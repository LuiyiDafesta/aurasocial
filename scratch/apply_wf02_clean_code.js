const https = require('https');

const MCP_URL = 'https://flow1.lsnetinformatica.com.ar/mcp-server/http';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2YzgwNGE1Ny00M2FkLTQ5MDctODUyYy05ZjNjYmMwZGU0ZDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJtY3Atc2VydmVyLWFwaSIsImp0aSI6IjQ3Y2E3YTEzLWYxYWUtNDAwNC05OGEyLTc5MmQ5NDVlZjhjMSIsImlhdCI6MTc4NzI1OTU2NX0.mLCya_6NsysfYHjT_JElnnviCIs06WuR00qk7SeWGlg';

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVleWtyZ253ZmFycmxqa290dm13Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIwODI2MiwiZXhwIjoyMTAyNzg0MjYyfQ.nICXCrJU42BYMMvdBjPHJRNusxmI8w_bhEDvN27bBiI';

async function callTool(toolName, args = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(MCP_URL);
    const body = JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: { name: toolName, arguments: args },
    });

    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const lines = data.split('\n');
        let parsedResult = null;
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try { parsedResult = JSON.parse(line.slice(6)); } catch (e) {}
          }
        }
        resolve(parsedResult || data);
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function updateWf02CleanCode() {
  console.log('=== ACTUALIZANDO WF02 CON NODOS ROBUSTOS DE CÓDIGO ===\n');

  const claimJs = `
const webhook = $('Webhook Trigger').first().json;
const body = webhook.body || webhook;
const contentItemId = body.content_item_id;

const patchRes = await fetch('https://eeykrgnwfarrljkotvmw.supabase.co/rest/v1/content_items?id=eq.' + contentItemId + '&status=eq.queued', {
  method: 'PATCH',
  headers: {
    'apikey': '${SERVICE_KEY}',
    'Authorization': 'Bearer ${SERVICE_KEY}',
    'Prefer': 'return=representation',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    status: 'generating',
    updated_at: new Date().toISOString()
  })
});

const rows = await patchRes.json();
const isWinner = Array.isArray(rows) && rows.length > 0;

return [{
  json: {
    is_claim_winner: isWinner,
    content_item_id: contentItemId,
    outbox_event_id: body.event_id,
    brand_id: body.brand_id,
    idea_id: body.idea_id,
    workspace_id: body.workspace_id,
    user_id: body.user_id,
    production_brief: body.production_brief
  }
}];
`;

  const prepareContextJs = `
const claimData = $('Atomic Claim content_items').first().json;
const brand = $('Get Brand').first().json;
const idea = $('Get Idea').first().json;

const brief = claimData.production_brief || {};
const platform = (brief.target_platform || 'instagram').toLowerCase();
const format = (brief.target_format || 'reel').toLowerCase();
const goal = brief.target_goal || 'Generar engagement y conversión';
const duration = brief.duration_preference || '30_seconds';
const customInstructions = brief.custom_instructions || '';

// Parsear Brand Brain
let brainRules = {};
if (typeof brand.rules === 'object' && brand.rules !== null) {
  brainRules = brand.rules;
}

const industry = brainRules.industry || 'General';
const subindustry = brainRules.subindustry || '';
const valueProp = brainRules.value_proposition || brand.description || '';
const audience = brand.audience || '';
const tone = brand.tone || '';
const personality = brainRules.personality || '';

const pains = Array.isArray(brainRules.pains) ? brainRules.pains.join(', ') : 'No especificados';
const desires = Array.isArray(brainRules.desires) ? brainRules.desires.join(', ') : 'No especificados';
const objections = Array.isArray(brainRules.objections) ? brainRules.objections.join(', ') : 'No especificadas';
const differentiators = Array.isArray(brainRules.differentiators) ? brainRules.differentiators.join(', ') : 'No especificados';
const wordsToUse = Array.isArray(brainRules.words_to_use) ? brainRules.words_to_use.join(', ') : '';
const wordsToAvoid = Array.isArray(brainRules.words_to_avoid) ? brainRules.words_to_avoid.join(', ') : '';
const editorialRules = Array.isArray(brainRules.rules) ? brainRules.rules.join('; ') : (Array.isArray(brand.rules) ? brand.rules.join('; ') : '');
const limits = Array.isArray(brainRules.limits) ? brainRules.limits.join('; ') : '';
const legalRestrictions = Array.isArray(brainRules.legal_restrictions) ? brainRules.legal_restrictions.join('; ') : '';

// Directivas nativas por plataforma
let platformDirectives = '';
if (platform === 'tiktok') {
  platformDirectives = \`
- PLATAFORMA: TikTok
- Hook verbal y visual en los primeros 1.5 segundos.
- Ritmo de cortes rápido (2-4 segundos por escena).
- Lenguaje espontáneo, nativo, cercano y conversacional.
- Textos grandes en pantalla con palabras de impacto.
- Caption breve y enfocado, con 3 a 5 hashtags relevantes.\`;
} else if (platform === 'instagram') {
  platformDirectives = \`
- PLATAFORMA: Instagram (\${format.toUpperCase()})
- Estética cuidada, iluminación profesional y composición balanceada.
- Hook visual contundente con zoom o movimiento inicial.
- Estructura narrativa clara: Hook -> Desarrollo de valor -> Resolución / CTA.
- Caption desarrollado y formateado para lectura fácil con emojis sobrios.
- CTA directo a comentarios o mensaje privado.\`;
} else if (platform === 'linkedin') {
  platformDirectives = \`
- PLATAFORMA: LinkedIn (\${format.toUpperCase()})
- Tono profesional, estratégico, orientado a negocios y ROI.
- Planteo de un problema o ineficiencia real de la industria y la solución estructural.
- Estructura argumentativa con lecciones, datos o frameworks accionables.
- CTA enfocado a debate profesional, feedback de pares o solicitud de demo.\`;
} else if (platform === 'youtube') {
  platformDirectives = \`
- PLATAFORMA: YouTube Shorts
- Retención acelerada desde el fotograma 1.
- Guion con progresión constante sin baches de silencio.
- Cierre con llamado a suscripción o visita al canal.\`;
} else {
  platformDirectives = \`
- PLATAFORMA: \${platform} (\${format})
- Adaptación nativa al formato seleccionado con hook potente y CTA claro.\`;
}

return [{
  json: {
    brand_name: brand.name,
    industry,
    subindustry,
    value_proposition: valueProp,
    audience,
    tone,
    personality,
    pains,
    desires,
    objections,
    differentiators,
    words_to_use: wordsToUse,
    words_to_avoid: wordsToAvoid,
    editorial_rules: editorialRules,
    limits,
    legal_restrictions: legalRestrictions,
    idea_title: idea.title,
    idea_concept: idea.concept,
    idea_hook: idea.hook,
    idea_cta: idea.cta,
    idea_pillar: idea.pillar,
    platform,
    format,
    goal,
    duration,
    custom_instructions: customInstructions,
    platform_directives: platformDirectives,
    content_item_id: claimData.content_item_id,
    outbox_event_id: claimData.outbox_event_id
  }
}];
`;

  const saveContentJs = `
const promptContext = $('Prepare Multiplatform Prompt').first().json;
const llmOutput = $('Basic LLM Chain').first().json;

// 1. Guardar en content_items
const res1 = await fetch('https://eeykrgnwfarrljkotvmw.supabase.co/rest/v1/content_items?id=eq.' + promptContext.content_item_id, {
  method: 'PATCH',
  headers: {
    'apikey': '${SERVICE_KEY}',
    'Authorization': 'Bearer ${SERVICE_KEY}',
    'Prefer': 'return=representation',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: llmOutput.title,
    platform: llmOutput.platform,
    content_type: llmOutput.content_type,
    hook: llmOutput.hook_verbal,
    script: llmOutput.script,
    caption: llmOutput.caption,
    hashtags: llmOutput.hashtags,
    cta: llmOutput.cta,
    creative_direction: llmOutput.creative_direction,
    media_requirements: llmOutput.media_requirements,
    scenes: llmOutput.scenes,
    status: 'draft',
    updated_at: new Date().toISOString()
  })
});

// 2. Marcar production_outbox como completed
const res2 = await fetch('https://eeykrgnwfarrljkotvmw.supabase.co/rest/v1/production_outbox?id=eq.' + promptContext.outbox_event_id, {
  method: 'PATCH',
  headers: {
    'apikey': '${SERVICE_KEY}',
    'Authorization': 'Bearer ${SERVICE_KEY}',
    'Prefer': 'return=representation',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    status: 'completed',
    processed_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })
});

return [{
  json: {
    success: true,
    content_item_id: promptContext.content_item_id,
    outbox_event_id: promptContext.outbox_event_id,
    title: llmOutput.title,
    status: 'draft'
  }
}];
`;

  const skippedJs = `
const claimData = $('Atomic Claim content_items').first().json;

await fetch('https://eeykrgnwfarrljkotvmw.supabase.co/rest/v1/production_outbox?id=eq.' + claimData.outbox_event_id, {
  method: 'PATCH',
  headers: {
    'apikey': '${SERVICE_KEY}',
    'Authorization': 'Bearer ${SERVICE_KEY}',
    'Prefer': 'return=representation',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    status: 'completed',
    processed_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })
});

return [{ json: { success: true, skipped: true, content_item_id: claimData.content_item_id } }];
`;

  const operations = [
    // 1. Cambiar Atomic Claim a nodo Code
    {
      type: "updateNode",
      nodeName: "Atomic Claim content_items",
      node: {
        id: "atomic-claim-node",
        name: "Atomic Claim content_items",
        type: "n8n-nodes-base.code",
        typeVersion: 2,
        position: [-160, 200],
        parameters: { jsCode: claimJs }
      }
    },
    // 2. Is Claim Winner
    {
      type: "updateNodeParameters",
      nodeName: "Is Claim Winner?",
      parameters: {
        conditions: {
          options: {
            caseSensitive: true,
            leftValue: "",
            typeValidation: "strict",
            version: 2
          },
          conditions: [
            {
              id: "claim-winner-check",
              leftValue: "={{ $json.is_claim_winner }}",
              rightValue: true,
              operator: {
                type: "boolean",
                operation: "equals"
              }
            }
          ],
          combinator: "and"
        },
        options: {}
      }
    },
    // 3. Get Brand
    {
      type: "updateNodeParameters",
      nodeName: "Get Brand",
      parameters: {
        operation: "get",
        tableId: "brands",
        filters: {
          conditions: [
            {
              keyName: "id",
              keyValue: "={{ $('Atomic Claim content_items').first().json.brand_id }}"
            }
          ]
        }
      }
    },
    // 4. Get Idea
    {
      type: "updateNodeParameters",
      nodeName: "Get Idea",
      parameters: {
        operation: "get",
        tableId: "content_ideas",
        filters: {
          conditions: [
            {
              keyName: "id",
              keyValue: "={{ $('Atomic Claim content_items').first().json.idea_id }}"
            }
          ]
        }
      }
    },
    // 5. Prepare Platform Context
    {
      type: "updateNodeParameters",
      nodeName: "Prepare Platform Context",
      parameters: { jsCode: prepareContextJs }
    },
    // 6. Save Generated Content (reemplaza Update Content Item Draft)
    {
      type: "updateNode",
      nodeName: "Update Content Item Draft",
      node: {
        id: "update-content-item-node",
        name: "Save Generated Content",
        type: "n8n-nodes-base.code",
        typeVersion: 2,
        position: [1360, 100],
        parameters: { jsCode: saveContentJs }
      }
    },
    // 7. Update Outbox Skipped
    {
      type: "updateNode",
      nodeName: "Update Outbox Skipped",
      node: {
        id: "update-outbox-skipped-node",
        name: "Update Outbox Skipped",
        type: "n8n-nodes-base.code",
        typeVersion: 2,
        position: [340, 360],
        parameters: { jsCode: skippedJs }
      }
    },
    // 8. Conexiones
    {
      type: "addConnection",
      source: "Webhook Trigger",
      target: "Atomic Claim content_items"
    },
    {
      type: "addConnection",
      source: "Atomic Claim content_items",
      target: "Is Claim Winner?"
    },
    {
      type: "addConnection",
      source: "Is Claim Winner?",
      target: "Get Brand",
      sourceOutputIndex: 0,
      targetInputIndex: 0
    },
    {
      type: "addConnection",
      source: "Is Claim Winner?",
      target: "Update Outbox Skipped",
      sourceOutputIndex: 1,
      targetInputIndex: 0
    },
    {
      type: "addConnection",
      source: "Get Brand",
      target: "Get Idea"
    },
    {
      type: "addConnection",
      source: "Get Idea",
      target: "Prepare Platform Context"
    },
    {
      type: "addConnection",
      source: "Prepare Platform Context",
      target: "Basic LLM Chain"
    },
    {
      type: "addConnection",
      source: "Basic LLM Chain",
      target: "Save Generated Content"
    }
  ];

  const updateRes = await callTool('update_workflow', {
    workflowId: 'QiOnKIx6QxIdzWAG',
    operations: operations,
    versionName: 'Nodos de código nativo ultra-robustos para Claim y Persistencia'
  });

  console.log('Update result:', JSON.stringify(updateRes, null, 2));

  const pubRes = await callTool('publish_workflow', { workflowId: 'QiOnKIx6QxIdzWAG' });
  console.log('Publish result:', JSON.stringify(pubRes, null, 2));
}

updateWf02CleanCode();
