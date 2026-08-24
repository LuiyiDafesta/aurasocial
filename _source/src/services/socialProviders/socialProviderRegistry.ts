import { ISocialProvider, ProviderCapabilities } from './SocialProvider';
import { SocialPlatform, SocialProviderId } from '../../types/publishing';
import { socialitProvider } from './SocialitProvider';
import { robinResearchProvider } from './RobinResearchProvider';
import { metaDirectProvider } from './MetaDirectProvider';

/**
 * Registro y Orquestador Central de Proveedores Sociales de AuraSocial.
 */
export class SocialProviderRegistry {
  private providers: Map<SocialProviderId, ISocialProvider> = new Map();
  private primaryProviderId: SocialProviderId = 'socialit';
  private secondaryProviderId: SocialProviderId = 'robin_research';

  constructor() {
    // Registrar proveedores predeterminados
    this.registerProvider(socialitProvider);
    this.registerProvider(robinResearchProvider);
    this.registerProvider(metaDirectProvider);
  }

  /**
   * Registra o actualiza un proveedor en el sistema.
   */
  registerProvider(provider: ISocialProvider): void {
    this.providers.set(provider.id, provider);
  }

  /**
   * Obtiene un proveedor por su ID.
   */
  getProvider(id: SocialProviderId): ISocialProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * Retorna el proveedor principal (🥇 SOCIALIT).
   */
  getPrimaryProvider(): ISocialProvider {
    const primary = this.providers.get(this.primaryProviderId);
    if (!primary) {
      throw new Error(`Proveedor principal '${this.primaryProviderId}' no está registrado.`);
    }
    return primary;
  }

  /**
   * Retorna el proveedor secundario / fallback (🥈 ROBIN RESEARCH).
   */
  getSecondaryProvider(): ISocialProvider {
    const secondary = this.providers.get(this.secondaryProviderId);
    if (!secondary) {
      throw new Error(`Proveedor secundario '${this.secondaryProviderId}' no está registrado.`);
    }
    return secondary;
  }

  /**
   * Lista todos los proveedores registrados en el sistema.
   */
  getAvailableProviders(): ISocialProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Filtra proveedores que soportan una plataforma específica (ej. Instagram, Facebook, TikTok, LinkedIn, YouTube).
   */
  getProvidersForPlatform(platform: SocialPlatform): ISocialProvider[] {
    return this.getAvailableProviders().filter(p => p.capabilities.platforms[platform]);
  }

  /**
   * Filtra proveedores que soportan una capacidad específica.
   */
  getProvidersForCapability(capability: keyof ProviderCapabilities): ISocialProvider[] {
    return this.getAvailableProviders().filter(p => Boolean(p.capabilities[capability]));
  }

  /**
   * Resuelve deterministamente qué proveedor debe utilizarse según la plataforma, capacidad requerida y estrategia de fallback.
   * 
   * Estrategia de Fallback:
   * 1. Evalúa el proveedor preferido (o el primario SOCIALIT).
   * 2. Si no soporta la plataforma o no está disponible, evalúa el secundario (ROBIN RESEARCH).
   * 3. Si ninguno aplica, retorna error con la lista de proveedores disponibles.
   */
  resolveProvider(options: {
    platform: SocialPlatform;
    capability?: keyof ProviderCapabilities;
    preferredProvider?: SocialProviderId;
  }): {
    provider: ISocialProvider;
    reason: string;
    fallbackUsed: boolean;
    availableProviders: SocialProviderId[];
  } {
    const { platform, capability, preferredProvider } = options;
    const compatibleProviders = this.getProvidersForPlatform(platform);

    const availableIds = compatibleProviders.map(p => p.id);

    if (compatibleProviders.length === 0) {
      throw new Error(`Ningún proveedor social registrado soporta la plataforma '${platform}'.`);
    }

    // 1. Si el usuario solicitó explícitamente un proveedor y es compatible:
    if (preferredProvider) {
      const preferred = this.getProvider(preferredProvider);
      if (preferred && preferred.capabilities.platforms[platform]) {
        if (!capability || preferred.capabilities[capability]) {
          return {
            provider: preferred,
            reason: `Proveedor preferido '${preferred.name}' asignado directamente para ${platform}.`,
            fallbackUsed: false,
            availableProviders: availableIds,
          };
        }
      }
    }

    // 2. Intentar con Proveedor Principal (🥇 SOCIALIT)
    const primary = this.getPrimaryProvider();
    if (primary.capabilities.platforms[platform] && (!capability || primary.capabilities[capability])) {
      return {
        provider: primary,
        reason: `Proveedor principal '${primary.name}' seleccionado para ${platform}.`,
        fallbackUsed: false,
        availableProviders: availableIds,
      };
    }

    // 3. Fallback a Proveedor Secundario (🥈 ROBIN RESEARCH)
    const secondary = this.getSecondaryProvider();
    if (secondary.capabilities.platforms[platform] && (!capability || secondary.capabilities[capability])) {
      return {
        provider: secondary,
        reason: `Fallback a '${secondary.name}': el proveedor principal no soporta la plataforma '${platform}'.`,
        fallbackUsed: true,
        availableProviders: availableIds,
      };
    }

    // 4. Seleccionar el primer proveedor compatible disponible
    const firstAvailable = compatibleProviders[0];
    return {
      provider: firstAvailable,
      reason: `Proveedor '${firstAvailable.name}' asignado como fallback general para ${platform}.`,
      fallbackUsed: true,
      availableProviders: availableIds,
    };
  }
}

export const socialProviderRegistry = new SocialProviderRegistry();
