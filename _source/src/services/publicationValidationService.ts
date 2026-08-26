import {
  TargetPlatform,
  TargetFormat,
  PlatformConstraints,
  PlatformAdaptation,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  SceneMediaPlan,
} from '../types/platformAdaptation';
import { getPlatformProfile } from '../config/platformProfiles';

/**
 * Diccionario centralizado de restricciones por plataforma (Fase 9A)
 */
export const PLATFORM_CONSTRAINTS: Record<string, PlatformConstraints> = {
  'instagram_reel': {
    platform: 'instagram',
    format: 'reel',
    maxCaptionLength: 2200,
    supportsVideo: true,
    supportsImage: false,
    allowedAspectRatios: ['9:16'],
    maxDurationSeconds: 90,
    minDurationSeconds: 3,
    safeAreaMargins: { top: 15, bottom: 20, left: 5, right: 15 },
    requiresCaption: false,
    requiresCta: false,
    allowedMediaTypes: ['video/mp4', 'video/quicktime'],
  },
  'instagram_post': {
    platform: 'instagram',
    format: 'post',
    maxCaptionLength: 2200,
    supportsVideo: false,
    supportsImage: true,
    supportsCarousel: true,
    allowedAspectRatios: ['1:1', '4:5', '9:16'],
    safeAreaMargins: { top: 5, bottom: 5, left: 5, right: 5 },
    requiresCaption: false,
    requiresCta: false,
    allowedMediaTypes: ['image/jpeg', 'image/png', 'image/svg+xml'],
  },
  'tiktok_video': {
    platform: 'tiktok',
    format: 'video',
    maxCaptionLength: 2200,
    supportsVideo: true,
    supportsImage: false,
    allowedAspectRatios: ['9:16'],
    maxDurationSeconds: 60,
    minDurationSeconds: 3,
    safeAreaMargins: { top: 15, bottom: 25, left: 5, right: 20 },
    requiresCaption: false,
    requiresCta: false,
    allowedMediaTypes: ['video/mp4'],
  },
  'facebook_post': {
    platform: 'facebook',
    format: 'post',
    maxCaptionLength: 63206,
    supportsVideo: true,
    supportsImage: true,
    allowedAspectRatios: ['1:1', '16:9', '4:5', '9:16'],
    safeAreaMargins: { top: 5, bottom: 5, left: 5, right: 5 },
    requiresCaption: false,
    requiresCta: false,
    allowedMediaTypes: ['image/jpeg', 'image/png', 'video/mp4', 'image/svg+xml'],
  },
  'facebook_reel': {
    platform: 'facebook',
    format: 'reel',
    maxCaptionLength: 63206,
    supportsVideo: true,
    supportsImage: false,
    allowedAspectRatios: ['9:16'],
    maxDurationSeconds: 90,
    minDurationSeconds: 3,
    safeAreaMargins: { top: 15, bottom: 20, left: 5, right: 15 },
    requiresCaption: false,
    requiresCta: false,
    allowedMediaTypes: ['video/mp4'],
  },
  'linkedin_post': {
    platform: 'linkedin',
    format: 'post',
    maxCaptionLength: 3000,
    supportsVideo: true,
    supportsImage: true,
    allowedAspectRatios: ['1:1', '16:9', '4:5'],
    maxDurationSeconds: 60,
    minDurationSeconds: 3,
    safeAreaMargins: { top: 5, bottom: 5, left: 5, right: 5 },
    requiresCaption: true,
    requiresCta: false,
    allowedMediaTypes: ['image/jpeg', 'image/png', 'video/mp4', 'image/svg+xml'],
  },
  'youtube_shorts_short': {
    platform: 'youtube_shorts',
    format: 'short',
    maxCaptionLength: 5000,
    supportsVideo: true,
    supportsImage: false,
    allowedAspectRatios: ['9:16'],
    maxDurationSeconds: 60,
    minDurationSeconds: 5,
    safeAreaMargins: { top: 10, bottom: 20, left: 6, right: 18 },
    requiresCaption: false,
    requiresCta: false,
    allowedMediaTypes: ['video/mp4'],
  },
  'youtube_video': {
    platform: 'youtube',
    format: 'video',
    maxCaptionLength: 5000,
    supportsVideo: true,
    supportsImage: false,
    allowedAspectRatios: ['16:9'],
    maxDurationSeconds: 3600,
    minDurationSeconds: 15,
    safeAreaMargins: { top: 5, bottom: 8, left: 5, right: 5 },
    requiresCaption: true,
    requiresCta: true,
    allowedMediaTypes: ['video/mp4'],
  },
  'x_post': {
    platform: 'x',
    format: 'post',
    maxCaptionLength: 280,
    supportsVideo: true,
    supportsImage: true,
    allowedAspectRatios: ['1:1', '16:9', '9:16'],
    maxDurationSeconds: 140,
    minDurationSeconds: 1,
    safeAreaMargins: { top: 5, bottom: 5, left: 5, right: 5 },
    requiresCaption: true,
    requiresCta: false,
    allowedMediaTypes: ['image/jpeg', 'image/png', 'video/mp4'],
  },
  'pinterest_post': {
    platform: 'pinterest',
    format: 'post',
    maxCaptionLength: 500,
    supportsVideo: true,
    supportsImage: true,
    allowedAspectRatios: ['4:5', '9:16'],
    maxDurationSeconds: 900,
    minDurationSeconds: 4,
    safeAreaMargins: { top: 8, bottom: 8, left: 8, right: 8 },
    requiresCaption: true,
    requiresCta: true,
    allowedMediaTypes: ['image/jpeg', 'image/png', 'video/mp4'],
  },
};

