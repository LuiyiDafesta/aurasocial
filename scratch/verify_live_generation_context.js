const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://eeykrgnwfarrljkotvmw.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVleWtyZ253ZmFycmxqa290dm13Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIwODI2MiwiZXhwIjoyMTAyNzg0MjYyfQ.nICXCrJU42BYMMvdBjPHJRNusxmI8w_bhEDvN27bBiI';

async function verifyTechnicalState() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  console.log('=== 1. VERIFICANDO SI generation_context EXISTE EN generation_runs ===');
  const { data: runs, error: runErr } = await supabase
    .from('generation_runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (runErr) {
    console.log('Error al consultar generation_runs:', runErr.message);
  } else {
    console.log(`Consulta exitosa. Se obtuvieron ${runs.length} corridas recientes.`);
    console.log('Columnas presentes en generation_runs:', runs.length > 0 ? Object.keys(runs[0]) : []);
    
    console.log('\n=== 2. MUESTRA REAL DE generation_context EN CORRIDAS RECIENTES ===');
    runs.forEach((r, idx) => {
      console.log(`\n--- Corrida #${idx + 1} (ID: ${r.id}) ---`);
      console.log(`Fecha: ${r.created_at} | Status: ${r.status} | Ideas creadas: ${r.ideas_created}`);
      console.log(`generation_context RAW:`, JSON.stringify(r.generation_context, null, 2));
      console.log(`Tiene 'generation_context' en el objeto?:`, 'generation_context' in r);
    });
  }

  console.log('\n=== 3. VERIFICANDO IDEAS VINCULADAS POR generation_run_id ===');
  const latestRunId = runs && runs.length > 0 ? runs[0].id : null;
  if (latestRunId) {
    const { data: ideas, error: ideaErr } = await supabase
      .from('content_ideas')
      .select('id, title, pillar, format, generation_run_id, created_at')
      .eq('generation_run_id', latestRunId);

    console.log(`Ideas con generation_run_id = ${latestRunId}:`, ideas ? ideas.length : 0);
    (ideas || []).forEach(i => {
      console.log(`- "${i.title}" | Pilar: ${i.pillar} | Formato: ${i.format}`);
    });
  }

  console.log('\n=== 4. AUDITORIA DE MARCAS Y BRAND BRAIN EN SUPABASE ===');
  const { data: brands, error: brandErr } = await supabase.from('brands').select('*');
  console.log(`Total marcas registradas: ${brands ? brands.length : 0}`);
  (brands || []).forEach(b => {
    console.log(`\nMarca ID: ${b.id}`);
    console.log(`Workspace ID: ${b.workspace_id}`);
    console.log(`Nombre: "${b.name}"`);
    console.log(`Descripción: "${b.description}"`);
    console.log(`Audiencia: "${b.audience}"`);
    console.log(`Tono: "${b.tone}"`);
    console.log(`Pilares:`, b.content_pillars);
    console.log(`Reglas:`, b.rules);
    console.log(`Objetivos:`, b.objectives);
    console.log(`Columnas presentes en brands:`, Object.keys(b));
  });
}

verifyTechnicalState();
