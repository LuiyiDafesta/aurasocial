import { supabase } from '../../lib/supabase';
import { SocialPlatform, SocialConnection } from '../../types/publishing';
import { isRealPublishingEnabled } from '../../config/publishingConfig';
import { sanitizeSocialConnectionForClient } from '../connectors/oauthSecurityService';
import { observabilityService } from '../n8n/observabilityService';

export interface ReadinessCondition {
  id: string;
  name: string;
  passed: boolean;
  message: string;
  details?: Record<string, any>;
}

export interface PublishingReadinessReport {
  content_id: string;
  workspace_id: string;
  brand_id: string;
  platform: SocialPlatform;
  status: 'READY_FOR_PUBLISH' | 'NOT_READY' | 'BLOCKED_BY_KILL_SWITCH';
  can_proceed_to_dispatcher: boolean;
  evaluated_at: string;
  conditions: ReadinessCondition[];
  target_connection?: Partial<SocialConnection> | null;
  reasons_not_ready: string[];
}

export class PublishingReadinessService {

  /**
   * Evalúa todos los requisitos previos requeridos antes de despachar una publicación a redes sociales.
   * NO realiza ninguna llamada de publicación externa.
   */
  async evaluateReadiness(params: {
    contentId: string;
    platform: SocialPlatform;
    workspaceId: string;
    brandId: string;
  }): Promise<PublishingReadinessReport> {
    const { contentId, platform, workspaceId, brandId } = params;
    const now = new Date().toISOString();
    const conditions: ReadinessCondition[] = [];
    const reasons: string[] = [];

    // 1. Validar existencia del Content Master y estado de Aprobación
    const { data: contentItem } = await supabase
      .from('content_items')
      .select('id, workspace_id, brand_id, status, title')
      .eq('id', contentId)
      .eq('workspace_id', workspaceId)
      .single();

    const isContentApproved = Boolean(contentItem && (contentItem.status === 'approved' || contentItem.status === 'ready'));
    conditions.push({
      id: 'content_approval',
      name: 'Aprobación de Contenido Master',
      passed: isContentApproved,
      message: isContentApproved 
        ? 'Contenido Master aprobado y validado.' 
        : `El contenido está en estado '${contentItem?.status || 'desconocido'}' (requiere 'approved').`,
    });
    if (!isContentApproved) {
      reasons.push('El contenido no ha sido formalmente aprobado.');
    }

    // 2. Validar Adaptación de Plataforma y Quality Gate
    const { data: adaptations } = await supabase
      .from('platform_adaptations')
      .select('id, platform, status, quality_gate, is_locked')
      .eq('content_item_id', contentId)
      .eq('platform', platform)
      .limit(1);

    const adaptation = adaptations && adaptations.length > 0 ? adaptations[0] : null;
    const qGate = adaptation?.quality_gate as any;
    const isQualityGatePassed = Boolean(qGate?.passed !== false && adaptation);
    conditions.push({
      id: 'quality_gate',
      name: 'Quality Gate de Plataforma',
      passed: isQualityGatePassed,
      message: isQualityGatePassed 
        ? `Quality Gate superado para ${platform}.` 
        : `Quality Gate pendiente o no superado para ${platform}.`,
    });
    if (!isQualityGatePassed) {
      reasons.push(`Quality Gate no superado para ${platform}.`);
    }

    // 3. Validar Render Job y Disponibilidad Multimedia
    const { data: renderJobs } = await supabase
      .from('render_jobs')
      .select('id, status, output_asset_id, output_path')
      .eq('content_item_id', contentId)
      .eq('platform', platform)
      .order('created_at', { ascending: false })
      .limit(1);

    const lastRender = renderJobs && renderJobs.length > 0 ? renderJobs[0] : null;
    const isRenderCompleted = Boolean(lastRender && (lastRender.status === 'completed' || lastRender.status === 'succeeded'));
    conditions.push({
      id: 'render_completion',
      name: 'Renderizado y Media Disponible',
      passed: isRenderCompleted,
      message: isRenderCompleted 
        ? 'Render completado y asset multimedia listo para publicación.' 
        : 'Render no iniciado, en proceso o fallido.',
    });
    if (!isRenderCompleted) {
      reasons.push('Falta el renderizado multimedia completado.');
    }

    // 4. Validar Conexión Social y Brand Binding
    const { data: connections } = await supabase
      .from('social_connections')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('brand_id', brandId)
      .eq('platform', platform)
      .in('status', ['connected', 'mock_connected'])
      .order('created_at', { ascending: false })
      .limit(1);

    const targetConn = connections && connections.length > 0 ? (connections[0] as SocialConnection) : null;
    const isAccountBoundAndConnected = Boolean(targetConn && targetConn.status === 'connected');
    conditions.push({
      id: 'account_binding',
      name: 'Cuenta Social Conectada y Vinculada',
      passed: isAccountBoundAndConnected || Boolean(targetConn?.status === 'mock_connected'),
      message: targetConn 
        ? `Cuenta vinculada: ${targetConn.account_name} (${targetConn.provider || 'socialit'}).` 
        : `No hay cuenta social conectada y vinculada a la marca para ${platform}.`,
    });
    if (!targetConn) {
      reasons.push(`No hay cuenta de ${platform} asociada a la marca actual.`);
    }

    // 5. Validar Salud y Capacidad can_publish
    let isHealthyAndCanPublish = false;
    if (targetConn) {
      if (targetConn.status === 'mock_connected') {
        isHealthyAndCanPublish = true;
      } else {
        const canPostMeta = targetConn.metadata?.can_post !== false;
        const healthMeta = targetConn.metadata?.health_status !== 'expired' && targetConn.metadata?.health_status !== 'revoked';
        isHealthyAndCanPublish = canPostMeta && healthMeta && targetConn.status === 'connected';
      }
    }

    conditions.push({
      id: 'account_can_publish',
      name: 'Capacidad de Publicación (can_publish)',
      passed: isHealthyAndCanPublish,
      message: isHealthyAndCanPublish 
        ? 'La cuenta social posee permisos vigentes de publicación (can_publish=true).' 
        : 'La cuenta no posee permisos de publicación o su token está revocado/expirado.',
    });
    if (!isHealthyAndCanPublish && targetConn) {
      reasons.push('La cuenta no tiene permisos activos de publicación.');
    }

    // 6. Validar Kill Switch (REAL_PUBLISHING_ENABLED)
    const killSwitchOpen = isRealPublishingEnabled();
    conditions.push({
      id: 'kill_switch_protection',
      name: 'Kill Switch de Publicación Real',
      passed: true, // Informativo
      message: killSwitchOpen 
        ? 'Publicación real habilitada en configuración.' 
        : 'Publicación real bloqueada de forma segura (REAL_PUBLISHING_ENABLED = false).',
      details: { kill_switch_active: !killSwitchOpen },
    });

    const allCoreConditionsPassed = isContentApproved && isQualityGatePassed && isRenderCompleted && Boolean(targetConn) && isHealthyAndCanPublish;
    
    let overallStatus: 'READY_FOR_PUBLISH' | 'NOT_READY' | 'BLOCKED_BY_KILL_SWITCH' = 'NOT_READY';
    if (allCoreConditionsPassed) {
      overallStatus = killSwitchOpen ? 'READY_FOR_PUBLISH' : 'BLOCKED_BY_KILL_SWITCH';
    }

    observabilityService.logEvent({
      event: 'publishing_readiness_changed',
      workspace_id: workspaceId,
      brand_id: brandId,
      platform,
      content_id: contentId,
      details: {
        status: overallStatus,
        all_passed: allCoreConditionsPassed,
        reasons_count: reasons.length,
      },
    });

    return {
      content_id: contentId,
      workspace_id: workspaceId,
      brand_id: brandId,
      platform,
      status: overallStatus,
      can_proceed_to_dispatcher: allCoreConditionsPassed && killSwitchOpen,
      evaluated_at: now,
      conditions,
      target_connection: targetConn ? sanitizeSocialConnectionForClient(targetConn) : null,
      reasons_not_ready: reasons,
    };
  }
}

export const publishingReadinessService = new PublishingReadinessService();
