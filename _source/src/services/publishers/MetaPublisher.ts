import { 
  SocialPublisherResult, 
  PublishPackage, 
  SocialConnection 
} from '../../types/publishing';
import { sanitizePublicationText } from '../copySanitizerService';
import { validatePublishPackage } from '../publishingValidationService';
import { isRealPublishingEnabled, META_GRAPH_API_VERSION } from '../../config/publishingConfig';

export type MetaPublishErrorType = 
  | 'transient'
  | 'permanent'
  | 'authentication'
  | 'permission'
  | 'rate_limit'
  | 'validation';

export interface MetaPublishDetailedResult extends SocialPublisherResult {
  errorType?: MetaPublishErrorType;
  retryAfterSeconds?: number;
  containerId?: string;
  metadata?: Record<string, any>;
}

/**
 * Clasifica los errores devueltos por Meta Graph API para determinar la estrategia de retry y respuesta segura.
 */
export function classifyMetaError(error: any): { type: MetaPublishErrorType; message: string; retryAfter?: number } {
  const code = error?.code || error?.error_subcode || 0;
  const rawMsg = error?.message || (typeof error === 'string' ? error : 'Error desconocido de Meta Graph API');

  // 1. Errores de Permisos insuficientes (No reintentar)
  if (code === 10 || code === 200 || code === 298 || /permission|scope|not authorized|insufficient|manage_posts|content_publish/i.test(rawMsg)) {
    return { type: 'permission', message: 'Permisos insuficientes en la cuenta de Meta para publicar en este canal.' };
  }

  // 2. Errores de Autenticación / Sesión expirada (No reintentar)
  if (code === 190 || code === 102 || /token|session|expired|oauth|invalid key/i.test(rawMsg)) {
    return { type: 'authentication', message: 'Es necesario volver a conectar la cuenta de Meta.' };
  }

  // 3. Errores de Rate Limit (Backoff con retry_after)
  if (code === 4 || code === 17 || code === 32 || code === 613 || /rate limit|too many requests|calls/i.test(rawMsg)) {
    return { type: 'rate_limit', message: 'Límite de cuota alcanzado en Meta Graph API. Reintentando más tarde.', retryAfter: 300 };
  }

  // 4. Errores de Validación de Media / Formato (Permanentes)
  if (code === 36003 || code === 2207001 || /invalid media|format|aspect ratio|unsupported|corrupted/i.test(rawMsg)) {
    return { type: 'permanent', message: 'Instagram rechazó el video porque el formato no cumple los requisitos (1080x1920 9:16 MP4).' };
  }

  // 5. Errores Transitorios (Servidor Meta, timeouts, procesamiento asíncrono)
  if (code === 1 || code === 2 || /timeout|server error|please retry|internal|processing/i.test(rawMsg)) {
    return { type: 'transient', message: 'Fallo temporal de comunicación con los servidores de Meta.', retryAfter: 30 };
  }

  // Por defecto, clasificar como permanente si no es reconocible
  return { type: 'permanent', message: 'Error en la API de Meta.' };
}

/**
 * Publicador oficial para Meta (Instagram Reels & Facebook Page Videos).
 * Ejecuta el protocolo server-to-server asíncrono de Meta Graph API.
 */
export class MetaPublisher {
  private apiVersion: string = META_GRAPH_API_VERSION;
  private baseUrl: string = 'https://graph.facebook.com';

