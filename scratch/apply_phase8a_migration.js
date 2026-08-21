const path = require('path');
const { Client } = require(path.join(__dirname, '..', '_source', 'node_modules', 'pg'));

const sqlPhase8A = `
-- ============================================================================
-- FASE 8A: MIGRACIÓN DE ARQUITECTURA (CAMPAIGNS, VERSIONS, ASSETS & STORAGE)
-- ============================================================================

-- 1. REFORZAR UNIQUE CONSTRAINTS COMPUESTAS EN TABLAS BASE
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_brands_id_workspace'
  ) THEN
    ALTER TABLE public.brands ADD CONSTRAINT uq_brands_id_workspace UNIQUE (id, workspace_id);
  END IF;
END $$;

-- 2. CREAR TABLA public.campaigns
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  brand_id uuid NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  strategic_objective text NOT NULL,
  strategic_theme text,
  target_audience text,
  primary_channel text,
  budget_context text,
  kpis jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),
  start_date date,
  end_date date,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_campaigns_brand_slug UNIQUE (brand_id, slug),
  CONSTRAINT uq_campaigns_id_brand UNIQUE (id, brand_id),
  CONSTRAINT uq_campaigns_id_workspace UNIQUE (id, workspace_id),
  CONSTRAINT chk_campaigns_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
  CONSTRAINT fk_campaigns_brand_workspace FOREIGN KEY (brand_id, workspace_id) 
    REFERENCES public.brands(id, workspace_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_campaigns_brand_status ON public.campaigns (brand_id, status);
CREATE INDEX IF NOT EXISTS idx_campaigns_workspace ON public.campaigns (workspace_id);

-- 3. AGREGAR campaign_id EN generation_runs, content_ideas y content_items
-- ----------------------------------------------------------------------------
ALTER TABLE public.generation_runs
ADD COLUMN IF NOT EXISTS campaign_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_generation_runs_campaign'
  ) THEN
    ALTER TABLE public.generation_runs 
    ADD CONSTRAINT fk_generation_runs_campaign 
    FOREIGN KEY (campaign_id, brand_id) REFERENCES public.campaigns(id, brand_id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_generation_runs_campaign ON public.generation_runs (campaign_id);

ALTER TABLE public.content_ideas
ADD COLUMN IF NOT EXISTS campaign_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_content_ideas_campaign'
  ) THEN
    ALTER TABLE public.content_ideas 
    ADD CONSTRAINT fk_content_ideas_campaign 
    FOREIGN KEY (campaign_id, brand_id) REFERENCES public.campaigns(id, brand_id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_content_ideas_campaign ON public.content_ideas (campaign_id);

ALTER TABLE public.content_items
ADD COLUMN IF NOT EXISTS campaign_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_content_items_id_brand'
  ) THEN
    ALTER TABLE public.content_items ADD CONSTRAINT uq_content_items_id_brand UNIQUE (id, brand_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_content_items_campaign'
  ) THEN
    ALTER TABLE public.content_items 
    ADD CONSTRAINT fk_content_items_campaign 
    FOREIGN KEY (campaign_id, brand_id) REFERENCES public.campaigns(id, brand_id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_content_items_campaign ON public.content_items (campaign_id);

-- 4. TRIGGER DE INTEGRIDAD DE CAMPAIGN EN CONTENT_ITEMS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_content_item_campaign_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_idea record;
BEGIN
  -- Si el contenido nace de una idea, validar y sincronizar campaña
  IF NEW.idea_id IS NOT NULL THEN
    SELECT id, brand_id, workspace_id, campaign_id 
    INTO v_idea
    FROM public.content_ideas
    WHERE id = NEW.idea_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'idea_id % no existe en public.content_ideas', NEW.idea_id USING ERRCODE = 'P0002';
    END IF;

    -- Validar que la idea pertenezca a la misma marca
    IF v_idea.brand_id <> NEW.brand_id THEN
      RAISE EXCEPTION 'Inconsistencia de marca: content_item brand_id (%) no coincide con idea brand_id (%)', NEW.brand_id, v_idea.brand_id USING ERRCODE = '42804';
    END IF;

    -- Si la idea tiene campaña y el contenido no especificó una, heredarla automáticamente
    IF v_idea.campaign_id IS NOT NULL AND NEW.campaign_id IS NULL THEN
      NEW.campaign_id := v_idea.campaign_id;
    END IF;

    -- Si ambos especifican campaña pero son distintas, forzar consistencia
    IF v_idea.campaign_id IS NOT NULL AND NEW.campaign_id IS NOT NULL AND NEW.campaign_id <> v_idea.campaign_id THEN
      -- Se permite solo si la nueva campaña es válida para la marca
      IF NOT EXISTS (SELECT 1 FROM public.campaigns WHERE id = NEW.campaign_id AND brand_id = NEW.brand_id) THEN
        RAISE EXCEPTION 'Inconsistencia de campaña: la campaña especificada (%) no pertenece a la marca (%)', NEW.campaign_id, NEW.brand_id USING ERRCODE = '42804';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_content_item_campaign_integrity ON public.content_items;
CREATE TRIGGER trg_content_item_campaign_integrity
BEFORE INSERT OR UPDATE ON public.content_items
FOR EACH ROW
EXECUTE FUNCTION public.check_content_item_campaign_integrity();

-- 5. CREAR TABLA public.content_versions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.content_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  brand_id uuid NOT NULL,
  version_number integer NOT NULL CHECK (version_number >= 1),
  version_type text NOT NULL CHECK (version_type IN ('historical_snapshot', 'ai_draft', 'human_edit', 'platform_adaptation', 'revision', 'restored_from_version', 'final')),
  title text NOT NULL,
  hook text,
  script text,
  caption text,
  hashtags jsonb DEFAULT '[]'::jsonb,
  cta text,
  creative_direction text,
  media_requirements jsonb DEFAULT '[]'::jsonb,
  scenes jsonb DEFAULT '[]'::jsonb,
  production_brief_snapshot jsonb DEFAULT '{}'::jsonb,
  platform text,
  content_type text,
  status text,
  scheduled_at timestamptz,
  published_at timestamptz,
  external_post_url text,
  change_summary text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_content_versions_item_num UNIQUE (content_item_id, version_number),
  CONSTRAINT fk_content_versions_item_brand FOREIGN KEY (content_item_id, brand_id) 
    REFERENCES public.content_items(id, brand_id) ON DELETE CASCADE,
  CONSTRAINT fk_content_versions_brand_workspace FOREIGN KEY (brand_id, workspace_id) 
    REFERENCES public.brands(id, workspace_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_content_versions_item ON public.content_versions (content_item_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_content_versions_brand ON public.content_versions (brand_id);
CREATE INDEX IF NOT EXISTS idx_content_versions_workspace ON public.content_versions (workspace_id);

-- 6. TRIGGER DE INMUTABILIDAD ESTRICTA (APPEND-ONLY) EN CONTENT_VERSIONS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_content_version_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Inmutabilidad violada: Las versiones de contenido (content_versions) son inmutables y no pueden ser modificadas (UPDATE) ni eliminadas (DELETE).'
  USING ERRCODE = 'integrity_constraint_violation';
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_content_versions_immutability ON public.content_versions;
CREATE TRIGGER trg_protect_content_versions_immutability
BEFORE UPDATE OR DELETE ON public.content_versions
FOR EACH ROW
EXECUTE FUNCTION public.prevent_content_version_mutation();

-- 7. RPC SEGURA create_content_version (SECURITY DEFINER + VALIDACIÓN DE AUTORIZACIÓN)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_content_version(
  p_content_item_id uuid,
  p_version_type text,
  p_title text,
  p_hook text DEFAULT NULL,
  p_script text DEFAULT NULL,
  p_caption text DEFAULT NULL,
  p_hashtags jsonb DEFAULT '[]'::jsonb,
  p_cta text DEFAULT NULL,
  p_creative_direction text DEFAULT NULL,
  p_media_requirements jsonb DEFAULT '[]'::jsonb,
  p_scenes jsonb DEFAULT '[]'::jsonb,
  p_production_brief_snapshot jsonb DEFAULT '{}'::jsonb,
  p_platform text DEFAULT NULL,
  p_content_type text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_scheduled_at timestamptz DEFAULT NULL,
  p_published_at timestamptz DEFAULT NULL,
  p_external_post_url text DEFAULT NULL,
  p_change_summary text DEFAULT NULL
)
RETURNS public.content_versions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item record;
  v_next_version integer;
  v_new_version public.content_versions;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  -- 1. BLOQUEO PESIMISTA: Serializa intentos concurrentes sobre este content_item
  SELECT id, workspace_id, brand_id, platform, content_type, status, scheduled_at, published_at, external_post_url
  INTO v_item
  FROM public.content_items
  WHERE id = p_content_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'content_item con id % no existe', p_content_item_id USING ERRCODE = 'P0002';
  END IF;

  -- 2. VALIDACIÓN DE AUTORIZACIÓN: El usuario autenticado debe pertenecer al workspace
  IF v_user_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = v_item.workspace_id AND user_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'Acceso denegado: El usuario no pertenece al workspace del content_item' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- 3. CALCULAR SIGUIENTE NÚMERO DE VERSIÓN DE FORMA ATÓMICA
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_next_version
  FROM public.content_versions
  WHERE content_item_id = p_content_item_id;

  -- 4. INSERTAR EN CONTENT_VERSIONS
  INSERT INTO public.content_versions (
    content_item_id,
    workspace_id,
    brand_id,
    version_number,
    version_type,
    title,
    hook,
    script,
    caption,
    hashtags,
    cta,
    creative_direction,
    media_requirements,
    scenes,
    production_brief_snapshot,
    platform,
    content_type,
    status,
    scheduled_at,
    published_at,
    external_post_url,
    change_summary,
    created_by
  ) VALUES (
    v_item.id,
    v_item.workspace_id,
    v_item.brand_id,
    v_next_version,
    p_version_type,
    p_title,
    p_hook,
    p_script,
    p_caption,
    p_hashtags,
    p_cta,
    p_creative_direction,
    p_media_requirements,
    p_scenes,
    p_production_brief_snapshot,
    COALESCE(p_platform, v_item.platform),
    COALESCE(p_content_type, v_item.content_type),
    COALESCE(p_status, v_item.status),
    COALESCE(p_scheduled_at, v_item.scheduled_at),
    COALESCE(p_published_at, v_item.published_at),
    COALESCE(p_external_post_url, v_item.external_post_url),
    p_change_summary,
    v_user_id
  )
  RETURNING * INTO v_new_version;

  -- 5. ACTUALIZAR ESTADO VIGENTE EN CONTENT_ITEMS
  UPDATE public.content_items
  SET
    title = p_title,
    hook = p_hook,
    script = p_script,
    caption = p_caption,
    hashtags = p_hashtags,
    cta = p_cta,
    creative_direction = p_creative_direction,
    media_requirements = p_media_requirements,
    scenes = p_scenes,
    platform = COALESCE(p_platform, platform),
    content_type = COALESCE(p_content_type, content_type),
    status = COALESCE(p_status, status),
    scheduled_at = COALESCE(p_scheduled_at, scheduled_at),
    published_at = COALESCE(p_published_at, published_at),
    external_post_url = COALESCE(p_external_post_url, external_post_url),
    updated_at = now()
  WHERE id = p_content_item_id;

  RETURN v_new_version;
END;
$$;

-- 8. CREAR TABLA public.content_assets CON SCOPES ESTRICTOS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.content_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  brand_id uuid NOT NULL,
  campaign_id uuid,
  content_item_id uuid,
  asset_scope text NOT NULL CHECK (asset_scope IN ('brand', 'campaign', 'content')),
  asset_type text NOT NULL CHECK (asset_type IN ('logo', 'brand_book', 'font', 'palette', 'image', 'video', 'audio', 'document', 'thumbnail', 'b_roll', 'raw_footage')),
  name text NOT NULL,
  storage_bucket text NOT NULL DEFAULT 'aura-media',
  storage_path text NOT NULL,
  mime_type text NOT NULL,
  file_size_bytes bigint NOT NULL CHECK (file_size_bytes >= 0),
  width integer,
  height integer,
  duration_seconds numeric,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_asset_scope_exclusive CHECK (
    (asset_scope = 'brand' AND campaign_id IS NULL AND content_item_id IS NULL) OR
    (asset_scope = 'campaign' AND campaign_id IS NOT NULL AND content_item_id IS NULL) OR
    (asset_scope = 'content' AND content_item_id IS NOT NULL)
  ),
  CONSTRAINT fk_content_assets_brand_workspace FOREIGN KEY (brand_id, workspace_id) 
    REFERENCES public.brands(id, workspace_id) ON DELETE CASCADE,
  CONSTRAINT fk_content_assets_campaign FOREIGN KEY (campaign_id, brand_id) 
    REFERENCES public.campaigns(id, brand_id) ON DELETE SET NULL,
  CONSTRAINT fk_content_assets_content_item FOREIGN KEY (content_item_id, brand_id) 
    REFERENCES public.content_items(id, brand_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_content_assets_brand ON public.content_assets (brand_id, asset_scope);
CREATE INDEX IF NOT EXISTS idx_content_assets_campaign ON public.content_assets (campaign_id);
CREATE INDEX IF NOT EXISTS idx_content_assets_content_item ON public.content_assets (content_item_id);

-- 9. RLS MULTI-TENANT PARA NUEVAS TABLAS
-- ----------------------------------------------------------------------------
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_assets ENABLE ROW LEVEL SECURITY;

-- Campaigns RLS
DROP POLICY IF EXISTS "Tenant isolation for campaigns select" ON public.campaigns;
CREATE POLICY "Tenant isolation for campaigns select" ON public.campaigns
FOR SELECT TO authenticated
USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant isolation for campaigns insert" ON public.campaigns;
CREATE POLICY "Tenant isolation for campaigns insert" ON public.campaigns
FOR INSERT TO authenticated
WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant isolation for campaigns update" ON public.campaigns;
CREATE POLICY "Tenant isolation for campaigns update" ON public.campaigns
FOR UPDATE TO authenticated
USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()))
WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant isolation for campaigns delete" ON public.campaigns;
CREATE POLICY "Tenant isolation for campaigns delete" ON public.campaigns
FOR DELETE TO authenticated
USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- Content Versions RLS (Append-Only: Solo SELECT e INSERT)
DROP POLICY IF EXISTS "Tenant isolation for content_versions select" ON public.content_versions;
CREATE POLICY "Tenant isolation for content_versions select" ON public.content_versions
FOR SELECT TO authenticated
USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant isolation for content_versions insert" ON public.content_versions;
CREATE POLICY "Tenant isolation for content_versions insert" ON public.content_versions
FOR INSERT TO authenticated
WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- Content Assets RLS
DROP POLICY IF EXISTS "Tenant isolation for content_assets select" ON public.content_assets;
CREATE POLICY "Tenant isolation for content_assets select" ON public.content_assets
FOR SELECT TO authenticated
USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant isolation for content_assets insert" ON public.content_assets;
CREATE POLICY "Tenant isolation for content_assets insert" ON public.content_assets
FOR INSERT TO authenticated
WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant isolation for content_assets update" ON public.content_assets;
CREATE POLICY "Tenant isolation for content_assets update" ON public.content_assets
FOR UPDATE TO authenticated
USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()))
WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant isolation for content_assets delete" ON public.content_assets;
CREATE POLICY "Tenant isolation for content_assets delete" ON public.content_assets
FOR DELETE TO authenticated
USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- 10. CONFIGURACIÓN DEL BUCKET PRIVADO aura-media EN SUPABASE STORAGE
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'aura-media',
  'aura-media',
  false,
  524288000, -- 500 MB max por archivo
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'audio/mpeg', 'audio/wav', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 524288000,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'audio/mpeg', 'audio/wav', 'application/pdf'];

-- Políticas de Storage en storage.objects
DROP POLICY IF EXISTS "Tenant isolation for storage aura-media select" ON storage.objects;
CREATE POLICY "Tenant isolation for storage aura-media select"
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'aura-media' AND
  (storage.foldername(name))[1]::uuid IN (
    SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Tenant isolation for storage aura-media insert" ON storage.objects;
CREATE POLICY "Tenant isolation for storage aura-media insert"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'aura-media' AND
  (storage.foldername(name))[1]::uuid IN (
    SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Tenant isolation for storage aura-media update" ON storage.objects;
CREATE POLICY "Tenant isolation for storage aura-media update"
ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'aura-media' AND
  (storage.foldername(name))[1]::uuid IN (
    SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Tenant isolation for storage aura-media delete" ON storage.objects;
CREATE POLICY "Tenant isolation for storage aura-media delete"
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'aura-media' AND
  (storage.foldername(name))[1]::uuid IN (
    SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
  )
);

-- 11. MIGRACIÓN HISTÓRICA IDEMPOTENTE DE LOS CONTENIDOS EXISTENTES (v1 historical_snapshot)
-- ----------------------------------------------------------------------------
INSERT INTO public.content_versions (
  content_item_id,
  workspace_id,
  brand_id,
  version_number,
  version_type,
  title,
  hook,
  script,
  caption,
  hashtags,
  cta,
  creative_direction,
  media_requirements,
  scenes,
  production_brief_snapshot,
  platform,
  content_type,
  status,
  scheduled_at,
  published_at,
  external_post_url,
  change_summary,
  created_at
)
SELECT 
  ci.id,
  ci.workspace_id,
  ci.brand_id,
  1,
  'historical_snapshot',
  COALESCE(ci.title, 'Contenido sin título'),
  ci.hook,
  ci.script,
  ci.caption,
  COALESCE(ci.hashtags, '[]'::jsonb),
  ci.cta,
  ci.creative_direction,
  COALESCE(ci.media_requirements, '[]'::jsonb),
  COALESCE(ci.scenes, '[]'::jsonb),
  COALESCE(ci.production_brief, '{}'::jsonb),
  ci.platform,
  ci.content_type,
  ci.status,
  ci.scheduled_at,
  ci.published_at,
  ci.external_post_url,
  'Snapshot inicial de migración a Fase 8',
  COALESCE(ci.created_at, now())
FROM public.content_items ci
WHERE NOT EXISTS (
  SELECT 1 FROM public.content_versions cv WHERE cv.content_item_id = ci.id
);
`;

