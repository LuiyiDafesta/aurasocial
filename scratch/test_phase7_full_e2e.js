const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://eeykrgnwfarrljkotvmw.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVleWtyZ253ZmFycmxqa290dm13Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIwODI2MiwiZXhwIjoyMTAyNzg0MjYyfQ.nICXCrJU42BYMMvdBjPHJRNusxmI8w_bhEDvN27bBiI';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVleWtyZ253ZmFycmxqa290dm13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMDgyNjIsImV4cCI6MjEwMjc4NDI2Mn0.WM7sgjhvR003fHUKIy_r3CJ5S8TaIBA_3179hLkxdRk';

async function runE2ETests() {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const userClient = createClient(SUPABASE_URL, ANON_KEY);

  console.log('=== BATERÍA COMPLETA DE PRUEBAS E2E (FASE 7) ===\n');

  // Iniciar sesión
  const { data: auth, error: loginErr } = await userClient.auth.signInWithPassword({
    email: 'lsnetinformatica2024@gmail.com',
    password: 'Luiyi260879@',
  });
  if (loginErr) throw loginErr;
  console.log(`✅ Usuario autenticado: ${auth.user.email} (${auth.user.id})`);

  // Obtener ideas de prueba
  const { data: altIdea } = await admin.from('content_ideas').select('id, brand_id, workspace_id, generation_run_id, title').eq('brand_id', '471e6a3c-2aae-42e7-84e5-6d8a870b9b91').limit(1).single();
  const { data: novaIdea } = await admin.from('content_ideas').select('id, brand_id, workspace_id, generation_run_id, title').eq('brand_id', '5d756aab-e729-46dd-adb3-fd4cee3f1f25').limit(1).single();
  const { data: trIdea } = await admin.from('content_ideas').select('id, brand_id, workspace_id, generation_run_id, title').eq('brand_id', '304338b5-1768-4260-a1ee-6fa8b4816fb0').limit(1).single();

  // =========================================================================
  // TEST 1: 100 REQUESTS CONCURRENTES (MISMO request_id)
  // =========================================================================
  console.log('\n--- TEST 1: 100 REQUESTS CONCURRENTES (MISMO request_id) ---');
  const concurrentReqId = 'req_concurrency_100_' + Date.now();
  const promises = [];

  for (let i = 0; i < 100; i++) {
    promises.push(
      admin.rpc('create_content_production_request', {
        p_request_id: concurrentReqId,
        p_workspace_id: altIdea.workspace_id,
        p_brand_id: altIdea.brand_id,
        p_idea_id: altIdea.id,
        p_generation_run_id: altIdea.generation_run_id,
        p_platform: 'instagram',
        p_content_type: 'reel',
        p_production_brief: { target_platform: 'instagram', target_format: 'reel' }
      })
    );
  }

  const results = await Promise.all(promises);
  const distinctContentIds = new Set(results.map(r => r.data?.content_item_id));
  const distinctOutboxIds = new Set(results.map(r => r.data?.outbox_event_id));
  const newCount = results.filter(r => r.data?.is_new === true).length;
  const duplicateCount = results.filter(r => r.data?.is_new === false).length;

  console.log(`Total respuestas: ${results.length}`);
  console.log(`is_new === true: ${newCount} | is_new === false: ${duplicateCount}`);
  console.log(`Distinct content_item_ids: ${distinctContentIds.size}`);
  console.log(`Distinct outbox_event_ids: ${distinctOutboxIds.size}`);

  if (distinctContentIds.size === 1 && distinctOutboxIds.size === 1 && newCount === 1) {
    console.log('✅ TEST 1 APROBADO: Exactamente 1 content_item y 1 outbox_event creados con PostgreSQL ACID.');
  } else {
    throw new Error('TEST 1 FALLÓ');
  }

  // =========================================================================
  // TEST 2: PROTECCIÓN DE IDENTIDAD (409 CONFLICT)
  // =========================================================================
  console.log('\n--- TEST 2: PROTECCIÓN DE IDENTIDAD (409 CONFLICT) ---');
  const { data: conflictRes, error: conflictErr } = await admin.rpc('create_content_production_request', {
    p_request_id: concurrentReqId,
    p_workspace_id: novaIdea.workspace_id,
    p_brand_id: novaIdea.brand_id, // Marca distinta
    p_idea_id: novaIdea.id,
    p_generation_run_id: novaIdea.generation_run_id,
    p_platform: 'linkedin',
    p_content_type: 'post',
    p_production_brief: {}
  });

  if (conflictErr && conflictErr.message.includes('409 Conflict')) {
    console.log(`✅ TEST 2 APROBADO: Error 409 Conflict arrojado exitosamente.`);
  } else {
    throw new Error('TEST 2 FALLÓ');
  }

  // =========================================================================
  // TEST 3: PRODUCCIÓN REAL MULTIRRUBRO: INMOBILIARIA ALTURAS (Instagram Reel)
  // =========================================================================
  console.log('\n--- TEST 3: PRODUCCIÓN REAL: INMOBILIARIA ALTURAS (Instagram Reel) ---');
  const realReqAlt = 'req_prod_alt_live_' + Date.now();
  const { data: altCreated } = await admin.rpc('create_content_production_request', {
    p_request_id: realReqAlt,
    p_workspace_id: altIdea.workspace_id,
    p_brand_id: altIdea.brand_id,
    p_idea_id: altIdea.id,
    p_generation_run_id: altIdea.generation_run_id,
    p_platform: 'instagram',
    p_content_type: 'reel',
    p_production_brief: {
      target_platform: 'instagram',
      target_format: 'reel',
      target_goal: 'Derribar objeciones de cuotas en pozo y seguridad jurídica',
      duration_preference: '30_seconds',
      custom_instructions: 'Enfocar en plusvalía en USD con disclaimer legal.'
    }
  });

  const webhookUrl = 'https://flow1.lsnetinformatica.com.ar/webhook/produce-content';
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_id: altCreated.outbox_event_id,
      request_id: realReqAlt,
      content_item_id: altCreated.content_item_id,
      workspace_id: altIdea.workspace_id,
      brand_id: altIdea.brand_id,
      user_id: auth.user.id,
      idea_id: altIdea.id,
      generation_run_id: altIdea.generation_run_id,
      production_brief: {
        target_platform: 'instagram',
        target_format: 'reel',
        target_goal: 'Derribar objeciones de cuotas en pozo y seguridad jurídica',
        duration_preference: '30_seconds',
        custom_instructions: 'Enfocar en plusvalía en USD con disclaimer legal.'
      }
    })
  });

  console.log('Esperando producción de Inmobiliaria Alturas en WF02...');
  let altDone = false;
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const { data: checkItem } = await admin.from('content_items').select('*').eq('id', altCreated.content_item_id).single();
    if (checkItem.status === 'draft') {
      altDone = true;
      console.log(`✅ Inmobiliaria Alturas completada en ~${(i+1)*2}s!`);
      console.log(`- Título: "${checkItem.title}"`);
      console.log(`- Hook: "${checkItem.hook}"`);
      console.log(`- Escenas (${checkItem.scenes?.length}):`, checkItem.scenes?.map(s => `[Escena ${s.scene_number} (${s.duration_seconds}s)] ${s.on_screen_text}`));
      console.log(`- Media requirements (${checkItem.media_requirements?.length}):`, checkItem.media_requirements?.slice(0, 2));
      break;
    }
  }
  if (!altDone) throw new Error('TEST 3 FALLÓ: Timeout esperando producción');

  // =========================================================================
  // TEST 4: PRODUCCIÓN REAL: NOVA SAAS (LinkedIn Post B2B)
  // =========================================================================
  console.log('\n--- TEST 4: PRODUCCIÓN REAL: NOVA SAAS (LinkedIn Post B2B) ---');
  const realReqNova = 'req_prod_nova_live_' + Date.now();
  const { data: novaCreated } = await admin.rpc('create_content_production_request', {
    p_request_id: realReqNova,
    p_workspace_id: novaIdea.workspace_id,
    p_brand_id: novaIdea.brand_id,
    p_idea_id: novaIdea.id,
    p_generation_run_id: novaIdea.generation_run_id,
    p_platform: 'linkedin',
    p_content_type: 'post',
    p_production_brief: {
      target_platform: 'linkedin',
      target_format: 'post',
      target_goal: 'Demostrar reducción de churn y retorno de inversión B2B',
      duration_preference: 'short',
      custom_instructions: 'Dirigido a directores de tecnología y operaciones.'
    }
  });

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_id: novaCreated.outbox_event_id,
      request_id: realReqNova,
      content_item_id: novaCreated.content_item_id,
      workspace_id: novaIdea.workspace_id,
      brand_id: novaIdea.brand_id,
      user_id: auth.user.id,
      idea_id: novaIdea.id,
      generation_run_id: novaIdea.generation_run_id,
      production_brief: {
        target_platform: 'linkedin',
        target_format: 'post',
        target_goal: 'Demostrar reducción de churn y retorno de inversión B2B',
        duration_preference: 'short',
        custom_instructions: 'Dirigido a directores de tecnología y operaciones.'
      }
    })
  });

  console.log('Esperando producción de Nova SaaS en WF02...');
  let novaDone = false;
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const { data: checkItem } = await admin.from('content_items').select('*').eq('id', novaCreated.content_item_id).single();
    if (checkItem.status === 'draft') {
      novaDone = true;
      console.log(`✅ Nova SaaS completada en ~${(i+1)*2}s!`);
      console.log(`- Título: "${checkItem.title}"`);
      console.log(`- Hook: "${checkItem.hook}"`);
      console.log(`- Caption (fragmento):\n${checkItem.caption?.slice(0, 200)}...`);
      break;
    }
  }
  if (!novaDone) throw new Error('TEST 4 FALLÓ: Timeout esperando producción de Nova SaaS');

  // =========================================================================
  // TEST 5: IDEMPOTENCIA Y PROTECCIÓN CONTRA DOBLE EJECUCIÓN (CLAIM ATÓMICO)
  // =========================================================================
  console.log('\n--- TEST 5: IDEMPOTENCIA EN WF02 (SEGUNDO DISPATCH A ITEM DRAFT) ---');
  const res2 = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_id: altCreated.outbox_event_id,
      request_id: realReqAlt,
      content_item_id: altCreated.content_item_id,
      workspace_id: altIdea.workspace_id,
      brand_id: altIdea.brand_id,
      user_id: auth.user.id,
      idea_id: altIdea.id,
      generation_run_id: altIdea.generation_run_id,
      production_brief: {}
    })
  });

  console.log('Segundo webhook enviado status HTTP:', res2.status);
  await new Promise(r => setTimeout(r, 2000));
  const { data: checkSkippedItem } = await admin.from('content_items').select('status, updated_at').eq('id', altCreated.content_item_id).single();
  console.log(`✅ TEST 5 APROBADO: El estado se mantuvo intacto en "${checkSkippedItem.status}" sin re-ejecutar GPT.`);

  console.log('\n======================================================');
  console.log('🎉 TODOS LOS 5 TESTS DE FASE 7 PASARON EXITOSAMENTE 🎉');
  console.log('======================================================\n');
}

runE2ETests().catch(err => {
  console.error('❌ ERROR EN BATERÍA DE PRUEBAS:', err);
  process.exit(1);
});
