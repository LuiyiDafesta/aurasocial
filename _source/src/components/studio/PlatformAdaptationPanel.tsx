import { useState } from 'react';
import {
  PlatformAdaptation,
  TargetPlatform,
  PublicationPackage,
  ValidationResult,
} from '../../types/platformAdaptation';
import { Button } from '../common/Button';
import { n8nOrchestratorService, N8nPublishWorkflowResponse } from '../../services/n8n/n8nOrchestratorService';
import { useToast } from '../../hooks/useToast';
import { 
  Instagram, 
  Facebook, 
  Linkedin, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  ShieldAlert, 
  Send, 
  Check, 
  Radio, 
  FileText, 
  ThumbsUp,
  Zap
} from 'lucide-react';

interface PlatformAdaptationPanelProps {
  adaptations: PlatformAdaptation[];
  activePlatform: TargetPlatform;
  workspaceId?: string;
  brandId?: string;
  contentId?: string;
  connectionId?: string;
  onSelectPlatform: (platform: TargetPlatform) => void;
  onUpdateCaption: (platform: TargetPlatform, caption: string) => void;
  onUpdateCta: (platform: TargetPlatform, cta: string) => void;
  onApproveAdaptation: (adaptationId: string) => Promise<void>;
  onRevalidate: () => void;
  isReadOnly?: boolean;
}