async function applyPhase8A() {
  console.log('================================================================================');
  console.log('🚀 APLICANDO MIGRACIÓN FASE 8A: DATABASE & STORAGE HARDENING');
  console.log('================================================================================\n');

  const client = new Client({
    connectionString: 'postgresql://postgres.eeykrgnwfarrljkotvmw:Luiyi260879%40@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('✅ Conectado a PostgreSQL en Supabase.');

  console.log('Ejecutando DDL y migraciones de Fase 8A...');
  await client.query(sqlPhase8A);
  console.log('✅ DDL, Triggers, RPCs, Constraints y RLS aplicados exitosamente.\n');

  // Verificación de tablas creadas
  const tables = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name IN ('campaigns', 'content_versions', 'content_assets');
  `);
  console.log('Tablas verificadas en public:');
  console.table(tables.rows);

  // Verificación de snapshots históricos creados
  const versionsCount = await client.query(`
    SELECT version_type, count(*) 
    FROM public.content_versions 
    GROUP BY version_type;
  `);
  console.log('\nSnapshots creados en content_versions:');
  console.table(versionsCount.rows);

  // Verificación del bucket aura-media
  const bucketCheck = await client.query(`
    SELECT id, name, public, file_size_limit 
    FROM storage.buckets 
    WHERE id = 'aura-media';
  `);
  console.log('\nBucket en storage.buckets:');
  console.table(bucketCheck.rows);

  await client.end();
}

applyPhase8A().catch(console.error);
