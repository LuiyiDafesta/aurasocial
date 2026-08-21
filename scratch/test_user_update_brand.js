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

async function queryPolicies() {
  // Let's create an RPC or execute SQL via postgres connection / Supabase MCP if available
  // Or check how user login performs an UPDATE on brands
  // Let's sign in as the user or generate a session
  console.log('Testing update with user JWT token:');
  const { data: signin } = await httpReq(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
  }, {
    email: 'lsnetinformatica2024@gmail.com',
    password: 'Password123!' // Let's check password or create session
  });
  console.log('Signin result:', signin);
}

queryPolicies().catch(console.error);
