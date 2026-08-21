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

async function fixSaveContentNode() {
  const saveContentJs = `
const promptContext = $('Prepare Platform Context').first().json;
const rawLlm = $('Basic LLM Chain').first().json;
const llmOutput = rawLlm.output || rawLlm;

// 1. Guardar en content_items
await this.helpers.httpRequest({
  method: 'PATCH',
  url: 'https://eeykrgnwfarrljkotvmw.supabase.co/rest/v1/content_items?id=eq.' + promptContext.content_item_id,
  headers: {
    'apikey': '${SERVICE_KEY}',
    'Authorization': 'Bearer ${SERVICE_KEY}',
    'Prefer': 'return=representation',
    'Content-Type': 'application/json'
  },
  body: {
    title: llmOutput.title,
    platform: llmOutput.platform || promptContext.platform,
    content_type: llmOutput.content_type || promptContext.format,
    hook: llmOutput.hook_verbal || llmOutput.hook,
    script: llmOutput.script,
    caption: llmOutput.caption,
    hashtags: Array.isArray(llmOutput.hashtags) ? llmOutput.hashtags : [],
    cta: llmOutput.cta,
    creative_direction: llmOutput.creative_direction,
    media_requirements: Array.isArray(llmOutput.media_requirements) ? llmOutput.media_requirements : [],
    scenes: Array.isArray(llmOutput.scenes) ? llmOutput.scenes : [],
    status: 'draft',
    updated_at: new Date().toISOString()
  },
  json: true
});

// 2. Marcar production_outbox como completed
await this.helpers.httpRequest({
  method: 'PATCH',
  url: 'https://eeykrgnwfarrljkotvmw.supabase.co/rest/v1/production_outbox?id=eq.' + promptContext.outbox_event_id,
  headers: {
    'apikey': '${SERVICE_KEY}',
    'Authorization': 'Bearer ${SERVICE_KEY}',
    'Prefer': 'return=representation',
    'Content-Type': 'application/json'
  },
  body: {
    status: 'completed',
    processed_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  json: true
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

  const operations = [
    {
      type: "updateNodeParameters",
      nodeName: "Save Generated Content",
      parameters: { jsCode: saveContentJs }
    }
  ];

  const updateRes = await callTool('update_workflow', {
    workflowId: 'QiOnKIx6QxIdzWAG',
    operations: operations,
    versionName: 'Mapeo correcto de rawLlm.output en Save Generated Content'
  });

  console.log('Update result:', JSON.stringify(updateRes, null, 2));

  const pubRes = await callTool('publish_workflow', { workflowId: 'QiOnKIx6QxIdzWAG' });
  console.log('Publish result:', JSON.stringify(pubRes, null, 2));
}

fixSaveContentNode();
