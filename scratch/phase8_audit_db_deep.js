const path = require('path');
const { Client } = require(path.join(__dirname, '..', '_source', 'node_modules', 'pg'));

async function auditDatabaseDeep() {
  const client = new Client({
    connectionString: 'postgresql://postgres.eeykrgnwfarrljkotvmw:Luiyi260879%40@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('=== AUDITORÍA PROFUNDA DE BASE DE DATOS SUPABASE — FASE 8 ===\n');

  // 1. Listar todas las tablas en public y storage
  const tablesRes = await client.query(`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_schema IN ('public', 'storage') 
      AND table_type = 'BASE TABLE'
    ORDER BY table_schema, table_name;
  `);

  console.log('--- 1. TABLAS EXISTENTES ---');
  console.table(tablesRes.rows);

  // 2. Para cada tabla de public, obtener columnas completas
  console.log('\n--- 2. COLUMNAS Y TIPOS POR TABLA (PUBLIC) ---');
  const colsRes = await client.query(`
    SELECT 
      table_name, 
      column_name, 
      data_type, 
      udt_name,
      is_nullable, 
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `);

  const tablesMap = {};
  for (const c of colsRes.rows) {
    if (!tablesMap[c.table_name]) tablesMap[c.table_name] = [];
    tablesMap[c.table_name].push({
      column: c.column_name,
      type: c.data_type === 'USER-DEFINED' ? c.udt_name : c.data_type,
      nullable: c.is_nullable,
      default: c.column_default ? c.column_default.substring(0, 30) : null
    });
  }

  for (const [tbl, cols] of Object.entries(tablesMap)) {
    console.log(`\nTABLA: public.${tbl}`);
    console.table(cols);
  }

  // 3. Primary Keys, Foreign Keys y Unique Constraints
  console.log('\n--- 3. CONSTRAINTS (PK, FK, UNIQUE, CHECK) ---');
  const constraintsRes = await client.query(`
    SELECT
      tc.table_name,
      tc.constraint_name,
      tc.constraint_type,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    LEFT JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.table_schema = 'public'
    ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;
  `);
  console.table(constraintsRes.rows);

  // 4. Índices
  console.log('\n--- 4. ÍNDICES DE BASE DE DATOS ---');
  const indexesRes = await client.query(`
    SELECT
      tablename,
      indexname,
      indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname;
  `);
  console.table(indexesRes.rows.map(r => ({
    table: r.tablename,
    index: r.indexname,
    def: r.indexdef.substring(0, 80)
  })));

  // 5. RLS y Políticas
  console.log('\n--- 5. RLS Y POLÍTICAS DE SEGURIDAD ---');
  const rlsRes = await client.query(`
    SELECT
      tablename,
      policyname,
      cmd,
      roles,
      qual,
      with_check
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, cmd;
  `);
  console.table(rlsRes.rows.map(r => ({
    table: r.tablename,
    policy: r.policyname,
    cmd: r.cmd,
    roles: r.roles
  })));

  // 6. Funciones y RPCs en public
  console.log('\n--- 6. FUNCIONES / RPCS EN PUBLIC ---');
  const rpcRes = await client.query(`
    SELECT 
      routine_name, 
      data_type,
      security_type
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    ORDER BY routine_name;
  `);
  console.table(rpcRes.rows);

  // 7. Cantidad de registros por tabla
  console.log('\n--- 7. REGISTROS ACTUALES POR TABLA ---');
  for (const tbl of Object.keys(tablesMap)) {
    const countRes = await client.query(`SELECT count(*) FROM public.${tbl};`);
    console.log(`public.${tbl}: ${countRes.rows[0].count} registros`);
  }

  // 8. Storage Buckets
  console.log('\n--- 8. SUPABASE STORAGE BUCKETS ---');
  const bucketsRes = await client.query(`
    SELECT id, name, public, created_at, file_size_limit, allowed_mime_types 
    FROM storage.buckets;
  `);
  console.table(bucketsRes.rows);

  // 9. Storage Objects
  const objectsRes = await client.query(`
    SELECT id, bucket_id, name, created_at, metadata 
    FROM storage.objects 
    LIMIT 10;
  `);
  console.log(`storage.objects: ${objectsRes.rows.length} objetos encontrados (muestra de 10)`);
  console.table(objectsRes.rows);

  await client.end();
}

auditDatabaseDeep().catch(console.error);
