const path = require('path');
const { Client } = require(path.join(__dirname, '..', '_source', 'node_modules', 'pg'));

async function auditBrandsRlsSql() {
  const client = new Client({
    connectionString: 'postgresql://postgres.eeykrgnwfarrljkotvmw:Luiyi260879%40@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('CONECTADO A POSTGRES!');

  const res = await client.query(`
    SELECT policyname, permissive, roles, cmd, qual, with_check 
    FROM pg_policies 
    WHERE tablename = 'brands';
  `);

  console.log('POLICIES ON BRANDS:\n', JSON.stringify(res.rows, null, 2));

  const rlsStatus = await client.query(`
    SELECT relname, relrowsecurity 
    FROM pg_class 
    WHERE relname = 'brands';
  `);
  console.log('\nRLS STATUS ON BRANDS:', rlsStatus.rows);

  await client.end();
}

auditBrandsRlsSql().catch(console.error);
