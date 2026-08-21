const https = require('https');

const MCP_URL = 'https://flow1.lsnetinformatica.com.ar/mcp-server/http';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2YzgwNGE1Ny00M2FkLTQ5MDctODUyYy05ZjNjYmMwZGU0ZDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJtY3Atc2VydmVyLWFwaSIsImp0aSI6IjQ3Y2E3YTEzLWYxYWUtNDAwNC05OGEyLTc5MmQ5NDVlZjhjMSIsImlhdCI6MTc4NzI1OTU2NX0.mLCya_6NsysfYHjT_JElnnviCIs06WuR00qk7SeWGlg';

async function listTools() {
  const tools = await new Promise((resolve) => {
    const url = new URL(MCP_URL);
    const body = JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method: 'tools/list', params: {} });
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Content-Length': Buffer.byteLength(body),
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        const lines = d.split('\n');
        let r = null;
        for (const l of lines) {
          if (l.startsWith('data: ')) {
            try { r = JSON.parse(l.slice(6)); } catch(e){}
          }
        }
        resolve(r);
      });
    });
    req.write(body);
    req.end();
  });

  console.log('Tools disponibles en n8n:');
  tools?.result?.tools?.forEach(t => console.log(`- ${t.name}: ${t.description.slice(0, 80)}...`));
}

listTools();
