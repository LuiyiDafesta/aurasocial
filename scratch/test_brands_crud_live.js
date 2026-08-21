const https = require('https');

const SUPABASE_URL = 'https://eeykrgnwfarrljkotvmw.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVleWtyZ253ZmFycmxqa290dm13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMDgyNjIsImV4cCI6MjEwMjc4NDI2Mn0.WM7sgjhvR003fHUKIy_r3CJ5S8TaIBA_3179hLkxdRk';

function httpReq(urlStr, options = {}, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const opts = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${token || ANON_KEY}`,
        ...(options.headers || {}),
      },
    };

    if (body) {
      opts.headers['Content-Length'] = Buffer.byteLength(typeof body === 'string' ? body : JSON.stringify(body));
    }

    const req = https.request(url, opts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, data: parsed });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function testBrandsCrud() {
  console.log('=== TEST BRANDS CRUD CON USUARIO AUTENTICADO ===\n');

  // Login
  const { data: authData } = await httpReq(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    { method: 'POST' },
    { email: 'lsnetinformatica2024@gmail.com', password: 'Luiyi260879@' }
  );

  const userToken = authData.access_token;
  console.log('✅ Usuario autenticado.');

  // 1. Probar actualizar TravelRockChannel
  const { data: brands } = await httpReq(
    `${SUPABASE_URL}/rest/v1/brands?name=ilike.*TravelRock*`,
    {},
    null,
    userToken
  );
  const travelBrand = brands[0];

  const updatedTone = 'Joven, argentino, auténtico, divertido, cercano y emocional cuando corresponda.';
  const { status, data: updateRes } = await httpReq(
    `${SUPABASE_URL}/rest/v1/brands?id=eq.${travelBrand.id}`,
    {
      method: 'PATCH',
      headers: { 'Prefer': 'return=representation' }
    },
    {
      tone: updatedTone,
      updated_at: new Date().toISOString()
    },
    userToken
  );

  console.log('\nUPDATE de TravelRockChannel: Status =', status);
  console.log('Tono guardado en DB:', updateRes[0]?.tone);
  if (updateRes[0]?.tone === updatedTone) {
    console.log('✅ ÉXITO: El tono se actualizó y persistió en la base de datos correctamente.');
  } else {
    console.error('❌ FALLÓ: El tono no coincide.');
  }
}

testBrandsCrud().catch(console.error);
