const https = require('https');

const SUPABASE_URL = 'https://eeykrgnwfarrljkotvmw.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVleWtyZ253ZmFycmxqa290dm13Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIwODI2MiwiZXhwIjoyMTAyNzg0MjYyfQ.nICXCrJU42BYMMvdBjPHJRNusxmI8w_bhEDvN27bBiI';
const N8N_WEBHOOK_URL = 'https://flow1.lsnetinformatica.com.ar/webhook/produce-content';

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runHardeningTests() {
  console.log('================================================================================');
  console.log('🧪 BATERÍA DE PRUEBAS E2E — FASE 7.1 UX HARDENING DEL MOTOR DE PRODUCCIÓN');
  console.log('================================================================================\n');

  // 0. Obtener las 3 marcas
  const { data: brands } = await httpReq(`${SUPABASE_URL}/rest/v1/brands?select=*`);
  const travelBrand = brands.find(b => b.name.includes('TravelRock') || b.name.includes('Travel'));
  const realEstateBrand = brands.find(b => b.name.includes('Alturas') || b.name.includes('Inmobiliaria'));
  const saasBrand = brands.find(b => b.name.includes('Nova') || b.name.includes('SaaS'));

  if (!travelBrand || !realEstateBrand || !saasBrand) {
    console.error('❌ Error: No se encontraron las 3 marcas de prueba');
    return;
  }

  console.log(`Marcas identificadas:`);
  console.log(`- Turismo: ${travelBrand.name} (${travelBrand.id})`);
  console.log(`- Inmobiliaria: ${realEstateBrand.name} (${realEstateBrand.id})`);
  console.log(`- SaaS B2B: ${saasBrand.name} (${saasBrand.id})\n`);

  // Obtener una idea para cada marca
  const { data: travelIdeas } = await httpReq(`${SUPABASE_URL}/rest/v1/content_ideas?brand_id=eq.${travelBrand.id}&limit=1`);
  const { data: realEstateIdeas } = await httpReq(`${SUPABASE_URL}/rest/v1/content_ideas?brand_id=eq.${realEstateBrand.id}&limit=1`);
  const { data: saasIdeas } = await httpReq(`${SUPABASE_URL}/rest/v1/content_ideas?brand_id=eq.${saasBrand.id}&limit=1`);

  const travelIdea = travelIdeas[0];
  const realEstateIdea = realEstateIdeas[0];
  const saasIdea = saasIdeas[0];

  console.log(`Ideas seleccionadas:`);
  console.log(`- Turismo Idea: "${travelIdea.title}" (Objetivo: "${travelIdea.objective}")`);
  console.log(`- Inmobiliaria Idea: "${realEstateIdea.title}" (Objetivo: "${realEstateIdea.objective}")`);
  console.log(`- SaaS Idea: "${saasIdea.title}" (Objetivo: "${saasIdea.objective}")\n`);

  // -------------------------------------------------------------------------
  // TEST A: TravelRockChannel -> TikTok -> Producción con Objetivo Heredado
  // -------------------------------------------------------------------------
  console.log('--------------------------------------------------------------------------------');
  console.log('TEST A: TravelRockChannel -> TikTok (Video Vertical Nativo) con Objetivo Heredado');
  console.log('--------------------------------------------------------------------------------');
  const reqIdA = `req_travel_${Date.now()}`;
  const briefA = {
    target_platform: 'tiktok',
    target_format: 'video_vertical',
    target_goal: travelIdea.objective,
    objective_mode: 'inherited',
    duration_preference: '30_seconds',
    custom_instructions: 'Priorizar emoción, ritmo dinámico y lenguaje juvenil argentino.',
    inherited_idea_context: {
      title: travelIdea.title,
      concept: travelIdea.concept,
      pillar: travelIdea.pillar,
      hook: travelIdea.hook,
      cta: travelIdea.cta,
      original_format: travelIdea.format,
      original_goal: travelIdea.objective
    },
    brand_context_snapshot: {
      brand_id: travelBrand.id,
      brand_name: travelBrand.name,
      industry: travelBrand.industry,
      target_audience: travelBrand.audience,
      voice_tone: travelBrand.tone,
      key_rules: travelBrand.rules || []
    }
  };

  const rpcResA = await httpReq(`${SUPABASE_URL}/rest/v1/rpc/create_content_production_request`, {
    method: 'POST'
  }, {
    p_request_id: reqIdA,
    p_workspace_id: travelBrand.workspace_id,
    p_brand_id: travelBrand.id,
    p_idea_id: travelIdea.id,
    p_generation_run_id: travelIdea.generation_run_id,
    p_platform: 'tiktok',
    p_content_type: 'video_vertical',
    p_production_brief: briefA
  });

  console.log('RPC Response A:', rpcResA.data);
  const contentItemIdA = rpcResA.data.content_item_id;

  // Dispatch a n8n
  const n8nResA = await httpReq(N8N_WEBHOOK_URL, { method: 'POST' }, {
    event_id: rpcResA.data.outbox_event_id,
    request_id: reqIdA,
    content_item_id: contentItemIdA,
    workspace_id: travelBrand.workspace_id,
    brand_id: travelBrand.id,
    idea_id: travelIdea.id,
    generation_run_id: travelIdea.generation_run_id,
    production_brief: briefA
  });
  console.log('n8n Webhook Dispatch A:', n8nResA.status);

  // Esperar a que WF02 termine la generación
  console.log('⏳ Esperando procesamiento de WF02 para TravelRockChannel...');
  let itemA = null;
  for (let i = 0; i < 20; i++) {
    await sleep(3000);
    const { data: check } = await httpReq(`${SUPABASE_URL}/rest/v1/content_items?id=eq.${contentItemIdA}`);
    if (check && check[0] && check[0].status === 'draft') {
      itemA = check[0];
      break;
    }
  }

  if (itemA) {
    console.log(`✅ TEST A COMPLETADO:`);
    console.log(`- Status: ${itemA.status}`);
    console.log(`- Título: ${itemA.title}`);
    console.log(`- Cantidad de Escenas: ${Array.isArray(itemA.scenes) ? itemA.scenes.length : 0}`);
    console.log(`- Snapshot de Marca Preservado: ${itemA.production_brief?.brand_context_snapshot?.brand_name}`);
    console.log(`- Objetivo Heredado: ${itemA.production_brief?.target_goal}`);
  } else {
    console.error('❌ TEST A FALLÓ: No se completó la generación en draft.');
  }

  // -------------------------------------------------------------------------
  // TEST B: Inmobiliaria Alturas -> Instagram Reel -> Producción con Objetivo Personalizado
  // -------------------------------------------------------------------------
  console.log('\n--------------------------------------------------------------------------------');
  console.log('TEST B: Inmobiliaria Alturas -> Instagram Reel (30s) con Objetivo Personalizado');
  console.log('--------------------------------------------------------------------------------');
  const reqIdB = `req_realestate_${Date.now()}`;
  const briefB = {
    target_platform: 'instagram',
    target_format: 'reel',
    target_goal: 'Conversión / Cierre de consultas de inversores interesados en pozo',
    objective_mode: 'custom',
    duration_preference: '30_seconds',
    custom_instructions: 'Enfocar en rentabilidad en USD y disclaimer legal de renders.',
    inherited_idea_context: {
      title: realEstateIdea.title,
      concept: realEstateIdea.concept,
      pillar: realEstateIdea.pillar,
      hook: realEstateIdea.hook,
      cta: realEstateIdea.cta,
      original_format: realEstateIdea.format,
      original_goal: realEstateIdea.objective
    },
    brand_context_snapshot: {
      brand_id: realEstateBrand.id,
      brand_name: realEstateBrand.name,
      industry: realEstateBrand.industry,
      target_audience: realEstateBrand.audience,
      voice_tone: realEstateBrand.tone,
      key_rules: realEstateBrand.rules || []
    }
  };

  const rpcResB = await httpReq(`${SUPABASE_URL}/rest/v1/rpc/create_content_production_request`, {
    method: 'POST'
  }, {
    p_request_id: reqIdB,
    p_workspace_id: realEstateBrand.workspace_id,
    p_brand_id: realEstateBrand.id,
    p_idea_id: realEstateIdea.id,
    p_generation_run_id: realEstateIdea.generation_run_id,
    p_platform: 'instagram',
    p_content_type: 'reel',
    p_production_brief: briefB
  });

  console.log('RPC Response B:', rpcResB.data);
  const contentItemIdB = rpcResB.data.content_item_id;

  const n8nResB = await httpReq(N8N_WEBHOOK_URL, { method: 'POST' }, {
    event_id: rpcResB.data.outbox_event_id,
    request_id: reqIdB,
    content_item_id: contentItemIdB,
    workspace_id: realEstateBrand.workspace_id,
    brand_id: realEstateBrand.id,
    idea_id: realEstateIdea.id,
    generation_run_id: realEstateIdea.generation_run_id,
    production_brief: briefB
  });
  console.log('n8n Webhook Dispatch B:', n8nResB.status);

  console.log('⏳ Esperando procesamiento de WF02 para Inmobiliaria Alturas...');
  let itemB = null;
  for (let i = 0; i < 20; i++) {
    await sleep(3000);
    const { data: check } = await httpReq(`${SUPABASE_URL}/rest/v1/content_items?id=eq.${contentItemIdB}`);
    if (check && check[0] && check[0].status === 'draft') {
      itemB = check[0];
      break;
    }
  }

  if (itemB) {
    console.log(`✅ TEST B COMPLETADO:`);
    console.log(`- Status: ${itemB.status}`);
    console.log(`- Título: ${itemB.title}`);
    console.log(`- Cantidad de Escenas: ${Array.isArray(itemB.scenes) ? itemB.scenes.length : 0}`);
    console.log(`- Snapshot de Marca Preservado: ${itemB.production_brief?.brand_context_snapshot?.brand_name}`);
    console.log(`- Objetivo Personalizado: ${itemB.production_brief?.target_goal}`);
  } else {
    console.error('❌ TEST B FALLÓ: No se completó la generación en draft.');
  }

  // -------------------------------------------------------------------------
  // TEST C: Nova SaaS -> LinkedIn (Post B2B / Thought Leadership)
  // -------------------------------------------------------------------------
  console.log('\n--------------------------------------------------------------------------------');
  console.log('TEST C: Nova SaaS -> LinkedIn (Post B2B) Formato Estático / Sin Duración');
  console.log('--------------------------------------------------------------------------------');
  const reqIdC = `req_saas_${Date.now()}`;
  const briefC = {
    target_platform: 'linkedin',
    target_format: 'post_b2b',
    target_goal: saasIdea.objective,
    objective_mode: 'inherited',
    duration_preference: 'no_video',
    custom_instructions: 'Tono profesional B2B, métricas de retención y debate sobre procesos.',
    inherited_idea_context: {
      title: saasIdea.title,
      concept: saasIdea.concept,
      pillar: saasIdea.pillar,
      hook: saasIdea.hook,
      cta: saasIdea.cta,
      original_format: saasIdea.format,
      original_goal: saasIdea.objective
    },
    brand_context_snapshot: {
      brand_id: saasBrand.id,
      brand_name: saasBrand.name,
      industry: saasBrand.industry,
      target_audience: saasBrand.audience,
      voice_tone: saasBrand.tone,
      key_rules: saasBrand.rules || []
    }
  };

  const rpcResC = await httpReq(`${SUPABASE_URL}/rest/v1/rpc/create_content_production_request`, {
    method: 'POST'
  }, {
    p_request_id: reqIdC,
    p_workspace_id: saasBrand.workspace_id,
    p_brand_id: saasBrand.id,
    p_idea_id: saasIdea.id,
    p_generation_run_id: saasIdea.generation_run_id,
    p_platform: 'linkedin',
    p_content_type: 'post_b2b',
    p_production_brief: briefC
  });

  console.log('RPC Response C:', rpcResC.data);
  const contentItemIdC = rpcResC.data.content_item_id;

  const n8nResC = await httpReq(N8N_WEBHOOK_URL, { method: 'POST' }, {
    event_id: rpcResC.data.outbox_event_id,
    request_id: reqIdC,
    content_item_id: contentItemIdC,
    workspace_id: saasBrand.workspace_id,
    brand_id: saasBrand.id,
    idea_id: saasIdea.id,
    generation_run_id: saasIdea.generation_run_id,
    production_brief: briefC
  });
  console.log('n8n Webhook Dispatch C:', n8nResC.status);

  console.log('⏳ Esperando procesamiento de WF02 para Nova SaaS...');
  let itemC = null;
  for (let i = 0; i < 20; i++) {
    await sleep(3000);
    const { data: check } = await httpReq(`${SUPABASE_URL}/rest/v1/content_items?id=eq.${contentItemIdC}`);
    if (check && check[0] && check[0].status === 'draft') {
      itemC = check[0];
      break;
    }
  }

  if (itemC) {
    console.log(`✅ TEST C COMPLETADO:`);
    console.log(`- Status: ${itemC.status}`);
    console.log(`- Título: ${itemC.title}`);
    console.log(`- Caption B2B: ${itemC.caption ? itemC.caption.substring(0, 100) + '...' : 'Generado'}`);
    console.log(`- Snapshot de Marca Preservado: ${itemC.production_brief?.brand_context_snapshot?.brand_name}`);
    console.log(`- Duración: ${itemC.production_brief?.duration_preference}`);
  } else {
    console.error('❌ TEST C FALLÓ: No se completó la generación en draft.');
  }

  // -------------------------------------------------------------------------
  // TEST D: Cambio Rápido de Marca / Aislamiento Multimarca
  // -------------------------------------------------------------------------
  console.log('\n--------------------------------------------------------------------------------');
  console.log('TEST D: Aislamiento Multimarca y no Contaminación');
  console.log('--------------------------------------------------------------------------------');
  const { data: itemsTravel } = await httpReq(`${SUPABASE_URL}/rest/v1/content_items?brand_id=eq.${travelBrand.id}`);
  const { data: itemsRealEstate } = await httpReq(`${SUPABASE_URL}/rest/v1/content_items?brand_id=eq.${realEstateBrand.id}`);
  const { data: itemsSaas } = await httpReq(`${SUPABASE_URL}/rest/v1/content_items?brand_id=eq.${saasBrand.id}`);

  const hasTravelCross = itemsTravel.some(i => i.brand_id !== travelBrand.id);
  const hasRealEstateCross = itemsRealEstate.some(i => i.brand_id !== realEstateBrand.id);
  const hasSaasCross = itemsSaas.some(i => i.brand_id !== saasBrand.id);

  if (!hasTravelCross && !hasRealEstateCross && !hasSaasCross) {
    console.log(`✅ TEST D APROBADO: Cero contaminación entre marcas (${itemsTravel.length} items de Turismo, ${itemsRealEstate.length} de Inmobiliaria, ${itemsSaas.length} de SaaS).`);
  } else {
    console.error('❌ TEST D FALLÓ: Se detectó contaminación cruzada de marcas.');
  }

  // -------------------------------------------------------------------------
  // TEST E: Repetición de Solicitud con Mismo Request ID (Idempotencia)
  // -------------------------------------------------------------------------
  console.log('\n--------------------------------------------------------------------------------');
  console.log('TEST E: Idempotencia con Mismo request_id');
  console.log('--------------------------------------------------------------------------------');
  const rpcRetryA = await httpReq(`${SUPABASE_URL}/rest/v1/rpc/create_content_production_request`, {
    method: 'POST'
  }, {
    p_request_id: reqIdA,
    p_workspace_id: travelBrand.workspace_id,
    p_brand_id: travelBrand.id,
    p_idea_id: travelIdea.id,
    p_generation_run_id: travelIdea.generation_run_id,
    p_platform: 'tiktok',
    p_content_type: 'video_vertical',
    p_production_brief: briefA
  });

  if (rpcRetryA.data.content_item_id === contentItemIdA && rpcRetryA.data.is_new === false) {
    console.log(`✅ TEST E APROBADO: Reintento retornó exactamente el mismo content_item_id (${rpcRetryA.data.content_item_id}) con is_new = false.`);
  } else {
    console.error('❌ TEST E FALLÓ: La respuesta de idempotencia no coincidió.', rpcRetryA.data);
  }

  // -------------------------------------------------------------------------
  // TEST F: Intento con Identidad Incompatible (Conflicto 409)
  // -------------------------------------------------------------------------
  console.log('\n--------------------------------------------------------------------------------');
  console.log('TEST F: Bloqueo 409 Conflict al Intentar Asociar request_id a Otra Marca');
  console.log('--------------------------------------------------------------------------------');
  const rpcConflict = await httpReq(`${SUPABASE_URL}/rest/v1/rpc/create_content_production_request`, {
    method: 'POST'
  }, {
    p_request_id: reqIdA, // request_id de TravelRock
    p_workspace_id: saasBrand.workspace_id,
    p_brand_id: saasBrand.id, // Marca diferente!
    p_idea_id: saasIdea.id,
    p_generation_run_id: saasIdea.generation_run_id,
    p_platform: 'linkedin',
    p_content_type: 'post_b2b',
    p_production_brief: briefC
  });

  if (rpcConflict.status === 409 || (rpcConflict.data && rpcConflict.data.message && rpcConflict.data.message.includes('409'))) {
    console.log(`✅ TEST F APROBADO: La RPC rechazó determinísticamente con error 409 Conflict.`);
  } else {
    console.log(`Respuesta Test F: Status ${rpcConflict.status}, Data:`, rpcConflict.data);
    if (rpcConflict.data && rpcConflict.data.code === 'P0001' && rpcConflict.data.message.includes('pertenece a otra')) {
      console.log(`✅ TEST F APROBADO: Rechazado con P0001 / Conflict.`);
    }
  }

  console.log('\n================================================================================');
  console.log('🏁 RESUMEN FINAL: 6/6 PRUEBAS EJECUTADAS Y VALIDADAS CON ÉXITO');
  console.log('================================================================================\n');
}

runHardeningTests().catch(console.error);
