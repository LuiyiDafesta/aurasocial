/**
 * Local Video Renderer Engine (Fase 9A - Corrección Final)
 * 
 * Motor de renderizado y composición de video local utilizando FFmpeg en el entorno.
 * Genera archivos MP4 reales (H.264 / AAC) reproducibles fuera de AuraSocial
 * con costo $0 en APIs de IA y sin dependencias externas pagas.
 */

import { RenderOutput, SceneMediaPlan } from '../types/platformAdaptation';

export interface LocalVideoRenderOptions {
  outputPath: string;
  width?: number;
  height?: number;
  fps?: number;
  durationSeconds?: number;
  brandName: string;
  scenes: SceneMediaPlan[];
  caption?: string;
  cta?: string;
  fontPath?: string;
}

export interface LocalVideoProbeResult {
  filename: string;
  format: string;
  durationSeconds: number;
  fileSizeBytes: number;
  videoCodec: string;
  audioCodec?: string;
  width: number;
  height: number;
  aspectRatio: string;
  fps: number;
  isPlayable: boolean;
}

/**
 * Genera la configuración de comando para FFmpeg determinista
 */
export function buildFFmpegRenderCommand(options: LocalVideoRenderOptions): {
  command: string;
  args: string[];
} {
  const width = options.width || 1080;
  const height = options.height || 1920;
  const fps = options.fps || 30;
  const totalDuration = options.durationSeconds || Math.max(5, options.scenes.reduce((acc, s) => acc + (s.duration_seconds || 5), 0));
  const fontFile = options.fontPath || 'C\\:/Windows/Fonts/arial.ttf';

  const primaryText = options.scenes.find((s) => s.on_screen_text && s.on_screen_text.trim())?.on_screen_text?.replace(/'/g, "\\'") || options.brandName;
  const ctaText = (options.cta || 'Seguinos para más').replace(/'/g, "\\'");

  const filterString = [
    `drawtext=fontfile='${fontFile}':text='${options.brandName.toUpperCase()}':fontcolor=0xc084fc:fontsize=36:x=(w-text_w)/2:y=h*0.12`,
    `drawtext=fontfile='${fontFile}':text='${primaryText}':fontcolor=white:fontsize=44:x=(w-text_w)/2:y=h*0.48`,
    `drawtext=fontfile='${fontFile}':text='${ctaText}':fontcolor=0xa855f7:fontsize=28:x=(w-text_w)/2:y=h*0.88`,
  ].join(',');

  const args = [
    '-y',
    '-f', 'lavfi',
    '-i', `color=c=0x0f172a:s=${width}x${height}:d=${totalDuration}:r=${fps}`,
    '-f', 'lavfi',
    '-i', 'anullsrc=r=44100:cl=stereo',
    '-vf', filterString,
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-shortest',
    options.outputPath,
  ];

  return {
    command: 'ffmpeg',
    args,
  };
}

/**
 * Crea metadatos de RenderOutput compatibles con el pipeline de AuraSocial
 */
export function createLocalRenderOutput(
  outputPath: string,
  probeResult: LocalVideoProbeResult,
  scenes: SceneMediaPlan[]
): RenderOutput {
  return {
    renderer_version: 'ffmpeg-2025.07.01-deterministic',
    media_url: outputPath,
    storage_path: `renders/${outputPath.replace(/^.*[\\/]/, '')}`,
    thumbnail_url: outputPath,
    mime_type: 'video/mp4',
    width: probeResult.width,
    height: probeResult.height,
    duration_seconds: probeResult.durationSeconds,
    file_size_bytes: probeResult.fileSizeBytes,
    format: 'reel',
    input_assets: scenes.map((s) => ({
      scene_number: s.scene_number,
      asset_id: s.asset_id || null,
      asset_name: s.asset_name || null,
      source: s.source,
      storage_path: s.storage_path || null,
    })),
    is_mock: false,
    rendered_at: new Date().toISOString(),
  };
}
