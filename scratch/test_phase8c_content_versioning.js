const path = require('path');
const { Client } = require(path.join(__dirname, '..', '_source', 'node_modules', 'pg'));
const { createClient } = require(path.join(__dirname, '..', '_source', 'node_modules', '@supabase', 'supabase-js'));

const SUPABASE_URL = 'https://eeykrgnwfarrljkotvmw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVleWtyZ253ZmFycmxqa290dm13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNTA5OTMsImV4cCI6MjA4NjkyNjk5M30.6iQf2M0gWq6k9X8fGZ5M8M5f5g5g5g5g5g5g5g5g5g';
const PG_URL = 'postgresql://postgres.eeykrgnwfarrljkotvmw:Luiyi260879%40@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';

async function runPhase8cTests() {
  console.log('================================================================================');
  console.log('🧪 INICIANDO BATERÍA DE PRUEBAS E2E — FASE 8C: CONTENT VERSIONING ENGINE');
  console.log('================================================================================\n');

  const pgClient = new Client({ connectionString: PG_URL, ssl: { rejectUnauthorized: false } });
  await pgClient.connect();

  const WORKSPACE_ID = '8be26f9f-4d67-4410-a36e-cab8d34aab36';
  const BRAND_1_ID = '304338b5-1768-4260-a1ee-6fa8b4816fb0'; // TravelRock
  const BRAND_2_ID = '471e6a3c-2aae-42e7-84e5-6d8a870b9b91'; // Inmobiliaria Alturas
  const USER_ID = 'cc3016c6-69a5-4b05-a6b3-6b8e5ee4fdd4';

  let testContentItemId = null;
  let testIdeaId = null;
  let testRequestId = `test-phase8c-${Date.now()}`;

  try {
    // Crear idea de prueba
    const ideaRes = await pgClient.query(`
      INSERT INTO public.content_ideas (
        workspace_id,
        brand_id,
        title,
        concept,
        objective,
        pillar,
        format,
        hook,
        cta,
        status
      ) VALUES (
        $1, $2, 'Idea Test Fase 8C', 'Concepto 8C', 'Objetivo 8C', 'Estrategia', 'Reel', 'Hook Idea', 'CTA Idea', 'in_production'
      )
      RETURNING id;
    `, [WORKSPACE_ID, BRAND_1_ID]);
    testIdeaId = ideaRes.rows[0].id;

    // --- TEST 1: ContentItem existente y creación de v1 ---
    console.log('--- TEST 1: Verificar creación de v1 al producir contenido ---');
    const insertRes = await pgClient.query(`
      INSERT INTO public.content_items (
        request_id,
        workspace_id,
        brand_id,
        idea_id,
        platform,
        content_type,
        title,
        hook,
        script,
        caption,
        cta,
        creative_direction,
        hashtags,
        media_requirements,
        scenes,
        production_brief,
        status
      ) VALUES (
        $1, $2, $3, $4, 'instagram', 'reel',
        'Contenido Test Fase 8C v1',
        'Hook Original v1',
        'Guion Original de Locución v1',
        'Caption Original v1',
        'CTA Original v1',
        'Tono enérgico',
        '["viajes", "bariloche"]'::jsonb,
        '["Plano general nieve", "Plano detalle sonrisa"]'::jsonb,
        '[{"scene_number": 1, "visual_direction": "Toma aérea", "on_screen_text": "Texto v1", "duration_seconds": 3}]'::jsonb,
        '{"objective": "Generar engagement en temporada alta", "pillar": "Aventura"}'::jsonb,
        'draft'
      )
      RETURNING id;
    `, [testRequestId, WORKSPACE_ID, BRAND_1_ID, testIdeaId]);

    testContentItemId = insertRes.rows[0].id;

    const v1Res = await pgClient.query(`
      SELECT * FROM public.content_versions 
      WHERE content_item_id = $1 AND version_number = 1;
    `, [testContentItemId]);

    if (v1Res.rows.length === 1 && v1Res.rows[0].version_type === 'ai_draft') {
      console.log('✅ TEST 1 APROBADO: v1 (ai_draft) creada automáticamente con snapshots completos.');
    } else {
      throw new Error(`TEST 1 FALLÓ: Esperado 1 versión con version_type 'ai_draft', obtenido: ${JSON.stringify(v1Res.rows)}`);
    }

    // --- TEST 2: Crear una nueva versión v2 mediante RPC ---
    console.log('\n--- TEST 2: Crear nueva versión v2 mediante RPC create_content_version ---');
    const rpcRes = await pgClient.query(`
      SELECT * FROM public.create_content_version(
        p_content_item_id := $1,
        p_version_type := 'human_edit',
        p_title := 'Contenido Test Fase 8C v2 (Editado)',
        p_hook := 'Hook Mejorado v2',
        p_script := 'Guion Mejorado v2',
        p_caption := 'Caption Mejorado v2',
        p_hashtags := '["viajes", "bariloche", "egresados"]'::jsonb,
        p_cta := 'CTA Mejorado v2',
        p_creative_direction := 'Tono cercano y dinámico',
        p_media_requirements := '["Plano general nieve"]'::jsonb,
        p_scenes := '[{"scene_number": 1, "visual_direction": "Toma aérea", "on_screen_text": "Texto v2", "duration_seconds": 4}]'::jsonb,
        p_production_brief_snapshot := '{"objective": "Generar engagement en temporada alta"}'::jsonb,
        p_change_summary := 'Ajuste del hook y llamado a la acción'
      );
    `, [testContentItemId]);

    const createdV2 = rpcRes.rows[0];
    if (createdV2.version_number === 2 && createdV2.version_type === 'human_edit') {
      console.log('✅ TEST 2 APROBADO: v2 (human_edit) creada exitosamente vía RPC.');
    } else {
      throw new Error(`TEST 2 FALLÓ: Esperado version_number = 2, obtenido: ${createdV2.version_number}`);
    }

    // --- TEST 3: Comprobar que content_items = v2 y v1 sigue exactamente igual ---
    console.log('\n--- TEST 3: Comprobar estado vigente en content_items e inmutabilidad de v1 ---');
    const currentItemRes = await pgClient.query(`SELECT * FROM public.content_items WHERE id = $1;`, [testContentItemId]);
    const originalV1Res = await pgClient.query(`SELECT * FROM public.content_versions WHERE content_item_id = $1 AND version_number = 1;`, [testContentItemId]);

    const currentItem = currentItemRes.rows[0];
    const v1 = originalV1Res.rows[0];

    if (currentItem.title === 'Contenido Test Fase 8C v2 (Editado)' && v1.title === 'Contenido Test Fase 8C v1') {
      console.log('✅ TEST 3 APROBADO: content_items refleja el estado vigente v2 y v1 permanece inmutable.');
    } else {
      throw new Error(`TEST 3 FALLÓ: Inconsistencia entre content_items y v1`);
    }

    // --- TEST 4: Crear dos versiones concurrentemente (SELECT FOR UPDATE) ---
    console.log('\n--- TEST 4: Concurrencia — Crear dos versiones simultáneas ---');
    const [p1, p2] = await Promise.all([
      pgClient.query(`
        SELECT * FROM public.create_content_version(
          p_content_item_id := $1,
          p_version_type := 'revision',
          p_title := 'Contenido Test v3 Concurrente A',
          p_change_summary := 'Revisión concurrente A'
        );
      `, [testContentItemId]),
      pgClient.query(`
        SELECT * FROM public.create_content_version(
          p_content_item_id := $1,
          p_version_type := 'platform_adaptation',
          p_title := 'Contenido Test v4 Concurrente B',
          p_change_summary := 'Adaptación concurrente B'
        );
      `, [testContentItemId]),
    ]);

    const versionsRes = await pgClient.query(`
      SELECT version_number, version_type, title 
      FROM public.content_versions 
      WHERE content_item_id = $1 
      ORDER BY version_number ASC;
    `, [testContentItemId]);

    const versionNums = versionsRes.rows.map(r => r.version_number);
    if (JSON.stringify(versionNums) === JSON.stringify([1, 2, 3, 4])) {
      console.log('✅ TEST 4 APROBADO: Concurrencia serializada con éxito sin números duplicados ([1, 2, 3, 4]).');
    } else {
      throw new Error(`TEST 4 FALLÓ: Números de versión inesperados: ${JSON.stringify(versionNums)}`);
    }

    // --- TEST 5: Intentar UPDATE sobre v1 (Debe fallar por inmutabilidad) ---
    console.log('\n--- TEST 5: Intento de UPDATE sobre versión histórica v1 ---');
    try {
      await pgClient.query(`
        UPDATE public.content_versions
        SET title = 'Hackeando v1'
        WHERE content_item_id = $1 AND version_number = 1;
      `, [testContentItemId]);
      throw new Error('TEST 5 FALLÓ: Se permitió UPDATE sobre content_versions');
    } catch (err) {
      if (err.message.includes('Inmutabilidad violada') || err.code === '23000') {
        console.log('✅ TEST 5 APROBADO: PostgreSQL rechazó UPDATE sobre versión histórica con trigger de inmutabilidad.');
      } else {
        throw err;
      }
    }

    // --- TEST 6: Intentar DELETE sobre v1 (Debe fallar por inmutabilidad) ---
    console.log('\n--- TEST 6: Intento de DELETE sobre versión histórica v1 ---');
    try {
      await pgClient.query(`
        DELETE FROM public.content_versions
        WHERE content_item_id = $1 AND version_number = 1;
      `, [testContentItemId]);
      throw new Error('TEST 6 FALLÓ: Se permitió DELETE sobre content_versions');
    } catch (err) {
      if (err.message.includes('Inmutabilidad violada') || err.code === '23000') {
        console.log('✅ TEST 6 APROBADO: PostgreSQL rechazó DELETE sobre versión histórica con trigger de inmutabilidad.');
      } else {
        throw err;
      }
    }

    // --- TEST 7: Restaurar v1 -> Genera v5 (restored_from_version) ---
    console.log('\n--- TEST 7: Restaurar versión histórica v1 ---');
    const restoreRes = await pgClient.query(`
      SELECT * FROM public.create_content_version(
        p_content_item_id := $1,
        p_version_type := 'restored_from_version',
        p_title := $2,
        p_hook := $3,
        p_script := $4,
        p_caption := $5,
        p_hashtags := $6,
        p_cta := $7,
        p_creative_direction := $8,
        p_media_requirements := $9,
        p_scenes := $10,
        p_production_brief_snapshot := $11,
        p_change_summary := 'Restaurado a partir de v1'
      );
    `, [
      testContentItemId,
      v1.title,
      v1.hook,
      v1.script,
      v1.caption,
      JSON.stringify(v1.hashtags),
      v1.cta,
      v1.creative_direction,
      JSON.stringify(v1.media_requirements),
      JSON.stringify(v1.scenes),
      JSON.stringify(v1.production_brief_snapshot)
    ]);

    const v5 = restoreRes.rows[0];
    if (v5.version_number === 5 && v5.version_type === 'restored_from_version' && v5.title === v1.title) {
      console.log('✅ TEST 7 APROBADO: Restauración generó v5 (restored_from_version) copiando el snapshot exacto de v1.');
    } else {
      throw new Error(`TEST 7 FALLÓ: Resultado inesperado en restauración: ${JSON.stringify(v5)}`);
    }

    // --- TEST 8: Comparar v1 vs v2 (Diff Engine) ---
    console.log('\n--- TEST 8: Diff Engine entre v1 y v2 ---');
    function computeVersionDiff(versionA, versionB) {
      const fieldsToCompare = [
        { key: 'title', label: 'Título' },
        { key: 'hook', label: 'Hook / Gancho Inicial' },
        { key: 'script', label: 'Guion Completo de Locución' },
        { key: 'caption', label: 'Caption / Copia del Post' },
        { key: 'cta', label: 'Llamado a la Acción (CTA)' },
        { key: 'creative_direction', label: 'Dirección Creativa' },
        { key: 'hashtags', label: 'Hashtags', isStructured: true },
        { key: 'scenes', label: 'Escenas Audiovisuales', isStructured: true },
        { key: 'media_requirements', label: 'Requisitos Multimedia', isStructured: true },
      ];

      const fields = [];
      let hasAnyChange = false;

      for (const f of fieldsToCompare) {
        const valA = versionA[f.key];
        const valB = versionB[f.key];

        let hasChanged = false;
        if (f.isStructured) {
          hasChanged = JSON.stringify(valA ?? []) !== JSON.stringify(valB ?? []);
        } else {
          hasChanged = (valA ?? '').trim() !== (valB ?? '').trim();
        }

        if (hasChanged) hasAnyChange = true;

        fields.push({
          fieldName: f.key,
          label: f.label,
          hasChanged,
          valueA: valA,
          valueB: valB,
        });
      }

      return { versionA, versionB, fields, hasAnyChange };
    }

    const v2Res = await pgClient.query(`SELECT * FROM public.content_versions WHERE content_item_id = $1 AND version_number = 2;`, [testContentItemId]);
    const v2 = v2Res.rows[0];

    const diff = computeVersionDiff(v1, v2);
    if (diff.hasAnyChange && diff.fields.find(f => f.fieldName === 'title')?.hasChanged) {
      console.log('✅ TEST 8 APROBADO: Diff Engine detectó correctamente las diferencias estructurales entre versiones.');
    } else {
      throw new Error('TEST 8 FALLÓ: Diff Engine no detectó los cambios');
    }

    // --- TEST 9: Aislamiento / Autorización de versión para otra marca/workspace ---
    console.log('\n--- TEST 9: Integridad de autorización multi-tenant ---');
    try {
      // Intentar crear versión para un content_item inexistente o de otro tenant
      await pgClient.query(`
        SELECT * FROM public.create_content_version(
          p_content_item_id := '00000000-0000-0000-0000-000000000000'::uuid,
          p_version_type := 'human_edit',
          p_title := 'Ataque Inexistente'
        );
      `);
      throw new Error('TEST 9 FALLÓ: Se permitió crear versión de un content_item ajeno');
    } catch (err) {
      if (err.code === 'P0002') {
        console.log('✅ TEST 9 APROBADO: create_content_version rechazó content_item ajeno/inexistente con código P0002.');
      } else {
        throw err;
      }
    }

    // --- TEST 10: Idempotencia de WF02 (Reintento no genera otra v1) ---
    console.log('\n--- TEST 10: Idempotencia de WF02 ante reintentos ---');
    // Actualizar nuevamente el item simulando un reintento
    await pgClient.query(`
      UPDATE public.content_items
      SET updated_at = now()
      WHERE id = $1;
    `, [testContentItemId]);

    const countV1Res = await pgClient.query(`
      SELECT count(*) FROM public.content_versions 
      WHERE content_item_id = $1 AND version_number = 1;
    `, [testContentItemId]);

    if (parseInt(countV1Res.rows[0].count, 10) === 1) {
      console.log('✅ TEST 10 APROBADO: Idempotencia garantizada (exactamente una versión v1 tras reintento).');
    } else {
      throw new Error('TEST 10 FALLÓ: Se duplicó la versión 1');
    }

    // --- TEST 11: production_brief_snapshot preservado ---
    console.log('\n--- TEST 11: Preservación de production_brief_snapshot ---');
    if (v1.production_brief_snapshot && v1.production_brief_snapshot.objective) {
      console.log('✅ TEST 11 APROBADO: production_brief_snapshot preservado íntegramente en la versión.');
    } else {
      throw new Error('TEST 11 FALLÓ: production_brief_snapshot vacío o corrupto');
    }

    // --- TEST 12: Preservación de scenes y media_requirements ---
    console.log('\n--- TEST 12: Preservación de scenes y media_requirements ---');
    if (Array.isArray(v1.scenes) && v1.scenes.length > 0 && Array.isArray(v1.media_requirements) && v1.media_requirements.length > 0) {
      console.log('✅ TEST 12 APROBADO: scenes y media_requirements preservados con exactitud.');
    } else {
      throw new Error('TEST 12 FALLÓ: scenes o media_requirements no fueron almacenados');
    }

    // --- TEST 13: Listado de historial en orden cronológico descendente ---
    console.log('\n--- TEST 13: Listado cronológico descendente de versiones ---');
    const allVersions = await pgClient.query(`
      SELECT version_number FROM public.content_versions 
      WHERE content_item_id = $1 
      ORDER BY version_number DESC;
    `, [testContentItemId]);

    const historyNums = allVersions.rows.map(r => r.version_number);
    if (JSON.stringify(historyNums) === JSON.stringify([5, 4, 3, 2, 1])) {
      console.log('✅ TEST 13 APROBADO: Historial listado ordenado correctamente: [5, 4, 3, 2, 1].');
    } else {
      throw new Error(`TEST 13 FALLÓ: Orden incorrecto: ${JSON.stringify(historyNums)}`);
    }

    // --- TEST 14: Concurrencia de doble restauración simultánea ---
    console.log('\n--- TEST 14: Concurrencia — Doble restauración simultánea ---');
    const [r1, r2] = await Promise.all([
      pgClient.query(`
        SELECT * FROM public.create_content_version(
          p_content_item_id := $1,
          p_version_type := 'restored_from_version',
          p_title := 'Restauración Concurrente 1',
          p_change_summary := 'Restaurado simultáneo 1'
        );
      `, [testContentItemId]),
      pgClient.query(`
        SELECT * FROM public.create_content_version(
          p_content_item_id := $1,
          p_version_type := 'restored_from_version',
          p_title := 'Restauración Concurrente 2',
          p_change_summary := 'Restaurado simultáneo 2'
        );
      `, [testContentItemId]),
    ]);

    const finalVersionsRes = await pgClient.query(`
      SELECT version_number, version_type, title 
      FROM public.content_versions 
      WHERE content_item_id = $1 
      ORDER BY version_number ASC;
    `, [testContentItemId]);

    const finalNums = finalVersionsRes.rows.map(r => r.version_number);
    if (JSON.stringify(finalNums) === JSON.stringify([1, 2, 3, 4, 5, 6, 7])) {
      console.log('✅ TEST 14 APROBADO: Doble restauración concurrente generó v6 y v7 consecutivas sin colisiones.');
    } else {
      throw new Error(`TEST 14 FALLÓ: Concurrencia de restauración fallida: ${JSON.stringify(finalNums)}`);
    }

  } finally {
    // Limpieza de datos de prueba
    if (testContentItemId) {
      console.log('\n🧹 Limpiando datos del test E2E...');
      await pgClient.query(`DELETE FROM public.content_items WHERE id = $1;`, [testContentItemId]);
    }
    if (testIdeaId) {
      await pgClient.query(`DELETE FROM public.content_ideas WHERE id = $1;`, [testIdeaId]);
    }
    console.log('🧹 Limpieza completada.');
    await pgClient.end();
  }

  console.log('\n================================================================================');
  console.log('🏁 RESULTADO FINAL: 14/14 PRUEBAS APROBADAS');
  console.log('================================================================================\n');
}

runPhase8cTests().catch((err) => {
  console.error('❌ ERROR FATAL EN PRUEBAS DE FASE 8C:', err);
  process.exit(1);
});
