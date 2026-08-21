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

async function inspectWf02() {
  console.log('=== INSPECCIONANDO WF02: QiOnKIx6QxIdzWAG ===');
  const hist = await callMcpTool('get_workflow_history', { workflowId: 'QiOnKIx6QxIdzWAG' });
  const rawText = hist?.result?.content?.[0]?.text;
  const parsed = JSON.parse(rawText || '{}');
  const activeVerId = parsed.versions?.[0]?.versionId;

  const ver = await callMcpTool('get_workflow_version', { workflowId: 'QiOnKIx6QxIdzWAG', versionId: activeVerId });
  const fullWf = JSON.parse(ver?.result?.content?.[0]?.text || '{}');

  console.log('Nombre:', fullWf.name);
  console.log('Nodos (' + fullWf.nodes?.length + '):');
  fullWf.nodes?.forEach(n => {
    console.log(`- [${n.type}] "${n.name}"`);
  });

  console.log('\nDetalle de Webhook / Triggers:');
  const triggers = fullWf.nodes?.filter(n => n.type.includes('webhook') || n.type.includes('trigger'));
  console.log(JSON.stringify(triggers, null, 2));

  console.log('\nDetalle de LLM / Chains:');
  const llms = fullWf.nodes?.filter(n => n.type.includes('chain') || n.type.includes('openAi') || n.type.includes('anthropic') || n.type.includes('model'));
  console.log(JSON.stringify(llms, null, 2));
}

inspectWf02();
