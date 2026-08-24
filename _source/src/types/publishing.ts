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
  | 'pending'
  | 'connected'
  | 'mock_connected'
  | 'expired'
  | 'revoked'
  | 'error'
  | 'disconnected';

/**
 * Tipo de cuenta social
 */
export type SocialAccountType =
  | 'profile'
  | 'page'
  | 'business_account'
  | 'channel';

export type SocialProviderId = 'socialit' | 'robin_research' | 'meta_direct' | string;

/**
 * Conexión o cuenta social de una marca
 */
export interface SocialConnection {
  id: string;
  workspace_id: string;
  brand_id: string | null;
  platform: SocialPlatform;
  provider?: SocialProviderId;
  provider_account_id?: string | null;
  provider_account_name?: string | null;
  provider_metadata?: Record<string, any>;
  account_type?: SocialAccountType | string | null;
  account_id?: string | null;
  account_name?: string | null;
  account_username?: string | null;
  avatar_url?: string | null;
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
 * Cuenta social descubierta durante el flujo OAuth
 */
export interface DiscoveredSocialAccount {
  id: string;
  platform: SocialPlatform;
  account_type: SocialAccountType;
  account_name: string;
  username?: string;
  avatar_url?: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string | null;
  scopes: string[];
  metadata?: Record<string, any>;
  page_id?: string;
}

/**
 * Registro de estado OAuth Anti-CSRF
 */
export interface OAuthStateRecord {
  id: string;
  state: string;
  workspace_id: string;
  brand_id: string;
  user_id?: string | null;
  platform: SocialPlatform;
  nonce: string;
  redirect_uri: string;
  scopes: string[];
  expires_at: string;
  used_at?: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

/**
 * Estado de salud de una conexión social
 */
export type ConnectionHealthStatus =
  | 'healthy'
  | 'warning'
  | 'expiring_soon'
  | 'expired'
  | 'revoked'
  | 'error'
  | 'disconnected'
  | 'unknown';

/**
 * Reporte de diagnóstico de salud de conexión
 */
export interface ConnectionHealthReport {
  connection_id: string;
  platform: SocialPlatform;
  status: ConnectionHealthStatus;
  is_valid: boolean;
  account_name?: string;
  expires_at?: string | null;
  days_until_expiration?: number | null;
  issues: string[];
  scopes: string[];
  checked_at: string;
}

/**
 * Método de publicación soportado por AuraSocial
 */
export type PublicationMethod = 'automatic' | 'manual';

/**
 * Elemento multimedia dentro del paquete de publicación
 */
export interface PublicationPackageMediaItem {
  type: 'video' | 'image' | 'thumbnail';
  asset_id?: string;
  storage_path?: string;
  signed_url?: string;
  filename?: string;
}

/**
 * Restricciones de formato de la plataforma
 */
export interface PublicationPackagePlatformConstraints {
  aspect_ratio?: string;
  max_caption_length?: number;
  max_hashtags?: number;
  max_video_duration_seconds?: number;
}

/**
 * Estado del Quality Gate dentro del paquete de publicación
 */
export interface PublicationPackageQualityGate {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Paquete estructurado final de publicación (Publication Package)
 */
export interface PublicationPackage {
  content_id: string;
  platform: SocialPlatform;
  publication_method: PublicationMethod;
  title?: string;
  caption?: string;
  hashtags?: string[];
  description?: string;
  media: PublicationPackageMediaItem[];
  render_id?: string;
  platform_constraints: PublicationPackagePlatformConstraints;
  quality_gate: PublicationPackageQualityGate;
}

/**
 * Paquete de publicación canónico e inmutable (Snapshot para Outbox)
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
  publication_method?: PublicationMethod;
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
  | 'processing'
  | 'publishing'
  | 'published'
  | 'retrying'
  | 'manual_prepared'
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
  provider?: SocialProviderId | null;
  provider_account_id?: string | null;
  provider_job_id?: string | null;
  provider_status?: string | null;
  provider_error_code?: string | null;
  status: OutboxStatus;
  publication_method: PublicationMethod;
  publish_package: PublishPackage;
  scheduled_at?: string | null;
  queued_at?: string | null;
  started_at?: string | null;
  published_at?: string | null;
  external_post_id?: string | null;
  external_post_url?: string | null;
  notes?: string | null;
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
