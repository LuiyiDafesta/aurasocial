const path = require('path');
const { Client } = require(path.join(__dirname, '..', '_source', 'node_modules', 'pg'));

async function inspectRpc() {
  const client = new Client({
    connectionString: 'postgresql://postgres.eeykrgnwfarrljkotvmw:Luiyi260879%40@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const rpcRes = await client.query(`
    SELECT pg_get_functiondef(oid) as def
    FROM pg_proc
    WHERE proname = 'create_content_version';
  `);

  if (rpcRes.rows.length > 0) {
    console.log('--- DEFINICIÓN DE create_content_version ---');
    console.log(rpcRes.rows[0].def);
  } else {
    console.log('❌ No se encontró create_content_version');
  }

  await client.end();
}

inspectRpc();
