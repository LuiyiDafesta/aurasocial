import { RenderPackage } from './platformAdaptation';

export type RenderJobStatus =
  | 'queued'
  | 'preparing'
  | 'rendering'
  | 'validating'
  | 'uploading'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type RenderJobStep =
  | 'queued'
  | 'preparing_assets'
  | 'rendering_scenes'
  | 'encoding_video'
  | 'validating_output'
  | 'uploading_b2'
  | 'completed'
  | 'failed';

export interface RenderOutputMetadata {
  storage_bucket: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  duration_seconds: number;
  width: number;
  height: number;
  codec: string;
  audio_codec?: string;
  sha256?: string;
  thumbnail_storage_path?: string;
  thumbnail_url?: string;
  signed_url?: string;
  is_playable?: boolean;
}

export interface ValidationGateResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: Partial<RenderOutputMetadata>;
}

export interface MissingMediaDetail {
  scene_number: number;
  slot_id?: string;
  reason: 'missing_asset' | 'missing_storage_path' | 'empty_storage_path' | 'invalid_duration';
  message: string;
}

export interface RenderMediaValidationResult {
  can_render: boolean;
  code: 'RENDER_MEDIA_VALID' | 'RENDER_MEDIA_REQUIRED';
  errors: string[];
  missing_slots: MissingMediaDetail[];
  summary_message: string;
}

export interface RenderJob {
  id: string;
  workspace_id: string;
  brand_id: string;
  campaign_id?: string | null;
  content_item_id: string;
  platform_adaptation_id: string;
  content_version_id?: string | null;
  status: RenderJobStatus;
  progress: number; // 0 a 100
  current_step: string;
  render_package_snapshot: RenderPackage;
  output_storage_path?: string | null;
  output_metadata: RenderOutputMetadata | Record<string, any>;
  error_message?: string | null;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
}