  /**
   * Publica un Reel en una cuenta de Instagram Business / Creator.
   * 
   * Flujo oficial Meta:
   * 1. POST /{ig_user_id}/media (Crear contenedor con video_url accesible, caption y hashtags)
   * 2. GET /{container_id}?fields=status_code,status (Polling hasta 'FINISHED' o 'ERROR')
   * 3. POST /{ig_user_id}/media_publish (Publicar el contenedor verificado)
   * 4. GET /{media_id}?fields=permalink (Obtener URL pública oficial del Reel)
   */
  async publishInstagramReel(params: {
    connection: SocialConnection;
    publishPackage: PublishPackage;
    videoUrl: string;
    caption: string;
    hashtags?: string[];
    isMock?: boolean;
  }): Promise<MetaPublishDetailedResult> {
    const { connection, publishPackage, videoUrl, caption, hashtags = [], isMock = false } = params;

    // 1. Re-validar Quality Gate preventivo
    const validation = validatePublishPackage(publishPackage);
    if (!validation.isValid) {
      return {
        success: false,
        errorCode: 'QUALITY_GATE_FAILED',
        errorMessage: validation.errors.map(e => e.message).join(' | '),
        errorType: 'validation',
      };
    }

    // 2. Sanitizar texto completo de publicación
    const cleanCaption = sanitizePublicationText(caption);
    const cleanHashtags = Array.isArray(hashtags) ? hashtags.filter(Boolean).join(' ') : '';
    const fullCaption = cleanHashtags ? `${cleanCaption}\n\n${cleanHashtags}` : cleanCaption;

    const igUserId = connection.account_id;
    const accessToken = connection.access_token_encrypted 
      ? connection.access_token_encrypted.replace(/^enc_/, '') 
      : null;

    // 3. Verificación de Kill Switch para entorno de desarrollo / seguridad
    if (!isMock && !isRealPublishingEnabled()) {
      return {
        success: false,
        errorCode: 'KILL_SWITCH_BLOCKED',
        errorMessage: 'La publicación real está bloqueada en este entorno por el Kill Switch de seguridad.',
        errorType: 'permission',
      };
    }

    // 4. Si es modo Mock o no hay token real disponible, simular flujo exitoso con costo $0
    if (isMock || !accessToken || accessToken.startsWith('mock_')) {
      const ts = Date.now().toString(36);
      const mockContainerId = `mock_ig_container_${ts}`;
      const mockPostId = `mock_ig_reel_${ts}_${Math.random().toString(36).substring(2, 6)}`;
      const mockUrl = `https://www.instagram.com/reel/${mockPostId}/`;

      return {
        success: true,
        externalPostId: mockPostId,
        externalPostUrl: mockUrl,
        publishedAt: new Date().toISOString(),
        containerId: mockContainerId,
        metadata: {
          platform: 'instagram',
          media_type: 'REELS',
          provider: 'meta_graph_api',
          is_mock: true,
        },
      };
    }

    try {
      // 5. PASO 1: Crear Contenedor de Reel en Meta
      const createContainerUrl = `${this.baseUrl}/${this.apiVersion}/${igUserId}/media`;
      const containerRes = await fetch(createContainerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: 'REELS',
          video_url: videoUrl,
          caption: fullCaption,
          access_token: accessToken,
        }),
      });

      const containerData = await containerRes.json();
      if (containerData.error) {
        const classified = classifyMetaError(containerData.error);
        return {
          success: false,
          errorCode: `META_CONTAINER_ERROR_${containerData.error.code || 'UNKNOWN'}`,
          errorMessage: classified.message,
          errorType: classified.type,
          retryAfterSeconds: classified.retryAfter,
        };
      }

      const containerId = containerData.id;

      // 6. PASO 2: Polling de estado del contenedor (asíncrono)
      let isReady = false;
      let attempts = 0;
      const maxAttempts = 10;

      while (!isReady && attempts < maxAttempts) {
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 3000)); // Espera de 3s entre polls

        const statusRes = await fetch(
          `${this.baseUrl}/${this.apiVersion}/${containerId}?fields=status_code,status&access_token=${accessToken}`
        );
        const statusData = await statusRes.json();

        if (statusData.status_code === 'FINISHED') {
          isReady = true;
        } else if (statusData.status_code === 'ERROR') {
          return {
            success: false,
            errorCode: 'META_VIDEO_PROCESSING_FAILED',
            errorMessage: `Error en el procesamiento de video en servidores de Meta: ${statusData.status || 'Formato no soportado'}`,
            errorType: 'permanent',
            containerId,
          };
        } else if (statusData.status_code === 'EXPIRED') {
          return {
            success: false,
            errorCode: 'META_CONTAINER_EXPIRED',
            errorMessage: 'El contenedor de video de Meta expiró antes de publicarse.',
            errorType: 'transient',
            retryAfterSeconds: 60,
            containerId,
          };
        }
      }

      if (!isReady) {
        return {
          success: false,
          errorCode: 'META_PROCESSING_TIMEOUT',
          errorMessage: 'El video aún se está procesando en Meta. Se programará reintento.',
          errorType: 'transient',
          retryAfterSeconds: 45,
          containerId,
        };
      }

      // 7. PASO 3: Publicar el contenedor verificado
      const publishUrl = `${this.baseUrl}/${this.apiVersion}/${igUserId}/media_publish`;
      const publishRes = await fetch(publishUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: accessToken,
        }),
      });

      const publishData = await publishRes.json();
      if (publishData.error) {
        const classified = classifyMetaError(publishData.error);
        return {
          success: false,
          errorCode: `META_PUBLISH_ERROR_${publishData.error.code || 'UNKNOWN'}`,
          errorMessage: classified.message,
          errorType: classified.type,
          retryAfterSeconds: classified.retryAfter,
          containerId,
        };
      }

      const externalPostId = publishData.id;

      // 8. PASO 4: Obtener Permalink oficial de Instagram
      let externalUrl = `https://www.instagram.com/reel/${externalPostId}/`;
      try {
        const permalinkRes = await fetch(
          `${this.baseUrl}/${this.apiVersion}/${externalPostId}?fields=permalink&access_token=${accessToken}`
        );
        const permalinkData = await permalinkRes.json();
        if (permalinkData.permalink) {
          externalUrl = permalinkData.permalink;
        }
      } catch {
        // Fallback al formato de permalink determinista
      }

      return {
        success: true,
        externalPostId,
        externalPostUrl: externalUrl,
        publishedAt: new Date().toISOString(),
        containerId,
        metadata: {
          platform: 'instagram',
          media_type: 'REELS',
          provider: 'meta_graph_api',
          api_version: this.apiVersion,
        },
      };
    } catch (err: any) {
      const classified = classifyMetaError(err);
      return {
        success: false,
        errorCode: 'META_NETWORK_EXCEPTION',
        errorMessage: classified.message,
        errorType: classified.type,
        retryAfterSeconds: classified.retryAfter,
      };
    }
  }

  /**
   * Publica un Video Post en una página de Facebook (Facebook Page).
   */
  async publishFacebookVideo(params: {
    connection: SocialConnection;
    publishPackage: PublishPackage;
    videoUrl: string;
    caption: string;
    title?: string | null;
    hashtags?: string[];
    isMock?: boolean;
  }): Promise<MetaPublishDetailedResult> {
    const { connection, publishPackage, videoUrl, caption, title, hashtags = [], isMock = false } = params;

    // 1. Re-validar Quality Gate
    const validation = validatePublishPackage(publishPackage);
    if (!validation.isValid) {
      return {
        success: false,
        errorCode: 'QUALITY_GATE_FAILED',
        errorMessage: validation.errors.map(e => e.message).join(' | '),
        errorType: 'validation',
      };
    }

    const cleanCaption = sanitizePublicationText(caption);
    const cleanHashtags = Array.isArray(hashtags) ? hashtags.filter(Boolean).join(' ') : '';
    const fullDescription = cleanHashtags ? `${cleanCaption}\n\n${cleanHashtags}` : cleanCaption;

    const pageId = connection.account_id;
    const pageAccessToken = connection.access_token_encrypted
      ? connection.access_token_encrypted.replace(/^enc_/, '')
      : null;

    // Verificación de Kill Switch
    if (!isMock && !isRealPublishingEnabled()) {
      return {
        success: false,
        errorCode: 'KILL_SWITCH_BLOCKED',
        errorMessage: 'La publicación real está bloqueada en este entorno por el Kill Switch de seguridad.',
        errorType: 'permission',
      };
    }

    if (isMock || !pageAccessToken || pageAccessToken.startsWith('mock_')) {
      const ts = Date.now().toString(36);
      const mockPostId = `mock_fb_video_${ts}_${Math.random().toString(36).substring(2, 6)}`;
      const mockUrl = `https://www.facebook.com/${pageId || 'page'}/videos/${mockPostId}/`;

      return {
        success: true,
        externalPostId: mockPostId,
        externalPostUrl: mockUrl,
        publishedAt: new Date().toISOString(),
        metadata: {
          platform: 'facebook',
          provider: 'meta_graph_api',
          is_mock: true,
        },
      };
    }

    try {
      const videoUploadUrl = `${this.baseUrl}/${this.apiVersion}/${pageId}/videos`;
      const bodyPayload: Record<string, any> = {
        file_url: videoUrl,
        description: fullDescription,
        access_token: pageAccessToken,
      };
      if (title) bodyPayload.title = sanitizePublicationText(title);

      const res = await fetch(videoUploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      const data = await res.json();
      if (data.error) {
        const classified = classifyMetaError(data.error);
        return {
          success: false,
          errorCode: `META_FB_PUBLISH_ERROR_${data.error.code || 'UNKNOWN'}`,
          errorMessage: classified.message,
          errorType: classified.type,
          retryAfterSeconds: classified.retryAfter,
        };
      }

      const externalPostId = data.id;
      const externalPostUrl = `https://www.facebook.com/${pageId}/videos/${externalPostId}/`;

      return {
        success: true,
        externalPostId,
        externalPostUrl,
        publishedAt: new Date().toISOString(),
        metadata: {
          platform: 'facebook',
          provider: 'meta_graph_api',
          api_version: this.apiVersion,
        },
      };
    } catch (err: any) {
      const classified = classifyMetaError(err);
      return {
        success: false,
        errorCode: 'META_FB_NETWORK_EXCEPTION',
        errorMessage: classified.message,
        errorType: classified.type,
        retryAfterSeconds: classified.retryAfter,
      };
    }
  }
}

export const metaPublisher = new MetaPublisher();
