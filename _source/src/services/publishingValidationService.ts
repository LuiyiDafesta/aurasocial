import { PublishPackage, PublishingValidationResult, PublishingValidationError } from '../types/publishing';
import { getPlatformProfile } from '../config/platformProfiles';
import { PlatformAdaptation } from '../types/platformAdaptation';
import { RenderJob } from '../types/renderJob';
import { validateTextForPlaceholders, sanitizeAndValidateHashtags } from './copySanitizerService';

/**
 * Servicio centralizado de validación de calidad y restricciones antes de publicar (Quality Gate).
 */
export function validatePublishPackage(pkg: PublishPackage): PublishingValidationResult {
  const errors: PublishingValidationError[] = [];
  const warnings: { field: string; message: string }[] = [];

  const profile = getPlatformProfile(pkg.platform);

  // 1. Validación de Media & Render
  if (!pkg.media) {
    errors.push({ field: 'media', message: 'El paquete no incluye datos multimedia.', code: 'MISSING_MEDIA' });
  } else {
    if (!pkg.media.render_job_id) {
      errors.push({ field: 'media.render_job_id', message: 'Falta el identificador del Render Job.', code: 'MISSING_RENDER_JOB_ID' });
    }
    if (!pkg.media.storage_path || pkg.media.storage_path.trim() === '') {
      errors.push({ field: 'media.storage_path', message: 'Ruta de almacenamiento de video vacía o inexistente.', code: 'MISSING_STORAGE_PATH' });
    }
    if (pkg.media.width <= 0 || pkg.media.height <= 0) {
      errors.push({ field: 'media.dimensions', message: 'Dimensiones de video inválidas o nulas.', code: 'INVALID_DIMENSIONS' });
    }
    if (pkg.media.duration_seconds <= 0) {
      errors.push({ field: 'media.duration_seconds', message: 'Duración de video inválida (<= 0s).', code: 'INVALID_DURATION' });
    }

    // Duración máxima según plataforma
    if (pkg.media.duration_seconds > profile.maxDurationSeconds) {
      errors.push({
        field: 'media.duration_seconds',
        message: `La duración (${pkg.media.duration_seconds}s) excede el máximo permitido para ${profile.name} (${profile.maxDurationSeconds}s).`,
        code: 'DURATION_EXCEEDED',
      });
    }

    // MIME type check
    if (pkg.media.mime_type && !pkg.media.mime_type.startsWith('video/') && !pkg.media.mime_type.startsWith('image/')) {
      errors.push({
        field: 'media.mime_type',
        message: `Tipo MIME inválido: '${pkg.media.mime_type}'. Debe ser video/mp4 o imagen compatible.`,
        code: 'INVALID_MIME_TYPE',
      });
    }
  }

  // 2. Validación de Copy & Textos (Text QA)
  if (!pkg.copy) {
    errors.push({ field: 'copy', message: 'Faltan datos de copy en el paquete.', code: 'MISSING_COPY' });
  } else {
    const caption = pkg.copy.caption || '';
    const title = pkg.copy.title || '';
    const description = pkg.copy.description || '';
    const hashtags = Array.isArray(pkg.copy.hashtags) ? pkg.copy.hashtags : [];

    // Caption requerido / longitud
    if (profile.requiresCaption && caption.trim().length === 0) {
      errors.push({ field: 'copy.caption', message: `El caption es obligatorio para ${profile.name}.`, code: 'CAPTION_REQUIRED' });
    }

    if (caption.length > profile.maxCaptionLength) {
      errors.push({
        field: 'copy.caption',
        message: `El caption supera el límite de ${profile.maxCaptionLength} caracteres (longitud actual: ${caption.length}).`,
        code: 'CAPTION_TOO_LONG',
      });
    }

    // Title requerido (e.g. YouTube / Pinterest)
    if (profile.requiresTitle && title.trim().length === 0) {
      errors.push({ field: 'copy.title', message: `El título es obligatorio para ${profile.name}.`, code: 'TITLE_REQUIRED' });
    }

    if (profile.maxTitleLength && title.length > profile.maxTitleLength) {
      errors.push({
        field: 'copy.title',
        message: `El título supera el límite de ${profile.maxTitleLength} caracteres.`,
        code: 'TITLE_TOO_LONG',
      });
    }

    // Validar placeholders y términos prohibidos en caption, title y description
    const captionPlaceholders = validateTextForPlaceholders(caption, 'copy.caption');
    for (const issue of captionPlaceholders) {
      errors.push({ field: issue.field, message: issue.message, code: issue.code });
    }

    const titlePlaceholders = validateTextForPlaceholders(title, 'copy.title');
    for (const issue of titlePlaceholders) {
      errors.push({ field: issue.field, message: issue.message, code: issue.code });
    }

    const descPlaceholders = validateTextForPlaceholders(description, 'copy.description');
    for (const issue of descPlaceholders) {
      errors.push({ field: issue.field, message: issue.message, code: issue.code });
    }

    // Caracteres de control no permitidos
    // eslint-disable-next-line no-control-regex
    const controlCharsRegex = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
    if (controlCharsRegex.test(caption)) {
      errors.push({ field: 'copy.caption', message: 'El caption contiene caracteres de control no permitidos.', code: 'INVALID_CHARACTERS' });
    }

    // Detección de URLs malformadas
    const rawUrls = caption.match(/(https?:\/\/[^\s]+)/g) || [];
    for (const url of rawUrls) {
      try {
        new URL(url);
      } catch {
        errors.push({ field: 'copy.caption', message: `URL malformada en el caption: ${url}`, code: 'MALFORMED_URL' });
      }
    }

    // Validación exhaustiva de hashtags con duplicate check
    const hashtagValidation = sanitizeAndValidateHashtags(hashtags, profile.maxHashtags);
    for (const issue of hashtagValidation.issues) {
      if (issue.type === 'error') {
        errors.push({ field: 'copy.hashtags', message: issue.message, code: issue.code });
      } else {
        warnings.push({ field: 'copy.hashtags', message: issue.message });
      }
    }

    // Advertencia de CTA
    if (profile.requiresCta && !pkg.copy.cta) {
      warnings.push({
        field: 'copy.cta',
        message: `Se recomienda incluir un llamado a la acción (CTA) para optimizar la interacción en ${profile.name}.`,
      });
    }
  }

  // 3. Validación de Tenant Snapshot
  if (!pkg.source_snapshot?.brand_id || !pkg.source_snapshot?.content_item_id) {
    errors.push({ field: 'source_snapshot', message: 'El snapshot del paquete no contiene referencias válidas de marca o contenido.', code: 'CORRUPTED_SNAPSHOT' });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Valida si una adaptación y su render job están listos para generar el Publishing Package.
 */
export function validateAdaptationAndRenderForPublishing(
  adaptation: PlatformAdaptation,
  renderJob: RenderJob | null
): PublishingValidationResult {
  const errors: PublishingValidationError[] = [];
  const warnings: { field: string; message: string }[] = [];

  if (!adaptation) {
    errors.push({ field: 'adaptation', message: 'Adaptación no encontrada.', code: 'MISSING_ADAPTATION' });
    return { isValid: false, errors, warnings };
  }

  if (!renderJob) {
    errors.push({ field: 'renderJob', message: 'No existe un Render Job para esta adaptación. Debe renderizar el video primero.', code: 'NO_RENDER_JOB' });
    return { isValid: false, errors, warnings };
  }

  if (renderJob.status !== 'completed') {
    errors.push({
      field: 'renderJob.status',
      message: `El Render Job está en estado '${renderJob.status}'. Solo se pueden publicar renders completados.`,
      code: 'RENDER_NOT_COMPLETED',
    });
  }

  if (adaptation.readiness_status !== 'approved') {
    errors.push({
      field: 'adaptation.readiness_status',
      message: 'La adaptación debe ser explícitamente aprobada por el usuario antes de publicar.',
      code: 'RENDER_NOT_APPROVED',
    });
  }

  if (!renderJob.output_storage_path) {
    errors.push({ field: 'renderJob.output_storage_path', message: 'El Render Job no posee ruta de almacenamiento de video en Backblaze B2.', code: 'NO_STORAGE_PATH' });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
