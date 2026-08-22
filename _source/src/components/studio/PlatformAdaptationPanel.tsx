import { useState } from 'react';
import {
  PlatformAdaptation,
  TargetPlatform,
  PublicationPackage,
  ValidationResult,
} from '../../types/platformAdaptation';
import { Button } from '../common/Button';
import { dispatchMockPublication, MockDispatchResult } from '../../services/mockPublicationDispatcher';
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
  ExternalLink, 
  DollarSign, 
  Check, 
  X,
  Radio,
  FileText,
  ThumbsUp
} from 'lucide-react';

interface PlatformAdaptationPanelProps {
  adaptations: PlatformAdaptation[];
  activePlatform: TargetPlatform;
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
  onSelectPlatform,
  onUpdateCaption,
  onApproveAdaptation,
  isReadOnly = false,
}: PlatformAdaptationPanelProps) {
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [publishResult, setPublishResult] = useState<MockDispatchResult | null>(null);

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
            Published (Mock)
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
            <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />
            Approved
          </span>
        );
      case 'valid':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider bg-sky-500/10 text-sky-300 border border-sky-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
            Valid (Auto-Check OK)
          </span>
        );
      case 'needs_assets':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            Needs Assets
          </span>
        );
      case 'blocked':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider bg-rose-500/10 text-rose-300 border border-rose-500/30">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            Blocked
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-500/10 text-slate-300 border border-slate-500/30">
            Draft
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

  const handlePublishMock = async () => {
    if (!pkg || readinessStatus !== 'approved') {
      toast('Publicación bloqueada', {
        type: 'error',
        description: 'La pieza debe estar en estado APPROVED para despachar.',
      });
      return;
    }

    try {
      setIsPublishing(true);
      const res = await dispatchMockPublication(pkg);
      setPublishResult(res);
      toast('¡Publicación Despachada (Mock)!', {
        type: 'success',
        description: `Post generado exitosamente en ${pkg.platform.toUpperCase()}.`,
      });
    } catch (err: any) {
      toast('Error de despacho', {
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
                <span className="text-slate-400 font-mono text-[11px]">
                  ({currentAdaptation.dimensions?.aspect_ratio || '9:16'} •{' '}
                  {currentAdaptation.dimensions?.width}x{currentAdaptation.dimensions?.height})
                </span>
              </div>
            </div>
            {getReadinessBadge(readinessStatus)}
          </div>

          {/* Caption Editor */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-sky-400" /> Caption Adaptado
              </span>
              <span className="font-mono text-slate-400">
                {(currentAdaptation.caption || '').length} car.
              </span>
            </div>

            <textarea
              value={currentAdaptation.caption || ''}
              onChange={(e) => onUpdateCaption(activePlatform, e.target.value)}
              disabled={isReadOnly}
              rows={3}
              className="w-full bg-dark-950 border border-dark-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-aura-500 font-sans resize-none"
            />
          </div>

          {/* Cost Estimation Widget */}
          <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
              <span className="flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Costo Estimado de Render
              </span>
              <span className="font-mono text-sm text-emerald-400">$0.00 USD</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              Renderizado determinista local con assets propios (Cero costo en APIs pagas de IA).
            </p>
          </div>

          {/* Validation Checklist */}
          {validation && (
            <div className="p-3.5 rounded-2xl bg-dark-950/70 border border-dark-800 space-y-2.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Checklist de Validación Automática
              </span>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Textos y Caracteres:</span>
                  {validation.errors.some((e) => e.field === 'caption' || e.field === 'hashtags') ? (
                    <span className="text-rose-400 flex items-center gap-1 font-semibold">
                      <X className="w-3.5 h-3.5" /> Error
                    </span>
                  ) : (
                    <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                      <Check className="w-3.5 h-3.5" /> Válido
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Assets de Escenas:</span>
                  {currentAdaptation.scene_mappings.some((s) => s.status === 'needs_asset') ? (
                    <span className="text-amber-400 flex items-center gap-1 font-semibold">
                      <AlertCircle className="w-3.5 h-3.5" /> Needs Asset
                    </span>
                  ) : (
                    <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                      <Check className="w-3.5 h-3.5" /> Completo
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Safe Area Overlays:</span>
                  {validation.errors.some((e) => e.code === 'TEXT_OVERLAY_OVERFLOW') ? (
                    <span className="text-amber-400 flex items-center gap-1 font-semibold">
                      <ShieldAlert className="w-3.5 h-3.5" /> Desborde
                    </span>
                  ) : (
                    <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" /> Seguro
                    </span>
                  )}
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

          {/* Action Buttons: 1. Aprobar (Humano) -> 2. Publicar (Mock) */}
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
              onClick={handlePublishMock}
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
                ? 'Publicar (Mock Dispatch)'
                : readinessStatus === 'valid'
                ? 'Pendiente de Aprobación Humana'
                : 'Publicación Bloqueada'}
            </Button>

            {/* Published Result Box */}
            {publishResult && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2 text-xs">
                <div className="flex items-center justify-between text-emerald-300 font-bold">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> ¡Publicado con Éxito!
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">200 OK</span>
                </div>
                <a
                  href={publishResult.external_post_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-white underline font-semibold hover:text-emerald-300 transition-colors text-[11px]"
                >
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  {publishResult.external_post_url}
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
