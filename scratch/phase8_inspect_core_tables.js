const path = require('path');
const { Client } = require(path.join(__dirname, '..', '_source', 'node_modules', 'pg'));

async function inspectCoreTables() {
  const client = new Client({
    connectionString: 'postgresql://postgres.eeykrgnwfarrljkotvmw:Luiyi260879%40@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('=== DETALLE ESPECÍFICO DE TABLAS CORE ===\n');

  // A. CONTENT_ITEMS
  console.log('--- A. TABLA public.content_items ---');
  const colsCI = await client.query(`
    SELECT column_name, data_type, udt_name, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'content_items' 
    ORDER BY ordinal_position;
  `);
  console.table(colsCI.rows);

  const sampleCI = await client.query(`
    SELECT id, brand_id, idea_id, generation_run_id, request_id, platform, content_type, title, status, 
           jsonb_typeof(scenes) as scenes_type, jsonb_array_length(scenes) as scenes_count,
           jsonb_typeof(production_brief) as brief_type
    FROM public.content_items 
    ORDER BY created_at DESC 
    LIMIT 5;
  `);
  console.log('Muestra de 5 content_items recientes:');
  console.table(sampleCI.rows);

  const detailCI = await client.query(`
    SELECT id, title, hook, script, caption, hashtags, cta, creative_direction, media_requirements, scenes, production_brief
    FROM public.content_items 
    ORDER BY created_at DESC 
    LIMIT 1;
  `);
  console.log('\nRegistro de contenido completo (último generado):');
  console.log(JSON.stringify(detailCI.rows[0], null, 2));

  // B. CONTENT_IDEAS
  console.log('\n--- B. TABLA public.content_ideas ---');
  const colsIdeas = await client.query(`
    SELECT column_name, data_type, udt_name, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'content_ideas' 
    ORDER BY ordinal_position;
  `);
  console.table(colsIdeas.rows);

  // C. GENERATION_RUNS
  console.log('\n--- C. TABLA public.generation_runs ---');
  const colsRuns = await client.query(`
    SELECT column_name, data_type, udt_name, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'generation_runs' 
    ORDER BY ordinal_position;
  `);
  console.table(colsRuns.rows);

  // D. BRANDS
  console.log('\n--- D. TABLA public.brands ---');
  const colsBrands = await client.query(`
    SELECT column_name, data_type, udt_name, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'brands' 
    ORDER BY ordinal_position;
  `);
  console.table(colsBrands.rows);

  await client.end();
}

inspectCoreTables().catch(console.error);
