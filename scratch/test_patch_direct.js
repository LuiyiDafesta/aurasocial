const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const SUPABASE_URL = 'https://eeykrgnwfarrljkotvmw.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVleWtyZ253ZmFycmxqa290dm13Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIwODI2MiwiZXhwIjoyMTAyNzg0MjYyfQ.nICXCrJU42BYMMvdBjPHJRNusxmI8w_bhEDvN27bBiI';

async function testPatchDirect() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // 1. Create queued content
  const { data: idea } = await supabase.from('content_ideas').select('id, brand_id, workspace_id, generation_run_id').limit(1).single();
  const testReqId = 'test_patch_' + Date.now();

  const { data: rpcRes } = await supabase.rpc('create_content_production_request', {
    p_request_id: testReqId,
    p_workspace_id: idea.workspace_id,
    p_brand_id: idea.brand_id,
    p_idea_id: idea.id,
    p_generation_run_id: idea.generation_run_id,
    p_platform: 'instagram',
    p_content_type: 'reel',
    p_production_brief: { target_platform: 'instagram' }
  });

  console.log('Fila creada:', rpcRes);
  const contentId = rpcRes.content_item_id;

  // 2. Perform PATCH directly via https
  const patchBody = JSON.stringify({ status: 'generating', updated_at: new Date().toISOString() });
  const url = new URL(`${SUPABASE_URL}/rest/v1/content_items?id=eq.${contentId}&status=eq.queued`);

  const options = {
    method: 'PATCH',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Prefer': 'return=representation',
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(patchBody)
    }
  };

  const patchRes = await new Promise((resolve) => {
    const req = https.request(url, options, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, data: d }));
    });
    req.write(patchBody);
    req.end();
  });

  console.log('Respuesta de PATCH directo:', patchRes);
}

testPatchDirect();
