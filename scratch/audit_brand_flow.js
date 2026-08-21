const { createClient } = require('@supabase/supabase-js');
const https = require('https');

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

async function auditBrandBrainFlow() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  console.log('=== 1. AUDITORÍA DE COLUMNAS EN public.brands (SUPABASE) ===');
  const { data: brandSample, error: bErr } = await supabase.from('brands').select('*').limit(1);
  if (brandSample && brandSample.length > 0) {
    console.log('Columnas reales en public.brands:', Object.keys(brandSample[0]));
    console.log('Ejemplo de fila:', JSON.stringify(brandSample[0], null, 2));
  } else {
    console.log('Error o sin filas:', bErr);
  }

  console.log('\n=== 2. AUDITORÍA DE NODOS EN WF01 (n8n) ===');
  const hist = await callMcpTool('get_workflow_history', { workflowId: 'zWZBqNASoL93kHn8' });
  const rawText = hist?.result?.content?.[0]?.text;
  const parsed = JSON.parse(rawText || '{}');
  const activeVerId = parsed.versions?.[0]?.versionId;

  const ver = await callMcpTool('get_workflow_version', {
    workflowId: 'zWZBqNASoL93kHn8',
    versionId: activeVerId,
  });
  const wf = JSON.parse(ver?.result?.content?.[0]?.text || '{}');

  const getBrandNode = wf.nodes.find(n => n.name === 'Get Brand');
  console.log('\n[Nodo Get Brand]:', JSON.stringify(getBrandNode, null, 2));

  const checkResearchNode = wf.nodes.find(n => n.name === 'Check & Prepare Research');
  console.log('\n[Nodo Check & Prepare Research]:', JSON.stringify(checkResearchNode, null, 2));

  const buildStratNode = wf.nodes.find(n => n.name === 'Build Strategy Context');
  console.log('\n[Nodo Build Strategy Context]:', JSON.stringify(buildStratNode, null, 2));

  const chainNode = wf.nodes.find(n => n.name === 'Basic LLM Chain');
  console.log('\n[Nodo Basic LLM Chain Prompt]:', JSON.stringify(chainNode?.parameters?.prompt, null, 2));
}

auditBrandBrainFlow();
