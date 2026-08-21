const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://eeykrgnwfarrljkotvmw.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVleWtyZ253ZmFycmxqa290dm13Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIwODI2MiwiZXhwIjoyMTAyNzg0MjYyfQ.nICXCrJU42BYMMvdBjPHJRNusxmI8w_bhEDvN27bBiI';

async function auditFullDatabase() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  console.log('=== 1. AUDITORÍA DE TABLAS Y ESTRUCTURA EN SUPABASE ===\n');

  const tables = [
    'workspaces',
    'workspace_members',
    'brands',
    'social_accounts',
    'generation_runs',
    'content_ideas',
    'content_items',
    'campaigns',
    'content_assets',
    'content_versions',
    'approvals'
  ];

  for (const table of tables) {
    try {
      const { data, count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: false })
        .limit(1);

      if (error) {
        console.log(`❌ TABLA [${table}]: NO EXISTE o Error -> ${error.message}`);
      } else {
        console.log(`✅ TABLA [${table}]: EXISTE | Filas: ${count} | Columnas:`, data && data.length > 0 ? Object.keys(data[0]) : '(tabla vacía)');
        if (data && data.length > 0) {
          console.log(`   Ejemplo de registro:`, JSON.stringify(data[0], null, 2).slice(0, 300) + '...');
        }
      }
    } catch (e) {
      console.log(`❌ TABLA [${table}]: Exception -> ${e.message}`);
    }
  }

  // Auditar específicamente content_items
  console.log('\n=== 2. DETALLE ESPECÍFICO DE public.content_items ===');
  const { data: contentSample } = await supabase.from('content_items').select('*').limit(3);
  console.log(`content_items sample (${contentSample?.length || 0}):`, JSON.stringify(contentSample, null, 2));

  // Auditar marcas existentes
  console.log('\n=== 3. MARCAS REGISTRADAS EN public.brands ===');
  const { data: brands } = await supabase.from('brands').select('id, workspace_id, name, audience, tone, content_pillars, rules');
  console.log(JSON.stringify(brands, null, 2));
}

auditFullDatabase();
