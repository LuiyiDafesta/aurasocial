/**
 * Utilidades livianas de multimedia preparadas para resolver URLs
 * de previsualización o futuros assets de Backblaze B2 / Cloudflare CDN.
 */

export function getMediaUrl(pathOrUrl?: string | null): string | null {
  if (!pathOrUrl) return null;

  // Si ya es una URL completa (http/https)
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl;
  }

  // Placeholder para futuras rutas relativas de CDN
  return pathOrUrl;
}

export function isVideoContent(contentType?: string, mediaRequirements?: any): boolean {
  if (contentType?.toLowerCase().includes('video') || contentType?.toLowerCase().includes('reel') || contentType?.toLowerCase().includes('short')) {
    return true;
  }
  if (Array.isArray(mediaRequirements)) {
    return mediaRequirements.some((req: string) => typeof req === 'string' && req.toLowerCase().includes('video'));
  }
  return false;
}