export function PlatformAdaptationPanel({
  adaptations,
  activePlatform,
  workspaceId,
  brandId,
  contentId,
  connectionId,
  onSelectPlatform,
  onUpdateCaption,
  onApproveAdaptation,
  isReadOnly = false,
}: PlatformAdaptationPanelProps) {
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [publishResult, setPublishResult] = useState<N8nPublishWorkflowResponse | null>(null);

  const { toast } = useToast();

  const currentAdaptation =
    adaptations.find((a) => a.platform === activePlatform) || adaptations[0];

  const pkg = (currentAdaptation?.publication_package as PublicationPackage) || null;
  const validation: ValidationResult | null =
    pkg?.validation_snapshot || (currentAdaptation ? {
      isValid: currentAdaptation.validation_status === 'valid',
      isBlocked: currentAdaptation.validation_status === 'blocked',
      errors: currentAdaptation.validation_errors || [],
      warnings: currentAdaptation.validation_warnings || [],
      validatedAt: currentAdaptation.updated_at,
    } : null);

  const readinessStatus = currentAdaptation?.readiness_status || 'draft';

  const getPlatformIcon = (plat: TargetPlatform) => {
    switch (plat) {
      case 'instagram':
        return <Instagram className="w-3.5 h-3.5" />;
      case 'facebook':
        return <Facebook className="w-3.5 h-3.5" />;
      case 'linkedin':
        return <Linkedin className="w-3.5 h-3.5" />;
      default:
        return <Radio className="w-3.5 h-3.5" />;
    }
  };

  const getReadinessBadge = (status: string) => {
    switch (status) {
      case 'published':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider bg-purple-500/10 text-purple-300 border border-purple-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
            Publicado
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
            <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />
            Aprobado
          </span>
        );
      case 'valid':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider bg-sky-500/10 text-sky-300 border border-sky-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
            Listo (Quality Gate OK)
          </span>
        );
      case 'needs_assets':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            Faltan Medios
          </span>
        );
      case 'blocked':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider bg-rose-500/10 text-rose-300 border border-rose-500/30">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            Bloqueado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-500/10 text-slate-300 border border-slate-500/30">
            Borrador
          </span>
        );
    }
  };

  const handleApprove = async () => {
    if (!currentAdaptation) return;
    try {
      setIsApproving(true);
      await onApproveAdaptation(currentAdaptation.id);
      toast('¡Adaptación Aprobada!', {
        type: 'success',
        description: `La adaptación de ${currentAdaptation.platform.toUpperCase()} está aprobada para publicar.`,
      });
    } catch (err: any) {
      toast('Error al aprobar', {
        type: 'error',
        description: err.message,
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handlePublishN8nDryRun = async () => {
    if (!currentAdaptation || readinessStatus !== 'approved') {
      toast('Publicación bloqueada', {
        type: 'error',
        description: 'La pieza debe estar en estado APROBADO para despachar.',
      });
      return;
    }

    try {
      setIsPublishing(true);
      setPublishResult(null);

      const targetConnectionId = connectionId || currentAdaptation.id;
      const targetWorkspaceId = workspaceId || currentAdaptation.workspace_id || 'default_workspace';
      const targetBrandId = brandId || currentAdaptation.brand_id || 'default_brand';
      const targetContentId = contentId || currentAdaptation.content_item_id || 'default_content';

      const res = await n8nOrchestratorService.triggerSocialPublishWorkflow({
        workspaceId: targetWorkspaceId,
        brandId: targetBrandId,
        contentId: targetContentId,
        provider: 'socialit',
        mode: 'dry_run',
        targets: [
          {
            platform: activePlatform,
            connectionId: targetConnectionId,
            provider: 'socialit',
          }
        ],
        publishPackage: {
          title: currentAdaptation.platform.toUpperCase(),
          caption: currentAdaptation.caption || '',
          hashtags: currentAdaptation.hashtags || [],
          media: currentAdaptation.render_output?.media_url
            ? { url: currentAdaptation.render_output.media_url, mimeType: 'video/mp4' }
            : undefined,
        }
      });

      setPublishResult(res);

      if (res.success && res.mode === 'dry_run') {
        toast('⚡ Simulación n8n completada', {
          type: 'success',
          description: `Workflow ejecutado con éxito. ${res.accounts_processed} cuenta(s) validadas en modo Dry Run (Cero publicaciones reales).`,
        });
      } else if (!res.success) {
        toast('Error en orquestación n8n', {
          type: 'error',
          description: res.error || 'Error desconocido al invocar webhook de n8n.',
        });
      }
    } catch (err: any) {
      toast('Error al invocar n8n', {
        type: 'error',
        description: err.message,
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-dark-900/90 border border-dark-800 rounded-3xl p-5 shadow-xl space-y-4">
      {/* Platform Switcher Tabs */}
      <div className="space-y-2 pb-3 border-b border-dark-800">
        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
          Plataforma de Adaptación:
        </span>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {(['instagram', 'tiktok', 'facebook', 'linkedin'] as TargetPlatform[]).map((plat) => {
            const isSelected = plat === activePlatform;
            const adapt = adaptations.find((a) => a.platform === plat);
            const isApproved = adapt?.readiness_status === 'approved';
            const isValid = adapt?.readiness_status === 'valid';

            return (
              <button
                key={plat}
                onClick={() => onSelectPlatform(plat)}
                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold capitalize transition-all ${
                  isSelected
                    ? 'bg-aura-600 text-white shadow-md shadow-aura-950/40'
                    : 'bg-dark-950/80 border border-dark-800 text-slate-300 hover:bg-dark-800'
                }`}
              >
                {getPlatformIcon(plat)}
                <span className="truncate">{plat}</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isApproved ? 'bg-emerald-400' : isValid ? 'bg-sky-400' : 'bg-amber-400'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      {currentAdaptation && (
        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          {/* Format & Readiness Badge */}
          <div className="flex items-center justify-between gap-2 p-3.5 rounded-2xl bg-dark-950/70 border border-dark-800">
            <div className="space-y-0.5">
              <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider block">
                Formato y Dimensiones
              </span>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span className="uppercase">{currentAdaptation.format}</span>
                <span className="text-slate-500 font-mono text-[11px]">
                  ({currentAdaptation.dimensions?.width || 1080}x{currentAdaptation.dimensions?.height || 1920})
                </span>
              </div>
            </div>
            {getReadinessBadge(readinessStatus)}
          </div>

          {/* Caption & Hashtags Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-aura-400" />
                Caption Adaptado ({activePlatform.toUpperCase()}):
              </label>
              <span className="text-[10px] font-mono text-slate-500">
                {currentAdaptation.caption?.length || 0} car.
              </span>
            </div>
            <textarea
              value={currentAdaptation.caption || ''}
              onChange={(e) => onUpdateCaption(activePlatform, e.target.value)}
              disabled={isReadOnly}
              rows={3}
              className="w-full rounded-2xl bg-dark-950 border border-dark-800 p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-aura-500 focus:ring-1 focus:ring-aura-500/50 resize-none transition-all leading-relaxed"
              placeholder={`Escribe el copy optimizado para ${activePlatform}...`}
            />
          </div>

          {/* Hashtags Tags */}
          {currentAdaptation.hashtags && currentAdaptation.hashtags.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider block">
                Hashtags ({currentAdaptation.hashtags.length}):
              </span>
              <div className="flex flex-wrap gap-1">
                {currentAdaptation.hashtags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-lg bg-dark-950 border border-dark-800 text-aura-400 text-[10px] font-medium font-mono"
                  >
                    #{tag.replace(/^#/, '')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Quality Gate Checklist */}
          {validation && (
            <div className="p-4 rounded-2xl bg-dark-950/80 border border-dark-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-dark-800 text-xs font-bold text-white">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Quality Gate:
                </span>
                {validation.isBlocked ? (
                  <span className="text-rose-400 flex items-center gap-1 text-[11px] font-semibold">
                    <ShieldAlert className="w-3.5 h-3.5" /> Bloqueado
                  </span>
                ) : validation.isValid ? (
                  <span className="text-emerald-400 flex items-center gap-1 text-[11px] font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" /> 100% Válido
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1 text-[11px] font-semibold">
                    <AlertCircle className="w-3.5 h-3.5" /> Pendiente
                  </span>
                )}
              </div>

              {/* Validation Rules */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-[11px]">Duración máxima ({activePlatform}):</span>
                  <span className="font-mono text-[11px] text-white">
                    {currentAdaptation.target_duration_seconds || currentAdaptation.render_output?.duration_seconds || 15}s / 60s
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-[11px]">Video MP4 asignado:</span>
                  {currentAdaptation.render_output?.media_url ? (
                    <span className="text-emerald-400 flex items-center gap-1 font-semibold text-[11px]">
                      <Check className="w-3 h-3" /> Asignado
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1 font-semibold text-[11px]">
                      <AlertCircle className="w-3 h-3" /> Falta Video
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-[11px]">Safe Area Guides:</span>
                  <span className="text-emerald-400 flex items-center gap-1 font-semibold text-[11px]">
                    <ShieldCheck className="w-3 h-3" /> Seguro
                  </span>
                </div>
              </div>

              {validation.errors.length > 0 && (
                <div className="pt-2 border-t border-dark-800 space-y-1">
                  {validation.errors.map((err, idx) => (
                    <p key={idx} className="text-[11px] text-rose-400 leading-tight">
                      • {err.message}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons: 1. Aprobar (Humano) -> 2. Publicar (n8n Dry Run) */}
          <div className="pt-2 space-y-2">
            {readinessStatus === 'valid' && (
              <Button
                variant="primary"
                size="md"
                onClick={handleApprove}
                isLoading={isApproving}
                leftIcon={<ThumbsUp className="w-4 h-4" />}
                className="w-full font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-950/40"
              >
                Aprobar para Publicación (Paso Humano)
              </Button>
            )}

            <Button
              variant="primary"
              size="lg"
              onClick={handlePublishN8nDryRun}
              disabled={readinessStatus !== 'approved' || isPublishing}
              isLoading={isPublishing}
              leftIcon={<Send className="w-4 h-4" />}
              className={`w-full font-bold shadow-lg ${
                readinessStatus === 'approved'
                  ? 'bg-gradient-to-r from-aura-600 to-emerald-600 hover:from-aura-500 hover:to-emerald-500 text-white shadow-emerald-950/40'
                  : 'bg-dark-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {readinessStatus === 'approved'
                ? 'Enviar Publicación (n8n Dry Run)'
                : readinessStatus === 'valid'
                ? 'Pendiente de Aprobación Humana'
                : 'Publicación Bloqueada (Faltan Medios)'}
            </Button>

            {/* n8n Dry Run Result Banner */}
            {publishResult && (
              <div
                className={`p-3.5 rounded-2xl border space-y-2 text-xs animate-in fade-in duration-200 ${
                  publishResult.success
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5">
                    {publishResult.success ? (
                      <>
                        <Zap className="w-4 h-4 text-amber-400" /> ⚡ Simulación n8n Exitosa
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-rose-400" /> Error de Orquestación n8n
                      </>
                    )}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-dark-950/60 border border-dark-800">
                    mode: {publishResult.mode}
                  </span>
                </div>

                {publishResult.success ? (
                  <p className="text-[11px] text-amber-300/90 leading-relaxed">
                    Workflow ejecutado correctamente por n8n ({publishResult.accounts_processed} cuenta validada). 
                    <strong className="block font-semibold mt-0.5 text-amber-200">
                      Modo Dry Run: Cero publicaciones realizadas en redes sociales externas.
                    </strong>
                  </p>
                ) : (
                  <p className="text-[11px] text-rose-300 leading-tight">
                    {publishResult.error || 'No se pudo conectar con el webhook de n8n.'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
