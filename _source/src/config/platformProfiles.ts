/**
 * Platform Profiles & Specifications (Fase 9C)
 * 
 * Configuración centralizada de perfiles y restricciones técnicas por plataforma.
 * No hardcodear estas reglas en componentes de interfaz.
 */

export type PlatformKey = 
  | 'instagram'
  | 'tiktok'
  | 'facebook'
  | 'linkedin'
  | 'youtube_shorts'
  | 'youtube'
  | 'x'
  | 'pinterest';

export type PlatformFormat = 'reel' | 'video' | 'post' | 'short' | 'story' | 'carousel';

export interface SafeAreaConfig {
  top: number;    // % desde el borde superior
  bottom: number; // % desde el borde inferior
  left: number;   // % desde el borde izquierdo
  right: number;  // % desde el borde derecho
}

export interface PlatformDimensionsConfig {
  width: number;
  height: number;
  aspect_ratio: '9:16' | '1:1' | '4:5' | '16:9';
}

export interface PlatformProfile {
  key: PlatformKey;
  name: string;
  defaultFormat: PlatformFormat;
  dimensions: PlatformDimensionsConfig;
  safeArea: SafeAreaConfig;
  maxCaptionLength: number;
  minCaptionLength: number;
  maxHashtags: number;
  minHashtags: number;
  requiresCaption: boolean;
  requiresCta: boolean;
  requiresTitle: boolean;
  maxTitleLength?: number;
  maxHookLength?: number;
  supportsVideo: boolean;
  supportsImage: boolean;
  allowedAspectRatios: string[];
  maxDurationSeconds: number;
  minDurationSeconds: number;
  defaultFitMode: 'cover' | 'contain' | 'stretch';
  textRules: {
    maxLineLength: number;
    maxLinesPerScene: number;
    recommendedFontSize: number;
    allowedAlignments: ('left' | 'center' | 'right')[];
  };
}

