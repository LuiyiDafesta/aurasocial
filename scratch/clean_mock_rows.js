const path = require('path');
const { Client } = require(path.join(__dirname, '..', '_source', 'node_modules', 'pg'));

async function cleanMockRows() {
  const client = new Client({
    connectionString: 'postgresql://postgres.eeykrgnwfarrljkotvmw:Luiyi260879%40@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  console.log('--- ELIMINANDO FILAS DE TEST / INCOMPLETAS ---');
  
  // 1. Eliminar item de test 6c7375ff
  const res1 = await client.query(`
    DELETE FROM public.content_items 
    WHERE title ILIKE '%Versión 2 Editada%' 
       OR title ILIKE '%Test%' 
       OR title ILIKE '%Mock%'
       OR hook = 'Hook 2 Mejorado';
  `);
  console.log(`Eliminados items de test explícitos: ${res1.rowCount}`);

  // 2. Eliminar ideas de test
  const resIdeas = await client.query(`
    DELETE FROM public.content_ideas 
    WHERE title ILIKE '%test%' 
       OR title ILIKE '%e2e%' 
       OR title = 'Idea con Campaña';
  `);
  console.log(`Eliminadas ideas de test: ${resIdeas.rowCount}`);

  // 3. Eliminar campañas de test
  const resCamps = await client.query(`
    DELETE FROM public.campaigns 
    WHERE slug ILIKE '%test%' 
       OR slug ILIKE '%summer-launch%' 
       OR name ILIKE '%E2E%';
  `);
  console.log(`Eliminadas campañas de test: ${resCamps.rowCount}`);

  // 4. Mostrar contenidos restantes en la base
  const remaining = await client.query(`
    SELECT id, title, hook, status, created_at 
    FROM public.content_items 
    WHERE title IS NOT NULL
    ORDER BY created_at DESC;
  `);

  console.log('\n--- CONTENIDOS REALES VÁLIDOS EN LA BASE DE DATOS ---');
  console.table(remaining.rows.map(r => ({
    id: r.id.substring(0, 8),
    title: r.title,
    hook: (r.hook || '').substring(0, 40),
    status: r.status,
    created_at: r.created_at
  })));

  await client.end();
}

cleanMockRows();
