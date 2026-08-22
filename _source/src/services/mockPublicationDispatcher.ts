import { PublicationPackage } from '../types/platformAdaptation';

export interface MockDispatchResult {
  success: boolean;
  package_id: string;
  platform: string;
  external_post_id: string;
  external_post_url: string;
  published_at: string;
  audit_trail: {
    event: string;
    timestamp: string;
    user: string;
    details: string;
  }[];
}

/**
 * Dispatcher Mock de Publicación (Fase 9A.5 / 9A.21 / 9A.24)
 * Demuestra el flujo completo APPROVED -> Mock Publish -> PUBLISHED
 * con validación estricta de pre-condición: Si no está APPROVED, se RECHAZA.
 */
export async function dispatchMockPublication(
  pkg: PublicationPackage,
  userId?: string
): Promise<MockDispatchResult> {
  const actingUser = userId || pkg.approved_by || 'system_user';

  // 1. REGLA ESTRICTA (Fase 9A.4 / 9A.5): Solo despachar si el paquete está en estado APPROVED
  if (pkg.readiness_status !== 'approved') {
    throw new Error(
      `Bloqueo de Publicación: El paquete '${pkg.package_id}' para ${pkg.platform} no está en estado APPROVED (Estado actual: '${pkg.readiness_status}'). La pieza debe ser aprobada explícitamente por un usuario antes de publicar.`
    );
  }

  // 2. Simular latencia de red de despacho
  await new Promise((resolve) => setTimeout(resolve, 250));

  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  const externalPostId = `ext_${pkg.platform}_${randomSuffix}`;
  let externalPostUrl = `https://${pkg.platform}.com/p/${externalPostId}`;

  if (pkg.platform === 'tiktok') {
    externalPostUrl = `https://www.tiktok.com/@${pkg.brand_profile.handle || 'brand'}/video/${externalPostId}`;
  } else if (pkg.platform === 'facebook') {
    externalPostUrl = `https://www.facebook.com/posts/${externalPostId}`;
  } else if (pkg.platform === 'linkedin') {
    externalPostUrl = `https://www.linkedin.com/feed/update/urn:li:activity:${externalPostId}`;
  }

  const publishedAt = new Date().toISOString();

  const auditTrail = [
    {
      event: 'PACKAGE_VALIDATION',
      timestamp: pkg.validation_snapshot?.validatedAt || publishedAt,
      user: actingUser,
      details: `Paquete validado con 0 errores para ${pkg.platform} (${pkg.format}).`,
    },
    {
      event: 'HUMAN_APPROVAL',
      timestamp: pkg.approved_at || publishedAt,
      user: actingUser,
      details: `Aprobación humana confirmada. Estado pasó a APPROVED.`,
    },
    {
      event: 'MEDIA_RENDER_VERIFICATION',
      timestamp: publishedAt,
      user: actingUser,
      details: `Archivo final verificado: ${pkg.media.render_url.slice(0, 40)}... (${pkg.media.width}x${pkg.media.height})`,
    },
    {
      event: 'MOCK_DISPATCH_SUCCESS',
      timestamp: publishedAt,
      user: actingUser,
      details: `Despacho simulado exitoso hacia ${pkg.platform}. URL generada: ${externalPostUrl}`,
    },
  ];

  return {
    success: true,
    package_id: pkg.package_id,
    platform: pkg.platform,
    external_post_id: externalPostId,
    external_post_url: externalPostUrl,
    published_at: publishedAt,
    audit_trail: auditTrail,
  };
}
