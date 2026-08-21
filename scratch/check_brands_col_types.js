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

async function checkColTypes() {
  const { data: cols } = await httpReq(`${SUPABASE_URL}/rest/v1/?apikey=${SERVICE_KEY}`);
  // O consultar OpenAPI
  const { data: openapi } = await httpReq(`${SUPABASE_URL}/rest/v1/`);
  console.log('OpenAPI definitions for brands:');
  const brandDef = openapi?.definitions?.brands;
  console.log(JSON.stringify(brandDef, null, 2));
}

checkColTypes().catch(console.error);
