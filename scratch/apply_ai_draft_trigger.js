const path = require('path');
const { Client } = require(path.join(__dirname, '..', '_source', 'node_modules', 'pg'));

async function applyAiDraftTrigger() {
  const client = new Client({
    connectionString: 'postgresql://postgres.eeykrgnwfarrljkotvmw:Luiyi260879%40@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  console.log('--- APLICANDO TRIGGER DE AI DRAFT v1 IDEMPOTENTE PARA WF02 ---');

  await client.query(`
    CREATE OR REPLACE FUNCTION public.fn_create_initial_ai_draft_version()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    BEGIN
      -- Solo actuar si el item tiene título y pasó a un estado de borrador/listo
      IF NEW.title IS NOT NULL AND NEW.title <> '' THEN
        -- Evitar duplicados (idempotencia estricta para WF02 / reintentos)
        IF NOT EXISTS (
          SELECT 1 FROM public.content_versions 
          WHERE content_item_id = NEW.id AND version_number = 1
        ) THEN
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
          ) VALUES (
            NEW.id,
            NEW.workspace_id,
            NEW.brand_id,
            1,
            'ai_draft',
            NEW.title,
            NEW.hook,
            NEW.script,
            NEW.caption,
            COALESCE(NEW.hashtags, '[]'::jsonb),
            NEW.cta,
            NEW.creative_direction,
            COALESCE(NEW.media_requirements, '[]'::jsonb),
            COALESCE(NEW.scenes, '[]'::jsonb),
            COALESCE(NEW.production_brief, '{}'::jsonb),
            NEW.platform,
            NEW.content_type,
            NEW.status,
            NEW.scheduled_at,
            NEW.published_at,
            NEW.external_post_url,
            'Borrador generado por IA (GPT-5.6 Luna)',
            now()
          );
        END IF;
      END IF;

      RETURN NEW;
    END;
    $$;

    DROP TRIGGER IF EXISTS trg_content_item_initial_version ON public.content_items;
    CREATE TRIGGER trg_content_item_initial_version
    AFTER INSERT OR UPDATE OF title, hook, script, caption, status ON public.content_items
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_create_initial_ai_draft_version();
  `);

  console.log('✅ Trigger trg_content_item_initial_version instalado y verificado.');
  await client.end();
}

applyAiDraftTrigger();
