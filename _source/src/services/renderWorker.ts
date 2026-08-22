import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { RenderPackage } from '../types/platformAdaptation';
import { RenderJobStep, RenderOutputMetadata, ValidationGateResult } from '../types/renderJob';
import { B2_CONFIG, b2Client } from '../lib/b2Storage';
import { supabase } from '../lib/supabase';

export interface WorkerRenderOptions {
  jobId: string;
  renderPackage: RenderPackage;
  workspaceId: string;
  brandId: string;
  contentItemId: string;
  platformAdaptationId: string;
  contentVersionId?: string | null;
  brandName?: string;
  onProgress?: (step: RenderJobStep, progress: number, details?: string) => Promise<void>;
}

export interface WorkerRenderResult {
  jobId: string;
  storagePath: string;
  thumbnailStoragePath: string;
  signedUrl: string;
  thumbnailSignedUrl: string;
  metadata: RenderOutputMetadata;
}

/**
 * Divide un texto en líneas cortas respetando palabras para evitar desbordes en Safe Area.
 */
export function wrapText(text: string, maxLineLength = 32): string[] {
  if (!text) return [];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxLineLength) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Escapa strings para filtros drawtext de FFmpeg en Windows / Linux.
 */
export function escapeFFmpegText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/:/g, '\\:')
    .replace(/%/g, '\\%')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');
}

/**
 * Valida un archivo de video MP4 generado mediante ffprobe.
 */
export function validateRenderedOutput(
  filePath: string,
  expectedResolution: { width: number; height: number },
  expectedDurationSeconds: number
): ValidationGateResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!fs.existsSync(filePath)) {
    return {
      valid: false,
      errors: [`El archivo de render no existe: ${filePath}`],
      warnings: [],
    };
  }

  const stat = fs.statSync(filePath);
  if (stat.size === 0) {
    return {
      valid: false,
      errors: ['El archivo de render está vacío (0 bytes).'],
      warnings: [],
    };
  }

  // Cálculo de hash SHA-256
  const fileBuffer = fs.readFileSync(filePath);
  const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

  let probeData: any = {};
  try {
    const probeOut = execSync(
      `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`,
      { stdio: 'pipe' }
    ).toString();
    probeData = JSON.parse(probeOut);
  } catch (err: any) {
    return {
      valid: false,
      errors: [`Error al inspeccionar video con ffprobe: ${err.message}`],
      warnings: [],
    };
  }

  const videoStream = (probeData.streams || []).find((s: any) => s.codec_type === 'video');
  const audioStream = (probeData.streams || []).find((s: any) => s.codec_type === 'audio');
  const format = probeData.format || {};

  if (!videoStream) {
    errors.push('El archivo generado no contiene ningún stream de video.');
  } else {
    // 1. Codec Video
    if (videoStream.codec_name !== 'h264') {
      errors.push(`Codec de video inesperado: ${videoStream.codec_name} (se esperaba h264).`);
    }

    // 2. Pixel Format
    if (videoStream.pix_fmt !== 'yuv420p') {
      warnings.push(`Pixel format ${videoStream.pix_fmt} podría no ser reproducible en todos los navegadores (recomendado: yuv420p).`);
    }

    // 3. Resolución
    if (videoStream.width !== expectedResolution.width || videoStream.height !== expectedResolution.height) {
      errors.push(
        `Resolución incorrecta: ${videoStream.width}x${videoStream.height} (se esperaba ${expectedResolution.width}x${expectedResolution.height}).`
      );
    }
  }

  // 4. Duración
  const actualDuration = parseFloat(format.duration || videoStream?.duration || '0');
  const durationDiff = Math.abs(actualDuration - expectedDurationSeconds);
  if (durationDiff > 1.5) {
    errors.push(
      `Duración fuera de tolerancia: ${actualDuration.toFixed(2)}s (se esperaba ${expectedDurationSeconds}s, diff: ${durationDiff.toFixed(2)}s).`
    );
  }

  // 5. Codec Audio
  if (audioStream && audioStream.codec_name !== 'aac') {
    warnings.push(`Codec de audio ${audioStream.codec_name} (recomendado: aac).`);
  }

  const valid = errors.length === 0;

  return {
    valid,
    errors,
    warnings,
    metadata: {
      storage_bucket: B2_CONFIG.bucketName,
      size_bytes: stat.size,
      duration_seconds: actualDuration,
      width: videoStream?.width || expectedResolution.width,
      height: videoStream?.height || expectedResolution.height,
      codec: videoStream?.codec_name || 'h264',
      audio_codec: audioStream?.codec_name || 'aac',
      sha256,
      is_playable: valid,
    },
  };
}

