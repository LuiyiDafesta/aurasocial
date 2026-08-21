const path = require('path');
const { Client } = require(path.join(__dirname, '..', '_source', 'node_modules', 'pg'));

async function inspectContentItemsColumns() {
  const client = new Client({
    connectionString: 'postgresql://postgres.eeykrgnwfarrljkotvmw:Luiyi260879%40@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  const cols = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'content_items' 
    ORDER BY ordinal_position;
  `);

  console.log('ALL COLUMNS IN public.content_items:');
  console.table(cols.rows);

  await client.end();
}

inspectContentItemsColumns().catch(console.error);
