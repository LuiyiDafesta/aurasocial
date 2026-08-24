import { validateN8NServerRequest } from './n8nInternalAuthService';
import { socialProviderRegistry } from '../socialProviders/socialProviderRegistry';
import { 
  getBrandAndUnassignedSocialAccounts, 
  discoverAndSyncSocialitAccounts,
  diagnoseSocialConnectionHealth,
  getSocialConnection 
} from '../socialConnectionService';
import { publishingReadinessService } from '../publishing/publishingReadinessService';
import { supabase } from '../../lib/supabase';
import { SocialPlatform } from '../../types/publishing';
import { observabilityService } from './observabilityService';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: Record<string, any>;
}

export class N8NInternalApiService {

  /**
   * GET /api/social/providers/health
   */
  async getProvidersHealth(headers: Record<string, any>): Promise<ApiResponse> {
    const auth = validateN8NServerRequest(headers);
    if (!auth.isValid || !auth.context) {
      return { success: false, error: auth.error || 'UNAUTHORIZED' };
    }

    const providers = socialProviderRegistry.getAvailableProviders();
    const results = [];

    for (const p of providers) {
      const cfg = p.getConfigurationStatus();
      results.push({
        id: p.id,
        name: p.name,
        isPrimary: p.id === socialProviderRegistry.getPrimaryProvider().id,
        status: cfg,
        isValid: cfg === 'configured',
        supportedPlatforms: p.capabilities.platforms,
        capabilities: p.capabilities,
      });
    }

    observabilityService.logEvent({
      event: 'provider_health_checked',
      workspace_id: auth.context.workspace_id,
      brand_id: auth.context.brand_id,
      details: { total_providers: results.length },
    });

    return {
      success: true,
      data: {
        providers: results,
        checked_at: new Date().toISOString(),
      },
    };
  }

  /**
   * GET /api/social/accounts
   */
  async getSocialAccounts(
    headers: Record<string, any>,
    params?: { brandId?: string }
  ): Promise<ApiResponse> {
    const auth = validateN8NServerRequest(headers);
    if (!auth.isValid || !auth.context) {
      return { success: false, error: auth.error || 'UNAUTHORIZED' };
    }

    const targetBrandId = params?.brandId || auth.context.brand_id || '';
    const accounts = await getBrandAndUnassignedSocialAccounts({
      workspaceId: auth.context.workspace_id,
      brandId: targetBrandId,
    });

    return {
      success: true,
      data: accounts,
      meta: {
        workspace_id: auth.context.workspace_id,
        brand_id: targetBrandId || null,
        bound_count: accounts.bound.length,
        unassigned_count: accounts.unassigned.length,
      },
    };
  }

