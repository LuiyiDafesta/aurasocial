const https = require('https');

const MCP_URL = 'https://flow1.lsnetinformatica.com.ar/mcp-server/http';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2YzgwNGE1Ny00M2FkLTQ5MDctODUyYy05ZjNjYmMwZGU0ZDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJtY3Atc2VydmVyLWFwaSIsImp0aSI6IjQ3Y2E3YTEzLWYxYWUtNDAwNC05OGEyLTc5MmQ5NDVlZjhjMSIsImlhdCI6MTc4NzI1OTU2NX0.mLCya_6NsysfYHjT_JElnnviCIs06WuR00qk7SeWGlg';

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

async function checkLastExec() {
  const execs = await callTool('search_workflow_executions', { workflowId: 'QiOnKIx6QxIdzWAG', limit: 3 });
  const parsed = JSON.parse(execs?.result?.content?.[0]?.text || '{}');
  const lastExecId = parsed.data?.[0]?.id;
  console.log(`Última ejecución: ${lastExecId} (Status: ${parsed.data?.[0]?.status})`);

  if (lastExecId) {
    const det = await callTool('get_workflow_execution', {
      executionId: lastExecId,
      workflowId: 'QiOnKIx6QxIdzWAG',
      includeData: true
    });
    const runData = JSON.parse(det?.result?.content?.[0]?.text || '{}')?.data?.resultData?.runData;
    console.log('Nodos ejecutados:', Object.keys(runData || {}));
    for (const [nodeName, runs] of Object.entries(runData || {})) {
      if (runs[0]?.executionStatus === 'error') {
        console.log(`❌ ERROR EN NODO "${nodeName}":`, JSON.stringify(runs[0].error, null, 2));
      } else {
        console.log(`✅ NODO "${nodeName}": OK`);
      }
    }
  }
}

checkLastExec();