export function getPlatformConstraints(platform: TargetPlatform, format: TargetFormat): PlatformConstraints {
  const key = `${platform}_${format}`;
  if (PLATFORM_CONSTRAINTS[key]) {
    return PLATFORM_CONSTRAINTS[key];
  }

  const profile = getPlatformProfile(platform);

  return {
    platform,
    format,
    maxCaptionLength: profile.maxCaptionLength || 2200,
    supportsVideo: profile.supportsVideo ?? true,
    supportsImage: profile.supportsImage ?? true,
    allowedAspectRatios: (profile.allowedAspectRatios as any) || ['9:16', '1:1', '16:9', '4:5'],
    maxDurationSeconds: profile.maxDurationSeconds || 60,
    minDurationSeconds: profile.minDurationSeconds || 1,
    safeAreaMargins: { 
      top: profile.safeArea?.top || 10, 
      bottom: profile.safeArea?.bottom || 15, 
      left: profile.safeArea?.left || 5, 
      right: profile.safeArea?.right || 10 
    },
    requiresCaption: profile.requiresCaption ?? false,
    requiresCta: profile.requiresCta ?? false,
    allowedMediaTypes: ['image/jpeg', 'image/png', 'video/mp4', 'image/svg+xml'],
  };
}

/**
 * Validador de Safe Text Layout con mensajes accionables (Fase 9A.8 / 9A.15)
 */
export function validateSafeTextLayout(
  text: string,
  sceneNumber: number
): { isValid: boolean; warning?: string; action?: string } {
  if (!text || !text.trim()) return { isValid: true };

  const lines = text.split('\n');
  if (lines.length > 4) {
    return {
      isValid: false,
      warning: `El texto de la Escena ${sceneNumber} tiene ${lines.length} líneas, superando el límite seguro de 4 líneas.`,
      action: 'Reducir el texto o dividirlo en varias escenas.',
    };
  }

  if (text.length > 100) {
    return {
      isValid: false,
      warning: `El texto de la Escena ${sceneNumber} tiene ${text.length} caracteres, superando el límite seguro de 100 caracteres por pantalla.`,
      action: 'Abreviar el mensaje o reducir el tamaño tipográfico.',
    };
  }

  return { isValid: true };
}

/**
 * Motor Central de Validación de Publicaciones (Fase 9A.8)
 */