/**
 * Worker Determinista de Renderizado (Fase 9D)
 */
export async function executeRenderWorker(options: WorkerRenderOptions): Promise<WorkerRenderResult> {
  const {
    jobId,
    renderPackage,
    workspaceId,
    brandId,
    contentItemId,
    platformAdaptationId,
    onProgress,
  } = options;

  const tempDir = path.resolve(process.cwd(), 'temp_renders', jobId);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const updateProgress = async (step: RenderJobStep, prog: number, details?: string) => {
    if (onProgress) {
      await onProgress(step, prog, details);
    }
    // Actualizar PostgreSQL
    await supabase
      .from('render_jobs')
      .update({
        status: prog === 100 ? 'completed' : 'rendering',
        progress: prog,
        current_step: step,
        started_at: prog > 0 ? new Date().toISOString() : null,
      })
      .eq('id', jobId);
  };

  try {
    // -------------------------------------------------------------
    // ETAPA 1: Preparación y descarga de Assets desde Backblaze B2
    // -------------------------------------------------------------
    await updateProgress('preparing_assets', 15, 'Descargando y verificando assets desde Backblaze B2');

    const scenes = renderPackage.scenes || [];
    const targetWidth = renderPackage.resolution.width;
    const targetHeight = renderPackage.resolution.height;
    const totalExpectedDuration = renderPackage.duration_seconds || scenes.reduce((acc, s) => acc + s.duration_seconds, 0);

    const sceneFileMap: Array<{ sceneNumber: number; localFilePath: string; isImage: boolean; duration: number; textOverlay?: string; fitMode: string }> = [];

    for (const scene of scenes) {
      const duration = scene.duration_seconds || 4;
      const fitMode = scene.fit_mode || 'cover';
      const textOverlay = scene.text_overlay?.text || '';

      let localAssetPath = '';
      let isImage = true;

      if (scene.asset && scene.asset.storage_path) {
        const storagePath = scene.asset.storage_path;
        const ext = path.extname(storagePath) || '.mp4';
        const destPath = path.join(tempDir, `asset_scene_${scene.scene_number}${ext}`);

        // Descargar desde Backblaze B2
        try {
          const getCmd = new GetObjectCommand({
            Bucket: B2_CONFIG.bucketName,
            Key: storagePath,
          });
          const b2Res = await b2Client.send(getCmd);
          if (b2Res.Body) {
            const byteArray = await b2Res.Body.transformToByteArray();
            fs.writeFileSync(destPath, Buffer.from(byteArray));
            localAssetPath = destPath;
            isImage = /\.(jpe?g|png|webp|gif|svg)$/i.test(ext);
          }
        } catch (err: any) {
          console.warn(`Aviso: No se pudo descargar asset de B2 (${storagePath}): ${err.message}. Se utilizará fondo determinista.`);
        }
      }

      // Si no hay asset descargado, crear canvas de color sólido de fondo
      if (!localAssetPath || !fs.existsSync(localAssetPath)) {
        const bgPath = path.join(tempDir, `bg_scene_${scene.scene_number}.png`);
        // Generar imagen de fondo determinista vía FFmpeg
        execSync(
          `ffmpeg -y -f lavfi -i color=c=0x0f172a:s=${targetWidth}x${targetHeight}:d=1 -vframes 1 "${bgPath}"`,
          { stdio: 'pipe' }
        );
        localAssetPath = bgPath;
        isImage = true;
      }

      sceneFileMap.push({
        sceneNumber: scene.scene_number,
        localFilePath: localAssetPath,
        isImage,
        duration,
        textOverlay,
        fitMode,
      });
    }

    // -------------------------------------------------------------
    // ETAPA 2: Composición de Clips de Escena individuales
    // -------------------------------------------------------------
    await updateProgress('rendering_scenes', 40, 'Componiendo escenas con safe areas y tipografía');

    const fontFile = 'C\\:/Windows/Fonts/arial.ttf';
    const safeArea = renderPackage.safe_area || { top: 10, bottom: 20, left: 6, right: 18 };
    const safeYRatio = ((safeArea.top + (100 - safeArea.bottom)) / 200).toFixed(2);

    const renderedScenePaths: string[] = [];

    for (let i = 0; i < sceneFileMap.length; i++) {
      const item = sceneFileMap[i];
      const sceneOutputPath = path.join(tempDir, `scene_${String(item.sceneNumber).padStart(3, '0')}.mp4`);

      // Filtro de escalado y encuadre
      let scaleFilter = '';
      if (item.fitMode === 'contain') {
        scaleFilter = `scale=w='if(gt(a,${targetWidth}/${targetHeight}),${targetWidth},-2)':h='if(gt(a,${targetWidth}/${targetHeight}),-2,${targetHeight})',pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2:color=0x0f172a`;
      } else {
        // cover
        scaleFilter = `scale=w='if(gt(a,${targetWidth}/${targetHeight}),-2,${targetWidth})':h='if(gt(a,${targetWidth}/${targetHeight}),${targetHeight},-2)',crop=${targetWidth}:${targetHeight}`;
      }

      // Overlays de texto con wrapping dentro de Safe Area
      const filterParts: string[] = [scaleFilter];

      if (item.textOverlay) {
        const wrappedLines = wrapText(item.textOverlay, 28);
        const fontSize = 42;
        const lineSpacing = 52;
        const startY = `(h*${safeYRatio}) - ${(wrappedLines.length * lineSpacing) / 2}`;

        for (let l = 0; l < wrappedLines.length; l++) {
          const lineTxt = escapeFFmpegText(wrappedLines[l]);
          const currentY = `${startY} + ${l * lineSpacing}`;
          filterParts.push(
            `drawtext=fontfile='${fontFile}':text='${lineTxt}':fontcolor=white:fontsize=${fontSize}:box=1:boxcolor=black@0.65:boxborderw=12:x=(w-text_w)/2:y=${currentY}`
          );
        }
      }

      const fullFilter = filterParts.join(',');

      // Ejecutar render de la escena
      if (item.isImage) {
        const cmd = `ffmpeg -y -loop 1 -i "${item.localFilePath}" -f lavfi -i anullsrc=r=44100:cl=stereo -vf "${fullFilter}" -c:v libx264 -t ${item.duration} -pix_fmt yuv420p -r 30 -c:a aac -shortest "${sceneOutputPath}"`;
        execSync(cmd, { stdio: 'pipe' });
      } else {
        const cmd = `ffmpeg -y -i "${item.localFilePath}" -vf "${fullFilter}" -c:v libx264 -t ${item.duration} -pix_fmt yuv420p -r 30 -c:a aac -shortest "${sceneOutputPath}"`;
        execSync(cmd, { stdio: 'pipe' });
      }

      renderedScenePaths.push(sceneOutputPath);
    }

    // -------------------------------------------------------------
    // ETAPA 3: Concatenación y Codificación de Video Final
    // -------------------------------------------------------------
    await updateProgress('encoding_video', 70, 'Codificando MP4 H.264 / AAC faststart');

    const concatListPath = path.join(tempDir, 'concat_list.txt');
    const concatContent = renderedScenePaths
      .map((p) => `file '${p.replace(/\\/g, '/')}'`)
      .join('\n');
    fs.writeFileSync(concatListPath, concatContent);

    const finalRenderPath = path.join(tempDir, 'render.mp4');

    // Concat demuxer
    const concatCmd = `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c:v libx264 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart "${finalRenderPath}"`;
    execSync(concatCmd, { stdio: 'pipe' });

    // -------------------------------------------------------------
    // ETAPA 4: Validación con ffprobe (Quality Gate)
    // -------------------------------------------------------------
    await updateProgress('validating_output', 85, 'Validando resolución, codecs y reproducibilidad con ffprobe');

    const validation = validateRenderedOutput(
      finalRenderPath,
      renderPackage.resolution,
      totalExpectedDuration
    );

    if (!validation.valid) {
      throw new Error(`Fallo de Quality Gate en render: ${validation.errors.join('; ')}`);
    }

    // -------------------------------------------------------------
    // ETAPA 5: Generación de Thumbnail y Upload a Backblaze B2
    // -------------------------------------------------------------
    await updateProgress('uploading_b2', 95, 'Generando thumbnail y subiendo MP4 a Backblaze B2');

    const thumbnailPath = path.join(tempDir, 'thumbnail.jpg');
    execSync(
      `ffmpeg -y -ss 00:00:00.500 -i "${finalRenderPath}" -vframes 1 -q:v 2 "${thumbnailPath}"`,
      { stdio: 'pipe' }
    );

    const platformKey = renderPackage.platform || 'instagram';
    const outputStoragePath = `renders/${workspaceId}/${brandId}/${contentItemId}/${platformKey}/${platformAdaptationId}/${jobId}/render.mp4`;
    const thumbStoragePath = `renders/${workspaceId}/${brandId}/${contentItemId}/${platformKey}/${platformAdaptationId}/${jobId}/thumbnail.jpg`;

    // Upload Video a B2
    const videoData = fs.readFileSync(finalRenderPath);
    await b2Client.send(
      new PutObjectCommand({
        Bucket: B2_CONFIG.bucketName,
        Key: outputStoragePath,
        Body: videoData,
        ContentType: 'video/mp4',
      })
    );

    // Upload Thumbnail a B2
    const thumbData = fs.readFileSync(thumbnailPath);
    await b2Client.send(
      new PutObjectCommand({
        Bucket: B2_CONFIG.bucketName,
        Key: thumbStoragePath,
        Body: thumbData,
        ContentType: 'image/jpeg',
      })
    );

    // Generar Signed URLs para previsualización inmediata
    const signedUrl = await getSignedUrl(
      b2Client,
      new GetObjectCommand({ Bucket: B2_CONFIG.bucketName, Key: outputStoragePath }),
      { expiresIn: 3600 }
    );
    const thumbSignedUrl = await getSignedUrl(
      b2Client,
      new GetObjectCommand({ Bucket: B2_CONFIG.bucketName, Key: thumbStoragePath }),
      { expiresIn: 3600 }
    );

    const meta = validation.metadata || {};
    const finalMetadata: RenderOutputMetadata = {
      storage_bucket: B2_CONFIG.bucketName,
      storage_path: outputStoragePath,
      mime_type: 'video/mp4',
      size_bytes: meta.size_bytes || 0,
      duration_seconds: meta.duration_seconds || 0,
      width: meta.width || targetWidth,
      height: meta.height || targetHeight,
      codec: meta.codec || 'h264',
      audio_codec: meta.audio_codec || 'aac',
      sha256: meta.sha256 || '',
      thumbnail_storage_path: thumbStoragePath,
      thumbnail_url: thumbSignedUrl,
      signed_url: signedUrl,
      is_playable: true,
    };

    // -------------------------------------------------------------
    // ETAPA 6: Completado y actualización de Estado en DB
    // -------------------------------------------------------------
    await updateProgress('completed', 100, 'Render completado exitosamente');

    await supabase
      .from('render_jobs')
      .update({
        status: 'completed',
        progress: 100,
        current_step: 'completed',
        output_storage_path: outputStoragePath,
        output_metadata: finalMetadata,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    await supabase
      .from('platform_adaptations')
      .update({
        render_status: 'rendered',
        readiness_status: 'valid',
        render_output: {
          renderer_version: 'ffmpeg-2025.07.01-deterministic',
          media_url: signedUrl,
          storage_path: outputStoragePath,
          thumbnail_url: thumbSignedUrl,
          mime_type: 'video/mp4',
          width: finalMetadata.width,
          height: finalMetadata.height,
          duration_seconds: finalMetadata.duration_seconds,
          file_size_bytes: finalMetadata.size_bytes,
          format: renderPackage.format,
          input_assets: scenes.map((s) => ({
            scene_number: s.scene_number,
            asset_id: s.asset?.asset_id || null,
            asset_name: s.asset?.asset_name || null,
            source: s.asset?.asset_id ? 'real_asset' : 'needs_asset',
            storage_path: s.asset?.storage_path || null,
          })),
          is_mock: false,
          rendered_at: new Date().toISOString(),
        },
      })
      .eq('id', platformAdaptationId);

    return {
      jobId,
      storagePath: outputStoragePath,
      thumbnailStoragePath: thumbStoragePath,
      signedUrl,
      thumbnailSignedUrl: thumbSignedUrl,
      metadata: finalMetadata,
    };
  } catch (err: any) {
    console.error(`Error en Render Worker [Job ${jobId}]:`, err);
    await supabase
      .from('render_jobs')
      .update({
        status: 'failed',
        error_message: err.message || 'Error desconocido durante renderizado',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    await supabase
      .from('platform_adaptations')
      .update({
        render_status: 'failed',
      })
      .eq('id', platformAdaptationId);

    throw err;
  } finally {
    // -------------------------------------------------------------
    // ETAPA 7: Limpieza de archivos temporales (Cleanup estricto)
    // -------------------------------------------------------------
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (cleanErr) {
      console.warn(`Aviso: Error durante limpieza de carpeta temporal ${tempDir}:`, cleanErr);
    }
  }
}
