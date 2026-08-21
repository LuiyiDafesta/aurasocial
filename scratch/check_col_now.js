const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://eeykrgnwfarrljkotvmw.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVleWtyZ253ZmFycmxqa290dm13Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIwODI2MiwiZXhwIjoyMTAyNzg0MjYyfQ.nICXCrJU42BYMMvdBjPHJRNusxmI8w_bhEDvN27bBiI';

async function checkColNow() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data, error } = await supabase.from('generation_runs').select('id, generation_context').limit(1);
  if (error) {
    console.log('Error select generation_context:', error.message);
  } else {
    console.log('EXITO! generation_context existe en generation_runs:', data);
  }

  // Also check brands table columns
  const { data: bData, error: bError } = await supabase.from('brands').select('*').limit(1);
  if (bData && bData.length > 0) {
    console.log('Columnas de brands:', Object.keys(bData[0]));
  }
}

checkColNow();
