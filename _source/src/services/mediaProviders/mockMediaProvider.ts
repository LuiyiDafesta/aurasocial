import {
  MediaProvider,
  MediaType,
  GenerationParams,
  CostEstimation,
  MediaGenerationResult,
} from '../../types/mediaProvider';

/**
 * Proveedor Multimedia Mock (Fase 9A)
 * Garantiza CERO COSTO de APIs de IA mientras proporciona estimaciones
 * de costos realistas para futura comparación entre OpenAI, Runway, Veo, etc.
 */
export class MockMediaProvider implements MediaProvider {
  readonly id = 'mock-media-provider';
  readonly name = 'Aura Deterministic Mock Provider (Zero Cost)';
  readonly supportedTypes: MediaType[] = ['image', 'video', 'audio'];
  readonly isPaidApi = false;

  async estimateCost(params: GenerationParams): Promise<CostEstimation> {
    const duration = params.durationSeconds || (params.mediaType === 'video' ? 6 : 0);
    const resolution = params.resolution || (params.aspectRatio === '9:16' ? '1080p' : '720p');

    let unitRate = 0.05; // $0.05 USD por segundo en 720p base
    if (resolution === '1080p') unitRate = 0.08;
    if (resolution === '4k') unitRate = 0.15;

    let baseCost = 0.04; // Imagen base $0.04 USD
    if (params.mediaType === 'video') {
      baseCost = parseFloat((duration * unitRate).toFixed(2));
    } else if (params.mediaType === 'audio') {
      baseCost = parseFloat((duration * 0.01).toFixed(2));
    }

    return {
      estimatedCostUsd: baseCost,
      currency: 'USD',
      provider: 'Mock Engine (Simulación de Proveedor IA)',
      model: params.model || (params.mediaType === 'video' ? 'aura-video-v1-fast' : 'aura-image-v1-hd'),
      resolution,
      durationSeconds: duration,
      isMock: true,
      costBreakdown: `${params.mediaType.toUpperCase()} ${resolution} (${duration}s) @ $${unitRate}/s = $${baseCost} USD (Costo Real Ejecutado: $0.00)`,
    };
  }

  async generateImage(params: GenerationParams): Promise<MediaGenerationResult> {
    const width = params.aspectRatio === '9:16' ? 1080 : params.aspectRatio === '16:9' ? 1920 : 1080;
    const height = params.aspectRatio === '9:16' ? 1920 : params.aspectRatio === '16:9' ? 1080 : 1080;

    // Generar un SVG data URI limpio y determinista con el prompt
    const svgContent = encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0f172a" />
            <stop offset="50%" stop-color="#1e1b4b" />
            <stop offset="100%" stop-color="#311042" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad)" />
        <rect x="40" y="40" width="${width - 80}" height="${height - 80}" fill="none" stroke="#7c3aed" stroke-width="3" stroke-dasharray="8 8" opacity="0.6" rx="24" />
        <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" fill="#c084fc" font-family="system-ui, sans-serif" font-size="32" font-weight="700">AURA MEDIA ASSET</text>
        <text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="20">${params.aspectRatio || '1:1'} • ${width}x${height}</text>
        <text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="16" opacity="0.8">${params.prompt.slice(0, 50)}...</text>
      </svg>
    `);

    return {
      success: true,
      mediaUrl: `data:image/svg+xml;utf8,${svgContent}`,
      width,
      height,
      mimeType: 'image/svg+xml',
      provider: this.id,
      model: 'deterministic-mock-image-v1',
      costUsd: 0.0, // Cero costo estricto
      isMock: true,
    };
  }

  async generateVideo(params: GenerationParams): Promise<MediaGenerationResult> {
    const width = params.aspectRatio === '9:16' ? 1080 : 1920;
    const height = params.aspectRatio === '9:16' ? 1920 : 1080;
    const duration = params.durationSeconds || 6;

    // Generar placeholder SVG representativo para preview de video
    const svgContent = encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <defs>
          <linearGradient id="vgrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#020617" />
            <stop offset="50%" stop-color="#111827" />
            <stop offset="100%" stop-color="#1e1b4b" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#vgrad)" />
        <circle cx="50%" cy="48%" r="60" fill="#7c3aed" opacity="0.3" />
        <polygon points="${width / 2 - 15},${height / 2 - 35} ${width / 2 - 15},${height / 2 + 5} ${width / 2 + 25},${height / 2 - 15}" fill="#ffffff" />
        <text x="50%" y="60%" dominant-baseline="middle" text-anchor="middle" fill="#c084fc" font-family="system-ui, sans-serif" font-size="28" font-weight="700">VIDEO RENDER (${duration}s)</text>
        <text x="50%" y="66%" dominant-baseline="middle" text-anchor="middle" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="18">${width}x${height} • ${params.aspectRatio || '9:16'}</text>
      </svg>
    `);

    return {
      success: true,
      mediaUrl: `data:image/svg+xml;utf8,${svgContent}`,
      width,
      height,
      durationSeconds: duration,
      mimeType: 'video/mp4',
      provider: this.id,
      model: 'deterministic-mock-video-v1',
      costUsd: 0.0, // Cero costo estricto
      isMock: true,
    };
  }

  async generateAudio(params: GenerationParams): Promise<MediaGenerationResult> {
    return {
      success: true,
      mediaUrl: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=',
      durationSeconds: params.durationSeconds || 5,
      mimeType: 'audio/wav',
      provider: this.id,
      model: 'deterministic-mock-voiceover-v1',
      costUsd: 0.0,
      isMock: true,
    };
  }
}

export const defaultMockMediaProvider = new MockMediaProvider();
