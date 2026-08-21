const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://eeykrgnwfarrljkotvmw.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVleWtyZ253ZmFycmxqa290dm13Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIwODI2MiwiZXhwIjoyMTAyNzg0MjYyfQ.nICXCrJU42BYMMvdBjPHJRNusxmI8w_bhEDvN27bBiI';

async function testJsonbFields() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: b, error } = await supabase.from('brands').select('*').limit(1);
  console.log('Sample brand:', b);

  // Let's test updating rich structured jsonb in `rules`, `objectives`
  // E.g. in `rules`: we can store array OR full object
  // Let's test updating rules as an object or array
  const testObj = {
    rules: ["No inventar precios", "No prometer rentabilidad garantizada"],
    limits: ["No criticar competidores directamente"],
    legal_restrictions: ["Incluir disclaimer de inversión inmobiliaria regulada"],
    pains: ["Miedo a perder ahorros", "Falta de tiempo para gestionar alquileres"],
    desires: ["Renta en dólares predecible", "Capitalización a largo plazo"],
    objections: ["Incertidumbre económica", "Desconfianza en constructoras"],
    differentiators: ["Más de 15 años de trayectoria", "Rendimiento auditado en pozo"],
    personality: "Experta, sobria, confiable y orientada a números",
    words_to_use: ["rentabilidad", "seguridad jurídica", "plusvalía", "ubicación premium"],
    words_to_avoid: ["barato", "ganga", "mágico", "fácil"]
  };

  const { data: updateRes, error: updateErr } = await supabase
    .from('brands')
    .update({ rules: testObj })
    .eq('name', 'Inmobiliaria Alturas')
    .select()
    .single();

  console.log('Update result:', updateErr ? updateErr.message : 'SUCCESS');
  if (updateRes) {
    console.log('Updated rules field in DB:', updateRes.rules);
  }
}

testJsonbFields();
