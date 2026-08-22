/**
 * Platform Text Validator (Fase 9C)
 * 
 * Validación técnica y semántica exhaustiva de textos, captions, hashtags,
 * CTAs y overlays para cada plataforma social.
 */

import { PlatformProfile } from '../config/platformProfiles';
import { ValidationError, ValidationWarning } from '../types/platformAdaptation';

export interface TextValidationParams {
  title?: string | null;
  hook?: string | null;
  caption?: string | null;
  hashtags?: string[] | null;
  cta?: string | null;
  sceneTexts?: Array<{ scene_number: number; on_screen_text: string }>;
}

export interface TextValidationResult {
  isValid: boolean;
  isBlocked: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export function validatePlatformTexts(
  texts: TextValidationParams,
  profile: PlatformProfile
): TextValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const title = (texts.title || '').trim();
  const caption = (texts.caption || '').trim();
  const cta = (texts.cta || '').trim();
  const hashtags = Array.isArray(texts.hashtags) ? texts.hashtags : [];
  const sceneTexts = Array.isArray(texts.sceneTexts) ? texts.sceneTexts : [];

  // 1. Validación de Título (si la plataforma lo requiere)
  if (profile.requiresTitle && !title) {
    errors.push({
      code: 'TITLE_REQUIRED',
      field: 'title',
      message: `El título es obligatorio para ${profile.name}.`,
      severity: 'error',
    });
  }

  if (profile.maxTitleLength && title.length > profile.maxTitleLength) {
    errors.push({
      code: 'TITLE_TOO_LONG',
      field: 'title',
      message: `El título excede el límite máximo de ${profile.maxTitleLength} caracteres (${title.length}).`,
      severity: 'error',
    });
  }

  // 2. Validación de Caption
  if (profile.requiresCaption && !caption) {
    errors.push({
      code: 'CAPTION_REQUIRED',
      field: 'caption',
      message: `El caption o texto principal es obligatorio para ${profile.name}.`,
      severity: 'error',
    });
  }

  if (caption) {
    if (caption.length > profile.maxCaptionLength) {
      errors.push({
        code: 'CAPTION_TOO_LONG',
        field: 'caption',
        message: `El caption excede el límite de ${profile.maxCaptionLength} caracteres (${caption.length}).`,
        severity: 'error',
      });
    }

    if (profile.minCaptionLength && caption.length < profile.minCaptionLength) {
      warnings.push({
        code: 'CAPTION_TOO_SHORT',
        field: 'caption',
        message: `El caption es muy corto para ${profile.name} (mínimo recomendado: ${profile.minCaptionLength} caracteres).`,
      });
    }

    // Detección de saltos de línea excesivos
    if ((caption.match(/\n{4,}/g) || []).length > 0) {
      warnings.push({
        code: 'EXCESSIVE_LINEBREAKS',
        field: 'caption',
        message: 'Se detectaron más de 3 saltos de línea consecutivos que podrían verse mal formateados.',
      });
    }

    // Detección de URLs mal formadas
    const urlMatches = caption.match(/(https?:\/\/[^\s]+)/g) || [];
    for (const url of urlMatches) {
      try {
        new URL(url);
      } catch {
        errors.push({
          code: 'MALFORMED_URL',
          field: 'caption',
          message: `La URL "${url}" dentro del caption tiene un formato inválido.`,
          severity: 'error',
        });
      }
    }
  }

  // 3. Validación de CTA
  if (profile.requiresCta && !cta) {
    warnings.push({
      code: 'CTA_RECOMMENDED',
      field: 'cta',
      message: `Se recomienda incluir un llamado a la acción (CTA) claro para ${profile.name}.`,
    });
  }

  // 4. Validación de Hashtags
  if (hashtags.length > profile.maxHashtags) {
    warnings.push({
      code: 'TOO_MANY_HASHTAGS',
      field: 'hashtags',
      message: `Se especificaron ${hashtags.length} hashtags; el máximo recomendado para ${profile.name} es ${profile.maxHashtags}.`,
    });
  }

  for (let i = 0; i < hashtags.length; i++) {
    const rawTag = hashtags[i];
    const tag = rawTag.startsWith('#') ? rawTag.slice(1) : rawTag;

    if (!tag || tag.trim().length === 0) {
      errors.push({
        code: 'EMPTY_HASHTAG',
        field: `hashtags[${i}]`,
        message: 'Hashtag vacío o inválido.',
        severity: 'error',
      });
    } else if (/\s/.test(tag)) {
      errors.push({
        code: 'HASHTAG_CONTAINS_SPACES',
        field: `hashtags[${i}]`,
        message: `El hashtag "#${tag}" contiene espacios y será cortado por la plataforma.`,
        severity: 'error',
      });
    } else if (/[!@$%^&*()+\-=[\]{};':"\\|,.<>/?]/.test(tag)) {
      warnings.push({
        code: 'HASHTAG_SPECIAL_CHARS',
        field: `hashtags[${i}]`,
        message: `El hashtag "#${tag}" contiene caracteres especiales que podrían romper el enlace social.`,
      });
    }
  }

  // 5. Validación de Textos en Pantalla por Escena
  for (const scene of sceneTexts) {
    const txt = (scene.on_screen_text || '').trim();
    if (!txt) continue;

    // Advertencia de longitud de overlay
    if (txt.length > 100) {
      errors.push({
        code: 'OVERLAY_TOO_LONG',
        field: 'on_screen_text',
        message: `El texto en pantalla de la Escena ${scene.scene_number} (${txt.length} caracteres) es demasiado extenso para el Safe Area de ${profile.name}.`,
        scene_number: scene.scene_number,
        severity: 'error',
      });
    }

    const lines = txt.split('\n');
    if (lines.length > profile.textRules.maxLinesPerScene) {
      warnings.push({
        code: 'TOO_MANY_OVERLAY_LINES',
        field: 'on_screen_text',
        message: `La Escena ${scene.scene_number} tiene ${lines.length} líneas de texto; se recomiendan máximo ${profile.textRules.maxLinesPerScene}.`,
        scene_number: scene.scene_number,
      });
    }

    for (const line of lines) {
      if (line.length > profile.textRules.maxLineLength) {
        warnings.push({
          code: 'OVERLAY_LINE_TOO_WIDE',
          field: 'on_screen_text',
          message: `Una línea en la Escena ${scene.scene_number} tiene ${line.length} caracteres (máx recomendado: ${profile.textRules.maxLineLength}).`,
          scene_number: scene.scene_number,
        });
      }
    }
  }

  const isBlocked = errors.some((e) => e.severity === 'error' || e.severity === 'fatal');
  const isValid = !isBlocked;

  return {
    isValid,
    isBlocked,
    errors,
    warnings,
  };
}
