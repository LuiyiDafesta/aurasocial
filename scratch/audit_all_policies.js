const path = require('path');
const { Client } = require(path.join(__dirname, '..', '_source', 'node_modules', 'pg'));

async function auditAllPolicies() {
  const client = new Client({
    connectionString: 'postgresql://postgres.eeykrgnwfarrljkotvmw:Luiyi260879%40@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('CONECTADO A POSTGRES!\n');

  const res = await client.query(`
    SELECT tablename, policyname, cmd, roles 
    FROM pg_policies 
    ORDER BY tablename, cmd;
  `);

  console.log('ALL POLICIES IN DB:');
  for (const row of res.rows) {
    console.log(`- Table [${row.tablename}] | CMD [${row.cmd}] | Policy: "${row.policyname}" | Roles: ${row.roles}`);
  }

  await client.end();
}

auditAllPolicies().catch(console.error);
