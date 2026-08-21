const path = require('path');
const { Client } = require(path.join(__dirname, '..', '_source', 'node_modules', 'pg'));

async function inspectAndClean() {
  const client = new Client({
    connectionString: 'postgresql://postgres.eeykrgnwfarrljkotvmw:Luiyi260879%40@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  console.log('--- CONTENT ITEMS EN LA BASE DE DATOS ---');
  const itemsRes = await client.query(`
    SELECT id, title, hook, script, caption, status, campaign_id, created_at
    FROM public.content_items
    ORDER BY created_at DESC;
  `);

  console.table(itemsRes.rows.map(r => ({
    id: r.id.substring(0, 8),
    title: r.title,
    hook: (r.hook || '').substring(0, 30),
    status: r.status,
    created_at: r.created_at
  })));

  // Ver si hay items de test creados con nombres como "Título Versión 2 Editada", "Test", etc.
  const testItems = itemsRes.rows.filter(r => 
    r.title?.includes('Versión') || 
    r.title?.includes('Test') || 
    r.title?.includes('E2E') ||
    r.title?.includes('Mock') ||
    r.hook?.includes('Hook 2') ||
    r.hook?.includes('Test')
  );

  console.log(`\nItems de test identificados: ${testItems.length}`);
  for (const t of testItems) {
    console.log(`Eliminando item de test: ${t.id} - ${t.title}`);
    await client.query(`DELETE FROM public.content_versions WHERE content_item_id = $1;`, [t.id]);
    await client.query(`DELETE FROM public.content_items WHERE id = $1;`, [t.id]);
  }

  // Ver si hay ideas de test
  const ideasRes = await client.query(`
    SELECT id, title FROM public.content_ideas WHERE title ILIKE '%test%' OR title ILIKE '%e2e%' OR title ILIKE '%Idea con Campaña%';
  `);
  console.log(`\nIdeas de test identificadas: ${ideasRes.rowCount}`);
  for (const idea of ideasRes.rows) {
    console.log(`Eliminando idea de test: ${idea.id} - ${idea.title}`);
    await client.query(`DELETE FROM public.content_ideas WHERE id = $1;`, [idea.id]);
  }

  // Ver si hay campañas de test
  const campsRes = await client.query(`
    SELECT id, name, slug FROM public.campaigns WHERE slug ILIKE '%test%' OR slug ILIKE '%summer-launch%' OR name ILIKE '%E2E%';
  `);
  console.log(`\nCampañas de test identificadas: ${campsRes.rowCount}`);
  for (const c of campsRes.rows) {
    console.log(`Eliminando campaña de test: ${c.id} - ${c.name}`);
    await client.query(`DELETE FROM public.campaigns WHERE id = $1;`, [c.id]);
  }

  await client.end();
}

inspectAndClean();
