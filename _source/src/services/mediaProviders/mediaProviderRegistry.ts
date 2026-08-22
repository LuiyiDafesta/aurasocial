import { MediaProvider, GenerationParams, CostEstimation } from '../../types/mediaProvider';
import { defaultMockMediaProvider } from './mockMediaProvider';

/**
 * Registro Desacoplado de Proveedores Multimedia (Fase 9A)
 * Permite registrar, comparar costos y seleccionar proveedores de generación
 * (OpenAI, Runway, Sora, Veo, Mock) sin alterar el Content Master ni el flujo de publicación.
 */
export class MediaProviderRegistry {
  private static instance: MediaProviderRegistry;
  private providers: Map<string, MediaProvider> = new Map();
  private activeProviderId: string = 'mock-media-provider';

  private constructor() {
    this.registerProvider(defaultMockMediaProvider);
  }

  public static getInstance(): MediaProviderRegistry {
    if (!MediaProviderRegistry.instance) {
      MediaProviderRegistry.instance = new MediaProviderRegistry();
    }
    return MediaProviderRegistry.instance;
  }

  public registerProvider(provider: MediaProvider): void {
    this.providers.set(provider.id, provider);
  }

  public getProvider(id?: string): MediaProvider {
    const targetId = id || this.activeProviderId;
    const provider = this.providers.get(targetId);
    if (!provider) {
      return defaultMockMediaProvider;
    }
    return provider;
  }

  public setActiveProvider(id: string): void {
    if (!this.providers.has(id)) {
      throw new Error(`El proveedor multimedia '${id}' no está registrado.`);
    }
    this.activeProviderId = id;
  }

  public getActiveProviderId(): string {
    return this.activeProviderId;
  }

  public listProviders(): MediaProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Compara los costos estimados entre todos los proveedores registrados
   * para unos parámetros dados, facilitando la toma de decisiones costo/calidad.
   */
  public async compareProviderCosts(params: GenerationParams): Promise<CostEstimation[]> {
    const estimations: CostEstimation[] = [];
    for (const provider of this.providers.values()) {
      try {
        const est = await provider.estimateCost(params);
        estimations.push(est);
      } catch (err: any) {
        console.warn(`Error estimando costo con proveedor ${provider.id}:`, err.message);
      }
    }
    return estimations;
  }
}

export const mediaProviderRegistry = MediaProviderRegistry.getInstance();
