const path = require('path');
const { Client } = require(path.join(__dirname, '..', '_source', 'node_modules', 'pg'));

async function inspectCampaignTriggers() {
  const client = new Client({
    connectionString: 'postgresql://postgres.eeykrgnwfarrljkotvmw:Luiyi260879%40@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const res = await client.query(`
    SELECT proname, pg_get_functiondef(oid) as def
    FROM pg_proc
    WHERE proname IN ('sync_content_item_campaign_from_idea', 'protect_content_item_campaign_integrity');
  `);

  for (const r of res.rows) {
    console.log(`\n================ ${r.proname} ================`);
    console.log(r.def);
  }

  await client.end();
}

inspectCampaignTriggers();
