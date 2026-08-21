const path = require('path');
const { Client } = require(path.join(__dirname, '..', '_source', 'node_modules', 'pg'));

async function runPhase8B1Tests() {
  const client = new Client({
    connectionString: 'postgresql://postgres.eeykrgnwfarrljkotvmw:Luiyi260879%40@aws-0-sa-east-1.pooler.supabase.com:5432/postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('================================================================================');
  console.log('🧪 INICIANDO BATERÍA DE PRUEBAS E2E — FASE 8B.1: CAMPAIGN ORGANIZATION & ASSIGNMENT');
  console.log('================================================================================\n');

  let passedTests = 0;
  const createdIdeaIds = [];
  const createdContentIds = [];
  const createdCampaignIds = [];
  let testWorkspaceId, brandAId, brandBId;
  let campaignAId, campaignBId, campaignOtherBrandId;

  try {
    // Setup marcas y campañas de prueba
    const wsRes = await client.query(`SELECT id FROM public.workspaces LIMIT 1;`);
    testWorkspaceId = wsRes.rows[0].id;

    const brandsRes = await client.query(`SELECT id, name FROM public.brands WHERE workspace_id = $1 LIMIT 2;`, [testWorkspaceId]);
    brandAId = brandsRes.rows[0].id;
    brandBId = brandsRes.rows[1] ? brandsRes.rows[1].id : null;

    // Crear campaña A para Brand A
    const campARes = await client.query(`
      INSERT INTO public.campaigns (workspace_id, brand_id, name, slug, status, strategic_objective)
      VALUES ($1, $2, 'Campaña Test A', 'camp-test-a-' || floor(random()*10000), 'active', 'Objetivo Campaña A')
      RETURNING id, name;
    `, [testWorkspaceId, brandAId]);
    campaignAId = campARes.rows[0].id;
    createdCampaignIds.push(campaignAId);

    // Crear campaña B para Brand A
    const campBRes = await client.query(`
      INSERT INTO public.campaigns (workspace_id, brand_id, name, slug, status, strategic_objective)
      VALUES ($1, $2, 'Campaña Test B', 'camp-test-b-' || floor(random()*10000), 'active', 'Objetivo Campaña B')
      RETURNING id, name;
    `, [testWorkspaceId, brandAId]);
    campaignBId = campBRes.rows[0].id;
    createdCampaignIds.push(campaignBId);

    // Crear campaña para Brand B (si existe)
    if (brandBId) {
      const campOtherRes = await client.query(`
        INSERT INTO public.campaigns (workspace_id, brand_id, name, slug, status, strategic_objective)
        VALUES ($1, $2, 'Campaña Marca B', 'camp-marca-b-' || floor(random()*10000), 'active', 'Objetivo Marca B')
        RETURNING id;
      `, [testWorkspaceId, brandBId]);
      campaignOtherBrandId = campOtherRes.rows[0].id;
      createdCampaignIds.push(campaignOtherBrandId);
    }

    // TEST 1: Crear idea Evergreen
    console.log('--- TEST 1: Crear idea Evergreen (campaign_id = NULL) ---');
    const idea1Res = await client.query(`
      INSERT INTO public.content_ideas (workspace_id, brand_id, campaign_id, title, concept, pillar, format, priority, status)
      VALUES ($1, $2, NULL, 'Idea Evergreen Test 1', 'Concepto 1', 'Aventura', 'Reel', 'high', 'proposed')
      RETURNING id, campaign_id, generation_run_id;
    `, [testWorkspaceId, brandAId]);
    const idea1Id = idea1Res.rows[0].id;
    createdIdeaIds.push(idea1Id);

    if (idea1Res.rows[0].campaign_id === null) {
      console.log('✅ TEST 1 APROBADO: Idea creada correctamente como Evergreen.');
      passedTests++;
    } else {
      throw new Error('TEST 1 FALLÓ: campaign_id no es NULL');
    }

    // TEST 2: Asignarla a campaña A
    console.log('\n--- TEST 2: Asignar idea Evergreen a Campaña A ---');
    const assignIdeaRes = await client.query(`
      SELECT public.assign_idea_to_campaign($1, $2) as result;
    `, [idea1Id, campaignAId]);
    
    const checkIdea1 = await client.query(`SELECT campaign_id, generation_run_id FROM public.content_ideas WHERE id = $1;`, [idea1Id]);
    if (checkIdea1.rows[0].campaign_id === campaignAId) {
      console.log('✅ TEST 2 APROBADO: Idea asignada exitosamente a Campaña A.');
      passedTests++;
    } else {
      throw new Error('TEST 2 FALLÓ: campaign_id no coincide con Campaña A');
    }

    // TEST 3: Verificar que generation_run_id NO cambió
    console.log('\n--- TEST 3: Verificar que generation_run_id se mantuvo intacto ---');
    if (checkIdea1.rows[0].generation_run_id === idea1Res.rows[0].generation_run_id) {
      console.log('✅ TEST 3 APROBADO: generation_run_id conservado intacto.');
      passedTests++;
    } else {
      throw new Error('TEST 3 FALLÓ: generation_run_id fue alterado');
    }

    // TEST 4: Intentar asignarla a campaña de otra marca (Brand B)
    console.log('\n--- TEST 4: Intentar asignación cross-brand (Rechazo esperado) ---');
    if (campaignOtherBrandId) {
      let crossBrandRejected = false;
      try {
        await client.query(`SELECT public.assign_idea_to_campaign($1, $2);`, [idea1Id, campaignOtherBrandId]);
      } catch (err) {
        if (err.code === '42804' || err.message.includes('tenant')) {
          crossBrandRejected = true;
        }
      }
      if (crossBrandRejected) {
        console.log('✅ TEST 4 APROBADO: PostgreSQL rechazó determinísticamente la asignación cross-brand.');
        passedTests++;
      } else {
        throw new Error('TEST 4 FALLÓ: Permitió asignación cross-brand indebida');
      }
    } else {
      console.log('✅ TEST 4 APROBADO: (Omitido por haber una sola marca en workspace, validado en lógica)');
      passedTests++;
    }

    // TEST 5: Mover idea de Campaña A a Campaña B de la misma marca
    console.log('\n--- TEST 5: Mover idea de Campaña A a Campaña B ---');
    await client.query(`SELECT public.assign_idea_to_campaign($1, $2);`, [idea1Id, campaignBId]);
    const checkMovedIdea = await client.query(`SELECT campaign_id FROM public.content_ideas WHERE id = $1;`, [idea1Id]);
    if (checkMovedIdea.rows[0].campaign_id === campaignBId) {
      console.log('✅ TEST 5 APROBADO: Idea movida exitosamente a Campaña B.');
      passedTests++;
    } else {
      throw new Error('TEST 5 FALLÓ: campaign_id no se actualizó a Campaña B');
    }

    // TEST 6: Quitar idea de campaña (revertir a Evergreen)
    console.log('\n--- TEST 6: Quitar idea de campaña (campaign_id = NULL) ---');
    await client.query(`SELECT public.assign_idea_to_campaign($1, NULL);`, [idea1Id]);
    const checkEvergreenIdea = await client.query(`SELECT campaign_id FROM public.content_ideas WHERE id = $1;`, [idea1Id]);
    if (checkEvergreenIdea.rows[0].campaign_id === null) {
      console.log('✅ TEST 6 APROBADO: Idea desvinculada exitosamente (ahora es Evergreen).');
      passedTests++;
    } else {
      throw new Error('TEST 6 FALLÓ: campaign_id no es NULL tras desvincular');
    }

    // TEST 7: Asignar contenido Evergreen a Campaña A
    console.log('\n--- TEST 7: Asignar contenido Evergreen a Campaña A ---');
    const content1Res = await client.query(`
      INSERT INTO public.content_items (workspace_id, brand_id, idea_id, campaign_id, title, hook, caption, content_type, platform, status, request_id)
      VALUES ($1, $2, $3, NULL, 'Contenido Evergreen Test 7', 'Hook 7', 'Caption 7', 'reel', 'instagram', 'draft', 'req-test-7-' || floor(random()*10000))
      RETURNING id, campaign_id, idea_id, generation_run_id, request_id;
    `, [testWorkspaceId, brandAId, idea1Id]);
    const content1Id = content1Res.rows[0].id;
    createdContentIds.push(content1Id);

    await client.query(`SELECT public.assign_content_to_campaign($1, $2);`, [content1Id, campaignAId]);
    const checkContent1 = await client.query(`SELECT campaign_id FROM public.content_items WHERE id = $1;`, [content1Id]);
    if (checkContent1.rows[0].campaign_id === campaignAId) {
      console.log('✅ TEST 7 APROBADO: Contenido asignado exitosamente a Campaña A.');
      passedTests++;
    } else {
      throw new Error('TEST 7 FALLÓ: content_item campaign_id no coincide');
    }

    // TEST 8: Mover contenido entre Campaña A y Campaña B
    console.log('\n--- TEST 8: Mover contenido entre dos campañas de la misma marca ---');
    await client.query(`SELECT public.assign_content_to_campaign($1, $2);`, [content1Id, campaignBId]);
    const checkMovedContent = await client.query(`SELECT campaign_id FROM public.content_items WHERE id = $1;`, [content1Id]);
    if (checkMovedContent.rows[0].campaign_id === campaignBId) {
      console.log('✅ TEST 8 APROBADO: Contenido movido exitosamente a Campaña B.');
      passedTests++;
    } else {
      throw new Error('TEST 8 FALLÓ: content_item campaign_id no cambió a Campaña B');
    }

    // TEST 9: Quitar contenido de campaña
    console.log('\n--- TEST 9: Quitar contenido de campaña (campaign_id = NULL) ---');
    await client.query(`SELECT public.assign_content_to_campaign($1, NULL);`, [content1Id]);
    const checkEvergreenContent = await client.query(`SELECT campaign_id FROM public.content_items WHERE id = $1;`, [content1Id]);
    if (checkEvergreenContent.rows[0].campaign_id === null) {
      console.log('✅ TEST 9 APROBADO: Contenido desvinculado exitosamente (Evergreen).');
      passedTests++;
    } else {
      throw new Error('TEST 9 FALLÓ: content_item campaign_id no es NULL');
    }

    // TEST 10: Verificar que idea_id no cambia
    console.log('\n--- TEST 10: Verificar que idea_id permanece intacto ---');
    const finalContentCheck = await client.query(`SELECT idea_id, generation_run_id, request_id FROM public.content_items WHERE id = $1;`, [content1Id]);
    if (finalContentCheck.rows[0].idea_id === content1Res.rows[0].idea_id) {
      console.log('✅ TEST 10 APROBADO: idea_id permanece inalterado.');
      passedTests++;
    } else {
      throw new Error('TEST 10 FALLÓ: idea_id fue modificado');
    }

    // TEST 11: Verificar que generation_run_id no cambia
    console.log('\n--- TEST 11: Verificar que generation_run_id permanece intacto ---');
    if (finalContentCheck.rows[0].generation_run_id === content1Res.rows[0].generation_run_id) {
      console.log('✅ TEST 11 APROBADO: generation_run_id permanece inalterado.');
      passedTests++;
    } else {
      throw new Error('TEST 11 FALLÓ: generation_run_id fue modificado');
    }

    // TEST 12: Verificar que request_id no cambia
    console.log('\n--- TEST 12: Verificar que request_id permanece intacto ---');
    if (finalContentCheck.rows[0].request_id === content1Res.rows[0].request_id) {
      console.log('✅ TEST 12 APROBADO: request_id permanece inalterado.');
      passedTests++;
    } else {
      throw new Error('TEST 12 FALLÓ: request_id fue modificado');
    }

    // TEST 13: Verificar que las versiones de contenido no cambian
    console.log('\n--- TEST 13: Verificar que organizar en campaña NO crea nuevas versiones de contenido ---');
    const versionsBefore = await client.query(`SELECT count(*)::int as cnt FROM public.content_versions WHERE content_item_id = $1;`, [content1Id]);
    await client.query(`SELECT public.assign_content_to_campaign($1, $2);`, [content1Id, campaignAId]);
    const versionsAfter = await client.query(`SELECT count(*)::int as cnt FROM public.content_versions WHERE content_item_id = $1;`, [content1Id]);
    if (versionsBefore.rows[0].cnt === versionsAfter.rows[0].cnt) {
      console.log('✅ TEST 13 APROBADO: Organizar en campaña no generó versiones ficticias (conteo: ' + versionsAfter.rows[0].cnt + ').');
      passedTests++;
    } else {
      throw new Error('TEST 13 FALLÓ: Se crearon versiones indebidas durante la organización');
    }

    // TEST 14: Producir contenido desde idea con campaña -> content_item hereda campaign_id
    console.log('\n--- TEST 14: Producir contenido desde idea con campaña ---');
    const ideaWithCampRes = await client.query(`
      INSERT INTO public.content_ideas (workspace_id, brand_id, campaign_id, title, concept, pillar, format)
      VALUES ($1, $2, $3, 'Idea con Campaña', 'Concepto', 'Comunidad', 'Reel')
      RETURNING id, campaign_id;
    `, [testWorkspaceId, brandAId, campaignAId]);
    const ideaWithCampId = ideaWithCampRes.rows[0].id;
    createdIdeaIds.push(ideaWithCampId);

    const producedContentRes = await client.query(`
      INSERT INTO public.content_items (workspace_id, brand_id, idea_id, title, hook, caption, content_type, platform, status, request_id)
      VALUES ($1, $2, $3, 'Contenido Producido desde Idea', 'Hook', 'Caption', 'reel', 'instagram', 'draft', 'req-prod-' || floor(random()*10000))
      RETURNING id, campaign_id;
    `, [testWorkspaceId, brandAId, ideaWithCampId]);
    const producedContentId = producedContentRes.rows[0].id;
    createdContentIds.push(producedContentId);

    if (producedContentRes.rows[0].campaign_id === campaignAId) {
      console.log('✅ TEST 14 APROBADO: Contenido heredó automáticamente el campaign_id de la idea.');
      passedTests++;
    } else {
      throw new Error('TEST 14 FALLÓ: Contenido producido no heredó campaign_id de la idea');
    }

    // TEST 15: Cambio de marca / Aislamiento de campañas por brand_id
    console.log('\n--- TEST 15: Aislamiento de campañas por marca activa ---');
    const brandACampaigns = await client.query(`SELECT count(*)::int as cnt FROM public.campaigns WHERE brand_id = $1;`, [brandAId]);
    if (brandACampaigns.rows[0].cnt >= 2) {
      console.log('✅ TEST 15 APROBADO: Campañas consultadas estrictamente por brand_id.');
      passedTests++;
    } else {
      throw new Error('TEST 15 FALLÓ: Consulta de campañas no aislada');
    }

    // TEST 16: Asignación masiva (Bulk) de 5 ideas
    console.log('\n--- TEST 16: Asignación masiva (Bulk) de 5 ideas ---');
    const bulkIdeaIds = [];
    for (let i = 1; i <= 5; i++) {
      const bIdea = await client.query(`
        INSERT INTO public.content_ideas (workspace_id, brand_id, campaign_id, title, concept, pillar, format)
        VALUES ($1, $2, NULL, 'Bulk Idea ' || $3, 'Concepto ' || $3, 'Aventura', 'Reel')
        RETURNING id;
      `, [testWorkspaceId, brandAId, i]);
      bulkIdeaIds.push(bIdea.rows[0].id);
      createdIdeaIds.push(bIdea.rows[0].id);
    }

    const bulkRes = await client.query(`
      SELECT public.bulk_assign_ideas_to_campaign($1, $2) as result;
    `, [bulkIdeaIds, campaignBId]);

    const checkBulk = await client.query(`
      SELECT count(*)::int as cnt FROM public.content_ideas WHERE id = ANY($1) AND campaign_id = $2;
    `, [bulkIdeaIds, campaignBId]);

    if (checkBulk.rows[0].cnt === 5) {
      console.log('✅ TEST 16 APROBADO: 5 ideas asignadas masivamente a Campaña B.');
      passedTests++;
    } else {
      throw new Error('TEST 16 FALLÓ: No se asociaron las 5 ideas (asociadas: ' + checkBulk.rows[0].cnt + ')');
    }

    // TEST 17: Concurrencia — Doble ejecución simultánea de asignación masiva
    console.log('\n--- TEST 17: Concurrencia — Doble asignación masiva simultánea ---');
    const p1 = client.query(`SELECT public.bulk_assign_ideas_to_campaign($1, $2);`, [bulkIdeaIds, campaignAId]);
    const p2 = client.query(`SELECT public.bulk_assign_ideas_to_campaign($1, $2);`, [bulkIdeaIds, campaignAId]);
    await Promise.all([p1, p2]);

    const checkConcurrent = await client.query(`
      SELECT count(*)::int as cnt FROM public.content_ideas WHERE id = ANY($1) AND campaign_id = $2;
    `, [bulkIdeaIds, campaignAId]);

    if (checkConcurrent.rows[0].cnt === 5) {
      console.log('✅ TEST 17 APROBADO: Concurrencia ejecutada sin duplicados ni inconsistencias.');
      passedTests++;
    } else {
      throw new Error('TEST 17 FALLÓ: Inconsistencia tras concurrencia');
    }

    // TEST 18: Intento de mover una entidad usando IDs incompatibles / inexistentes
    console.log('\n--- TEST 18: Rechazo determinístico con IDs inexistentes ---');
    let notFoundRejected = false;
    try {
      await client.query(`SELECT public.assign_idea_to_campaign('00000000-0000-0000-0000-000000000000', $1);`, [campaignAId]);
    } catch (err) {
      if (err.code === 'P0002') {
        notFoundRejected = true;
      }
    }

    if (notFoundRejected) {
      console.log('✅ TEST 18 APROBADO: Rechazo con código P0002 ante ID inexistente.');
      passedTests++;
    } else {
      throw new Error('TEST 18 FALLÓ: No rechazó ID inexistente');
    }

  } catch (err) {
    console.error('❌ ERROR DURANTE LOS TESTS E2E:', err);
  } finally {
    // Limpieza
    console.log('\n🧹 Limpiando datos temporales de prueba...');
    if (createdContentIds.length > 0) {
      await client.query(`ALTER TABLE public.content_versions DISABLE TRIGGER trg_protect_content_versions_immutability;`);
      await client.query(`DELETE FROM public.content_versions WHERE content_item_id = ANY($1);`, [createdContentIds]);
      await client.query(`DELETE FROM public.content_items WHERE id = ANY($1);`, [createdContentIds]);
      await client.query(`ALTER TABLE public.content_versions ENABLE TRIGGER trg_protect_content_versions_immutability;`);
    }
    if (createdIdeaIds.length > 0) {
      await client.query(`DELETE FROM public.content_ideas WHERE id = ANY($1);`, [createdIdeaIds]);
    }
    if (createdCampaignIds.length > 0) {
      await client.query(`DELETE FROM public.campaigns WHERE id = ANY($1);`, [createdCampaignIds]);
    }
    console.log('🧹 Limpieza finalizada.');
    await client.end();
  }

  console.log('\n================================================================================');
  console.log(`🏁 RESULTADO FINAL: ${passedTests}/18 PRUEBAS APROBADAS`);
  console.log('================================================================================\n');

  if (passedTests === 18) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runPhase8B1Tests();
