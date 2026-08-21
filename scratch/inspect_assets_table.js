const path = require('path');
const { Client } = require(path.join(__dirname, '..', '_source', 'node_modules', 'pg'));

async function inspectAssetsTable() {
  const client = new Client({
    connectionString: 'postgresql://postgres.eeykrgnwfarrljkotvmw:Luiyi260879%40@aws-0-sa-east-1.pooler.supabase.com:5432/postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const cols = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'content_assets';
  `);
  console.log('Columns:');
  for (const c of cols.rows) {
    console.log(`- ${c.column_name}: ${c.data_type} (nullable: ${c.is_nullable})`);
  }

  const cons = await client.query(`
    SELECT conname, pg_get_constraintdef(oid) as def
    FROM pg_constraint
    WHERE conrelid = 'public.content_assets'::regclass;
  `);
  console.log('\nConstraints:');
  for (const c of cons.rows) {
    console.log(`- ${c.conname}: ${c.def}`);
  }

  await client.end();
}

inspectAssetsTable();
