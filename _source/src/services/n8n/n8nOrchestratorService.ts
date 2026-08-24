/**
 * AuraSocial — n8n Orchestrator Service
 * Fase 12D.5: Social Account Sync Orchestration
 * 
 * Permite a AuraSocial invocar el Webhook real de n8n para orquestar
 * el ciclo completo: AuraSocial -> n8n -> Socialit Discovery -> Dynamic Item Processing -> Dynamic Binding -> Structured Response.
 * 
 * ZERO PUBLISHING MANDATE:
 * - No realiza publicaciones externas
 * - No modifica publishing_outbox
 * - No expone secretos ni tokens
 */

import { observabilityService } from './observabilityService';

export interface N8nSyncWorkflowInput {
  workspaceId: string;
  brandId: string;
  provider?: 'socialit' | 'robin_research' | 'meta_direct';
  customWebhookUrl?: string;
}

export interface N8nSyncWorkflowAccountResult {
  platform: string;
  provider_account_id: string;
  account_name: string;
  success: boolean;
  already_bound: boolean;
  connection_id: string | null;
}

export interface N8nSyncWorkflowResponse {
  success: boolean;
  workspaceId: string;
  brandId: string;
  provider: string;
  accounts_processed: number;
  results: N8nSyncWorkflowAccountResult[];
  timestamp?: string;
  error?: string;
}

export interface N8nPublishTargetInput {
  platform: string;
  connectionId: string;
  provider?: string;
}

export interface N8nPublishPackageInput {
  title?: string;
  caption?: string;
  hashtags?: string[];
  media?: {
    url?: string;
    mimeType?: string;
  };
}

export interface N8nPublishWorkflowInput {
  workspaceId: string;
  brandId: string;
  contentId: string;
  provider?: 'socialit' | 'robin_research' | 'meta_direct';
  mode?: 'dry_run' | 'real';
  targets: N8nPublishTargetInput[];
  publishPackage: N8nPublishPackageInput;
  customWebhookUrl?: string;
}

export interface N8nPublishTargetResult {
  platform: string;
  connectionId: string;
  provider: string;
  success: boolean;
  mode: string;
  published: boolean;
  would_publish: boolean;
  target_readiness?: Record<string, any> | null;
}

export interface N8nPublishWorkflowResponse {
  success: boolean;
  mode: string;
  published: boolean;
  publishing_requests: number;
  accounts_processed: number;
  contentId?: string;
  workspaceId?: string;
  brandId?: string;
  provider?: string;
  results: N8nPublishTargetResult[];
  timestamp?: string;
  error?: string;
  error_code?: string;
}

export class N8nOrchestratorService {
  private defaultWebhookUrl: string;
  private defaultPublishWebhookUrl: string;
  private serverKey: string;

  constructor() {
    const envWebhook = typeof process !== 'undefined' && process.env 
      ? (process.env.N8N_SOCIAL_SYNC_WEBHOOK_URL || process.env.VITE_N8N_SYNC_WEBHOOK_URL)
      : undefined;

    const envPublishWebhook = typeof process !== 'undefined' && process.env
      ? (process.env.N8N_SOCIAL_PUBLISH_WEBHOOK_URL || process.env.VITE_N8N_SOCIAL_PUBLISH_WEBHOOK_URL)
      : undefined;

    this.defaultWebhookUrl = envWebhook || 'https://aurasocial.lsnethub.com/webhook/aurasocial/social/sync';
    this.defaultPublishWebhookUrl = envPublishWebhook || 'https://aurasocial.lsnethub.com/webhook/aurasocial/social/publish';
    this.serverKey = (typeof process !== 'undefined' && process.env && process.env.AURASOCIAL_N8N_API_KEY) ||
      'aura_n8n_live_sec_99a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4';
  }