export const PLATFORM_PROFILES: Record<PlatformKey, PlatformProfile> = {
  instagram: {
    key: 'instagram',
    name: 'Instagram Reel',
    defaultFormat: 'reel',
    dimensions: {
      width: 1080,
      height: 1920,
      aspect_ratio: '9:16',
    },
    safeArea: {
      top: 14,    // Evitar barra superior / header
      bottom: 22, // Evitar caption, audio y botones inferiores
      left: 6,    // Margen lateral
      right: 18,  // Evitar barra de likes/comentarios/compartir
    },
    maxCaptionLength: 2200,
    minCaptionLength: 5,
    maxHashtags: 30,
    minHashtags: 1,
    requiresCaption: true,
    requiresCta: true,
    requiresTitle: false,
    maxTitleLength: 100,
    maxHookLength: 120,
    supportsVideo: true,
    supportsImage: true,
    allowedAspectRatios: ['9:16', '1:1', '4:5'],
    maxDurationSeconds: 90,
    minDurationSeconds: 3,
    defaultFitMode: 'cover',
    textRules: {
      maxLineLength: 35,
      maxLinesPerScene: 3,
      recommendedFontSize: 42,
      allowedAlignments: ['left', 'center', 'right'],
    },
  },

  tiktok: {
    key: 'tiktok',
    name: 'TikTok',
    defaultFormat: 'video',
    dimensions: {
      width: 1080,
      height: 1920,
      aspect_ratio: '9:16',
    },
    safeArea: {
      top: 12,    // Evitar búsqueda / tabs
      bottom: 24, // Evitar username, caption expandida y música
      left: 6,
      right: 20,  // Evitar columna de interacción derecha
    },
    maxCaptionLength: 4000,
    minCaptionLength: 3,
    maxHashtags: 10,
    minHashtags: 2,
    requiresCaption: true,
    requiresCta: false,
    requiresTitle: false,
    maxTitleLength: 80,
    maxHookLength: 100,
    supportsVideo: true,
    supportsImage: true,
    allowedAspectRatios: ['9:16'],
    maxDurationSeconds: 180,
    minDurationSeconds: 3,
    defaultFitMode: 'cover',
    textRules: {
      maxLineLength: 32,
      maxLinesPerScene: 3,
      recommendedFontSize: 44,
      allowedAlignments: ['center', 'left'],
    },
  },

  facebook: {
    key: 'facebook',
    name: 'Facebook Feed',
    defaultFormat: 'post',
    dimensions: {
      width: 1080,
      height: 1080,
      aspect_ratio: '1:1',
    },
    safeArea: {
      top: 8,
      bottom: 12,
      left: 8,
      right: 8,
    },
    maxCaptionLength: 5000,
    minCaptionLength: 5,
    maxHashtags: 15,
    minHashtags: 0,
    requiresCaption: true,
    requiresCta: true,
    requiresTitle: false,
    maxTitleLength: 120,
    maxHookLength: 150,
    supportsVideo: true,
    supportsImage: true,
    allowedAspectRatios: ['1:1', '4:5', '16:9', '9:16'],
    maxDurationSeconds: 240,
    minDurationSeconds: 1,
    defaultFitMode: 'cover',
    textRules: {
      maxLineLength: 40,
      maxLinesPerScene: 4,
      recommendedFontSize: 38,
      allowedAlignments: ['left', 'center'],
    },
  },

  linkedin: {
    key: 'linkedin',
    name: 'LinkedIn Post',
    defaultFormat: 'post',
    dimensions: {
      width: 1080,
      height: 1080,
      aspect_ratio: '1:1',
    },
    safeArea: {
      top: 6,
      bottom: 8,
      left: 6,
      right: 6,
    },
    maxCaptionLength: 3000,
    minCaptionLength: 20,
    maxHashtags: 5,
    minHashtags: 1,
    requiresCaption: true,
    requiresCta: true,
    requiresTitle: false,
    maxTitleLength: 150,
    maxHookLength: 200,
    supportsVideo: true,
    supportsImage: true,
    allowedAspectRatios: ['1:1', '4:5', '16:9'],
    maxDurationSeconds: 600,
    minDurationSeconds: 3,
    defaultFitMode: 'contain',
    textRules: {
      maxLineLength: 45,
      maxLinesPerScene: 4,
      recommendedFontSize: 36,
      allowedAlignments: ['left', 'center'],
    },
  },

  youtube_shorts: {
    key: 'youtube_shorts',
    name: 'YouTube Shorts',
    defaultFormat: 'short',
    dimensions: {
      width: 1080,
      height: 1920,
      aspect_ratio: '9:16',
    },
    safeArea: {
      top: 10,
      bottom: 20, // Evitar título de Short y barra de sonido
      left: 6,
      right: 18,  // Evitar botones laterales de YouTube Shorts
    },
    maxCaptionLength: 5000,
    minCaptionLength: 0,
    maxHashtags: 15,
    minHashtags: 1,
    requiresCaption: false,
    requiresCta: false,
    requiresTitle: true,
    maxTitleLength: 100,
    maxHookLength: 100,
    supportsVideo: true,
    supportsImage: false,
    allowedAspectRatios: ['9:16'],
    maxDurationSeconds: 60,
    minDurationSeconds: 5,
    defaultFitMode: 'cover',
    textRules: {
      maxLineLength: 30,
      maxLinesPerScene: 3,
      recommendedFontSize: 46,
      allowedAlignments: ['center'],
    },
  },

  // Perfiles Extensibles
  youtube: {
    key: 'youtube',
    name: 'YouTube Video',
    defaultFormat: 'video',
    dimensions: {
      width: 1920,
      height: 1080,
      aspect_ratio: '16:9',
    },
    safeArea: { top: 5, bottom: 8, left: 5, right: 5 },
    maxCaptionLength: 5000,
    minCaptionLength: 10,
    maxHashtags: 15,
    minHashtags: 0,
    requiresCaption: true,
    requiresCta: true,
    requiresTitle: true,
    maxTitleLength: 100,
    supportsVideo: true,
    supportsImage: false,
    allowedAspectRatios: ['16:9'],
    maxDurationSeconds: 3600,
    minDurationSeconds: 15,
    defaultFitMode: 'cover',
    textRules: {
      maxLineLength: 50,
      maxLinesPerScene: 3,
      recommendedFontSize: 40,
      allowedAlignments: ['left', 'center'],
    },
  },

  x: {
    key: 'x',
    name: 'X (Twitter)',
    defaultFormat: 'post',
    dimensions: {
      width: 1080,
      height: 1080,
      aspect_ratio: '1:1',
    },
    safeArea: { top: 5, bottom: 5, left: 5, right: 5 },
    maxCaptionLength: 280,
    minCaptionLength: 1,
    maxHashtags: 4,
    minHashtags: 0,
    requiresCaption: true,
    requiresCta: false,
    requiresTitle: false,
    supportsVideo: true,
    supportsImage: true,
    allowedAspectRatios: ['1:1', '16:9', '9:16'],
    maxDurationSeconds: 140,
    minDurationSeconds: 1,
    defaultFitMode: 'cover',
    textRules: {
      maxLineLength: 40,
      maxLinesPerScene: 2,
      recommendedFontSize: 36,
      allowedAlignments: ['left'],
    },
  },

  pinterest: {
    key: 'pinterest',
    name: 'Pinterest Pin',
    defaultFormat: 'post',
    dimensions: {
      width: 1000,
      height: 1500,
      aspect_ratio: '4:5',
    },
    safeArea: { top: 8, bottom: 8, left: 8, right: 8 },
    maxCaptionLength: 500,
    minCaptionLength: 10,
    maxHashtags: 20,
    minHashtags: 0,
    requiresCaption: true,
    requiresCta: true,
    requiresTitle: true,
    maxTitleLength: 100,
    supportsVideo: true,
    supportsImage: true,
    allowedAspectRatios: ['4:5', '9:16'],
    maxDurationSeconds: 900,
    minDurationSeconds: 4,
    defaultFitMode: 'cover',
    textRules: {
      maxLineLength: 35,
      maxLinesPerScene: 3,
      recommendedFontSize: 40,
      allowedAlignments: ['center'],
    },
  },
};

/**
 * Obtiene el perfil de plataforma normalizado.
 */
export function getPlatformProfile(platform: string): PlatformProfile {
  const normalized = platform.toLowerCase().trim() as PlatformKey;
  return PLATFORM_PROFILES[normalized] || PLATFORM_PROFILES.instagram;
}
