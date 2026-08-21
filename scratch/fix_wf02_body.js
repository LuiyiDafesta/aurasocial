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

async function fixWebhookBodyAccess() {
  console.log('=== ACTUALIZANDO ACCESO A BODY EN WF02 ===\n');

  const prepareContextJs = `
const rawWebhook = $('Webhook Trigger').first().json;
const webhookData = rawWebhook.body || rawWebhook;
const brand = $('Get Brand').first().json;
const idea = $('Get Idea').first().json;

const brief = webhookData.production_brief || {};
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
    content_item_id: webhookData.content_item_id,
    outbox_event_id: webhookData.event_id
  }
}];
`;

  const operations = [
    {
      type: "updateNodeParameters",
      nodeName: "Atomic Claim content_items",
      parameters: {
        method: "PATCH",
        url: "=https://eeykrgnwfarrljkotvmw.supabase.co/rest/v1/content_items?id=eq.{{ ($json.body && $json.body.content_item_id) ? $json.body.content_item_id : $json.content_item_id }}&status=eq.queued",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: "apikey", value: SERVICE_KEY },
            { name: "Authorization", value: `Bearer ${SERVICE_KEY}` },
            { name: "Prefer", value: "return=representation" },
            { name: "Content-Type", value: "application/json" }
          ]
        },
        sendBody: true,
        specifyBody: "json",
        jsonBody: "={\n  \"status\": \"generating\",\n  \"updated_at\": \"{{ new Date().toISOString() }}\"\n}",
        options: {}
      }
    },
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
              keyValue: "={{ $('Webhook Trigger').first().json.body ? $('Webhook Trigger').first().json.body.brand_id : $('Webhook Trigger').first().json.brand_id }}"
            }
          ]
        }
      }
    },
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
              keyValue: "={{ $('Webhook Trigger').first().json.body ? $('Webhook Trigger').first().json.body.idea_id : $('Webhook Trigger').first().json.idea_id }}"
            }
          ]
        }
      }
    },
    {
      type: "updateNodeParameters",
      nodeName: "Prepare Platform Context",
      parameters: {
        jsCode: prepareContextJs
      }
    }
  ];

  const updateRes = await callTool('update_workflow', {
    workflowId: 'QiOnKIx6QxIdzWAG',
    operations: operations,
    versionName: 'Corrección de acceso a body en Webhook Trigger'
  });

  console.log('Update result:', JSON.stringify(updateRes, null, 2));

  const pubRes = await callTool('publish_workflow', { workflowId: 'QiOnKIx6QxIdzWAG' });
  console.log('Publish result:', JSON.stringify(pubRes, null, 2));
}

fixWebhookBodyAccess();
