const path = require('path');
const { Client } = require(path.join(__dirname, '..', '_source', 'node_modules', 'pg'));

async function inspectAllTriggers() {
  const client = new Client({
    connectionString: 'postgresql://postgres.eeykrgnwfarrljkotvmw:Luiyi260879%40@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const triggers = await client.query(`
    SELECT 
      event_object_table,
      trigger_name,
      action_statement
    FROM information_schema.triggers
    WHERE event_object_table IN ('content_items', 'content_ideas', 'campaigns');
  `);

  console.table(triggers.rows);

  const funcs = await client.query(`
    SELECT proname, pg_get_functiondef(oid) as def
    FROM pg_proc
    WHERE proname ILIKE '%campaign%' OR proname ILIKE '%idea%';
  `);

  for (const f of funcs.rows) {
    console.log(`\n--- FUNC: ${f.proname} ---`);
    console.log(f.def);
  }

  await client.end();
}

inspectAllTriggers();
