const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://eeykrgnwfarrljkotvmw.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVleWtyZ253ZmFycmxqa290dm13Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIwODI2MiwiZXhwIjoyMTAyNzg0MjYyfQ.nICXCrJU42BYMMvdBjPHJRNusxmI8w_bhEDvN27bBiI';

const sqlMigration = `
-- ============================================================================
-- 1. EXTENDER public.content_items CON COLUMNAS DE FASE 7 Y TRAZABILIDAD
-- ============================================================================
ALTER TABLE public.content_items
ADD COLUMN IF NOT EXISTS request_id text,
ADD COLUMN IF NOT EXISTS generation_run_id uuid REFERENCES public.generation_runs(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS scenes jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS production_brief jsonb DEFAULT '{}'::jsonb;

-- Índice Único Parcial para Idempotencia estricta de request_id
CREATE UNIQUE INDEX IF NOT EXISTS uq_content_items_request_id
ON public.content_items (request_id)
WHERE request_id IS NOT NULL;

-- Índices compuestos para consultas y filtros
CREATE INDEX IF NOT EXISTS idx_content_items_brand_run ON public.content_items (brand_id, generation_run_id);
CREATE INDEX IF NOT EXISTS idx_content_items_idea ON public.content_items (idea_id);
CREATE INDEX IF NOT EXISTS idx_content_items_brand_status ON public.content_items (brand_id, status);

-- ============================================================================
-- 2. CREAR TABLA public.production_outbox
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.production_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  content_item_id uuid NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  request_id text NOT NULL,
  event_type text NOT NULL DEFAULT 'produce_content',
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  processed_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_production_outbox_request_event UNIQUE (request_id, event_type)
);

-- Índices para concurrencia y recuperación de eventos con SKIP LOCKED
CREATE INDEX IF NOT EXISTS idx_production_outbox_status_available ON public.production_outbox (status, available_at);
CREATE INDEX IF NOT EXISTS idx_production_outbox_content_item ON public.production_outbox (content_item_id);
CREATE INDEX IF NOT EXISTS idx_production_outbox_workspace_brand ON public.production_outbox (workspace_id, brand_id, created_at DESC);

-- RLS para production_outbox
ALTER TABLE public.production_outbox ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'production_outbox' AND policyname = 'Tenant isolation for production_outbox'
  ) THEN
    CREATE POLICY "Tenant isolation for production_outbox"
    ON public.production_outbox FOR ALL
    USING (
      workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- ============================================================================
-- 3. RPC TRANSACCIONAL: create_content_production_request
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_content_production_request(
  p_request_id text,
  p_workspace_id uuid,
  p_brand_id uuid,
  p_idea_id uuid,
  p_generation_run_id uuid,
  p_platform text,
  p_content_type text,
  p_production_brief jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_uid uuid;
  v_existing_content record;
  v_content_id uuid;
  v_outbox_id uuid;
  v_is_new boolean := false;
  v_status text;
BEGIN
  -- A. Validar membresía del usuario autenticado si es invocado vía JWT
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = p_workspace_id AND user_id = v_caller_uid
    ) THEN
      RAISE EXCEPTION '403 Forbidden: Usuario sin acceso a este workspace'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- B. Validación de Integridad Cruzada: brand pertenece a workspace
  IF NOT EXISTS (
    SELECT 1 FROM public.brands 
    WHERE id = p_brand_id AND workspace_id = p_workspace_id
  ) THEN
    RAISE EXCEPTION '400 Bad Request: La marca no pertenece al workspace indicado'
      USING ERRCODE = '23503';
  END IF;

  -- C. Validación de Integridad Cruzada: idea pertenece a brand y workspace
  IF p_idea_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.content_ideas 
      WHERE id = p_idea_id AND brand_id = p_brand_id AND workspace_id = p_workspace_id
    ) THEN
      RAISE EXCEPTION '400 Bad Request: La idea no pertenece a la marca y workspace indicados'
        USING ERRCODE = '23503';
    END IF;
  END IF;

  -- D. Validación de Integridad Cruzada: generation_run pertenece a brand y workspace
  IF p_generation_run_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.generation_runs 
      WHERE id = p_generation_run_id AND brand_id = p_brand_id AND workspace_id = p_workspace_id
    ) THEN
      RAISE EXCEPTION '400 Bad Request: La sesión de generación no pertenece a la marca y workspace indicados'
        USING ERRCODE = '23503';
    END IF;
  END IF;

  -- E. Verificar si el request_id ya existe
  SELECT id, workspace_id, brand_id, idea_id, status 
  INTO v_existing_content
  FROM public.content_items
  WHERE request_id = p_request_id;

  IF v_existing_content.id IS NOT NULL THEN
    -- Validación de Identidad Inmutable (409 Conflict si intentan reutilizar request_id para otra entidad)
    IF v_existing_content.workspace_id <> p_workspace_id OR
       v_existing_content.brand_id <> p_brand_id OR
       (v_existing_content.idea_id IS NOT NULL AND p_idea_id IS NOT NULL AND v_existing_content.idea_id <> p_idea_id) THEN
      RAISE EXCEPTION '409 Conflict: request_id ya pertenece a otra identidad o marca'
        USING ERRCODE = '23505';
    END IF;

    -- Inmutabilidad: Recuperar IDs existentes sin modificar ninguna columna
    v_content_id := v_existing_content.id;
    v_status := v_existing_content.status;

    SELECT id INTO v_outbox_id
    FROM public.production_outbox
    WHERE request_id = p_request_id AND event_type = 'produce_content';

  ELSE
    -- F. Inserción Transaccional en content_items
    INSERT INTO public.content_items (
      request_id,
      workspace_id,
      brand_id,
      idea_id,
      generation_run_id,
      platform,
      content_type,
      status,
      production_brief
    ) VALUES (
      p_request_id,
      p_workspace_id,
      p_brand_id,
      p_idea_id,
      p_generation_run_id,
      p_platform,
      p_content_type,
      'queued',
      p_production_brief
    )
    RETURNING id, status INTO v_content_id, v_status;

    v_is_new := true;

    -- G. Inserción Transaccional en production_outbox
    INSERT INTO public.production_outbox (
      workspace_id,
      brand_id,
      content_item_id,
      request_id,
      event_type,
      payload,
      status,
      available_at
    ) VALUES (
      p_workspace_id,
      p_brand_id,
      v_content_id,
      p_request_id,
      'produce_content',
      jsonb_build_object(
        'request_id', p_request_id,
        'content_item_id', v_content_id,
        'workspace_id', p_workspace_id,
        'brand_id', p_brand_id,
        'idea_id', p_idea_id,
        'generation_run_id', p_generation_run_id,
        'production_brief', p_production_brief
      ),
      'pending',
      now()
    )
    RETURNING id INTO v_outbox_id;
  END IF;

  RETURN jsonb_build_object(
    'content_item_id', v_content_id,
    'outbox_event_id', v_outbox_id,
    'status', v_status,
    'is_new', v_is_new
  );
END;
$$;

-- ============================================================================
-- 4. RPC DEL DISPATCHER / WORKER (Exclusivamente eventos 'pending')
-- ============================================================================
CREATE OR REPLACE FUNCTION public.claim_production_outbox_events(p_batch_size integer DEFAULT 10)
RETURNS SETOF public.production_outbox
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH claimable AS (
    SELECT id
    FROM public.production_outbox
    WHERE status = 'pending' AND available_at <= now()
    ORDER BY created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT p_batch_size
  )
  UPDATE public.production_outbox o
  SET 
    status = 'processing',
    locked_at = now(),
    attempts = o.attempts + 1,
    available_at = now() + (CASE 
      WHEN o.attempts = 0 THEN interval '30 seconds'
      WHEN o.attempts = 1 THEN interval '2 minutes'
      WHEN o.attempts = 2 THEN interval '10 minutes'
      ELSE interval '30 minutes'
    END),
    updated_at = now()
  FROM claimable c
  WHERE o.id = c.id
  RETURNING o.*;
END;
$$;
`;

async function runSqlMigration() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  console.log('=== APLICANDO MIGRACIÓN SQL FASE 7 EN SUPABASE ===\n');
  
  // Vamos a usar la tool execute_sql o RPC de sql
  console.log('SQL a ejecutar:\n', sqlMigration);
}

runSqlMigration();
