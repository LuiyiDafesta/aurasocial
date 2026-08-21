const path = require('path');
const { Client } = require(path.join(__dirname, '..', '_source', 'node_modules', 'pg'));

async function applyCampaignOrganizationRpcs() {
  const client = new Client({
    connectionString: 'postgresql://postgres.eeykrgnwfarrljkotvmw:Luiyi260879%40@aws-0-sa-east-1.pooler.supabase.com:5432/postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  console.log('--- APLICANDO RPCS Y TRIGGERS DE ORGANIZACIÓN DE CAMPAÑAS ---');

  // 1. Refinar trigger de integridad para content_items
  await client.query(`
    CREATE OR REPLACE FUNCTION public.check_content_item_campaign_integrity()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    DECLARE
      v_idea record;
    BEGIN
      -- Si el contenido nace de una idea en INSERT y no se pasó campaña, heredarla
      IF TG_OP = 'INSERT' AND NEW.idea_id IS NOT NULL THEN
        SELECT id, brand_id, workspace_id, campaign_id 
        INTO v_idea
        FROM public.content_ideas
        WHERE id = NEW.idea_id;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'idea_id % no existe en public.content_ideas', NEW.idea_id USING ERRCODE = 'P0002';
        END IF;

        IF v_idea.brand_id <> NEW.brand_id THEN
          RAISE EXCEPTION 'Inconsistencia de marca: content_item brand_id (%) no coincide con idea brand_id (%)', NEW.brand_id, v_idea.brand_id USING ERRCODE = '42804';
        END IF;

        IF v_idea.campaign_id IS NOT NULL AND NEW.campaign_id IS NULL THEN
          NEW.campaign_id := v_idea.campaign_id;
        END IF;
      END IF;

      -- En INSERT o UPDATE, si se asigna una campaña (no nula), validar que pertenezca a la misma marca y workspace
      IF NEW.campaign_id IS NOT NULL THEN
        IF NOT EXISTS (
          SELECT 1 FROM public.campaigns 
          WHERE id = NEW.campaign_id AND brand_id = NEW.brand_id AND workspace_id = NEW.workspace_id
        ) THEN
          RAISE EXCEPTION 'Inconsistencia de campaña: la campaña especificada (%) no pertenece a la marca (%) y workspace (%)', NEW.campaign_id, NEW.brand_id, NEW.workspace_id USING ERRCODE = '42804';
        END IF;
      END IF;

      RETURN NEW;
    END;
    $$;
  `);

  // 2. RPC: assign_idea_to_campaign
  await client.query(`
    CREATE OR REPLACE FUNCTION public.assign_idea_to_campaign(
      p_idea_id uuid,
      p_campaign_id uuid DEFAULT NULL
    )
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    DECLARE
      v_caller_uid uuid;
      v_idea record;
      v_campaign record;
    BEGIN
      v_caller_uid := auth.uid();

      -- Obtener idea
      SELECT id, workspace_id, brand_id, campaign_id, generation_run_id
      INTO v_idea
      FROM public.content_ideas
      WHERE id = p_idea_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Idea con id % no existe', p_idea_id USING ERRCODE = 'P0002';
      END IF;

      -- Validar membresía del usuario autenticado si es invocado vía JWT
      IF v_caller_uid IS NOT NULL THEN
        IF NOT EXISTS (
          SELECT 1 FROM public.workspace_members 
          WHERE workspace_id = v_idea.workspace_id AND user_id = v_caller_uid
        ) THEN
          RAISE EXCEPTION '403 Forbidden: Usuario sin acceso a este workspace' USING ERRCODE = '42501';
        END IF;
      END IF;

      -- Si se asigna a una campaña (no nula), validar existencia y pertenencia a la misma marca y workspace
      IF p_campaign_id IS NOT NULL THEN
        SELECT id, workspace_id, brand_id, name, slug
        INTO v_campaign
        FROM public.campaigns
        WHERE id = p_campaign_id;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Campaña con id % no existe', p_campaign_id USING ERRCODE = 'P0002';
        END IF;

        IF v_campaign.brand_id <> v_idea.brand_id OR v_campaign.workspace_id <> v_idea.workspace_id THEN
          RAISE EXCEPTION 'Inconsistencia de tenant: La campaña no pertenece a la misma marca y workspace de la idea' USING ERRCODE = '42804';
        END IF;
      END IF;

      -- Actualizar campaign_id sin alterar generation_run_id
      UPDATE public.content_ideas
      SET 
        campaign_id = p_campaign_id
      WHERE id = p_idea_id;

      RETURN jsonb_build_object(
        'success', true,
        'idea_id', p_idea_id,
        'previous_campaign_id', v_idea.campaign_id,
        'new_campaign_id', p_campaign_id
      );
    END;
    $$;
  `);

  // 3. RPC: assign_content_to_campaign
  await client.query(`
    CREATE OR REPLACE FUNCTION public.assign_content_to_campaign(
      p_content_item_id uuid,
      p_campaign_id uuid DEFAULT NULL
    )
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    DECLARE
      v_caller_uid uuid;
      v_item record;
      v_campaign record;
    BEGIN
      v_caller_uid := auth.uid();

      -- Obtener content_item
      SELECT id, workspace_id, brand_id, campaign_id, idea_id, generation_run_id
      INTO v_item
      FROM public.content_items
      WHERE id = p_content_item_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'content_item con id % no existe', p_content_item_id USING ERRCODE = 'P0002';
      END IF;

      -- Validar membresía del usuario autenticado si es invocado vía JWT
      IF v_caller_uid IS NOT NULL THEN
        IF NOT EXISTS (
          SELECT 1 FROM public.workspace_members 
          WHERE workspace_id = v_item.workspace_id AND user_id = v_caller_uid
        ) THEN
          RAISE EXCEPTION '403 Forbidden: Usuario sin acceso a este workspace' USING ERRCODE = '42501';
        END IF;
      END IF;

      -- Si se asigna a una campaña (no nula), validar existencia y pertenencia a la misma marca y workspace
      IF p_campaign_id IS NOT NULL THEN
        SELECT id, workspace_id, brand_id, name, slug
        INTO v_campaign
        FROM public.campaigns
        WHERE id = p_campaign_id;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Campaña con id % no existe', p_campaign_id USING ERRCODE = 'P0002';
        END IF;

        IF v_campaign.brand_id <> v_item.brand_id OR v_campaign.workspace_id <> v_item.workspace_id THEN
          RAISE EXCEPTION 'Inconsistencia de tenant: La campaña no pertenece a la misma marca y workspace del contenido' USING ERRCODE = '42804';
        END IF;
      END IF;

      -- Actualizar campaign_id sin alterar idea_id, generation_run_id ni crear versiones
      UPDATE public.content_items
      SET 
        campaign_id = p_campaign_id,
        updated_at = now()
      WHERE id = p_content_item_id;

      RETURN jsonb_build_object(
        'success', true,
        'content_item_id', p_content_item_id,
        'previous_campaign_id', v_item.campaign_id,
        'new_campaign_id', p_campaign_id
      );
    END;
    $$;
  `);

  // 4. RPC: bulk_assign_ideas_to_campaign
  await client.query(`
    CREATE OR REPLACE FUNCTION public.bulk_assign_ideas_to_campaign(
      p_idea_ids uuid[],
      p_campaign_id uuid DEFAULT NULL
    )
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    DECLARE
      v_id uuid;
      v_count integer := 0;
    BEGIN
      FOREACH v_id IN ARRAY p_idea_ids
      LOOP
        PERFORM public.assign_idea_to_campaign(v_id, p_campaign_id);
        v_count := v_count + 1;
      END LOOP;

      RETURN jsonb_build_object(
        'success', true,
        'assigned_count', v_count,
        'campaign_id', p_campaign_id
      );
    END;
    $$;
  `);

  // 5. RPC: bulk_assign_contents_to_campaign
  await client.query(`
    CREATE OR REPLACE FUNCTION public.bulk_assign_contents_to_campaign(
      p_content_ids uuid[],
      p_campaign_id uuid DEFAULT NULL
    )
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    DECLARE
      v_id uuid;
      v_count integer := 0;
    BEGIN
      FOREACH v_id IN ARRAY p_content_ids
      LOOP
        PERFORM public.assign_content_to_campaign(v_id, p_campaign_id);
        v_count := v_count + 1;
      END LOOP;

      RETURN jsonb_build_object(
        'success', true,
        'assigned_count', v_count,
        'campaign_id', p_campaign_id
      );
    END;
    $$;
  `);

  console.log('✅ RPCs y triggers de organización de campañas creados exitosamente.');
  await client.end();
}

applyCampaignOrganizationRpcs();