export function validatePlatformAdaptation(
  adaptation: Partial<PlatformAdaptation>,
  scenes: SceneMediaPlan[]
): ValidationResult {
  const platform = adaptation.platform || 'instagram';
  const format = adaptation.format || 'reel';
  const constraints = getPlatformConstraints(platform, format);

  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // 1. VALIDACIÓN DE TEXTO
  const caption = (adaptation.caption || '').trim();

  if (constraints.requiresCaption && !caption) {
    errors.push({
      code: 'CAPTION_REQUIRED',
      field: 'caption',
      message: `La plataforma ${platform.toUpperCase()} requiere un texto/caption de publicación obligatorio.`,
      severity: 'error',
    });
  }

  if (caption.length > constraints.maxCaptionLength) {
    errors.push({
      code: 'CAPTION_TOO_LONG',
      field: 'caption',
      message: `El caption excede el límite máximo de ${constraints.maxCaptionLength} caracteres permitido en ${platform} (actual: ${caption.length}).`,
      severity: 'error',
    });
  }

  if (/\{\{[^}]*\}\}/.test(caption)) {
    warnings.push({
      code: 'UNRESOLVED_TEMPLATE_TAG',
      field: 'caption',
      message: 'El caption contiene posibles etiquetas de plantilla sin reemplazar (ej. {{...}}).',
    });
  }

  const hashtags = Array.isArray(adaptation.hashtags) ? adaptation.hashtags : [];
  for (const tag of hashtags) {
    if (typeof tag !== 'string' || !tag.trim()) continue;
    const cleanTag = tag.startsWith('#') ? tag.slice(1) : tag;
    if (/\s/.test(cleanTag) || /[!@$%^&*()+=[\]{};':"\\|,.<>/?]/.test(cleanTag)) {
      errors.push({
        code: 'INVALID_HASHTAG_FORMAT',
        field: 'hashtags',
        message: `El hashtag "#${cleanTag}" contiene espacios o caracteres especiales no permitidos.`,
        severity: 'error',
      });
    }
  }

  // 2. VALIDACIÓN DE MEDIA & ESCENAS
  if (!scenes || scenes.length === 0) {
    errors.push({
      code: 'NO_SCENES_DEFINED',
      field: 'scenes',
      message: 'La adaptación no cuenta con escenas ni especificaciones de media definidas.',
      severity: 'fatal',
    });
  } else {
    for (const scene of scenes) {
      if (scene.status === 'needs_asset' || !scene.asset_url || scene.source === 'needs_asset') {
        errors.push({
          code: 'SCENE_MISSING_ASSET',
          field: 'scene_mappings',
          scene_number: scene.scene_number,
          message: `La Escena ${scene.scene_number} no tiene un recurso multimedia asignado (NEEDS_ASSET).`,
          severity: 'fatal',
        });
      }

      if (scene.mime_type) {
        const isMimeAllowed = constraints.allowedMediaTypes.some((m) =>
          scene.mime_type?.toLowerCase().includes(m.split('/')[1]) || scene.mime_type === m
        );
        if (!isMimeAllowed) {
          errors.push({
            code: 'UNSUPPORTED_MIME_TYPE',
            field: 'scene_mappings',
            scene_number: scene.scene_number,
            message: `El formato '${scene.mime_type}' de la Escena ${scene.scene_number} no es soportado por ${platform} ${format}.`,
            severity: 'error',
          });
        }
      }

      if (scene.on_screen_text) {
        const safeCheck = validateSafeTextLayout(scene.on_screen_text, scene.scene_number);
        if (!safeCheck.isValid) {
          errors.push({
            code: 'TEXT_OVERLAY_OVERFLOW',
            field: 'scene_mappings',
            scene_number: scene.scene_number,
            message: `${safeCheck.warning} Acción sugerida: ${safeCheck.action}`,
            severity: 'error',
          });
        }
      }
    }
  }

  // 3. VALIDACIÓN DE DURACIÓN FINAL (Quality Gate)
  const totalDuration = (scenes || []).reduce(
    (sum, scene) => sum + Number(scene.duration_seconds || 0),
    0
  );
  const maxDuration = constraints.maxDurationSeconds;
  const minDuration = constraints.minDurationSeconds || 1;
  const epsilon = 0.01;

  if (typeof maxDuration === 'number' && maxDuration > 0 && totalDuration > maxDuration + epsilon) {
    const formattedTotal = Number(totalDuration.toFixed(2));
    errors.push({
      code: 'DURATION_EXCEEDED',
      field: 'target_duration_seconds',
      message: `Duración excedida: ${formattedTotal}s / ${maxDuration}s para ${platform.toUpperCase()} (${format.toUpperCase()}).`,
      severity: 'error',
    });
  }

  if (typeof minDuration === 'number' && minDuration > 0 && totalDuration < minDuration - epsilon && (scenes || []).length > 0) {
    const formattedTotal = Number(totalDuration.toFixed(2));
    warnings.push({
      code: 'DURATION_TOO_SHORT',
      field: 'target_duration_seconds',
      message: `La duración total (${formattedTotal}s) es menor al mínimo sugerido de ${minDuration}s para ${platform.toUpperCase()}.`,
    });
  }

  // 4. VALIDACIÓN DE RENDER & DIMENSIONES
  const aspectRatio = adaptation.dimensions?.aspect_ratio || '9:16';
  if (!constraints.allowedAspectRatios.includes(aspectRatio)) {
    errors.push({
      code: 'INVALID_ASPECT_RATIO',
      field: 'dimensions',
      message: `La relación de aspecto '${aspectRatio}' no es óptima para ${platform} ${format} (admitidas: ${constraints.allowedAspectRatios.join(', ')}).`,
      severity: 'error',
    });
  }

  if (adaptation.render_status === 'failed') {
    errors.push({
      code: 'RENDER_FAILED',
      field: 'render_status',
      message: 'El renderizado final de la pieza falló o contiene errores en los archivos fuente.',
      severity: 'fatal',
    });
  }

  const isBlocked = errors.some(
    (e) => e.severity === 'fatal' || e.severity === 'error' || e.code === 'DURATION_EXCEEDED' || e.code === 'SCENE_MISSING_ASSET' || e.code === 'TEXT_OVERLAY_OVERFLOW'
  );
  const isValid = errors.length === 0 && !isBlocked;

  return {
    isValid,
    isBlocked,
    errors,
    warnings,
    validatedAt: new Date().toISOString(),
  };
}
