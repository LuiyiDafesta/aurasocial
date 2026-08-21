const https = require('https');

const MCP_URL = 'https://flow1.lsnetinformatica.com.ar/mcp-server/http';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2YzgwNGE1Ny00M2FkLTQ5MDctODUyYy05ZjNjYmMwZGU0ZDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJtY3Atc2VydmVyLWFwaSIsImp0aSI6IjQ3Y2E3YTEzLWYxYWUtNDAwNC05OGEyLTc5MmQ5NDVlZjhjMSIsImlhdCI6MTc4NzI1OTU2NX0.mLCya_6NsysfYHjT_JElnnviCIs06WuR00qk7SeWGlg';

async function callMcpTool(toolName, args = {}) {
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

const wf02Definition = {
  name: "SOCIAL AI — Content Production (WF02)",
  nodes: [
    {
      parameters: {
        httpMethod: "POST",
        path: "produce-content",
        responseMode: "onReceived",
        options: {}
      },
      type: "n8n-nodes-base.webhook",
      typeVersion: 2,
      position: [-400, 200],
      id: "webhook-trigger-node",
      name: "Webhook Trigger"
    },
    {
      parameters: {
        method: "PATCH",
        url: "=https://eeykrgnwfarrljkotvmw.supabase.co/rest/v1/content_items?id=eq.{{ $json.content_item_id }}&status=eq.queued",
        authentication: "predefinedCredentialType",
        nodeCredentialType: "supabaseApi",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            {
              name: "Prefer",
              value: "return=representation"
            },
            {
              name: "Content-Type",
              value: "application/json"
            }
          ]
        },
        sendBody: true,
        specifyBody: "json",
        jsonBody: "={\n  \"status\": \"generating\",\n  \"updated_at\": \"{{ new Date().toISOString() }}\"\n}",
        options: {}
      },
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [-160, 200],
      id: "atomic-claim-node",
      name: "Atomic Claim content_items",
      credentials: {
        supabaseApi: {
          id: "IyzRTFFbSyGBXpPf",
          name: "Supabase Lsnethub social IA"
        }
      }
    },
    {
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
              id: "claim-check",
              leftValue: "={{ Array.isArray($json) ? $json.length : ($json.id ? 1 : 0) }}",
              rightValue: 1,
              operator: {
                type: "number",
                operation: "gte"
              }
            }
          ],
          combinator: "and"
        },
        options: {}
      },
      type: "n8n-nodes-base.if",
      typeVersion: 2.2,
      position: [100, 200],
      id: "if-claim-winner",
      name: "Is Claim Winner?"
    },
    {
      parameters: {
        operation: "get",
        tableId: "brands",
        filters: {
          conditions: [
            {
              keyName: "id",
              keyValue: "={{ $('Webhook Trigger').first().json.brand_id }}"
            }
          ]
        }
      },
      type: "n8n-nodes-base.supabase",
      typeVersion: 1,
      position: [340, 100],
      id: "get-brand-node",
      name: "Get Brand",
      credentials: {
        supabaseApi: {
          id: "IyzRTFFbSyGBXpPf",
          name: "Supabase Lsnethub social IA"
        }
      }
    },
    {
      parameters: {
        operation: "get",
        tableId: "content_ideas",
        filters: {
          conditions: [
            {
              keyName: "id",
              keyValue: "={{ $('Webhook Trigger').first().json.idea_id }}"
            }
          ]
        }
      },
      type: "n8n-nodes-base.supabase",
      typeVersion: 1,
      position: [560, 100],
      id: "get-idea-node",
      name: "Get Idea",
      credentials: {
        supabaseApi: {
          id: "IyzRTFFbSyGBXpPf",
          name: "Supabase Lsnethub social IA"
        }
      }
    },
    {
      parameters: {
        jsCode: `
const webhookData = $('Webhook Trigger').first().json;
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

// Directivas por plataforma
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
`
      },
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [780, 100],
      id: "prepare-prompt-node",
      name: "Prepare Multiplatform Prompt"
    },
    {
      parameters: {
        promptType: "define",
        text: `=Eres un Director Creativo y Productor Senior de Contenido Digital.

Tu misión es transformar la siguiente IDEA ESTRATÉGICA en una PIEZA DE CONTENIDO COMPLETA Y LISTA PARA GRABAR/PUBLICAR, adaptada estrictamente a la plataforma y formato solicitados, respetando el Brand Brain al 100%.

### 1. BRAND BRAIN ESTRATÉGICO DE LA MARCA (Fuente de Verdad):
- Marca: {{ $json.brand_name }}
- Rubro / Industria: {{ $json.industry }} ({{ $json.subindustry }})
- Propuesta de Valor: {{ $json.value_proposition }}
- Audiencia Objetivo: {{ $json.audience }}
- Tono y Personalidad: {{ $json.tone }} | {{ $json.personality }}
- Dolores del Cliente (Pains): {{ $json.pains }}
- Deseos (Desires): {{ $json.desires }}
- Objeciones Frecuentes: {{ $json.objections }}
- Diferenciadores Clave: {{ $json.differentiators }}
- Palabras Preferidas: {{ $json.words_to_use }}
- Palabras Prohibidas (NO USAR): {{ $json.words_to_avoid }}
- Reglas Editoriales: {{ $json.editorial_rules }}
- Límites Estratégicos: {{ $json.limits }}
- Restricciones Legales: {{ $json.legal_restrictions }}

### 2. IDEA DE ORIGEN:
- Título: {{ $json.idea_title }}
- Concepto: {{ $json.idea_concept }}
- Hook Base: {{ $json.idea_hook }}
- CTA Base: {{ $json.idea_cta }}
- Pilar: {{ $json.idea_pillar }}

### 3. BRIEF DE PRODUCCIÓN:
- Plataforma: {{ $json.platform }}
- Formato: {{ $json.format }}
- Objetivo: {{ $json.goal }}
- Duración Objetivo: {{ $json.duration }}
- Instrucciones Adicionales: {{ $json.custom_instructions }}

### 4. DIRECTIVAS NATIVAS DE LA PLATAFORMA:
{{ $json.platform_directives }}

### 5. REGLAS OBLIGATORIAS DE PRODUCCIÓN:
1. Divide el contenido en ESCENAS claras y secuenciales (entre 3 y 6 escenas según la duración).
2. Para cada escena define: scene_number, duration_seconds, visual_direction (indicación de cámara y puesta en escena), on_screen_text (texto en pantalla) y voiceover (locución o diálogo).
3. Redacta un hook_verbal directo al grano y un hook_visual específico.
4. Genera el guion completo (script), el caption para redes sociales con emojis adecuados, hashtags pertinentes y el llamado a la acción (cta).
5. Enumera los requerimientos multimedia (media_requirements) necesarios para producción (planos, b-rolls, placas, disclaimers legales).
6. Cumple estrictamente con las palabras prohibidas y restricciones legales del Brand Brain.
7. NO inventes testimonios, cifras milagrosas ni datos falsos.

Devuelve la respuesta en formato JSON estrictamente estructurado.`,
        hasOutputParser: true,
        messages: {
          messageValues: [
            {
              message: "Eres un Director Creativo experto en producción audiovisual y contenido estratégico para redes sociales. Tu trabajo es estructurar guiones y piezas profesionales listas para ser ejecutadas por equipos de grabación, editores y community managers."
            }
          ]
        },
        batching: {}
      },
      type: "@n8n/n8n-nodes-langchain.chainLlm",
      typeVersion: 1.9,
      position: [1060, 100],
      id: "llm-chain-node",
      name: "Basic LLM Chain"
    },
    {
      parameters: {
        model: {
          __rl: true,
          value: "gpt-5.6-luna",
          mode: "list",
          cachedResultName: "gpt-5.6-luna"
        },
        builtInTools: {},
        options: {
          temperature: 0.5
        }
      },
      type: "@n8n/n8n-nodes-langchain.lmChatOpenAi",
      typeVersion: 1.3,
      position: [920, 320],
      id: "openai-model-node",
      name: "OpenAI Chat Model",
      credentials: {
        openAiApi: {
          id: "u9gs96ogj8wAve57",
          name: "OpenAi Lsnet informatica"
        }
      }
    },
    {
      parameters: {
        schemaType: "manual",
        inputSchema: JSON.stringify({
          type: "object",
          properties: {
            title: { type: "string" },
            platform: { type: "string" },
            content_type: { type: "string" },
            hook_verbal: { type: "string" },
            hook_visual: { type: "string" },
            script: { type: "string" },
            caption: { type: "string" },
            hashtags: { type: "array", items: { type: "string" } },
            cta: { type: "string" },
            creative_direction: { type: "string" },
            media_requirements: { type: "array", items: { type: "string" } },
            scenes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  scene_number: { type: "integer" },
                  duration_seconds: { type: "number" },
                  visual_direction: { type: "string" },
                  camera_direction: { type: "string" },
                  on_screen_text: { type: "string" },
                  voiceover: { type: "string" },
                  transition: { type: "string" }
                },
                required: ["scene_number", "duration_seconds", "visual_direction", "on_screen_text", "voiceover"]
              }
            }
          },
          required: [
            "title",
            "platform",
            "content_type",
            "hook_verbal",
            "hook_visual",
            "script",
            "caption",
            "hashtags",
            "cta",
            "creative_direction",
            "media_requirements",
            "scenes"
          ]
        }, null, 2)
      },
      type: "@n8n/n8n-nodes-langchain.outputParserStructured",
      typeVersion: 1.3,
      position: [1100, 320],
      id: "output-parser-node",
      name: "Structured Output Parser"
    },
    {
      parameters: {
        method: "PATCH",
        url: "=https://eeykrgnwfarrljkotvmw.supabase.co/rest/v1/content_items?id=eq.{{ $('Prepare Multiplatform Prompt').first().json.content_item_id }}",
        authentication: "predefinedCredentialType",
        nodeCredentialType: "supabaseApi",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            {
              name: "Prefer",
              value: "return=representation"
            },
            {
              name: "Content-Type",
              value: "application/json"
            }
          ]
        },
        sendBody: true,
        specifyBody: "json",
        jsonBody: `={
  "title": {{ JSON.stringify($json.title) }},
  "platform": {{ JSON.stringify($json.platform) }},
  "content_type": {{ JSON.stringify($json.content_type) }},
  "hook": {{ JSON.stringify($json.hook_verbal) }},
  "script": {{ JSON.stringify($json.script) }},
  "caption": {{ JSON.stringify($json.caption) }},
  "hashtags": {{ JSON.stringify($json.hashtags) }},
  "cta": {{ JSON.stringify($json.cta) }},
  "creative_direction": {{ JSON.stringify($json.creative_direction) }},
  "media_requirements": {{ JSON.stringify($json.media_requirements) }},
  "scenes": {{ JSON.stringify($json.scenes) }},
  "status": "draft",
  "updated_at": "{{ new Date().toISOString() }}"
}`,
        options: {}
      },
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [1360, 100],
      id: "update-content-item-node",
      name: "Update Content Item Draft",
      credentials: {
        supabaseApi: {
          id: "IyzRTFFbSyGBXpPf",
          name: "Supabase Lsnethub social IA"
        }
      }
    },
    {
      parameters: {
        method: "PATCH",
        url: "=https://eeykrgnwfarrljkotvmw.supabase.co/rest/v1/production_outbox?id=eq.{{ $('Prepare Multiplatform Prompt').first().json.outbox_event_id }}",
        authentication: "predefinedCredentialType",
        nodeCredentialType: "supabaseApi",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            {
              name: "Prefer",
              value: "return=representation"
            },
            {
              name: "Content-Type",
              value: "application/json"
            }
          ]
        },
        sendBody: true,
        specifyBody: "json",
        jsonBody: `={
  "status": "completed",
  "processed_at": "{{ new Date().toISOString() }}",
  "updated_at": "{{ new Date().toISOString() }}"
}`,
        options: {}
      },
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [1600, 100],
      id: "update-outbox-completed-node",
      name: "Update Outbox Completed",
      credentials: {
        supabaseApi: {
          id: "IyzRTFFbSyGBXpPf",
          name: "Supabase Lsnethub social IA"
        }
      }
    },
    {
      parameters: {
        method: "PATCH",
        url: "=https://eeykrgnwfarrljkotvmw.supabase.co/rest/v1/production_outbox?id=eq.{{ $('Webhook Trigger').first().json.event_id }}",
        authentication: "predefinedCredentialType",
        nodeCredentialType: "supabaseApi",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            {
              name: "Prefer",
              value: "return=representation"
            },
            {
              name: "Content-Type",
              value: "application/json"
            }
          ]
        },
        sendBody: true,
        specifyBody: "json",
        jsonBody: `={
  "status": "completed",
  "processed_at": "{{ new Date().toISOString() }}",
  "updated_at": "{{ new Date().toISOString() }}"
}`,
        options: {}
      },
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [340, 360],
      id: "update-outbox-skipped-node",
      name: "Update Outbox Skipped",
      credentials: {
        supabaseApi: {
          id: "IyzRTFFbSyGBXpPf",
          name: "Supabase Lsnethub social IA"
        }
      }
    }
  ],
  connections: {
    "Webhook Trigger": {
      main: [
        [
          {
            node: "Atomic Claim content_items",
            type: "main",
            index: 0
          }
        ]
      ]
    },
    "Atomic Claim content_items": {
      main: [
        [
          {
            node: "Is Claim Winner?",
            type: "main",
            index: 0
          }
        ]
      ]
    },
    "Is Claim Winner?": {
      main: [
        [
          {
            node: "Get Brand",
            type: "main",
            index: 0
          }
        ],
        [
          {
            node: "Update Outbox Skipped",
            type: "main",
            index: 0
          }
        ]
      ]
    },
    "Get Brand": {
      main: [
        [
          {
            node: "Get Idea",
            type: "main",
            index: 0
          }
        ]
      ]
    },
    "Get Idea": {
      main: [
        [
          {
            node: "Prepare Multiplatform Prompt",
            type: "main",
            index: 0
          }
        ]
      ]
    },
    "Prepare Multiplatform Prompt": {
      main: [
        [
          {
            node: "Basic LLM Chain",
            type: "main",
            index: 0
          }
        ]
      ]
    },
    "OpenAI Chat Model": {
      ai_languageModel: [
        [
          {
            node: "Basic LLM Chain",
            type: "ai_languageModel",
            index: 0
          }
        ]
      ]
    },
    "Structured Output Parser": {
      ai_outputParser: [
        [
          {
            node: "Basic LLM Chain",
            type: "ai_outputParser",
            index: 0
          }
        ]
      ]
    },
    "Basic LLM Chain": {
      main: [
        [
          {
            node: "Update Content Item Draft",
            type: "main",
            index: 0
          }
        ]
      ]
    },
    "Update Content Item Draft": {
      main: [
        [
          {
            node: "Update Outbox Completed",
            type: "main",
            index: 0
          }
        ]
      ]
    }
  }
};

async function applyWf02() {
  console.log('=== ACTUALIZANDO WORKFLOW WF02 EN n8n ===');
  const res = await callMcpTool('update_workflow', {
    workflowId: 'QiOnKIx6QxIdzWAG',
    workflow: wf02Definition
  });
  console.log('Resultado update_workflow:', JSON.stringify(res, null, 2));

  // Publicar / Activar
  const pub = await callMcpTool('publish_workflow', {
    workflowId: 'QiOnKIx6QxIdzWAG',
    versionId: res?.result?.content?.[0]?.text ? JSON.parse(res.result.content[0].text)?.versionId : undefined
  });
  console.log('Resultado publish_workflow:', JSON.stringify(pub, null, 2));
}

applyWf02();