  /**
   * Invoca el webhook de sincronización y binding de n8n de forma asíncrona y segura.
   */
  async triggerSocialSyncWorkflow(input: N8nSyncWorkflowInput): Promise<N8nSyncWorkflowResponse> {
    const { workspaceId, brandId, provider = 'socialit', customWebhookUrl } = input;

    if (!workspaceId) {
      throw new Error('BAD_REQUEST: workspaceId es obligatorio para la orquestación.');
    }

    if (!brandId) {
      throw new Error('BAD_REQUEST: brandId es obligatorio para la orquestación.');
    }

    const webhookUrl = customWebhookUrl || this.defaultWebhookUrl;

    observabilityService.logEvent({
      event: 'n8n_sync_orchestration_started',
      workspace_id: workspaceId,
      brand_id: brandId,
      provider,
      details: {
        webhook_url: webhookUrl,
        mode: 'dynamic_orchestration',
      },
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const payload = {
        workspaceId,
        brandId,
        provider,
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.serverKey}`,
          'X-AuraSocial-Server-Key': this.serverKey,
          'x-workspace-id': workspaceId,
          'x-brand-id': brandId,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP_${response.status}: Error al invocar n8n webhook: ${errorText}`);
      }

      const result: N8nSyncWorkflowResponse = await response.json();

      observabilityService.logEvent({
        event: 'n8n_sync_orchestration_completed',
        workspace_id: workspaceId,
        brand_id: brandId,
        provider,
        details: {
          accounts_processed: result.accounts_processed || 0,
          results_count: result.results ? result.results.length : 0,
        },
      });

      return result;
    } catch (err: any) {
      clearTimeout(timeoutId);

      const isAbort = err.name === 'AbortError';
      const classifiedError = isAbort ? 'TIMEOUT: n8n webhook superó los 30s sin responder' : err.message;

      observabilityService.logEvent({
        event: 'n8n_sync_orchestration_failed',
        workspace_id: workspaceId,
        brand_id: brandId,
        provider,
        details: {
          error_message: classifiedError,
          error_type: isAbort ? 'timeout' : 'request_failure',
        },
      });

      return {
        success: false,
        workspaceId,
        brandId,
        provider,
        accounts_processed: 0,
        results: [],
        error: classifiedError,
      };
    }
  }

  /**
   * Invoca el webhook de publicación (DRY RUN ONLY) de n8n.
   * STRICT GUARD: Solo se admite mode="dry_run". Cualquier intento de mode="real" es bloqueado.
   */
  async triggerSocialPublishWorkflow(input: N8nPublishWorkflowInput): Promise<N8nPublishWorkflowResponse> {
    const { 
      workspaceId, 
      brandId, 
      contentId, 
      provider = 'socialit', 
      mode = 'dry_run', 
      targets, 
      publishPackage, 
      customWebhookUrl 
    } = input;

    if (!workspaceId) throw new Error('BAD_REQUEST: workspaceId es obligatorio.');
    if (!brandId) throw new Error('BAD_REQUEST: brandId es obligatorio.');
    if (!contentId) throw new Error('BAD_REQUEST: contentId es obligatorio.');
    if (!Array.isArray(targets) || targets.length === 0) throw new Error('BAD_REQUEST: targets debe contener al menos 1 destino.');

    // GUARDIA ESTRICTA DE KILL SWITCH: Bloqueo de publicaciones reales en esta fase
    if (mode !== 'dry_run') {
      observabilityService.logEvent({
        event: 'n8n_publish_orchestration_failed',
        workspace_id: workspaceId,
        brand_id: brandId,
        content_id: contentId,
        provider,
        details: {
          error_code: 'REAL_PUBLISHING_DISABLED',
          attempted_mode: mode,
        },
      });

      return {
        success: false,
        error_code: 'REAL_PUBLISHING_DISABLED',
        mode,
        published: false,
        publishing_requests: 0,
        accounts_processed: 0,
        results: [],
        error: 'REAL_PUBLISHING_DISABLED: La publicación real está estrictamente deshabilitada en esta fase (Kill Switch activo).',
      };
    }

    const webhookUrl = customWebhookUrl || this.defaultPublishWebhookUrl;

    observabilityService.logEvent({
      event: 'n8n_publish_orchestration_started',
      workspace_id: workspaceId,
      brand_id: brandId,
      content_id: contentId,
      provider,
      details: {
        webhook_url: webhookUrl,
        mode: 'dry_run',
        targets_count: targets.length,
      },
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const payload = {
        workspaceId,
        brandId,
        contentId,
        provider,
        mode: 'dry_run',
        targets,
        publishPackage,
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.serverKey}`,
          'X-AuraSocial-Server-Key': this.serverKey,
          'x-workspace-id': workspaceId,
          'x-brand-id': brandId,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP_${response.status}: Error al invocar n8n publish webhook: ${errorText}`);
      }

      const result: N8nPublishWorkflowResponse = await response.json();

      observabilityService.logEvent({
        event: 'n8n_publish_orchestration_completed',
        workspace_id: workspaceId,
        brand_id: brandId,
        content_id: contentId,
        provider,
        details: {
          mode: 'dry_run',
          published: false,
          accounts_processed: result.accounts_processed || 0,
          publishing_requests: 0,
        },
      });

      return result;
    } catch (err: any) {
      clearTimeout(timeoutId);

      const isAbort = err.name === 'AbortError';
      const classifiedError = isAbort ? 'TIMEOUT: n8n publish webhook superó los 30s sin responder' : err.message;

      observabilityService.logEvent({
        event: 'n8n_publish_orchestration_failed',
        workspace_id: workspaceId,
        brand_id: brandId,
        content_id: contentId,
        provider,
        details: {
          error_message: classifiedError,
          error_type: isAbort ? 'timeout' : 'request_failure',
        },
      });

      return {
        success: false,
        mode: 'dry_run',
        published: false,
        publishing_requests: 0,
        accounts_processed: 0,
        results: [],
        error: classifiedError,
      };
    }
  }
}

export const n8nOrchestratorService = new N8nOrchestratorService();
