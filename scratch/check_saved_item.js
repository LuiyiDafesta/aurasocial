const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://eeykrgnwfarrljkotvmw.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVleWtyZ253ZmFycmxqa290dm13Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIwODI2MiwiZXhwIjoyMTAyNzg0MjYyfQ.nICXCrJU42BYMMvdBjPHJRNusxmI8w_bhEDvN27bBiI';

async function checkSavedData() {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: item } = await admin.from('content_items').select('*').eq('id', '39d196cd-7667-454f-a6f0-31743feb8e75').single();
  const { data: outbox } = await admin.from('production_outbox').select('*').eq('id', '6d669e96-47c4-473e-82e9-7b52ce895bbe').single();

  console.log('=== RESULTADO EN BASE DE DATOS TRAS EJECUCIÓN EXITOSA 236995 ===\n');
  console.log(`Content Item [${item?.id}]:`);
  console.log(`- Status: "${item?.status}"`);
  console.log(`- Platform: "${item?.platform}" | Content Type: "${item?.content_type}"`);
  console.log(`- Title: "${item?.title}"`);
  console.log(`- Hook: "${item?.hook}"`);
  console.log(`- Script:\n${item?.script}\n`);
  console.log(`- Caption:\n${item?.caption}\n`);
  console.log(`- Hashtags:`, item?.hashtags);
  console.log(`- Media Requirements:`, item?.media_requirements);
  console.log(`- Escenas (${item?.scenes?.length || 0}):`, JSON.stringify(item?.scenes, null, 2));
  console.log(`\nProduction Outbox [${outbox?.id}]:`);
  console.log(`- Status: "${outbox?.status}"`);
  console.log(`- Processed At: "${outbox?.processed_at}"`);
}

checkSavedData();
