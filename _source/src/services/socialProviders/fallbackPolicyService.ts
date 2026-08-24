import { SocialPlatform, SocialProviderId } from '../../types/publishing';
import { socialProviderRegistry } from './socialProviderRegistry';
import { observabilityService } from '../n8n/observabilityService';

export type ProviderErrorCategory =
  | 'configuration_error'
  | 'authentication_error'
  | 'permission_error'
  | 'rate_limit'
  | 'transient_error'
  | 'unsupported_platform'
  | 'provider_unavailable';

export interface FallbackEvaluationResult {
  canFallback: boolean;
  reason: string;
  targetProviderId?: SocialProviderId;
  errorCategory: ProviderErrorCategory;
}

export class FallbackPolicyService {

  /**
   * Clasifica un error en una categoría determinista.
   */
  classifyError(error: any): ProviderErrorCategory {
    if (!error) return 'transient_error';
    const message = (typeof error === 'string' ? error : error.message || '').toLowerCase();
    const status = error.status || error.statusCode || 0;

    if (status === 401 || message.includes('unauthorized') || message.includes('invalid_token') || message.includes('bad api key')) {
      return 'authentication_error';
    }
    if (status === 403 || message.includes('forbidden') || message.includes('scope') || message.includes('permission') || message.includes('can_post=false')) {
      return 'permission_error';
    }
    if (status === 429 || message.includes('rate limit') || message.includes('too many requests')) {
      return 'rate_limit';
    }
    if (status >= 500 && status < 600) {
      return 'provider_unavailable';
    }
    if (message.includes('not configured') || message.includes('missing api key') || message.includes('misconfigured')) {
      return 'configuration_error';
    }
    if (message.includes('unsupported platform') || message.includes('platform not supported')) {
      return 'unsupported_platform';
    }
    if (message.includes('timeout') || message.includes('econnrefused') || message.includes('network') || message.includes('econnreset')) {
      return 'transient_error';
    }

    return 'transient_error';
  }

  /**
   * Evalúa si es seguro y viable ejecutar un fallback hacia un proveedor secundario.
   */
  evaluateFallback(params: {
    workspaceId: string;
    brandId?: string | null;
    currentProviderId: SocialProviderId;
    platform: SocialPlatform;
    error: any;
  }): FallbackEvaluationResult {
    const { workspaceId, brandId, currentProviderId, platform, error } = params;
    const errorCategory = this.classifyError(error);

    // 1. Reglas estrictas de bloqueo de fallback
    if (errorCategory === 'permission_error') {
      return {
        canFallback: false,
        errorCategory,
        reason: 'FALLBACK_FORBIDDEN: Fallback no permitido ante errores de permisos o scopes insuficientes.',
      };
    }

    if (errorCategory === 'authentication_error') {
      return {
        canFallback: false,
        errorCategory,
        reason: 'FALLBACK_FORBIDDEN: Fallback no permitido ante credenciales inválidas o expiradas.',
      };
    }

    if (errorCategory === 'configuration_error') {
      return {
        canFallback: false,
        errorCategory,
        reason: 'FALLBACK_FORBIDDEN: Fallback no permitido ante errores de configuración.',
      };
    }

    if (errorCategory === 'rate_limit') {
      return {
        canFallback: false,
        errorCategory,
        reason: 'FALLBACK_FORBIDDEN: Fallback no permitido ante rate limit (debe aplicarse backoff).',
      };
    }

    // 2. Solo transient_error y provider_unavailable son candidatos a fallback
    if (errorCategory !== 'transient_error' && errorCategory !== 'provider_unavailable') {
      return {
        canFallback: false,
        errorCategory,
        reason: `FALLBACK_FORBIDDEN: Categoría de error '${errorCategory}' no admite fallback automático.`,
      };
    }

    // 3. Buscar proveedor secundario en el registry
    let secondaryProvider;
    try {
      secondaryProvider = socialProviderRegistry.getSecondaryProvider();
    } catch {
      return {
        canFallback: false,
        errorCategory,
        reason: `FALLBACK_UNAVAILABLE: No existe proveedor secundario registrado para la plataforma ${platform}.`,
      };
    }

    if (!secondaryProvider.capabilities.platforms[platform]) {
      return {
        canFallback: false,
        errorCategory,
        reason: `FALLBACK_UNAVAILABLE: El proveedor secundario '${secondaryProvider.id}' no soporta la plataforma ${platform}.`,
      };
    }

    // 4. Validar que el proveedor secundario esté configurado
    const status = secondaryProvider.getConfigurationStatus();
    if (status !== 'configured') {
      return {
        canFallback: false,
        errorCategory,
        reason: `FALLBACK_UNAVAILABLE: El proveedor secundario '${secondaryProvider.id}' se encuentra en estado '${status}'.`,
      };
    }

    // Registrar evento de auditoría
    observabilityService.logEvent({
      event: 'provider_fallback_triggered',
      workspace_id: workspaceId,
      brand_id: brandId,
      platform,
      provider: currentProviderId,
      details: {
        target_provider: secondaryProvider.id,
        error_category: errorCategory,
      },
    });

    return {
      canFallback: true,
      errorCategory,
      targetProviderId: secondaryProvider.id,
      reason: `FALLBACK_APPROVED: Proveedor secundario '${secondaryProvider.id}' seleccionado tras '${errorCategory}' en '${currentProviderId}'.`,
    };
  }
}

export const fallbackPolicyService = new FallbackPolicyService();
