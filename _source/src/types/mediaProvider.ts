export type MediaType = 'image' | 'video' | 'audio';

export interface GenerationParams {
  prompt: string;
  mediaType: MediaType;
  aspectRatio?: '9:16' | '1:1' | '16:9' | '4:5';
  resolution?: '720p' | '1080p' | '4k';
  durationSeconds?: number;
  negativePrompt?: string;
  stylePreset?: string;
  model?: string;
}

export interface CostEstimation {
  estimatedCostUsd: number;
  currency: string;
  provider: string;
  model: string;
  resolution?: string;
  durationSeconds?: number;
  isMock: boolean;
  costBreakdown: string;
}

export interface MediaGenerationResult {
  success: boolean;
  mediaUrl: string;
  storagePath?: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  mimeType: string;
  provider: string;
  model: string;
  costUsd: number;
  isMock: boolean;
  error?: string;
}

export interface MediaProvider {
  readonly id: string;
  readonly name: string;
  readonly supportedTypes: MediaType[];
  readonly isPaidApi: boolean;
  estimateCost(params: GenerationParams): Promise<CostEstimation>;
  generateImage(params: GenerationParams): Promise<MediaGenerationResult>;
  generateVideo(params: GenerationParams): Promise<MediaGenerationResult>;
  generateAudio(params: GenerationParams): Promise<MediaGenerationResult>;
}
