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
