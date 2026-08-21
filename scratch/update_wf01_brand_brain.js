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

async function updateWf01ForBrandBrain() {
  console.log('=== ACTUALIZANDO WF01 PARA BRAND BRAIN MULTIRRUBRO ===');
  const hist = await callMcpTool('get_workflow_history', { workflowId: 'zWZBqNASoL93kHn8' });
  const rawText = hist?.result?.content?.[0]?.text;
  const parsed = JSON.parse(rawText || '{}');
  const activeVerId = parsed.versions?.[0]?.versionId;

  const ver = await callMcpTool('get_workflow_version', {
    workflowId: 'zWZBqNASoL93kHn8',
    versionId: activeVerId,
  });
  const wf = JSON.parse(ver?.result?.content?.[0]?.text || '{}');

  // 1. Modificar nodo "Check & Prepare Research" para búsqueda dinámica sin hardcode
  const checkResearchNode = wf.nodes.find(n => n.name === 'Check & Prepare Research');
  if (checkResearchNode) {
    checkResearchNode.parameters.jsCode = `const ctx = $('Preserve Context').first().json;
const genCtx = ctx.generation_context || {};
const topic = (genCtx.topic || '').trim();
const keywords = Array.isArray(genCtx.keywords) ? genCtx.keywords.filter(k => k && k.trim()) : [];
const objective = (genCtx.objective || '').trim();
const format = (genCtx.preferred_format || 'any').trim();
const shouldSearch = genCtx.web_research === true && (topic.length > 0 || keywords.length > 0);

let brand = {};
try {
  brand = $('Get Brand').first().json || {};
} catch (e) {}

let searchQuery = '';
if (shouldSearch) {
  const kwPart = keywords.slice(0, 4).join(' ');
  const formatCue = format !== 'any' ? \`\${format} virales\` : 'formatos y tendencias';
  const brandContext = (brand.name || '').trim();
  searchQuery = \`\${topic} \${kwPart} \${formatCue} tendencias \${brandContext}\`.trim();
}

return [{
  json: {
    should_search: shouldSearch,
    search_query: searchQuery,
    topic: topic,
    keywords: keywords,
    objective: objective || null,
    preferred_format: format,
    ideas_count: genCtx.ideas_count || 5
  }
}];`;
  }

  // 2. Modificar nodo "Build Strategy Context" para extraer todo el Brand Brain
  const buildStratNode = wf.nodes.find(n => n.name === 'Build Strategy Context');
  if (buildStratNode) {
    buildStratNode.parameters.jsCode = `const ctx = $('Preserve Context').first().json;
const genCtx = ctx.generation_context || {};
const brand = $('Get Brand').first().json || {};

// 1. Clasificación heurística de mecánicas en ideas existentes
function inferMechanic(idea) {
  const text = \`\${idea.title || ''} \${idea.concept || ''} \${idea.hook || ''} \${idea.format || ''}\`.toLowerCase();
  if (text.includes('speedrun') || text.includes('cronómetro') || text.includes('segundos') || text.includes('tutorial') || text.includes('paso a paso')) return 'Tutorial / Demostración rápida';
  if (text.includes('unboxing') || text.includes('revelación') || text.includes('beneficio') || text.includes('tour') || text.includes('recorrido')) return 'Tour / Unboxing / Demostración Tangible';
  if (text.includes('mito') || text.includes('dudas') || text.includes('verdadero') || text.includes('faq') || text.includes('error común')) return 'Mito vs Realidad / FAQ / Derribo de Objeciones';
  if (text.includes('comentarios') || text.includes('deja tu') || text.includes('dueto') || text.includes('desafío') || text.includes('encuesta')) return 'Dinámica Participativa / Interacción con Audiencia';
  if (text.includes('antes') || text.includes('después') || text.includes('transformación') || text.includes('caso de éxito') || text.includes('historia')) return 'Storytelling / Transformación / Caso Real';
  if (text.includes('humor') || text.includes('sketch') || text.includes('identificación') || text.includes('pov')) return 'Humor / Situación Cotidiana / POV';
  if (text.includes('análisis') || text.includes('cifras') || text.includes('comparativa') || text.includes('versus') || text.includes('roi')) return 'Análisis de Valor / Cifras / Comparativa';
  if (text.includes('detrás de escena') || text.includes('backstage') || text.includes('cómo se hace')) return 'Detrás de Escena / Backstage';
  return 'Concepto Estratégico';
}

let existingIdeas = [];
const usedMechanicsSet = new Set();

try {
  const rawExisting = $('Get Existing Ideas').all();
  existingIdeas = rawExisting
    .map(item => item.json)
    .filter(item => item && item.title)
    .map((item, idx) => {
      const mech = inferMechanic(item);
      usedMechanicsSet.add(mech);
      return \`\${idx + 1}. "\${item.title}" [Mecánica: \${mech}] | Pilar: \${item.pillar || 'General'} | Concepto: \${item.concept || ''} | Hook: "\${item.hook || ''}"\`;
    });
} catch (e) {
  existingIdeas = [];
}

const usedMechanicsSummary = Array.from(usedMechanicsSet).join(', ') || 'Ninguna registrada';

// 2. Extraer insights detallados de búsqueda web
let webInsights = 'Investigación web no solicitada o completada en modo base.';
let tavilyQueryUsed = $('Check & Prepare Research').first()?.json?.search_query || 'N/A';
let researchSources = [];

try {
  let searchNode = null;
  try {
    searchNode = $('Tavily Search').first()?.json;
  } catch (e) {}

  if (searchNode) {
    if (Array.isArray(searchNode.results) && searchNode.results.length > 0) {
      researchSources = searchNode.results.slice(0, 5).map(r => ({
        title: r.title || 'Referencia Web',
        url: r.url || '',
        snippet: (r.content || '').slice(0, 260),
        score: r.score || null
      }));

      const formattedSources = researchSources.map((r, i) => 
        \`- INSIGHT #\${i + 1}: "\${r.title}"\\n  Contenido: \${r.snippet}...\\n  Fuente URL: \${r.url}\${r.score ? ' | Relevancia: ' + r.score : ''}\`
      ).join('\\n\\n');

      webInsights = \`SÍNTESIS DE TENDENCIAS:\\n\${searchNode.answer || 'Tendencias detectadas en la web.'}\\n\\nFUENTES Y REFERENCIAS:\\n\${formattedSources}\`;
    } else if (searchNode.answer) {
      webInsights = \`SÍNTESIS:\\n\${searchNode.answer}\`;
    }
  }
} catch (e) {
  webInsights = 'Investigación web omitida o completada sin resultados externos.';
}

// 3. Estructurar contexto del Brand Brain completo
const brandRulesRaw = brand.rules;
let rulesObj = {};
let standardRulesList = [];

if (Array.isArray(brandRulesRaw)) {
  standardRulesList = brandRulesRaw;
} else if (brandRulesRaw && typeof brandRulesRaw === 'object') {
  rulesObj = brandRulesRaw;
  standardRulesList = Array.isArray(rulesObj.rules) ? rulesObj.rules : [];
}

const brandName = brand.name || 'Marca Activa';
const brandDesc = brand.description || '';
const brandIndustry = rulesObj.industry || 'General';
const brandSubindustry = rulesObj.subindustry || '';
const brandMarketGeo = rulesObj.market_geo || '';
const brandBusinessModel = rulesObj.business_model || 'B2C';
const brandValueProp = rulesObj.value_proposition || brandDesc || '';
const brandAudience = brand.audience || 'Público objetivo y clientes potenciales';
const brandTone = brand.tone || 'Profesional, auténtico y cercano';
const brandPersonality = rulesObj.personality || '';
const brandPains = Array.isArray(rulesObj.pains) ? rulesObj.pains : [];
const brandDesires = Array.isArray(rulesObj.desires) ? rulesObj.desires : [];
const brandObjections = Array.isArray(rulesObj.objections) ? rulesObj.objections : [];
const brandDifferentiators = Array.isArray(rulesObj.differentiators) ? rulesObj.differentiators : [];
const brandWordsToUse = Array.isArray(rulesObj.words_to_use) ? rulesObj.words_to_use : [];
const brandWordsToAvoid = Array.isArray(rulesObj.words_to_avoid) ? rulesObj.words_to_avoid : [];
const brandLimits = Array.isArray(rulesObj.limits) ? rulesObj.limits : [];
const brandLegalRestrictions = Array.isArray(rulesObj.legal_restrictions) ? rulesObj.legal_restrictions : [];

const brandPillars = Array.isArray(brand.content_pillars) 
  ? brand.content_pillars.join(', ') 
  : (brand.content_pillars || 'Educación, Experiencias, Soluciones, Comunidad');

const brandObjectives = Array.isArray(brand.objectives)
  ? brand.objectives.join(', ')
  : (brand.objectives || 'Aumentar reconocimiento y engagement');

// 4. Construir bloque consolidado de Brand Brain
let brandBrainMarkdown = \`### IDENTIDAD Y NEGOCIO:
- Marca: \${brandName}
- Rubro / Industria: \${brandIndustry}\${brandSubindustry ? ' (' + brandSubindustry + ')' : ''}
- Mercado / Ubicación: \${brandMarketGeo || 'No especificado'}
- Modelo de Negocio: \${brandBusinessModel}
- Propuesta de Valor: \${brandValueProp || 'No especificada'}
- Descripción: \${brandDesc || 'No especificada'}

### AUDIENCIA Y PSICOLOGÍA DEL CLIENTE:
- Perfil del Público: \${brandAudience}
- Dolores / Frustraciones (Pains): \${brandPains.length > 0 ? brandPains.join('; ') : 'No especificados'}
- Deseos y Motivaciones (Desires): \${brandDesires.length > 0 ? brandDesires.join('; ') : 'No especificados'}
- Objeciones Frecuentes: \${brandObjections.length > 0 ? brandObjections.join('; ') : 'No especificadas'}
- Diferenciadores Clave: \${brandDifferentiators.length > 0 ? brandDifferentiators.join('; ') : 'No especificados'}

### VOZ, TONO Y COMUNICACIÓN:
- Tono: \${brandTone}
- Personalidad: \${brandPersonality || 'No especificada'}
- Expresiones Preferidas: \${brandWordsToUse.length > 0 ? brandWordsToUse.join(', ') : 'Libre'}
- Expresiones Prohibidas: \${brandWordsToAvoid.length > 0 ? brandWordsToAvoid.join(', ') : 'Ninguna'}

### PILARES Y LÍMITES ESTRATÉGICOS:
- Pilares de Contenido: \${brandPillars}
- Objetivos de Negocio: \${brandObjectives}
- Reglas de Comunicación: \${standardRulesList.length > 0 ? standardRulesList.join('; ') : 'Priorizar contenido auténtico y verificable'}
- Límites Estratégicos: \${brandLimits.length > 0 ? brandLimits.join('; ') : 'No inventar datos ni testimonios'}
- Restricciones Legales / Regulatorias: \${brandLegalRestrictions.length > 0 ? brandLegalRestrictions.join('; ') : 'Ninguna declarada'}\`;

// 5. Pedido del usuario
const userTopic = (genCtx.topic || '').trim();
const userKeywords = Array.isArray(genCtx.keywords) && genCtx.keywords.length > 0
  ? genCtx.keywords.join(', ')
  : 'Ninguna específica';
const userObjective = (genCtx.objective || '').trim() || brandObjectives;
const userFormat = (genCtx.preferred_format || 'any').trim();

return [{
  json: {
    run_id: ctx.run_id,
    workspace_id: ctx.workspace_id,
    brand_id: ctx.brand_id,
    user_topic: userTopic || 'Estrategia general abierta de la marca',
    user_keywords: userKeywords,
    user_objective: userObjective,
    user_format: userFormat,
    has_specific_topic: userTopic.length > 0,
    brand_name: brandName,
    brand_industry: brandIndustry,
    brand_brain_markdown: brandBrainMarkdown,
    web_insights: webInsights,
    tavily_query_used: tavilyQueryUsed,
    research_sources: researchSources,
    used_mechanics_summary: usedMechanicsSummary,
    existing_ideas_count: existingIdeas.length,
    existing_ideas_text: existingIdeas.length > 0 
      ? existingIdeas.slice(0, 25).join('\\n') 
      : 'No hay ideas previas registradas. Diseñar conceptos fundacionales.',
    brand_raw: brand,
    generation_context: genCtx
  }
}];`;
  }

  // 3. Modificar prompt en "Basic LLM Chain"
  const chainNode = wf.nodes.find(n => n.name === 'Basic LLM Chain');
  if (chainNode) {
    chainNode.parameters.text = `=Eres un estratega senior de contenido y director creativo para redes sociales especializado en estrategia multirrubro (turismo, inmobiliaria, gastronomía, software SaaS, servicios, salud, educación, comercio, etc.).
Analiza el Brand Brain de la marca, el pedido del usuario, los insights de investigación y el mapa de ideas previas para diseñar exactamente 5 ideas de contenido con ALTA RELEVANCIA ESTRATÉGICA, VARIEDAD DE MECÁNICAS Y ADAPTACIÓN AL RUBRO.

==================================================
1. PRIORIDAD 1 (MÁXIMA PRIORIDAD) — PEDIDO DEL USUARIO:
- Tema / Eje Central: "{{ $json.user_topic }}"
- Palabras Clave Relevantes: [{{ $json.user_keywords }}]
- Objetivo Específico: "{{ $json.user_objective }}"
- Formato Solicitado: "{{ $json.user_format }}"

REGLA DE ENFOQUE:
{{ $json.has_specific_topic ? 'El usuario definió un tema obligatorio (\"' + $json.user_topic + '\"). Las 5 ideas DEBEN ESTAR 100% ENFOCADAS EN ESTE TEMA e incorporar naturalmente las palabras clave y el objetivo, adaptándolas a la industria de la marca.' : 'Diseña 5 ideas estratégicas distribuidas entre los pilares de la marca.' }}

==================================================
2. PRIORIDAD 2 — BRAND BRAIN ESTRATÉGICO (FUENTE DE VERDAD):
{{ $json.brand_brain_markdown }}

REGLAS CRÍTICAS DEL BRAND BRAIN:
- Adapta el vocabulario, las situaciones, los problemas y las promesas al RUBRO Y AUDIENCIA de la marca.
- Aborda los Dolores (Pains), Deseos (Desires), Objeciones y Diferenciadores del Brand Brain.
- Respeta estrictamente el TONO, las Expresiones Preferidas y PROHÍBE tajantemente las Expresiones Prohibidas y Límites.
- Cumple con las Restricciones Legales/Regulatorias si existen.
- NUNCA inventes testimonios, cifras garantizadas sin base ni datos ficticios.

==================================================
3. PRIORIDAD 3 — INSIGHTS DE INVESTIGACIÓN WEB Y TENDENCIAS:
{{ $json.web_insights }}

REGLA DE RESEARCH:
- Usa las tendencias y formatos virales detectados para inspirar dinámicas atractivas.
- Transforma los insights en dinámicas de contenido auténticas y aplicables al rubro.

==================================================
4. PRIORIDAD 4 — MAPA DE MECÁNICAS Y CONTEXTO NEGATIVO ANTI-REPETICIÓN:
MECÁNICAS YA USADAS:
{{ $json.used_mechanics_summary }}

IDEAS YA EXISTENTES EN EL BANCO (PROHIBIDO REPETIR):
{{ $json.existing_ideas_text }}

REGLA ANTI-CLICHÉ:
- No repitas ganchos, mecánicas ni remates idénticos a las ideas previas.
- Busca ángulos creativos frescos y diferenciados.

==================================================
5. PRIORIDAD 5 — DIVERSIDAD CREATIVA ENTRE LAS 5 IDEAS:
- Las 5 ideas deben ser SUSTANCIALMENTE DIFERENTES ENTRE SÍ en mecánica audiovisual, situación, gancho inicial (hook) y llamada a la acción (CTA).
- Utiliza dinámicas adecuadas para este rubro, tales como:
  * Demostración en vivo / Tour / Revelación tangible de valor.
  * Derribo de objeciones / Mitos vs Realidades / Problema-Solución.
  * POV inmersivo / Situación cotidiana donde el cliente se siente identificado.
  * Análisis de valor / Comparativa / Rendimiento / Cifras claras.
  * Dinámica interactiva / Quiz / Autoevaluación en 15 segundos.
  * Storytelling de transformación / Caso real o testimonio verificable.
  * Detrás de escena / Cómo se hace / Autoridad y transparencia.
- CADA IDEA DEBE TENER:
  - Formato específico y ritmo visual claro.
  - Hook magnético para los primeros 2 segundos.
  - Desarrollo conceptual sólido.
  - CTA específico adaptado a la mecánica.

Devuelve exactamente 5 ideas estructuradas cumpliendo con el JSON Schema.`;
  }

  // Guardar cambios en el workflow
  const updateRes = await callMcpTool('update_workflow', {
    workflowId: 'zWZBqNASoL93kHn8',
    workflow: wf,
  });

  console.log('Resultado de actualización de WF01:', updateRes?.result ? 'OK' : JSON.stringify(updateRes));
}

updateWf01ForBrandBrain();
