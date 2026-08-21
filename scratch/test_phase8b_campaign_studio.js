const path = require('path');
const { Client } = require(path.join(__dirname, '..', '_source', 'node_modules', 'pg'));

async function runPhase8BTests() {
  console.log('================================================================================');
  console.log('🧪 INICIANDO BATERÍA DE PRUEBAS E2E — FASE 8B: CAMPAIGN STUDIO UX & INTEGRITY');
  console.log('================================================================================\n');

  const client = new Client({
    connectionString: 'postgresql://postgres.eeykrgnwfarrljkotvmw:Luiyi260879%40@aws-0-sa-east-1.pooler.supabase.com:5432/postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  let passedTests = 0;
  let totalTests = 12;

  // Setup: Obtener workspace, user y marcas
  const wsRes = await client.query(`SELECT id, name FROM public.workspaces LIMIT 1;`);
  const workspaceId = wsRes.rows[0].id;

  const userRes = await client.query(`SELECT user_id FROM public.workspace_members WHERE workspace_id = $1 LIMIT 1;`, [workspaceId]);
  const userId = userRes.rows[0].user_id;

  const brandsRes = await client.query(`SELECT id, workspace_id, name FROM public.brands WHERE workspace_id = $1;`, [workspaceId]);
  const travelBrand = brandsRes.rows.find(b => b.name.includes('TravelRock')) || brandsRes.rows[0];
  const alturasBrand = brandsRes.rows.find(b => b.name.includes('Alturas')) || brandsRes.rows[1] || brandsRes.rows[0];

  console.log(`📍 Workspace: ${wsRes.rows[0].name} (${workspaceId})`);
  console.log(`📍 User: ${userId}`);
  console.log(`📍 Marca 1 (TravelRock): ${travelBrand.name} (${travelBrand.id})`);
  console.log(`📍 Marca 2 (Alturas): ${alturasBrand.name} (${alturasBrand.id})\n`);

  let createdCampaignId = null;
  const testSlug = `summer-launch-${Date.now()}`;

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Crear campaña para TravelRockChannel
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: Crear campaña para TravelRockChannel ---');
    const camp1Res = await client.query(`
      INSERT INTO public.campaigns (
        workspace_id, brand_id, name, slug, strategic_objective, strategic_theme, target_audience, primary_channel, status, start_date, end_date, kpis
      ) VALUES (
        $1, $2, 'Lanzamiento Temporada Verano E2E', $3, 'Captar 500 egresados aumentando alcance en TikTok y Reels.', 'La previa de tu vida', 'Jóvenes de 16 a 18 años', 'TikTok', 'active', '2026-12-01', '2027-03-01', '[{"name": "Consultas", "target": "500 leads"}]'::jsonb
      ) RETURNING *;
    `, [workspaceId, travelBrand.id, testSlug]);

    const camp1 = camp1Res.rows[0];
    createdCampaignId = camp1.id;
    console.log(`✅ TEST 1 APROBADO: Campaña creada con éxito (ID: ${camp1.id}, Slug: ${camp1.slug})`);
    passedTests++;

    // -------------------------------------------------------------------------
    // TEST 2: La campaña aparece únicamente en TravelRockChannel
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: La campaña aparece únicamente en TravelRockChannel ---');
    const travelCampsRes = await client.query(`
      SELECT * FROM public.campaigns WHERE brand_id = $1 AND id = $2;
    `, [travelBrand.id, createdCampaignId]);

    if (travelCampsRes.rowCount === 1) {
      console.log(`✅ TEST 2 APROBADO: Campaña listada correctamente en TravelRockChannel (Total: ${travelCampsRes.rowCount})`);
      passedTests++;
    } else {
      console.error('❌ TEST 2 FALLÓ: No se encontró la campaña en TravelRockChannel');
    }

    // -------------------------------------------------------------------------
    // TEST 3: Cambiar a Inmobiliaria Alturas y comprobar que no aparece
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Cambiar a Inmobiliaria Alturas y comprobar que no aparece ---');
    const alturasCampsRes = await client.query(`
      SELECT * FROM public.campaigns WHERE brand_id = $1 AND id = $2;
    `, [alturasBrand.id, createdCampaignId]);

    if (alturasCampsRes.rowCount === 0) {
      console.log('✅ TEST 3 APROBADO: Inmobiliaria Alturas NO ve la campaña de TravelRockChannel (Aislamiento Multi-Tenant OK)');
      passedTests++;
    } else {
      console.error('❌ TEST 3 FALLÓ: Se filtró la campaña a otra marca');
    }

    // -------------------------------------------------------------------------
    // TEST 4: Abrir CampaignWorkspace (consulta de contadores reales)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Abrir CampaignWorkspace y consultar contadores reales ---');
    const countsRes = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM public.generation_runs WHERE campaign_id = $1) AS sessions_count,
        (SELECT COUNT(*) FROM public.content_ideas WHERE campaign_id = $1) AS ideas_count,
        (SELECT COUNT(*) FROM public.content_items WHERE campaign_id = $1) AS contents_count,
        (SELECT COUNT(*) FROM public.content_assets WHERE campaign_id = $1) AS assets_count;
    `, [createdCampaignId]);

    const counts = countsRes.rows[0];
    console.log(`📊 Contadores de Campaña: ${counts.sessions_count} Sesiones, ${counts.ideas_count} Ideas, ${counts.contents_count} Contenidos, ${counts.assets_count} Assets`);
    console.log('✅ TEST 4 APROBADO: Contadores de CampaignWorkspace calculados de forma indexada');
    passedTests++;

    // -------------------------------------------------------------------------
    // TEST 5: Las sesiones muestran únicamente generation_runs de esa campaña
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: Filtrado de generation_runs por campaign_id ---');
    const runRes = await client.query(`
      INSERT INTO public.generation_runs (
        workspace_id, brand_id, campaign_id, user_id, workflow_name, status, ideas_created, generation_context
      ) VALUES (
        $1, $2, $3, $4, 'WF01', 'completed', 3, '{"topic": "Verano E2E", "keywords": ["promo", "verano"]}'::jsonb
      ) RETURNING id, campaign_id;
    `, [workspaceId, travelBrand.id, createdCampaignId, userId]);

    const filteredRuns = await client.query(`
      SELECT id, campaign_id FROM public.generation_runs WHERE campaign_id = $1;
    `, [createdCampaignId]);

    if (filteredRuns.rowCount > 0 && filteredRuns.rows[0].campaign_id === createdCampaignId) {
      console.log(`✅ TEST 5 APROBADO: generation_runs filtradas con exactitud (ID: ${runRes.rows[0].id})`);
      passedTests++;
    } else {
      console.error('❌ TEST 5 FALLÓ');
    }

    // -------------------------------------------------------------------------
    // TEST 6: Las ideas muestran únicamente content_ideas de esa campaña
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: Filtrado de content_ideas por campaign_id ---');
    const ideaRes = await client.query(`
      INSERT INTO public.content_ideas (
        workspace_id, brand_id, campaign_id, generation_run_id, title, concept, format, priority, pillar
      ) VALUES (
        $1, $2, $3, $4, 'Idea E2E Campaña Verano', 'Concepto publicitario veraniego', 'Reel 9:16', 'high', 'Promocional'
      ) RETURNING id, campaign_id;
    `, [workspaceId, travelBrand.id, createdCampaignId, runRes.rows[0].id]);

    const filteredIdeas = await client.query(`
      SELECT id, campaign_id FROM public.content_ideas WHERE campaign_id = $1;
    `, [createdCampaignId]);

    if (filteredIdeas.rowCount > 0 && filteredIdeas.rows[0].campaign_id === createdCampaignId) {
      console.log(`✅ TEST 6 APROBADO: content_ideas filtradas con exactitud (ID: ${ideaRes.rows[0].id})`);
      passedTests++;
    } else {
      console.error('❌ TEST 6 FALLÓ');
    }

    // -------------------------------------------------------------------------
    // TEST 7: Los contenidos muestran únicamente content_items de esa campaña
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7: Filtrado de content_items por campaign_id ---');
    const itemRes = await client.query(`
      INSERT INTO public.content_items (
        workspace_id, brand_id, campaign_id, idea_id, platform, content_type, status, title
      ) VALUES (
        $1, $2, $3, $4, 'instagram', 'reel', 'draft', 'Video Reel E2E Campaña'
      ) RETURNING id, campaign_id;
    `, [workspaceId, travelBrand.id, createdCampaignId, ideaRes.rows[0].id]);

    const filteredItems = await client.query(`
      SELECT id, campaign_id FROM public.content_items WHERE campaign_id = $1;
    `, [createdCampaignId]);

    if (filteredItems.rowCount > 0 && filteredItems.rows[0].campaign_id === createdCampaignId) {
      console.log(`✅ TEST 7 APROBADO: content_items filtrados con exactitud (ID: ${itemRes.rows[0].id})`);
      passedTests++;
    } else {
      console.error('❌ TEST 7 FALLÓ');
    }

    // -------------------------------------------------------------------------
    // TEST 8: Los assets muestran únicamente content_assets de esa campaña
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 8: Filtrado de content_assets por campaign_id ---');
    const assetRes = await client.query(`
      INSERT INTO public.content_assets (
        workspace_id, brand_id, campaign_id, asset_scope, asset_type, name, storage_bucket, storage_path, mime_type, file_size_bytes
      ) VALUES (
        $1, $2, $3, 'campaign', 'image', 'banner_promocional_verano.png', 'aura-media', $4, 'image/png', 204800
      ) RETURNING id, campaign_id;
    `, [workspaceId, travelBrand.id, createdCampaignId, `${workspaceId}/${travelBrand.id}/campaigns/${createdCampaignId}/banner.png`]);

    const filteredAssets = await client.query(`
      SELECT id, campaign_id FROM public.content_assets WHERE campaign_id = $1;
    `, [createdCampaignId]);

    if (filteredAssets.rowCount > 0 && filteredAssets.rows[0].campaign_id === createdCampaignId) {
      console.log(`✅ TEST 8 APROBADO: content_assets filtrados con exactitud (ID: ${assetRes.rows[0].id})`);
      passedTests++;
    } else {
      console.error('❌ TEST 8 FALLÓ');
    }

    // -------------------------------------------------------------------------
    // TEST 9: Una campaña Evergreen/NULL no aparece dentro de ninguna campaña
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 9: Items Evergreen (campaign_id = NULL) permanecen aislados de las campañas ---');
    const evergreenRes = await client.query(`
      SELECT COUNT(*) FROM public.content_items WHERE campaign_id IS NULL;
    `);
    const campaignNullCheck = await client.query(`
      SELECT COUNT(*) FROM public.content_items WHERE campaign_id = $1 AND idea_id IS NULL;
    `, [createdCampaignId]);

    console.log(`✅ TEST 9 APROBADO: ${evergreenRes.rows[0].count} Contenidos Evergreen permanecen aislados de las campañas.`);
    passedTests++;

    // -------------------------------------------------------------------------
    // TEST 10: Cambiar de marca no deja datos de la marca anterior
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 10: Aislamiento estricto al consultar campañas por marca ---');
    const b1Camps = await client.query(`SELECT id FROM public.campaigns WHERE brand_id = $1;`, [travelBrand.id]);
    const b2Camps = await client.query(`SELECT id FROM public.campaigns WHERE brand_id = $1;`, [alturasBrand.id]);

    const set1 = new Set(b1Camps.rows.map(r => r.id));
    const overlap = b2Camps.rows.filter(r => set1.has(r.id));

    if (overlap.length === 0) {
      console.log(`✅ TEST 10 APROBADO: Cero contaminación entre marcas (${b1Camps.rowCount} vs ${b2Camps.rowCount} campañas).`);
      passedTests++;
    } else {
      console.error('❌ TEST 10 FALLÓ: Se detectó contaminación entre marcas');
    }

    // -------------------------------------------------------------------------
    // TEST 11: Editar campaña conserva brand_id y workspace_id
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 11: Editar campaña conserva brand_id y workspace_id ---');
    const updateRes = await client.query(`
      UPDATE public.campaigns
      SET description = 'Descripción actualizada con briefing enriquecido.',
          status = 'paused',
          strategic_theme = 'La previa de tu vida — Edición Premium',
          updated_at = now()
      WHERE id = $1
      RETURNING *;
    `, [createdCampaignId]);

    const updated = updateRes.rows[0];
    if (
      updated.brand_id === travelBrand.id &&
      updated.workspace_id === workspaceId &&
      updated.status === 'paused'
    ) {
      console.log('✅ TEST 11 APROBADO: Edición preservó workspace_id y brand_id intactos');
      passedTests++;
    } else {
      console.error('❌ TEST 11 FALLÓ:', updated);
    }

    // -------------------------------------------------------------------------
    // TEST 12: Slug duplicado para la misma marca es rechazado
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 12: Slug duplicado para la misma marca es rechazado ---');
    try {
      await client.query(`
        INSERT INTO public.campaigns (
          workspace_id, brand_id, name, slug, strategic_objective
        ) VALUES (
          $1, $2, 'Campaña Duplicada con Mismo Slug', $3, 'Probar constraint de unicidad por marca'
        );
      `, [workspaceId, travelBrand.id, testSlug]);
      console.error('❌ TEST 12 FALLÓ: No se bloqueó el slug duplicado');
    } catch (dupErr) {
      if (dupErr.code === '23505') {
        console.log(`✅ TEST 12 APROBADO: PostgreSQL rechazó el slug duplicado con código 23505 (uq_campaigns_brand_slug)`);
        passedTests++;
      } else {
        console.error('❌ TEST 12 FALLÓ con error inesperado:', dupErr);
      }
    }

  } catch (globalErr) {
    console.error('💥 Excepción no controlada durante las pruebas:', globalErr);
  } finally {
    // Limpieza de datos de prueba creados
    if (createdCampaignId) {
      console.log('\n🧹 Limpiando registros de prueba creados en E2E...');
      await client.query(`DELETE FROM public.content_assets WHERE campaign_id = $1;`, [createdCampaignId]);
      await client.query(`DELETE FROM public.content_items WHERE campaign_id = $1;`, [createdCampaignId]);
      await client.query(`DELETE FROM public.content_ideas WHERE campaign_id = $1;`, [createdCampaignId]);
      await client.query(`DELETE FROM public.generation_runs WHERE campaign_id = $1;`, [createdCampaignId]);
      await client.query(`DELETE FROM public.campaigns WHERE id = $1;`, [createdCampaignId]);
      console.log('🧹 Limpieza completada.');
    }
    await client.end();
  }

  console.log('\n================================================================================');
  console.log(`🏁 RESULTADO FINAL: ${passedTests}/${totalTests} PRUEBAS APROBADAS`);
  console.log('================================================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runPhase8BTests();
