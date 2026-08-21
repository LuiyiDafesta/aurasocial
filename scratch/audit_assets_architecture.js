const path = require('path');
const { Client } = require(path.join(__dirname, '..', '_source', 'node_modules', 'pg'));

async function auditAssetsArchitecture() {
  const client = new Client({
    connectionString: 'postgresql://postgres.eeykrgnwfarrljkotvmw:Luiyi260879%40@aws-0-sa-east-1.pooler.supabase.com:5432/postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  console.log('=== AUDITORÍA FASE 8D: ARCHITECTURE INSPECTION ===\n');

  // 1. Columnas y tipos de content_assets
  const cols = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_assets'
    ORDER BY ordinal_position;
  `);
  console.log('--- COLUMNAS DE public.content_assets ---');
  console.table(cols.rows);

  // 2. Constraints y CHECKS de content_assets
  const constraints = await client.query(`
    SELECT 
      conname as constraint_name,
      contype as constraint_type,
      pg_get_constraintdef(c.oid) as definition
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public' AND t.relname = 'content_assets';
  `);
  console.log('\n--- CONSTRAINTS DE public.content_assets ---');
  console.table(constraints.rows);

  // 3. Triggers de content_assets
  const triggers = await client.query(`
    SELECT trigger_name, event_manipulation, action_statement
    FROM information_schema.triggers
    WHERE event_object_schema = 'public' AND event_object_table = 'content_assets';
  `);
  console.log('\n--- TRIGGERS DE public.content_assets ---');
  console.table(triggers.rows);

  // 4. Políticas RLS de content_assets
  const rlsAssets = await client.query(`
    SELECT policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'content_assets';
  `);
  console.log('\n--- POLÍTICAS RLS DE content_assets ---');
  console.table(rlsAssets.rows);

  // 5. Buckets en storage.buckets
  const buckets = await client.query(`
    SELECT id, name, public, file_size_limit, allowed_mime_types
    FROM storage.buckets;
  `);
  console.log('\n--- BUCKETS EN storage.buckets ---');
  console.table(buckets.rows);

  // 6. Políticas RLS en storage.objects
  const rlsStorage = await client.query(`
    SELECT policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects';
  `);
  console.log('\n--- POLÍTICAS RLS DE storage.objects ---');
  console.table(rlsStorage.rows);

  await client.end();
}

auditAssetsArchitecture();
