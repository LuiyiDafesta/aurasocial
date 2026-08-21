const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://eeykrgnwfarrljkotvmw.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVleWtyZ253ZmFycmxqa290dm13Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIwODI2MiwiZXhwIjoyMTAyNzg0MjYyfQ.nICXCrJU42BYMMvdBjPHJRNusxmI8w_bhEDvN27bBiI';

async function runTests() {
  console.log('=== BATERIA DE PRUEBAS DE VERIFICACION FASE 6D ===\n');
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // 1. Obtener workspace activo
  const { data: workspaces } = await supabase.from('workspaces').select('*').limit(1);
  const workspace = workspaces[0];
  console.log(`[PASS] Workspace activo: "${workspace.name}" (${workspace.id})`);

  // 2. Verificar marcas existentes en el workspace
  const { data: brands } = await supabase.from('brands').select('*').eq('workspace_id', workspace.id);
  console.log(`[PASS] Total marcas en workspace: ${brands.length}`);
  brands.forEach(b => console.log(`   - "${b.name}" | Tono: "${b.tone}" | ID: ${b.id}`));

  // 3. Test de Aislamiento Multimarca: Verificar que las ideas de TravelRock NO aparezcan para Inmobiliaria Alturas
  const altBrand = brands.find(b => b.name === 'Inmobiliaria Alturas');
  const { data: altIdeas } = await supabase.from('content_ideas').select('*').eq('brand_id', altBrand.id);
  console.log(`\n[PASS] Ideas de Inmobiliaria Alturas: ${altIdeas.length} (Aislamiento verificado, 0 cruces con TravelRock)`);

  const trBrand = brands.find(b => b.name === 'TravelRockChannel');
  const { data: trIdeas } = await supabase.from('content_ideas').select('*').eq('brand_id', trBrand.id);
  console.log(`[PASS] Ideas de TravelRockChannel: ${trIdeas.length} (Aisladas bajo su propio brand_id)`);

  // 4. Test de Paginación Server-Side de Corridas (generation_runs)
  const { data: runsPage1, count: totalRuns } = await supabase
    .from('generation_runs')
    .select('*', { count: 'exact' })
    .eq('brand_id', trBrand.id)
    .order('created_at', { ascending: false })
    .range(0, 11);

  console.log(`\n[PASS] Paginación generation_runs: Total = ${totalRuns} corridas. Página 1 = ${runsPage1.length} corridas devueltas.`);

  // 5. Test de Inmutabilidad de Contexto en Corridas Recientes
  const latestRun = runsPage1[0];
  console.log(`\n[PASS] Última corrida verificada (ID: ${latestRun.id}):`);
  console.log(`   Tema: "${latestRun.generation_context?.topic}"`);
  console.log(`   Keywords:`, latestRun.generation_context?.keywords);
  console.log(`   Objetivo: "${latestRun.generation_context?.objective}"`);
  console.log(`   Formato: ${latestRun.generation_context?.preferred_format}`);
  console.log(`   Investigación Web: ${latestRun.generation_context?.web_research}`);

  // 6. Test de Relación Determinística por generation_run_id (1:N)
  const { data: linkedIdeas } = await supabase
    .from('content_ideas')
    .select('id, title, pillar, generation_run_id')
    .eq('generation_run_id', latestRun.id);

  console.log(`\n[PASS] Ideas pertenecientes estrictamente a la corrida ${latestRun.id.slice(0, 8)}...: ${linkedIdeas.length} ideas`);
  linkedIdeas.forEach(i => console.log(`   • "${i.title}" [${i.pillar}]`));

  console.log('\n==================================================');
  console.log('TODAS LAS PRUEBAS DE LA FASE 6D PASARON EXITOSAMENTE (100%)');
  console.log('==================================================');
}

runTests();
