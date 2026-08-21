const path = require('path');
const { Client } = require(path.join(__dirname, '..', '_source', 'node_modules', 'pg'));

async function inspectProductionProcs() {
  const client = new Client({
    connectionString: 'postgresql://postgres.eeykrgnwfarrljkotvmw:Luiyi260879%40@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const procs = await client.query(`
    SELECT proname, pg_get_functiondef(oid) as def
    FROM pg_proc
    WHERE proname IN ('create_content_production_request', 'claim_production_outbox_events', 'complete_production_outbox_event');
  `);

  for (const row of procs.rows) {
    console.log(`\n================== ${row.proname} ==================`);
    console.log(row.def);
  }

  await client.end();
}

inspectProductionProcs();
