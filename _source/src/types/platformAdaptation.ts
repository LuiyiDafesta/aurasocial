export type TargetPlatform =
  | 'instagram'
  | 'tiktok'
  | 'facebook'
  | 'linkedin'
  | 'youtube'
  | 'x'
  | 'other';

export type TargetFormat =
  | 'reel'
  | 'post'
  | 'story'
  | 'carousel'
  | 'video'
  | 'short';

export type AssetResolutionSource =
  | 'real_asset'
  | 'campaign_asset'
  | 'brand_asset'
  | 'stock'
  | 'placeholder'
  | 'ai_mock'
  | 'needs_asset';

export type RenderStatus = 'not_started' | 'rendering' | 'rendered' | 'failed';
export type ValidationStatus = 'pending' | 'valid' | 'blocked';

export type ReadinessStatus =
  | 'draft'
  | 'rendering'
  | 'needs_assets'
  | 'blocked'
  | 'render_failed'
  | 'valid'
  | 'approved'
  | 'published';

export interface PlatformDimensions {
  width: number;
  height: number;
  aspect_ratio: string; // '9:16' | '1:1' | '16:9' | '4:5'
}

export interface SafeAreaMargins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface PlatformConstraints {
  platform: TargetPlatform;
  format: TargetFormat;
  maxCaptionLength: number;
  minCaptionLength?: number;
  supportsVideo: boolean;
  supportsImage: boolean;
  supportsCarousel?: boolean;
  allowedAspectRatios: string[];
  maxDurationSeconds?: number;
  minDurationSeconds?: number;
  safeAreaMargins: SafeAreaMargins;
  requiresCaption: boolean;
  requiresCta: boolean;
  allowedMediaTypes: string[];
}

export interface SceneMediaPlan {
  scene_number: number;
  asset_type: 'video' | 'image' | 'audio';
  description: string;
  visual_direction?: string;
  camera_direction?: string;
  duration_seconds: number;
  on_screen_text?: string;
  voiceover?: string;
  transition?: string;
  source: AssetResolutionSource;
  asset_id?: string | null;
  asset_name?: string | null;
  asset_url?: string | null;
  storage_path?: string | null;
  mime_type?: string | null;
  safe_area_valid: boolean;
  safe_area_warning?: string | null;
  status: 'resolved' | 'needs_asset' | 'error';
}

export interface ValidationError {
  code: string;
  field: string;
  message: string;
  scene_number?: number;
  severity: 'error' | 'fatal';
}

export interface ValidationWarning {
  code: string;
  field: string;
  message: string;
  scene_number?: number;
}

export interface ValidationResult {
  isValid: boolean;
  isBlocked: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  validatedAt: string;
}

export interface RenderInputAsset {
  scene_number: number;
  asset_id?: string | null;
  asset_name?: string | null;
  source: string;
  storage_path?: string | null;
}

export interface RenderOutput {
  renderer_version: string;
  media_url: string;
  storage_path?: string;
  thumbnail_url?: string;
  mime_type: string;
  width: number;
  height: number;
  duration_seconds?: number;
  file_size_bytes: number;
  format: string;
  input_assets: RenderInputAsset[];
  is_mock: boolean;
  rendered_at: string;
}

export interface PublicationPackageMedia {
  render_url: string;
  thumbnail_url?: string;
  aspect_ratio: string;
  width: number;
  height: number;
  duration_seconds?: number;
  scenes: SceneMediaPlan[];
  render_metadata?: RenderOutput;
}

export interface PublicationPackage {
  package_id: string;
  content_item_id: string;
  content_version_id?: string | null;
  campaign_id?: string | null;
  version_number: number;
  platform: TargetPlatform;
  format: TargetFormat;
  brand_id: string;
  workspace_id: string;
  title: string;
  caption: string;
  hashtags: string[];
  cta: string;
  media: PublicationPackageMedia;
  text_overlays: Array<{
    scene_number: number;
    text: string;
    safe_area_valid: boolean;
  }>;
  brand_profile: {
    brand_name: string;
    handle?: string;
    avatar_url?: string;
  };
  validation_snapshot: ValidationResult;
  readiness_status: ReadinessStatus;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at: string;
}

export interface PlatformAdaptation {
  id: string;
  workspace_id: string;
  brand_id: string;
  campaign_id?: string | null;
  content_item_id: string;
  content_version_id?: string | null;
  platform: TargetPlatform;
  format: TargetFormat;
  dimensions: PlatformDimensions;
  target_duration_seconds?: number | null;
  caption?: string | null;
  hashtags?: string[];
  cta?: string | null;
  scene_mappings: SceneMediaPlan[];
  render_status: RenderStatus;
  render_output: RenderOutput;
  validation_status: ValidationStatus;
  validation_errors: ValidationError[];
  validation_warnings: ValidationWarning[];
  readiness_status: ReadinessStatus;
  approved_by?: string | null;
  approved_at?: string | null;
  publication_package: PublicationPackage | Record<string, any>;
  created_at: string;
  updated_at: string;
}
