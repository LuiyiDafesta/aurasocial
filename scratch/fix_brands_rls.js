const path = require('path');
const { Client } = require(path.join(__dirname, '..', '_source', 'node_modules', 'pg'));

async function fixBrandsRls() {
  const client = new Client({
    connectionString: 'postgresql://postgres.eeykrgnwfarrljkotvmw:Luiyi260879%40@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('CONECTADO A POSTGRES!');

  console.log('\n1. Agregando políticas de INSERT, UPDATE y DELETE en public.brands...');

  await client.query(`
    -- Permitir INSERT a usuarios autenticados en sus workspaces
    DROP POLICY IF EXISTS "Users can insert brands in their workspaces" ON public.brands;
    CREATE POLICY "Users can insert brands in their workspaces"
    ON public.brands
    FOR INSERT
    TO authenticated
    WITH CHECK (
      workspace_id IN (
        SELECT wm.workspace_id
        FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid()
      )
    );

    -- Permitir UPDATE a usuarios autenticados en sus workspaces
    DROP POLICY IF EXISTS "Users can update brands in their workspaces" ON public.brands;
    CREATE POLICY "Users can update brands in their workspaces"
    ON public.brands
    FOR UPDATE
    TO authenticated
    USING (
      workspace_id IN (
        SELECT wm.workspace_id
        FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid()
      )
    )
    WITH CHECK (
      workspace_id IN (
        SELECT wm.workspace_id
        FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid()
      )
    );

    -- Permitir DELETE a usuarios autenticados en sus workspaces
    DROP POLICY IF EXISTS "Users can delete brands in their workspaces" ON public.brands;
    CREATE POLICY "Users can delete brands in their workspaces"
    ON public.brands
    FOR DELETE
    TO authenticated
    USING (
      workspace_id IN (
        SELECT wm.workspace_id
        FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid()
      )
    );

    -- Permitir UPDATE en content_items para aprobación/rechazo/programación
    DROP POLICY IF EXISTS "Users can update content_items of their workspaces" ON public.content_items;
    CREATE POLICY "Users can update content_items of their workspaces"
    ON public.content_items
    FOR UPDATE
    TO authenticated
    USING (
      workspace_id IN (
        SELECT wm.workspace_id
        FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid()
      )
    )
    WITH CHECK (
      workspace_id IN (
        SELECT wm.workspace_id
        FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid()
      )
    );
  `);

  console.log('✅ Políticas aplicadas con éxito.');

  const res = await client.query(`
    SELECT tablename, policyname, cmd, roles 
    FROM pg_policies 
    WHERE tablename IN ('brands', 'content_items')
    ORDER BY tablename, cmd;
  `);

  console.log('\nPOLÍTICAS ACTUALIZADAS:');
  for (const row of res.rows) {
    console.log(`- Table [${row.tablename}] | CMD [${row.cmd}] | Policy: "${row.policyname}"`);
  }

  await client.end();
}

fixBrandsRls().catch(console.error);