  /**
   * GET /api/social/accounts/:id/health
   */
  async getSocialAccountHealth(
    headers: Record<string, any>,
    connectionId: string
  ): Promise<ApiResponse> {
    const auth = validateN8NServerRequest(headers);
    if (!auth.isValid || !auth.context) {
      return { success: false, error: auth.error || 'UNAUTHORIZED' };
    }

    try {
      // Validar pertenencia de la cuenta al workspace del tenant
      const conn = await getSocialConnection(connectionId);
      if (!conn || conn.workspace_id !== auth.context.workspace_id) {
        return { success: false, error: 'NOT_FOUND: Cuenta social no encontrada en el workspace.' };
      }

      const report = await diagnoseSocialConnectionHealth(connectionId);
      return {
        success: true,
        data: report,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * GET /api/social/accounts/:id/capabilities
   */
  async getSocialAccountCapabilities(
    headers: Record<string, any>,
    connectionId: string
  ): Promise<ApiResponse> {
    const auth = validateN8NServerRequest(headers);
    if (!auth.isValid || !auth.context) {
      return { success: false, error: auth.error || 'UNAUTHORIZED' };
    }

    const conn = await getSocialConnection(connectionId);
    if (!conn || conn.workspace_id !== auth.context.workspace_id) {
      return { success: false, error: 'NOT_FOUND: Cuenta no encontrada.' };
    }

    const report = await diagnoseSocialConnectionHealth(connectionId);
    return {
      success: true,
      data: {
        connection_id: conn.id,
        platform: conn.platform,
        provider: conn.provider,
        can_publish: report.can_publish,
        capabilities: report.capabilities,
        scopes: report.scopes,
      },
    };
  }

  /**
   * POST /api/social/accounts/sync
   */
  async syncSocialAccounts(
    headers: Record<string, any>,
    params?: { brandId?: string; bindToBrand?: boolean; platform?: SocialPlatform }
  ): Promise<ApiResponse> {
    const auth = validateN8NServerRequest(headers);
    if (!auth.isValid || !auth.context) {
      return { success: false, error: auth.error || 'UNAUTHORIZED' };
    }

    const targetBrandId = params?.brandId || auth.context.brand_id || undefined;
    const syncResult = await discoverAndSyncSocialitAccounts({
      workspaceId: auth.context.workspace_id,
      brandId: targetBrandId,
      bindToBrand: Boolean(params?.bindToBrand),
      filterPlatform: params?.platform,
    });

    observabilityService.logEvent({
      event: 'provider_account_synced',
      workspace_id: auth.context.workspace_id,
      brand_id: targetBrandId,
      details: {
        total_discovered: syncResult.summary.total,
        synced: syncResult.summary.synced,
      },
    });

    return {
      success: true,
      data: syncResult,
    };
  }

  /**
   * POST /api/social/accounts/bind
   * Asigna una cuenta social descubierta por Socialit a una Marca de AuraSocial.
   */
  async bindSocialAccount(
    headers: Record<string, any>,
    body: {
      workspaceId?: string;
      brandId?: string;
      provider?: string;
      provider_account_id?: string;
      platform?: SocialPlatform;
    }
  ): Promise<ApiResponse> {
    const auth = validateN8NServerRequest(headers);
    if (!auth.isValid || !auth.context) {
      return { success: false, error: auth.error || 'UNAUTHORIZED' };
    }

    const workspaceId = body.workspaceId || auth.context.workspace_id;
    const brandId = body.brandId || auth.context.brand_id;
    const provider = body.provider || 'socialit';
    const providerAccountId = body.provider_account_id;

    if (!workspaceId) {
      return { success: false, error: 'BAD_REQUEST: workspaceId es requerido.' };
    }
    if (!brandId) {
      return { success: false, error: 'BAD_REQUEST: brandId es requerido.' };
    }
    if (!providerAccountId) {
      return { success: false, error: 'BAD_REQUEST: provider_account_id es requerido.' };
    }

    // 1. Validar que el provider sea registrado
    const prov = socialProviderRegistry.getProvider(provider as any);
    if (!prov) {
      return { success: false, error: `INVALID_PROVIDER: Proveedor '${provider}' no está registrado en AuraSocial.` };
    }

    // 2. Validar que la marca exista y pertenezca al workspace
    const { data: brand, error: brandErr } = await supabase
      .from('brands')
      .select('id, workspace_id, name')
      .eq('id', brandId)
      .single();

    if (brandErr || !brand) {
      return { success: false, error: `BRAND_NOT_FOUND: Marca '${brandId}' no encontrada.` };
    }

    if (brand.workspace_id !== workspaceId) {
      return { success: false, error: `TENANT_MISMATCH: La marca '${brandId}' pertenece a otro workspace ('${brand.workspace_id}'), no a '${workspaceId}'.` };
    }

    // 3. Buscar la cuenta descubierta por provider_account_id o id
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(providerAccountId);
    const filterCondition = isUuid
      ? `id.eq.${providerAccountId},provider_account_id.eq.${providerAccountId},account_id.eq.${providerAccountId}`
      : `provider_account_id.eq.${providerAccountId},account_id.eq.${providerAccountId}`;

    const { data: connections, error: connErr } = await supabase
      .from('social_connections')
      .select('*')
      .or(filterCondition);

    if (connErr || !connections || connections.length === 0) {
      return { success: false, error: `ACCOUNT_NOT_FOUND: Cuenta social '${providerAccountId}' no encontrada como cuenta descubierta en el sistema.` };
    }

    // Filtrar la conexión correspondiente al proveedor
    const conn = connections.find(c => c.provider === provider) || connections[0];

    // 4. Validar aislamiento multi-tenant de la cuenta
    if (conn.workspace_id !== workspaceId) {
      return { success: false, error: `TENANT_MISMATCH: La cuenta social pertenece al workspace '${conn.workspace_id}', no a '${workspaceId}'. Asignación denegada.` };
    }

    // 5. Validar si ya está vinculada a la MISMA marca (Idempotente)
    if (conn.brand_id === brandId) {
      observabilityService.logEvent({
        event: 'social_account_bound',
        workspace_id: workspaceId,
        brand_id: brandId,
        details: {
          connection_id: conn.id,
          provider_account_id: providerAccountId,
          platform: conn.platform,
          provider: conn.provider,
          already_bound: true,
        },
      });

      return {
        success: true,
        data: {
          connection: {
            id: conn.id,
            workspace_id: conn.workspace_id,
            brand_id: conn.brand_id,
            platform: conn.platform,
            provider: conn.provider,
            provider_account_id: conn.provider_account_id || conn.account_id,
            account_name: conn.account_name,
            account_username: conn.account_username,
            status: conn.status,
          },
          already_bound: true,
        },
      };
    }

    // 6. Validar si está vinculada a OTRA marca (Bloquear reasignación silenciosa)
    if (conn.brand_id && conn.brand_id !== brandId) {
      return {
        success: false,
        error: `ALREADY_BOUND_TO_ANOTHER_BRAND: La cuenta social '${providerAccountId}' ya está vinculada a la marca '${conn.brand_id}'. Se requiere una desvinculación (unbind) explícita antes de reasignar.`,
      };
    }

    // 7. Realizar binding actualizando brand_id
    const { data: updatedConn, error: updateErr } = await supabase
      .from('social_connections')
      .update({
        brand_id: brandId,
        status: conn.status === 'disconnected' ? 'connected' : conn.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conn.id)
      .select('*')
      .single();

    if (updateErr || !updatedConn) {
      return { success: false, error: `DATABASE_ERROR: No se pudo actualizar el vínculo de la cuenta: ${updateErr?.message}` };
    }

    observabilityService.logEvent({
      event: 'social_account_bound',
      workspace_id: workspaceId,
      brand_id: brandId,
      details: {
        connection_id: updatedConn.id,
        provider_account_id: providerAccountId,
        platform: updatedConn.platform,
        provider: updatedConn.provider,
        already_bound: false,
      },
    });

    return {
      success: true,
      data: {
        connection: {
          id: updatedConn.id,
          workspace_id: updatedConn.workspace_id,
          brand_id: updatedConn.brand_id,
          platform: updatedConn.platform,
          provider: updatedConn.provider,
          provider_account_id: updatedConn.provider_account_id || updatedConn.account_id,
          account_name: updatedConn.account_name,
          account_username: updatedConn.account_username,
          status: updatedConn.status,
        },
        already_bound: false,
      },
    };
  }

  /**
   * POST /api/social/accounts/:id/health-check
   */
  async runSocialAccountHealthCheck(
    headers: Record<string, any>,
    connectionId: string
  ): Promise<ApiResponse> {
    return this.getSocialAccountHealth(headers, connectionId);
  }

  /**
   * GET /api/publishing/readiness/:contentId
   */
  async getPublishingReadiness(
    headers: Record<string, any>,
    contentId: string,
    platform: SocialPlatform
  ): Promise<ApiResponse> {
    const auth = validateN8NServerRequest(headers);
    if (!auth.isValid || !auth.context) {
      return { success: false, error: auth.error || 'UNAUTHORIZED' };
    }

    const targetBrandId = auth.context.brand_id || '';
    const report = await publishingReadinessService.evaluateReadiness({
      contentId,
      platform,
      workspaceId: auth.context.workspace_id,
      brandId: targetBrandId,
    });

    return {
      success: true,
      data: report,
    };
  }

  /**
   * GET /api/publishing/outbox/:id
   */
  async getPublishingOutbox(
    headers: Record<string, any>,
    outboxId: string
  ): Promise<ApiResponse> {
    const auth = validateN8NServerRequest(headers);
    if (!auth.isValid || !auth.context) {
      return { success: false, error: auth.error || 'UNAUTHORIZED' };
    }

    const { data: outbox, error } = await supabase
      .from('publishing_outbox')
      .select('*')
      .eq('id', outboxId)
      .eq('workspace_id', auth.context.workspace_id)
      .single();

    if (error || !outbox) {
      return { success: false, error: 'NOT_FOUND: Elemento de outbox no encontrado.' };
    }

    return {
      success: true,
      data: outbox,
    };
  }
}

export const n8nInternalApiService = new N8NInternalApiService();
