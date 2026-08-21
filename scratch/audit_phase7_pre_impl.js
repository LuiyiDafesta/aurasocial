const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://eeykrgnwfarrljkotvmw.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVleWtyZ253ZmFycmxqa290dm13Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIwODI2MiwiZXhwIjoyMTAyNzg0MjYyfQ.nICXCrJU42BYMMvdBjPHJRNusxmI8w_bhEDvN27bBiI';

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

async function auditPhase7PreImplementation() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  console.log('=== 1. INSPECCIÓN DE public.content_items EN SUPABASE ===');
  const { data: items, error } = await supabase.from('content_items').select('*').limit(3);
  if (items && items.length > 0) {
    console.log('Columnas presentes en content_items:', Object.keys(items[0]));
    console.log('Muestra de fila 1:', JSON.stringify(items[0], null, 2));
  } else {
    console.log('Error o sin items:', error);
  }

  console.log('\n=== 2. WORKFLOWS EN n8n (LISTADO COMPLETO) ===');
  const searchRes = await callMcpTool('search_workflows', {});
  const rawWorkflows = searchRes?.result?.content?.[0]?.text;
  let wfList = [];
  try {
    wfList = JSON.parse(rawWorkflows || '[]');
  } catch (e) {
    console.log('Raw search workflows:', rawWorkflows);
  }
  console.log(`Total workflows encontrados: ${wfList.length}`);
  wfList.forEach(w => {
    console.log(`- ID: ${w.id} | Nombre: "${w.name}" | Activo: ${w.active} | Tags:`, w.tags);
  });

  // Si existe WF02, inspeccionar detalles
  const wf02 = wfList.find(w => w.name?.toLowerCase().includes('wf02') || w.name?.toLowerCase().includes('producir') || w.name?.toLowerCase().includes('guion') || w.name?.toLowerCase().includes('contenido'));
  if (wf02) {
    console.log(`\n[ENCONTRADO WORKFLOW RELACIONADO A WF02]: ID ${wf02.id} - "${wf02.name}"`);
    const hist = await callMcpTool('get_workflow_history', { workflowId: wf02.id });
    const rawText = hist?.result?.content?.[0]?.text;
    const parsed = JSON.parse(rawText || '{}');
    const activeVerId = parsed.versions?.[0]?.versionId;
    const ver = await callMcpTool('get_workflow_version', { workflowId: wf02.id, versionId: activeVerId });
    const fullWf = JSON.parse(ver?.result?.content?.[0]?.text || '{}');
    console.log('Nodos de WF02:', fullWf.nodes?.map(n => ({ name: n.name, type: n.type })));
  } else {
    console.log('\n[WF02]: No se encontró ningún workflow con nombre WF02 o Producción.');
  }

  console.log('\n=== 3. EDGE FUNCTIONS EN EL PROYECTO LOCAL ===');
  const fnDir = path.resolve('c:/Users/sturz/Desktop/Antigravity/AuraSocial/supabase/functions');
  if (fs.existsSync(fnDir)) {
    const funcs = fs.readdirSync(fnDir);
    console.log('Carpetas de Edge Functions:', funcs);
  }
}

auditPhase7PreImplementation();
