/**
 * Plataformas sociales soportadas por AuraSocial
 */
export type SocialPlatform =
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  | 'youtube'
  | 'linkedin';

/**
 * Estados de conexión de canales sociales
 */
export type SocialConnectionStatus =
  | 'mock_connected'
  | 'connected'
  | 'disconnected'
  | 'expired'
  | 'revoked';

/**
 * Conexión o cuenta social de una marca
 */
export interface SocialConnection {
  id: string;
  workspace_id: string;
  brand_id: string;
  platform: SocialPlatform;
  account_id?: string | null;
  account_name?: string | null;
  account_username?: string | null;
  status: SocialConnectionStatus;
  access_token_encrypted?: string | null;
  refresh_token_encrypted?: string | null;
  token_expires_at?: string | null;
  scopes: string[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

/**
 * Paquete de publicación canónico e inmutable (Snapshot)
 */
export interface PublishPackageMedia {
  render_job_id: string;
  storage_bucket: string;
  storage_path: string;
  thumbnail_storage_path?: string;
  thumbnail_url?: string;
  signed_url?: string;
  mime_type: string;
  width: number;
  height: number;
  duration_seconds: number;
  sha256?: string;
}

export interface PublishPackageCopy {
  caption: string;
  title?: string | null;
  description?: string | null;
  hashtags: string[];
  cta?: string | null;
}

export interface PublishPackage {
  platform: SocialPlatform;
  platform_adaptation_id: string;
  media: PublishPackageMedia;
  copy: PublishPackageCopy;
  publishing_options: Record<string, any>;
  campaign_context: {
    campaign_id?: string | null;
    campaign_name?: string | null;
  };
  source_snapshot: {
    content_item_id: string;
    content_version_id?: string | null;
    brand_id: string;
    brand_name?: string;
  };
  created_at: string;
}

/**
 * Estados del flujo de Publishing Outbox
 */
export type OutboxStatus =
  | 'draft'
  | 'ready'
  | 'queued'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'cancelled';

/**
 * Registro de salida de publicación (Publishing Outbox)
 */
export interface PublishingOutboxEntry {
  id: string;
  workspace_id: string;
  brand_id: string;
  campaign_id?: string | null;
  content_item_id: string;
  platform_adaptation_id: string;
  render_job_id: string;
  social_connection_id?: string | null;
  platform: SocialPlatform;
  status: OutboxStatus;
  publish_package: PublishPackage;
  scheduled_at?: string | null;
  queued_at?: string | null;
  started_at?: string | null;
  published_at?: string | null;
  external_post_id?: string | null;
  external_post_url?: string | null;
  attempt_count: number;
  last_attempt_at?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Resultado de validación previa al envío a Outbox
 */
export interface PublishingValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface PublishingValidationResult {
  isValid: boolean;
  errors: PublishingValidationError[];
  warnings: { field: string; message: string }[];
}

/**
 * Contrato de resultado para Publisher Adapters
 */
export interface SocialPublisherResult {
  success: boolean;
  externalPostId?: string;
  externalPostUrl?: string;
  publishedAt?: string;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Interfaz común para adaptadores de publicación (Mock & Real)
 */
export interface SocialPublisherAdapter {
  platform: SocialPlatform;
  validatePackage(pkg: PublishPackage): Promise<PublishingValidationResult>;
  publish(pkg: PublishPackage, connection?: SocialConnection | null): Promise<SocialPublisherResult>;
  getPublishStatus?(externalPostId: string): Promise<{ status: string }>;
  deletePublishedPost?(externalPostId: string): Promise<boolean>;
}
