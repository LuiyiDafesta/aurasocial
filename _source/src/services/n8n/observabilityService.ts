import { sanitizeSocialitLogs } from '../socialProviders/socialitClient';

export type OrchestrationEventType =
  | 'provider_health_checked'
  | 'provider_account_synced'
  | 'provider_account_connected'
  | 'provider_account_disconnected'
  | 'provider_account_expiring'
  | 'provider_account_expired'
  | 'provider_fallback_triggered'
  | 'social_account_bound'
  | 'publishing_readiness_changed';

export interface OrchestrationEventPayload {
  event: OrchestrationEventType;
  workspace_id: string;
  brand_id?: string | null;
  platform?: string;
  provider?: string;
  account_id?: string;
  content_id?: string;
  details?: Record<string, any>;
  timestamp?: string;
}

export class ObservabilityService {
  private eventsLog: OrchestrationEventPayload[] = [];

  /**
   * Emite y almacena un evento de observabilidad estructurado sanitizando cualquier secreto.
   */
  logEvent(payload: OrchestrationEventPayload): OrchestrationEventPayload {
    const ts = payload.timestamp || new Date().toISOString();
    const sanitizedDetails = payload.details 
      ? JSON.parse(sanitizeSocialitLogs(JSON.stringify(payload.details))) 
      : {};

    const safeEvent: OrchestrationEventPayload = {
      event: payload.event,
      workspace_id: payload.workspace_id,
      brand_id: payload.brand_id || null,
      platform: payload.platform,
      provider: payload.provider,
      account_id: payload.account_id,
      content_id: payload.content_id,
      details: sanitizedDetails,
      timestamp: ts,
    };

    this.eventsLog.push(safeEvent);
    // Limitar histórico en memoria a 500 eventos
    if (this.eventsLog.length > 500) {
      this.eventsLog.shift();
    }

    console.log(`[ORCHESTRATION_TELEMETRY] [${ts}] [${payload.event}] Ws:${payload.workspace_id} | Brand:${payload.brand_id || 'all'} | Provider:${payload.provider || '-'} | Meta:`, sanitizedDetails);
    return safeEvent;
  }

  getRecentEvents(workspaceId?: string, limit: number = 50): OrchestrationEventPayload[] {
    let list = this.eventsLog;
    if (workspaceId) {
      list = list.filter(e => e.workspace_id === workspaceId);
    }
    return list.slice(-limit);
  }

  clear(): void {
    this.eventsLog = [];
  }
}

export const observabilityService = new ObservabilityService();
