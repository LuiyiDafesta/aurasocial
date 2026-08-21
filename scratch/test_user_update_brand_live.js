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

async function testUserUpdateBrand() {
  console.log('=== TEST USER UPDATE BRAND VIA HTTPS ===\n');

  // 1. Iniciar sesión con el usuario
  const { status: authStatus, data: authData } = await httpReq(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    { method: 'POST' },
    {
      email: 'lsnetinformatica2024@gmail.com',
      password: 'Luiyi260879@',
    }
  );

  if (!authData.access_token) {
    console.error('Error al autenticar:', authStatus, authData);
    return;
  }

  const userToken = authData.access_token;
  console.log('Usuario autenticado correctamente. Token obtenido.');

  // 2. Obtener marcas con el token del usuario
  const { data: brands } = await httpReq(
    `${SUPABASE_URL}/rest/v1/brands?name=ilike.*TravelRock*`,
    {},
    null,
    userToken
  );

  console.log('Marcas obtenidas por el usuario:', brands);
  if (!brands || brands.length === 0) return;

  const travelBrand = brands[0];

  // 3. Simular exactamente lo que hace updateBrand en brandService.ts:
  // packBrandBrainPayload empaca: name, description, audience, tone, objectives, content_pillars, rules
  const structuredRules = {
    industry: 'Turismo y Viajes',
    subindustry: '',
    market_geo: 'Argentina',
    business_model: 'B2C',
    value_proposition: '',
    pains: [],
    desires: [],
    objections: [],
    differentiators: [],
    personality: '',
    words_to_use: [],
    words_to_avoid: [],
    rules: [
      'No presentarse como una agencia que vende viajes',
      'No inventar testimonios',
      'No inventar experiencias de pasajeros',
      'Priorizar contenido real',
      'No hacer publicidad directa en cada publicación',
      'Mantener una comunicación joven y natural'
    ],
    limits: [],
    legal_restrictions: [],
  };

  const updateBody = {
    workspace_id: travelBrand.workspace_id,
    name: travelBrand.name,
    description: travelBrand.description,
    audience: travelBrand.audience,
    tone: 'Joven, argentino, auténtico, divertido, cercano y emocional cuando corresponda.aaaaa',
    objectives: travelBrand.objectives,
    content_pillars: travelBrand.content_pillars,
    rules: structuredRules,
    updated_at: new Date().toISOString()
  };

  console.log('\nEjecutando PATCH /rest/v1/brands?id=eq.' + travelBrand.id + ' con token de usuario...');
  const { status: patchStatus, data: patchData } = await httpReq(
    `${SUPABASE_URL}/rest/v1/brands?id=eq.${travelBrand.id}`,
    {
      method: 'PATCH',
      headers: { 'Prefer': 'return=representation' }
    },
    updateBody,
    userToken
  );

  console.log('Resultado PATCH con token de usuario: Status =', patchStatus);
  console.log('Datos devueltos:', patchData);
}

testUserUpdateBrand().catch(console.error);
