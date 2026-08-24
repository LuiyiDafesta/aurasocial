import { PlatformAdaptation } from '../../types/platformAdaptation';
import { RenderJob } from '../../types/renderJob';
import { Button } from '../common/Button';
import { 
  CheckCircle2, 
  X, 
  AlertCircle, 
  ShieldCheck, 
  Film, 
  Layers, 
  FileText, 
  Maximize2 
} from 'lucide-react';

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  adaptation: PlatformAdaptation;
  renderJob?: RenderJob | null;
  platformName?: string;
  isApproving?: boolean;
  validationErrors?: Array<{ code: string; message: string }>;
}

export function ApprovalModal({
  isOpen,
  onClose,
  onConfirm,
  adaptation,
  renderJob,
  platformName = 'Plataforma',
  isApproving = false,
  validationErrors = [],
}: ApprovalModalProps) {
  if (!isOpen) return null;

  const hasRender = Boolean(renderJob && renderJob.status === 'completed' && renderJob.output_storage_path);
  const scenes = Array.isArray(adaptation.scene_mappings) ? adaptation.scene_mappings : [];
  const hasResolvedMedia = scenes.length > 0 && scenes.every(s => s.status === 'resolved' && s.asset_id);
  const hasQualityGatePass = validationErrors.length === 0;
  const hasCopy = Boolean(adaptation.caption && adaptation.caption.trim().length > 0);
  const safeAreaValid = scenes.every(s => s.safe_area_valid !== false);

  const canApprove = hasRender && hasResolvedMedia && hasQualityGatePass && hasCopy;

  const checklist = [
    {
      label: 'Render de video MP4',
      valid: hasRender,
      icon: <Film className="w-4 h-4" />,
      detail: hasRender ? 'Render completado en Backblaze B2' : 'Falta renderizar video',
    },
    {
      label: 'Recursos multimedia (Media Slots)',
      valid: hasResolvedMedia,
      icon: <Layers className="w-4 h-4" />,
      detail: hasResolvedMedia ? `${scenes.length} de ${scenes.length} slots resueltos` : 'Faltan assets por resolver',
    },
    {
      label: 'Quality Gate & Sanitización',
      valid: hasQualityGatePass,
      icon: <ShieldCheck className="w-4 h-4" />,
      detail: hasQualityGatePass ? 'Sin placeholders ni términos prohibidos' : `${validationErrors.length} problema(s) detectados`,
    },
    {
      label: 'Copy & Hashtags de publicación',
      valid: hasCopy,
      icon: <FileText className="w-4 h-4" />,
      detail: hasCopy ? 'Texto y hashtags presentes y válidos' : 'Copy vacío o incompleto',
    },
    {
      label: 'Safe Areas de la plataforma',
      valid: safeAreaValid,
      icon: <Maximize2 className="w-4 h-4" />,
      detail: safeAreaValid ? 'Elementos dentro de zonas seguras' : 'Advertencia de safe area',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800 bg-zinc-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Aprobar Contenido para Publicar</h3>
              <p className="text-xs text-zinc-400">Canal: <span className="text-zinc-200 font-medium">{platformName}</span></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-2 rounded-lg hover:bg-zinc-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <p className="text-xs text-zinc-400 leading-relaxed">
            Revisión final de aseguramiento de calidad. Al confirmar la aprobación, la adaptación cambiará a estado <span className="text-emerald-400 font-medium">LISTO PARA PUBLICAR</span> y habilitará la publicación manual y automática.
          </p>

          {/* Checklist */}
          <div className="space-y-2 bg-zinc-950/40 p-4 rounded-xl border border-zinc-800/80">
            {checklist.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b border-zinc-800/40 last:border-0">
                <div className="flex items-center gap-2.5">
                  <span className={item.valid ? 'text-zinc-300' : 'text-zinc-500'}>{item.icon}</span>
                  <div>
                    <span className="text-xs font-medium text-zinc-200 block">{item.label}</span>
                    <span className="text-[10px] text-zinc-400">{item.detail}</span>
                  </div>
                </div>
                <div>
                  {item.valid ? (
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
                      <AlertCircle className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!canApprove && (
            <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-800/50 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-rose-200">
                <span className="font-semibold block mb-0.5">No se puede aprobar aún</span>
                Debe resolver todos los requerimientos pendientes antes de emitir la aprobación humana de publicación.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-zinc-800 bg-zinc-950/50">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isApproving}
            className="text-xs"
          >
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!canApprove || isApproving}
            isLoading={isApproving}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            ✓ Confirmar Aprobación
          </Button>
        </div>
      </div>
    </div>
  );
}
