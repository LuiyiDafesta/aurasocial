const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://eeykrgnwfarrljkotvmw.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVleWtyZ253ZmFycmxqa290dm13Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIwODI2MiwiZXhwIjoyMTAyNzg0MjYyfQ.nICXCrJU42BYMMvdBjPHJRNusxmI8w_bhEDvN27bBiI';

async function verifyMigration() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  console.log('=== 1. VERIFICANDO COLUMNAS EN content_items ===');
  const { data: itemSample, error: itemErr } = await supabase.from('content_items').select('*').limit(1);
  if (itemSample && itemSample.length > 0) {
    const cols = Object.keys(itemSample[0]);
    console.log('Columnas en content_items:', cols);
    console.log('Tiene request_id?:', cols.includes('request_id'));
    console.log('Tiene generation_run_id?:', cols.includes('generation_run_id'));
    console.log('Tiene scenes?:', cols.includes('scenes'));
    console.log('Tiene production_brief?:', cols.includes('production_brief'));
  } else {
    console.log('Error o sin items:', itemErr);
  }

  console.log('\n=== 2. VERIFICANDO TABLA production_outbox ===');
  const { data: outboxSample, error: outboxErr } = await supabase.from('production_outbox').select('*').limit(1);
  if (outboxErr) {
    console.log('❌ Error en production_outbox:', outboxErr.message);
  } else {
    console.log('✅ production_outbox existe y está accesible. Filas:', outboxSample?.length);
  }

  console.log('\n=== 3. PROBANDO RPC create_content_production_request ===');
  // Obtenemos una marca y workspace reales para prueba
  const { data: brand } = await supabase.from('brands').select('id, workspace_id').limit(1).single();
  const testRequestId = 'test_verify_' + Date.now();

  const { data: rpcRes, error: rpcErr } = await supabase.rpc('create_content_production_request', {
    p_request_id: testRequestId,
    p_workspace_id: brand.workspace_id,
    p_brand_id: brand.id,
    p_idea_id: null,
    p_generation_run_id: null,
    p_platform: 'instagram',
    p_content_type: 'reel',
    p_production_brief: { test: true }
  });

  if (rpcErr) {
    console.log('❌ Error probando RPC:', rpcErr);
  } else {
    console.log('✅ RPC create_content_production_request FUNCIONA PERFECTAMENTE:', rpcRes);

    // Limpieza de prueba
    if (rpcRes?.content_item_id) {
      await supabase.from('production_outbox').delete().eq('id', rpcRes.outbox_event_id);
      await supabase.from('content_items').delete().eq('id', rpcRes.content_item_id);
      console.log('🧹 Limpieza de fila de prueba completada.');
    }
  }

  console.log('\n=== 4. PROBANDO RPC claim_production_outbox_events ===');
  const { data: claimRes, error: claimErr } = await supabase.rpc('claim_production_outbox_events', { p_batch_size: 5 });
  if (claimErr) {
    console.log('❌ Error en claim_production_outbox_events:', claimErr.message);
  } else {
    console.log('✅ claim_production_outbox_events FUNCIONA:', claimRes);
  }
}

verifyMigration();
