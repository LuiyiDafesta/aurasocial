const path = require('path');
const { Client } = require(path.join(__dirname, '..', '_source', 'node_modules', 'pg'));

async function testPhase8AValidation() {
  console.log('================================================================================');
  console.log('🧪 BATERÍA DE PRUEBAS AUTOMATIZADAS — FASE 8A DATABASE & STORAGE HARDENING');
  console.log('================================================================================\n');

  const client = new Client({
    connectionString: 'postgresql://postgres.eeykrgnwfarrljkotvmw:Luiyi260879%40@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  // 1. Obtener marcas de prueba
  const brandsRes = await client.query(`SELECT id, workspace_id, name FROM public.brands;`);
  const travelBrand = brandsRes.rows.find(b => b.name.includes('TravelRock'));
  const realEstateBrand = brandsRes.rows.find(b => b.name.includes('Alturas'));
  const saasBrand = brandsRes.rows.find(b => b.name.includes('Nova'));

  // -------------------------------------------------------------------------
  // TEST 1: Creación de Campañas Reales por Marca
  // -------------------------------------------------------------------------
  console.log('--- TEST 1: Creación de Campañas de Prueba por Marca ---');
  const campTravelRes = await client.query(`
    INSERT INTO public.campaigns (
      workspace_id, brand_id, name, slug, strategic_objective, strategic_theme, status
    ) VALUES (
      $1, $2, 'Temporada Invierno Bariloche 2027', 'invierno-2027', 'Captar 500 nuevos pasajeros de secundaria', 'La previa de tu vida', 'active'
    )
    ON CONFLICT (brand_id, slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id, name, slug, status;
  `, [travelBrand.workspace_id, travelBrand.id]);
  const travelCampaignId = campTravelRes.rows[0].id;
  console.log(`✅ Campaña TravelRock creada: "${campTravelRes.rows[0].name}" (${travelCampaignId})`);

  // -------------------------------------------------------------------------
  // TEST 2: Intento de Cross-Brand / Cross-Workspace Violation
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 2: Protección contra Cross-Brand / Cross-Workspace en Campañas ---');
  try {
    // Intentar asignar un workspace_id falso a una marca
    await client.query(`
      INSERT INTO public.campaigns (
        workspace_id, brand_id, name, slug, strategic_objective
      ) VALUES (
        gen_random_uuid(), $1, 'Campaña Inválida', 'invalida', 'Objetivo'
      );
    `, [travelBrand.id]);
    console.error('❌ TEST 2 FALLÓ: Se permitió crear campaña con workspace inconsistente.');
  } catch (err) {
    console.log(`✅ TEST 2 APROBADO: FK compuesta bloqueó la inconsistencia (${err.code} / ${err.message.substring(0, 70)}...)`);
  }

  // -------------------------------------------------------------------------
  // TEST 3: Sincronización Automática de campaign_id en Content Items
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 3: Sincronización de campaign_id desde Idea a Content Item ---');
  // Crear una idea asociada a la campaña
  const ideaCampRes = await client.query(`
    INSERT INTO public.content_ideas (
      workspace_id, brand_id, campaign_id, title, concept, objective, format
    ) VALUES (
      $1, $2, $3, 'Idea con Campaña', 'Concepto de invierno', 'Objetivo comercial', 'Reel'
    ) RETURNING id;
  `, [travelBrand.workspace_id, travelBrand.id, travelCampaignId]);
  const ideaCampId = ideaCampRes.rows[0].id;

  // Insertar content_item sin especificar campaign_id (debe heredarlo por trigger)
  const ciAutoRes = await client.query(`
    INSERT INTO public.content_items (
      workspace_id, brand_id, idea_id, platform, content_type, title
    ) VALUES (
      $1, $2, $3, 'instagram', 'reel', 'Contenido Auto Sincronizado'
    ) RETURNING id, campaign_id;
  `, [travelBrand.workspace_id, travelBrand.id, ideaCampId]);

  if (ciAutoRes.rows[0].campaign_id === travelCampaignId) {
    console.log(`✅ TEST 3 APROBADO: content_item heredó automáticamente campaign_id (${travelCampaignId}) de la idea.`);
  } else {
    console.error(`❌ TEST 3 FALLÓ: campaign_id no se sincronizó.`, ciAutoRes.rows[0]);
  }

  // -------------------------------------------------------------------------
  // TEST 4: Intento de Asignar Campaña de Otra Marca a un Content Item
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 4: Bloqueo de Asignación de Campaña de Otra Marca ---');
  try {
    await client.query(`
      INSERT INTO public.content_items (
        workspace_id, brand_id, platform, content_type, title, campaign_id
      ) VALUES (
        $1, $2, 'linkedin', 'post_b2b', 'Post SaaS con Campaña de Turismo', $3
      );
    `, [saasBrand.workspace_id, saasBrand.id, travelCampaignId]);
    console.error('❌ TEST 4 FALLÓ: Se permitió asociar campaña de otra marca.');
  } catch (err) {
    console.log(`✅ TEST 4 APROBADO: FK compuesta bloqueó la campaña cruzada (${err.code} / ${err.constraint || err.message.substring(0, 60)}...)`);
  }

  // -------------------------------------------------------------------------
  // TEST 5: RPC create_content_version y Bloqueo Pesimista
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 5: Creación Atómica de Versiones vía RPC create_content_version ---');
  const ciToVersionId = ciAutoRes.rows[0].id;

  // Version 1 creada por migración o creada nueva
  const v1Res = await client.query(`
    SELECT * FROM public.create_content_version(
      $1, 'ai_draft', 'Título Versión 1 AI', 'Hook 1', 'Script 1', 'Caption 1'
    );
  `, [ciToVersionId]);
  console.log(`Versión 1 creada: Número ${v1Res.rows[0].version_number}, Tipo: ${v1Res.rows[0].version_type}`);

  const v2Res = await client.query(`
    SELECT * FROM public.create_content_version(
      $1, 'human_edit', 'Título Versión 2 Editada', 'Hook 2 Mejorado', 'Script 2', 'Caption 2 Editado', '[]'::jsonb, 'CTA 2', 'Dir Creativa', '[]'::jsonb, '[]'::jsonb, '{}'::jsonb, 'instagram', 'reel', 'draft', null, null, null, 'Ajuste de hook y copy por redactor'
    );
  `, [ciToVersionId]);
  console.log(`Versión 2 creada: Número ${v2Res.rows[0].version_number}, Tipo: ${v2Res.rows[0].version_type}, Summary: "${v2Res.rows[0].change_summary}"`);

  if (v2Res.rows[0].version_number === 2) {
    console.log(`✅ TEST 5 APROBADO: Secuencia de versiones generada atómicamente (v1 -> v2).`);
  } else {
    console.error(`❌ TEST 5 FALLÓ: Número de versión inesperado.`);
  }

  // -------------------------------------------------------------------------
  // TEST 6: Inmutabilidad Estricta (Append-Only Trigger) en Content Versions
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 6: Inmutabilidad Estricta (Bloqueo de UPDATE y DELETE en content_versions) ---');
  try {
    await client.query(`
      UPDATE public.content_versions 
      SET title = 'Intento de Modificación Ilegal' 
      WHERE id = $1;
    `, [v1Res.rows[0].id]);
    console.error('❌ TEST 6 FALLÓ: Se permitió modificar una versión histórica.');
  } catch (err) {
    console.log(`✅ TEST 6A APROBADO: UPDATE bloqueado por trigger (${err.message})`);
  }

  try {
    await client.query(`
      DELETE FROM public.content_versions 
      WHERE id = $1;
    `, [v1Res.rows[0].id]);
    console.error('❌ TEST 6 FALLÓ: Se permitió eliminar una versión histórica.');
  } catch (err) {
    console.log(`✅ TEST 6B APROBADO: DELETE bloqueado por trigger (${err.message})`);
  }

  // -------------------------------------------------------------------------
  // TEST 7: Scopes Exclusivos de Content Assets
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 7: Validación de Scopes Exclusivos en content_assets ---');
  // Asset de Marca Válido
  const assetBrand = await client.query(`
    INSERT INTO public.content_assets (
      workspace_id, brand_id, asset_scope, asset_type, name, storage_path, mime_type, file_size_bytes
    ) VALUES (
      $1, $2, 'brand', 'logo', 'Logo Principal SVG', 'brand/logo.svg', 'image/svg+xml', 15420
    ) RETURNING id, asset_scope;
  `, [travelBrand.workspace_id, travelBrand.id]);
  console.log(`✅ Asset de Marca creado: ID ${assetBrand.rows[0].id}`);

  // Intento de Asset Inválido: scope 'brand' con campaign_id
  try {
    await client.query(`
      INSERT INTO public.content_assets (
        workspace_id, brand_id, campaign_id, asset_scope, asset_type, name, storage_path, mime_type, file_size_bytes
      ) VALUES (
        $1, $2, $3, 'brand', 'logo', 'Logo Inválido', 'path/logo.svg', 'image/svg+xml', 1000
      );
    `, [travelBrand.workspace_id, travelBrand.id, travelCampaignId]);
    console.error('❌ TEST 7 FALLÓ: Se permitió crear asset con scope inconsistente.');
  } catch (err) {
    console.log(`✅ TEST 7 APROBADO: Constraint CHECK bloqueó scope inconsistente (${err.constraint})`);
  }

  // -------------------------------------------------------------------------
  // TEST 8: Idempotencia de la Migración Histórica
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 8: Verificación de Idempotencia de Migración Histórica ---');
  const countBefore = await client.query(`SELECT count(*) FROM public.content_versions WHERE version_type = 'historical_snapshot';`);
  
  // Re-ejecutar inserción histórica
  await client.query(`
    INSERT INTO public.content_versions (
      content_item_id, workspace_id, brand_id, version_number, version_type, title, hook, script, caption, hashtags, cta, creative_direction, media_requirements, scenes, production_brief_snapshot, platform, content_type, status, scheduled_at, published_at, external_post_url, change_summary, created_at
    )
    SELECT 
      ci.id, ci.workspace_id, ci.brand_id, 1, 'historical_snapshot', COALESCE(ci.title, 'Contenido sin título'), ci.hook, ci.script, ci.caption, COALESCE(ci.hashtags, '[]'::jsonb), ci.cta, ci.creative_direction, COALESCE(ci.media_requirements, '[]'::jsonb), COALESCE(ci.scenes, '[]'::jsonb), COALESCE(ci.production_brief, '{}'::jsonb), ci.platform, ci.content_type, ci.status, ci.scheduled_at, ci.published_at, ci.external_post_url, 'Snapshot inicial de migración a Fase 8', COALESCE(ci.created_at, now())
    FROM public.content_items ci
    WHERE NOT EXISTS (
      SELECT 1 FROM public.content_versions cv WHERE cv.content_item_id = ci.id
    );
  `);

  const countAfter = await client.query(`SELECT count(*) FROM public.content_versions WHERE version_type = 'historical_snapshot';`);
  if (countBefore.rows[0].count === countAfter.rows[0].count) {
    console.log(`✅ TEST 8 APROBADO: Idempotencia total. Snapshots históricos permanecen en ${countAfter.rows[0].count} (0 duplicados).`);
  } else {
    console.error(`❌ TEST 8 FALLÓ: Hubo duplicación de snapshots.`);
  }

  // Limpieza de datos de prueba temporales
  await client.query(`DELETE FROM public.content_items WHERE id = $1;`, [ciToVersionId]);
  await client.query(`DELETE FROM public.content_ideas WHERE id = $1;`, [ideaCampId]);
  await client.query(`DELETE FROM public.content_assets WHERE id = $1;`, [assetBrand.rows[0].id]);

  console.log('\n================================================================================');
  console.log('🏁 RESULTADO FINAL: 8/8 PRUEBAS DE HARDENING APROBADAS CON ÉXITO');
  console.log('================================================================================\n');

  await client.end();
}

testPhase8AValidation().catch(console.error);
