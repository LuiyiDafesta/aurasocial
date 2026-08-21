const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://eeykrgnwfarrljkotvmw.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVleWtyZ253ZmFycmxqa290dm13Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIwODI2MiwiZXhwIjoyMTAyNzg0MjYyfQ.nICXCrJU42BYMMvdBjPHJRNusxmI8w_bhEDvN27bBiI';

async function checkBrandsError() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: workspaces } = await supabase.from('workspaces').select('*').limit(1);
  const workspace = workspaces[0];

  const payload = {
    workspace_id: workspace.id,
    name: 'Inmobiliaria Alturas',
    description: 'Agencia de desarrollos inmobiliarios y venta de propiedades premium en pozo y terminadas.',
    audience: 'Inversores y familias que buscan vivienda propia o renta en dólares.',
    tone: 'Profesional, confiable, sobrio, empático y enfocado en números.',
    content_pillars: ['Tours virtuales', 'Análisis de rentabilidad', 'Educación financiera', 'Casos de éxito'],
    rules: ['No inventar precios ficticios', 'No prometer retornos garantizados sin respaldo legal'],
    objectives: ['Aumentar consultas de compra por WhatsApp', 'Posicionar la marca como referente de inversión']
  };

  const { data: newB, error: bErr } = await supabase.from('brands').insert(payload).select().single();
  console.log('Error insert:', bErr);
  console.log('Data insert:', newB);
}

checkBrandsError();
