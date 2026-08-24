/**
 * Servicio determinista de sanitización, validación y formateo de textos de publicación.
 * No utiliza IA ni dependencias externas.
 */

export interface TextValidationIssue {
  type: 'error' | 'warning';
  code: string;
  message: string;
  field: string;
}

/**
 * Patrones de placeholders y textos accidentales que deben ser detectados.
 */
const FORBIDDEN_PLACEHOLDER_PATTERNS = [
  { regex: /\bundefined\b/i, code: 'CONTAINS_UNDEFINED', message: 'El texto contiene el término literal "undefined".' },
  { regex: /\bnull\b/i, code: 'CONTAINS_NULL', message: 'El texto contiene el término literal "null".' },
  { regex: /\{\{.*?\}\}/g, code: 'UNRESOLVED_VARIABLE', message: 'El texto contiene variables sin resolver (ej. {{variable}}).' },
  { regex: /\[INSERTAR.*?\]/i, code: 'UNRESOLVED_PLACEHOLDER', message: 'El texto contiene instrucciones de plantilla (ej. [INSERTAR TEXTO]).' },
  { regex: /\[AGREGAR.*?\]/i, code: 'UNRESOLVED_PLACEHOLDER', message: 'El texto contiene placeholders (ej. [AGREGAR LINK]).' },
  { regex: /\bTODO\b/i, code: 'CONTAINS_TODO', message: 'El texto contiene marcas de tareas pendientes ("TODO:").' },
  { regex: /\bPLACEHOLDER\b/i, code: 'CONTAINS_PLACEHOLDER', message: 'El texto contiene la palabra clave "PLACEHOLDER".' },
];

/**
 * Limpia y normaliza deterministamente el texto para publicación.
 * - Normaliza espacios en blanco continuos.
 * - Normaliza saltos de línea (máximo 2 consecutivos).
 * - Elimina etiquetas HTML no deseadas.
 * - Remueve caracteres de control extraños conservando emojis y caracteres acentuados.
 * - Conserva puntuación y ortografía original.
 */
export function sanitizePublicationText(text: string | null | undefined): string {
  if (!text) return '';

  let cleaned = text;

  // 1. Eliminar etiquetas HTML accidentales (ej. <p>, <br/>, <span>)
  cleaned = cleaned.replace(/<[^>]*>/g, '');

  // 2. Normalizar retornos de carro Windows / Unix
  cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 3. Reemplazar espacios múltiples en la misma línea por un único espacio
  cleaned = cleaned.replace(/[^\S\n]+/g, ' ');

  // 4. Limitar saltos de línea a máximo 2 consecutivos
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // 5. Eliminar caracteres de control invisibles no permitidos (manteniendo saltos de línea y tabulaciones)
  // eslint-disable-next-line no-control-regex
  cleaned = cleaned.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');

  return cleaned.trim();
}

/**
 * Valida si un texto contiene placeholders o términos prohibidos.
 */
export function validateTextForPlaceholders(text: string | null | undefined, fieldName = 'caption'): TextValidationIssue[] {
  if (!text) return [];

  const issues: TextValidationIssue[] = [];

  for (const pattern of FORBIDDEN_PLACEHOLDER_PATTERNS) {
    if (pattern.regex.test(text)) {
      issues.push({
        type: 'error',
        code: pattern.code,
        message: pattern.message,
        field: fieldName,
      });
    }
  }

  // Detección de JSON accidental no parseado
  if (text.trim().startsWith('{') && text.trim().endsWith('}') && text.includes('":')) {
    try {
      JSON.parse(text);
      issues.push({
        type: 'error',
        code: 'ACCIDENTAL_JSON',
        message: 'El texto parece ser una estructura JSON sin procesar.',
        field: fieldName,
      });
    } catch {
      // No es JSON válido, continuar
    }
  }

  return issues;
}

/**
 * Valida y limpia la lista de hashtags asegurando formato, unicidad y límites.
 */
