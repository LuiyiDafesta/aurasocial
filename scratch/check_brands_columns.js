const path = require('path');
const { Client } = require(path.join(__dirname, '..', '_source', 'node_modules', 'pg'));

async function checkBrandsColumns() {
  const client = new Client({
    connectionString: 'postgresql://postgres.eeykrgnwfarrljkotvmw:Luiyi260879%40@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('CONECTADO A POSTGRES!');

  const cols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'brands'
    ORDER BY ordinal_position;
  `);

  console.log('COLUMNAS ACTUALES EN BRANDS:\n', cols.rows);

  const brandsRows = await client.query(`SELECT id, name, industry, rules FROM public.brands;`);
  console.log('\nFILAS EN BRANDS:\n', brandsRows.rows);

  await client.end();
}

checkBrandsColumns().catch(console.error);
