import { SocialPlatform } from '../types/publishing';

export interface SafeAreaZone {
  name: string;
  description: string;
  topPercent: number;
  bottomPercent: number;
  leftPercent: number;
  rightPercent: number;
}

export interface PlatformSafeAreaProfile {
  platform: SocialPlatform;
  hasVerticalSafeAreas: boolean;
  topMarginPercent: number;
  bottomMarginPercent: number;
  leftMarginPercent: number;
  rightMarginPercent: number;
  description: string;
  uiElements: {
    top: string;
    bottom: string;
    right: string;
    left: string;
  };
}

export const PLATFORM_SAFE_AREAS: Record<SocialPlatform, PlatformSafeAreaProfile> = {
  instagram: {
    platform: 'instagram',
    hasVerticalSafeAreas: true,
    topMarginPercent: 14,
    bottomMarginPercent: 22,
    leftMarginPercent: 5,
    rightMarginPercent: 18,
    description: 'Instagram Reel Safe Area: Protege textos y logos de la barra superior de audio y la botonera lateral derecha.',
    uiElements: {
      top: 'Cámara, Audio, Barra de estado (14%)',
      bottom: 'Avatar, Nombre de usuario, Caption, Audio ticker (22%)',
      right: 'Me gusta, Comentarios, Compartir, Guardar, Disco de audio (18%)',
      left: 'Margen de seguridad estándar (5%)',
    },
  },
  tiktok: {
    platform: 'tiktok',
    hasVerticalSafeAreas: true,
    topMarginPercent: 12,
    bottomMarginPercent: 26,
    leftMarginPercent: 5,
    rightMarginPercent: 20,
    description: 'TikTok Video Safe Area: Protege la zona central de las pestañas superiores y el panel de interacción derecho.',
    uiElements: {
      top: 'Pestañas Siguiendo / Para ti, Buscar (12%)',
      bottom: '@usuario, Descripción, Hashtags, Canción en rotación (26%)',
      right: 'Avatar con +, Corazón, Comentarios, Favorito, Compartir, Disco giratorio (20%)',
      left: 'Margen de seguridad estándar (5%)',
    },
  },
  youtube: {
    platform: 'youtube',
    hasVerticalSafeAreas: true,
    topMarginPercent: 12,
    bottomMarginPercent: 20,
    leftMarginPercent: 5,
    rightMarginPercent: 18,
    description: 'YouTube Shorts Safe Area: Protege contra la barra de búsqueda superior y los controles de Shorts.',
    uiElements: {
      top: 'Búsqueda, Cámara Shorts (12%)',
      bottom: 'Canal, Botón Suscribirse, Título, Audio (20%)',
      right: 'Me gusta, No me gusta, Comentarios, Compartir, Remix (18%)',
      left: 'Margen de seguridad estándar (5%)',
    },
  },
  facebook: {
    platform: 'facebook',
    hasVerticalSafeAreas: false,
    topMarginPercent: 0,
    bottomMarginPercent: 0,
    leftMarginPercent: 0,
    rightMarginPercent: 0,
    description: 'Facebook Feed (1:1 / 4:5): Todo el canvas del video se reproduce directamente en el feed.',
    uiElements: {
      top: 'Ninguno (Directo en feed)',
      bottom: 'Barra de reproducción estándar',
      right: 'Ninguno',
      left: 'Ninguno',
    },
  },
  linkedin: {
    platform: 'linkedin',
    hasVerticalSafeAreas: false,
    topMarginPercent: 0,
    bottomMarginPercent: 0,
    leftMarginPercent: 0,
    rightMarginPercent: 0,
    description: 'LinkedIn Post (1:1 / 16:9): Todo el canvas del video se reproduce en el contenedor del post profesional.',
    uiElements: {
      top: 'Ninguno (Directo en feed)',
      bottom: 'Barra de controles de video',
      right: 'Ninguno',
      left: 'Ninguno',
    },
  },
};

export function getPlatformSafeArea(platform: SocialPlatform): PlatformSafeAreaProfile {
  return PLATFORM_SAFE_AREAS[platform] || PLATFORM_SAFE_AREAS.instagram;
}
