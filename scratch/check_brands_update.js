const https = require('https');

const SUPABASE_URL = 'https://eeykrgnwfarrljkotvmw.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVleWtyZ253ZmFycmxqa290dm13Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIwODI2MiwiZXhwIjoyMTAyNzg0MjYyfQ.nICXCrJU42BYMMvdBjPHJRNusxmI8w_bhEDvN27bBiI';

function httpReq(urlStr, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const opts = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
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

async function inspectBrandsUpdate() {
  console.log('=== INSPECCIONANDO ACTUALIZACIÓN DE BRANDS ===\n');

  // 1. Obtener TravelRockChannel
  const { data: brands } = await httpReq(`${SUPABASE_URL}/rest/v1/brands?name=ilike.*TravelRock*`);
  console.log('Marca encontrada:', brands);

  if (!brands || brands.length === 0) return;
  const brand = brands[0];
  console.log('\nColumnas de la marca:', Object.keys(brand));
  console.log('Tono actual:', brand.tone);
  console.log('Rules actual:', brand.rules);

  // 2. Probar UPDATE de tone
  const newTone = 'Joven, argentino, auténtico, divertido, cercano y emocional cuando corresponda.';
  const { status, data: updateRes } = await httpReq(`${SUPABASE_URL}/rest/v1/brands?id=eq.${brand.id}`, {
    method: 'PATCH',
    headers: { 'Prefer': 'return=representation' }
  }, {
    tone: newTone,
    updated_at: new Date().toISOString()
  });

  console.log('\nResultado de PATCH:', status, updateRes);

  // 3. Verificar si se persistió
  const { data: recheck } = await httpReq(`${SUPABASE_URL}/rest/v1/brands?id=eq.${brand.id}`);
  console.log('\nRecheck tone:', recheck[0]?.tone);
}

inspectBrandsUpdate().catch(console.error);
