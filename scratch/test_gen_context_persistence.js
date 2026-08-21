const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const SUPABASE_URL = 'https://eeykrgnwfarrljkotvmw.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVleWtyZ253ZmFycmxqa290dm13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMDgyNjIsImV4cCI6MjEwMjc4NDI2Mn0.WM7sgjhvR003fHUKIy_r3CJ5S8TaIBA_3179hLkxdRk';

async function testGenerationContextPersistence() {
  console.log('=== TEST DE PERSISTENCIA DE generation_context EN generation_runs ===\n');

  const supabase = createClient(SUPABASE_URL, ANON_KEY);

  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'lsnetinformatica2024@gmail.com',
    password: 'Luiyi260879@',
  });

  if (authErr) {
    console.error('Error de autenticación:', authErr);
    return;
  }

  const token = authData.session.access_token;
  const { data: workspaces } = await supabase.from('workspaces').select('id, name').limit(1);
  const { data: brands } = await supabase.from('brands').select('id, name').limit(1);

  const workspace_id = workspaces[0].id;
  const brand_id = brands[0].id;

  const payload = {
    workspace_id,
    brand_id,
    generation_context: {
      topic: 'Tendencias de TikTok para Bariloche 2027',
      keywords: ['Bariloche2027', 'egresados', 'TikTok', 'viajes'],
      objective: 'Detectar ideas de contenido actuales con alto engagement para pasajeros',
      preferred_format: 'tiktok',
      web_research: true,
      ideas_count: 5,
    },
  };

  console.log('Invocando generate-ideas con tema:', payload.generation_context.topic);
  const bodyStr = JSON.stringify(payload);

  const edgeRes = await new Promise((resolve, reject) => {
    const req = https.request(
      `${SUPABASE_URL}/functions/v1/generate-ideas`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
      }
    );
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });

  console.log('Respuesta Edge Function:', edgeRes);
  const runId = edgeRes.body?.run_id;
  if (!runId) return;

  // Poll until completed
  console.log(`Polling corrida ${runId}...`);
  let status = 'pending';
  let attempts = 0;
  while ((status === 'pending' || status === 'running') && attempts < 35) {
    attempts++;
    await new Promise((r) => setTimeout(r, 2000));
    const { data: runData } = await supabase.from('generation_runs').select('*').eq('id', runId).single();
    status = runData?.status;
    console.log(`[Tick ${attempts}] Status: ${status} | Ideas: ${runData?.ideas_created || 0}`);
    if (status === 'completed' || status === 'failed') {
      console.log('\nRegistro final en generation_runs:');
      console.log(`ID: ${runData.id}`);
      console.log(`generation_context guardado en BD:`, JSON.stringify(runData.generation_context, null, 2));
      break;
    }
  }

  // Verificar ideas con generation_run_id
  const { data: ideas } = await supabase
    .from('content_ideas')
    .select('id, title, pillar, format, generation_run_id')
    .eq('generation_run_id', runId);

  console.log(`\nIdeas creadas vinculadas a run ${runId}: ${ideas?.length || 0}`);
  (ideas || []).forEach(i => {
    console.log(`• "${i.title}" | generation_run_id: ${i.generation_run_id} | Pilar: ${i.pillar}`);
  });
}

testGenerationContextPersistence();
