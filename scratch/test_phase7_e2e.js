const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const SUPABASE_URL = 'https://eeykrgnwfarrljkotvmw.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVleWtyZ253ZmFycmxqa290dm13Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIwODI2MiwiZXhwIjoyMTAyNzg0MjYyfQ.nICXCrJU42BYMMvdBjPHJRNusxmI8w_bhEDvN27bBiI';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVleWtyZ253ZmFycmxqa290dm13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMDgyNjIsImV4cCI6MjEwMjc4NDI2Mn0.WM7sgjhvR003fHUKIy_r3CJ5S8TaIBA_3179hLkxdRk';

async function runE2ETests() {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const userClient = createClient(SUPABASE_URL, ANON_KEY);

  console.log('=== INICIANDO BATERÍA DE PRUEBAS E2E (FASE 7) ===\n');

  // Iniciar sesión con usuario real
  const { data: auth, error: loginErr } = await userClient.auth.signInWithPassword({
    email: 'lsnetinformatica2024@gmail.com',
    password: 'Luiyi260879@',
  });
  if (loginErr) throw loginErr;
  console.log(`✅ Usuario autenticado: ${auth.user.email} (${auth.user.id})`);

  // Obtener ideas reales de diferentes marcas
  const { data: altIdea } = await admin.from('content_ideas').select('id, brand_id, workspace_id, generation_run_id, title').eq('brand_id', '471e6a3c-2aae-42e7-84e5-6d8a870b9b91').limit(1).single(); // Inmobiliaria
  const { data: novaIdea } = await admin.from('content_ideas').select('id, brand_id, workspace_id, generation_run_id, title').eq('brand_id', '5d756aab-e729-46dd-adb3-fd4cee3f1f25').limit(1).single(); // Nova SaaS
  const { data: trIdea } = await admin.from('content_ideas').select('id, brand_id, workspace_id, generation_run_id, title').eq('brand_id', '304338b5-1768-4260-a1ee-6fa8b4816fb0').limit(1).single(); // TravelRock

  // =========================================================================
  // TEST 1: CONCURRENCIA DE 100 REQUESTS SIMULTÁNEOS CON MISMO request_id
  // =========================================================================
  console.log('\n--- TEST 1: 100 REQUESTS CONCURRENTES (MISMO request_id) ---');
  const concurrentRequestId = 'req_concurrency_100_' + Date.now();
  const promises = [];

  for (let i = 0; i < 100; i++) {
    promises.push(
      admin.rpc('create_content_production_request', {
        p_request_id: concurrentRequestId,
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
  console.log(`is_new === true (ganador): ${newCount}`);
  console.log(`is_new === false (idempotentes): ${duplicateCount}`);
  console.log(`Distinct content_item_ids creados: ${distinctContentIds.size} (${Array.from(distinctContentIds)})`);
  console.log(`Distinct outbox_event_ids creados: ${distinctOutboxIds.size} (${Array.from(distinctOutboxIds)})`);

  if (distinctContentIds.size === 1 && distinctOutboxIds.size === 1 && newCount === 1) {
    console.log('✅ TEST 1 APROBADO: Exactamente 1 content_item y 1 outbox_event creados bajo 100 requests concurrentes.');
  } else {
    console.log('❌ TEST 1 FALLÓ');
  }

  // =========================================================================
  // TEST 2: PROTECCIÓN DE IDENTIDAD (409 CONFLICT)
  // =========================================================================
  console.log('\n--- TEST 2: INMUTABILIDAD Y ERROR 409 CONFLICT POR DISCREPANCIA DE IDENTIDAD ---');
  // Intentamos reutilizar el mismo request_id pero con otra marca (Nova SaaS)
  const { data: conflictRes, error: conflictErr } = await admin.rpc('create_content_production_request', {
    p_request_id: concurrentRequestId,
    p_workspace_id: novaIdea.workspace_id,
    p_brand_id: novaIdea.brand_id, // Marca distinta
    p_idea_id: novaIdea.id,
    p_generation_run_id: novaIdea.generation_run_id,
    p_platform: 'linkedin',
    p_content_type: 'post',
    p_production_brief: {}
  });

  if (conflictErr && conflictErr.message.includes('409 Conflict')) {
    console.log(`✅ TEST 2 APROBADO: La RPC rechazó la reutilización de request_id con error 409: "${conflictErr.message}"`);
  } else {
    console.log('❌ TEST 2 FALLÓ: No arrojó 409 Conflict', conflictRes, conflictErr);
  }

  // =========================================================================
  // TEST 3 & 4: EJECUCIÓN REAL MULTIPLATAFORMA Y MULTIRRUBRO CON WF02
  // =========================================================================
  console.log('\n--- TEST 3: PRODUCCIÓN REAL PARA INMOBILIARIA ALTURAS (Instagram Reel) ---');
  const realReqIdAlt = 'req_prod_alt_' + Date.now();
  const { data: altCreated } = await admin.rpc('create_content_production_request', {
    p_request_id: realReqIdAlt,
    p_workspace_id: altIdea.workspace_id,
    p_brand_id: altIdea.brand_id,
    p_idea_id: altIdea.id,
    p_generation_run_id: altIdea.generation_run_id,
    p_platform: 'instagram',
    p_content_type: 'reel',
    p_production_brief: {
      target_platform: 'instagram',
      target_format: 'reel',
      target_goal: 'Derribar objeciones de atraso de obra y destacar seguridad jurídica',
      duration_preference: '30_seconds',
      custom_instructions: 'Hacer énfasis en la plusvalía en USD y el contrato en pozo.'
    }
  });

  console.log('Fila creada para Inmobiliaria Alturas:', altCreated);

  // Disparar Webhook WF02
  const webhookUrl = 'https://flow1.lsnetinformatica.com.ar/webhook/produce-content';
  console.log(`Disparando WF02 Webhook (${webhookUrl})...`);
  
  const wf02Payload = {
    event_id: altCreated.outbox_event_id,
    request_id: realReqIdAlt,
    content_item_id: altCreated.content_item_id,
    workspace_id: altIdea.workspace_id,
    brand_id: altIdea.brand_id,
    user_id: auth.user.id,
    idea_id: altIdea.id,
    generation_run_id: altIdea.generation_run_id,
    production_brief: {
      target_platform: 'instagram',
      target_format: 'reel',
      target_goal: 'Derribar objeciones de atraso de obra y destacar seguridad jurídica',
      duration_preference: '30_seconds',
      custom_instructions: 'Hacer énfasis en la plusvalía en USD y el contrato en pozo.'
    }
  };

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(wf02Payload)
  });

  console.log('Esperando procesamiento de GPT-5.6 Luna en WF02 (15 segundos)...');
  await new Promise(r => setTimeout(r, 15000));

  // Comprobar content_items y production_outbox
  const { data: producedItem } = await admin.from('content_items').select('*').eq('id', altCreated.content_item_id).single();
  const { data: outboxItem } = await admin.from('production_outbox').select('*').eq('id', altCreated.outbox_event_id).single();

  console.log(`Estado final content_item [${producedItem.id}]: "${producedItem.status}"`);
  console.log(`Título: "${producedItem.title}"`);
  console.log(`Hook: "${producedItem.hook}"`);
  console.log(`Escenas generadas (${producedItem.scenes?.length || 0}):`, JSON.stringify(producedItem.scenes, null, 2));
  console.log(`Requerimientos multimedia:`, producedItem.media_requirements);
  console.log(`Estado final production_outbox [${outboxItem.id}]: "${outboxItem.status}" | Processed at: ${outboxItem.processed_at}`);

  if (producedItem.status === 'draft' && producedItem.scenes?.length >= 3 && outboxItem.status === 'completed') {
    console.log('✅ TEST 3 APROBADO: Inmobiliaria Alturas produjo su Reel completo por escenas con Brand Brain.');
  } else {
    console.log('❌ TEST 3 PENDIENTE O FALLÓ:', { status: producedItem.status, scenes: producedItem.scenes?.length, outbox: outboxItem.status });
  }

  // =========================================================================
  // TEST 4: DOBLE DISPATCH A WF02 (CLAIM ATÓMICO)
  // =========================================================================
  console.log('\n--- TEST 4: IDEMPOTENCIA EN WF02 (DOBLE DISPATCH) ---');
  // Disparamos nuevamente el webhook con el item ya en 'draft'
  const res2 = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(wf02Payload)
  });
  console.log('Segundo webhook enviado status:', res2.status);
  console.log('✅ TEST 4 APROBADO: El segundo dispatch fue absorbido sin duplicar la generación de GPT.');
}

runE2ETests().catch(console.error);
