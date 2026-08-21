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

async function fixHttpNodeHeaders() {
  const operations = [
    {
      type: "updateNodeParameters",
      nodeName: "Atomic Claim content_items",
      parameters: {
        method: "PATCH",
        url: "=https://eeykrgnwfarrljkotvmw.supabase.co/rest/v1/content_items?id=eq.{{ $json.content_item_id }}&status=eq.queued",
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
      nodeName: "Update Content Item Draft",
      parameters: {
        method: "PATCH",
        url: "=https://eeykrgnwfarrljkotvmw.supabase.co/rest/v1/content_items?id=eq.{{ $('Prepare Platform Context').first().json.content_item_id }}",
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
      }
    },
    {
      type: "updateNodeParameters",
      nodeName: "Update Outbox Completed",
      parameters: {
        method: "PATCH",
        url: "=https://eeykrgnwfarrljkotvmw.supabase.co/rest/v1/production_outbox?id=eq.{{ $('Prepare Platform Context').first().json.outbox_event_id }}",
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
        jsonBody: `={
  "status": "completed",
  "processed_at": "{{ new Date().toISOString() }}",
  "updated_at": "{{ new Date().toISOString() }}"
}`,
        options: {}
      }
    }
  ];

  const updateRes = await callTool('update_workflow', {
    workflowId: 'QiOnKIx6QxIdzWAG',
    operations: operations,
    versionName: 'Headers de autenticación Supabase Service Key en nodos HTTP'
  });

  console.log('Update headers result:', JSON.stringify(updateRes, null, 2));

  const pubRes = await callTool('publish_workflow', { workflowId: 'QiOnKIx6QxIdzWAG' });
  console.log('Publish result:', JSON.stringify(pubRes, null, 2));
}

fixHttpNodeHeaders();
