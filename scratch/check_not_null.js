const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://eeykrgnwfarrljkotvmw.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVleWtyZ253ZmFycmxqa290dm13Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIwODI2MiwiZXhwIjoyMTAyNzg0MjYyfQ.nICXCrJU42BYMMvdBjPHJRNusxmI8w_bhEDvN27bBiI';

async function checkColumnsConstraints() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // Let's test inserting a minimal item with idea_id to see what is required
  const { data: idea } = await supabase.from('content_ideas').select('id, brand_id, workspace_id, generation_run_id, title').limit(1).single();

  const { data: rpcRes, error: rpcErr } = await supabase.rpc('create_content_production_request', {
    p_request_id: 'test_with_idea_' + Date.now(),
    p_workspace_id: idea.workspace_id,
    p_brand_id: idea.brand_id,
    p_idea_id: idea.id,
    p_generation_run_id: idea.generation_run_id,
    p_platform: 'instagram',
    p_content_type: 'reel',
    p_production_brief: { target_platform: 'instagram', target_format: 'reel' }
  });

  console.log('Resultado con idea_id real:', rpcRes, 'Error:', rpcErr);

  if (rpcRes?.content_item_id) {
    await supabase.from('production_outbox').delete().eq('id', rpcRes.outbox_event_id);
    await supabase.from('content_items').delete().eq('id', rpcRes.content_item_id);
    console.log('Limpieza completada.');
  }
}

checkColumnsConstraints();
