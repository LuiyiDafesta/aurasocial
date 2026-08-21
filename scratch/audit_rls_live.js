const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://eeykrgnwfarrljkotvmw.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVleWtyZ253ZmFycmxqa290dm13Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIwODI2MiwiZXhwIjoyMTAyNzg0MjYyfQ.nICXCrJU42BYMMvdBjPHJRNusxmI8w_bhEDvN27bBiI';

async function auditRlsAndForeignKeys() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  console.log('=== AUDITORÍA DE RLS Y SEGURIDAD EN SUPABASE ===\n');

  // Let's test querying with an authenticated user client (ANON_KEY + login)
  const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVleWtyZ253ZmFycmxqa290dm13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMDgyNjIsImV4cCI6MjEwMjc4NDI2Mn0.WM7sgjhvR003fHUKIy_r3CJ5S8TaIBA_3179hLkxdRk';
  const userClient = createClient(SUPABASE_URL, ANON_KEY);

  const { data: authData, error: authErr } = await userClient.auth.signInWithPassword({
    email: 'lsnetinformatica2024@gmail.com',
    password: 'Luiyi260879@',
  });

  if (authErr) {
    console.log('Error login:', authErr.message);
    return;
  }

  console.log(`Usuario autenticado: ${authData.user.id} (${authData.user.email})`);

  const tables = ['workspaces', 'brands', 'social_accounts', 'generation_runs', 'content_ideas', 'content_items'];
  for (const t of tables) {
    const { data, error, count } = await userClient.from(t).select('*', { count: 'exact' });
    if (error) {
      console.log(`RLS [${t}]: ERROR -> ${error.message}`);
    } else {
      console.log(`RLS [${t}]: ACCESIBLE -> ${count} filas devueltas`);
    }
  }
}

auditRlsAndForeignKeys();
