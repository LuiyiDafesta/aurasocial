const path = require('path');
const { Client } = require(path.join(__dirname, '..', '_source', 'node_modules', 'pg'));

async function updateTrigger() {
  const client = new Client({
    connectionString: 'postgresql://postgres.eeykrgnwfarrljkotvmw:Luiyi260879%40@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  await client.query(`
    CREATE OR REPLACE FUNCTION public.prevent_content_version_mutation()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      -- UPDATE siempre está absolutamente prohibido (inmutabilidad estricta)
      IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'Inmutabilidad violada: Las versiones de contenido (content_versions) son inmutables y no pueden ser modificadas (UPDATE).'
        USING ERRCODE = 'integrity_constraint_violation';
      END IF;

      -- DELETE directo está absolutamente prohibido
      IF TG_OP = 'DELETE' THEN
        IF pg_trigger_depth() = 1 THEN
          RAISE EXCEPTION 'Inmutabilidad violada: No se permite la eliminación directa de versiones de contenido (content_versions).'
          USING ERRCODE = 'integrity_constraint_violation';
        END IF;
      END IF;

      RETURN OLD;
    END;
    $$;
  `);

  console.log('✅ Trigger prevent_content_version_mutation actualizado con soporte de cascade.');
  await client.end();
}

updateTrigger().catch(console.error);
