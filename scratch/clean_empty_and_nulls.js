const path = require('path');
const { Client } = require(path.join(__dirname, '..', '_source', 'node_modules', 'pg'));

async function cleanEmptyAndNulls() {
  const client = new Client({
    connectionString: 'postgresql://postgres.eeykrgnwfarrljkotvmw:Luiyi260879%40@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const res = await client.query(`
    DELETE FROM public.content_items 
    WHERE title IS NULL 
       OR title = '' 
       OR hook IS NULL 
       OR hook = ''
       OR title ILIKE '%test%'
       OR title ILIKE '%versión 2%';
  `);

  console.log(`Filas incompletas/nulas/test eliminadas: ${res.rowCount}`);

  const remaining = await client.query(`
    SELECT id, title, hook, status, created_at 
    FROM public.content_items 
    ORDER BY created_at DESC;
  `);

  console.log('\n--- CONTENIDOS FINALES VÁLIDOS ---');
  console.table(remaining.rows.map(r => ({
    id: r.id.substring(0, 8),
    title: r.title,
    hook: (r.hook || '').substring(0, 40),
    status: r.status,
  })));

  await client.end();
}

cleanEmptyAndNulls();
