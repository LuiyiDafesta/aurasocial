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

async function fixIfClaimWinner() {
  const operations = [
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
              id: "claim-status-check",
              leftValue: "={{ $json.status }}",
              rightValue: "generating",
              operator: {
                type: "string",
                operation: "equals"
              }
            }
          ],
          combinator: "and"
        },
        options: {}
      }
    }
  ];

  const updateRes = await callTool('update_workflow', {
    workflowId: 'QiOnKIx6QxIdzWAG',
    operations: operations,
    versionName: 'Simplificación de condición en Is Claim Winner'
  });

  console.log('Update result:', JSON.stringify(updateRes, null, 2));

  const pubRes = await callTool('publish_workflow', { workflowId: 'QiOnKIx6QxIdzWAG' });
  console.log('Publish result:', JSON.stringify(pubRes, null, 2));
}

fixIfClaimWinner();