export function sanitizeAndValidateHashtags(hashtags: string[] | null | undefined, maxLimit = 30): {
  validHashtags: string[];
  issues: TextValidationIssue[];
} {
  const issues: TextValidationIssue[] = [];
  if (!hashtags || !Array.isArray(hashtags)) {
    return { validHashtags: [], issues };
  }

  const seen = new Set<string>();
  const validHashtags: string[] = [];

  for (const rawTag of hashtags) {
    if (!rawTag || typeof rawTag !== 'string') continue;

    const trimmed = rawTag.trim();
    if (trimmed === '' || trimmed === '#') {
      issues.push({
        type: 'warning',
        code: 'EMPTY_HASHTAG',
        message: 'Se encontró un hashtag vacío.',
        field: 'hashtags',
      });
      continue;
    }

    const normalizedTag = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
    const tagBody = normalizedTag.slice(1);

    // Validar espacios dentro del hashtag
    if (/\s/.test(tagBody)) {
      issues.push({
        type: 'error',
        code: 'HASHTAG_CONTAINS_SPACES',
        message: `El hashtag '${normalizedTag}' contiene espacios no permitidos.`,
        field: 'hashtags',
      });
      continue;
    }

    // Validar símbolos especiales no permitidos en hashtags de redes sociales
    if (/[!@$%^&*()+=[\]{};':"\\|,.<>/?]/.test(tagBody)) {
      issues.push({
        type: 'error',
        code: 'HASHTAG_INVALID_SYMBOLS',
        message: `El hashtag '${normalizedTag}' contiene signos de puntuación o símbolos no permitidos.`,
        field: 'hashtags',
      });
      continue;
    }

    // Validar duplicados
    const lowerKey = normalizedTag.toLowerCase();
    if (seen.has(lowerKey)) {
      issues.push({
        type: 'warning',
        code: 'DUPLICATE_HASHTAG',
        message: `El hashtag '${normalizedTag}' está duplicado.`,
        field: 'hashtags',
      });
      continue;
    }

    seen.add(lowerKey);
    validHashtags.push(normalizedTag);
  }

  if (validHashtags.length > maxLimit) {
    issues.push({
      type: 'warning',
      code: 'HASHTAG_LIMIT_EXCEEDED',
      message: `Se supera el límite recomendado de ${maxLimit} hashtags (total: ${validHashtags.length}).`,
      field: 'hashtags',
    });
  }

  return { validHashtags, issues };
}

/**
 * Ensambla el texto de publicación completa de forma limpia y consistente.
 * Une título, hook/descripción, caption, hashtags y CTA sin filtrar ningún campo técnico ni de scoring.
 */
export function formatFullPublicationText(params: {
  title?: string | null;
  caption?: string | null;
  hashtags?: string[] | null;
  description?: string | null;
  cta?: string | null;
}): string {
  const { title, caption, hashtags, description, cta } = params;
  const sections: string[] = [];

  if (title) {
    const cleanTitle = sanitizePublicationText(title);
    if (cleanTitle) sections.push(cleanTitle);
  }

  if (description) {
    const cleanDesc = sanitizePublicationText(description);
    if (cleanDesc && cleanDesc !== title && cleanDesc !== caption) {
      sections.push(cleanDesc);
    }
  }

  if (caption) {
    const cleanCaption = sanitizePublicationText(caption);
    if (cleanCaption) sections.push(cleanCaption);
  }

  if (hashtags && Array.isArray(hashtags) && hashtags.length > 0) {
    const { validHashtags } = sanitizeAndValidateHashtags(hashtags);
    if (validHashtags.length > 0) {
      sections.push(validHashtags.join(' '));
    }
  }

  if (cta) {
    const cleanCta = sanitizePublicationText(cta);
    if (cleanCta) sections.push(cleanCta);
  }

  return sections.join('\n\n');
}
