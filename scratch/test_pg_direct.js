const { Client } = require('pg');

async function testPg() {
  const passwords = ['Luiyi260879@', 'LuiyiDafesta2024@', 'lsnetinformatica2024@'];
  for (const pwd of passwords) {
    const client = new Client({
      host: 'db.eeykrgnwfarrljkotvmw.supabase.co',
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: pwd,
      ssl: { rejectUnauthorized: false }
    });
    try {
      await client.connect();
      console.log('CONECTADO CON PASSWORD:', pwd);
      await client.end();
      return pwd;
    } catch (e) {
      console.log('Fallo con pwd:', e.message);
    }
  }
}

testPg();
