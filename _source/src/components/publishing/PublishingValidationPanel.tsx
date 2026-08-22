import { PublishingValidationResult } from '../../types/publishing';
import { CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';

interface PublishingValidationPanelProps {
  validationResult: PublishingValidationResult;
  isRenderApproved: boolean;
  hasCompletedRender: boolean;
}

export function PublishingValidationPanel({
  validationResult,
  isRenderApproved,
  hasCompletedRender,
}: PublishingValidationPanelProps) {
  const { isValid, errors, warnings } = validationResult;

  return (
    <div className="space-y-3 p-4 rounded-2xl bg-dark-950/80 border border-dark-800">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          Quality Gate de Publicación
        </h4>
        {isValid && isRenderApproved && hasCompletedRender ? (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            TODO VALIDADO
          </span>
        ) : (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-amber-400" />
            REQUIERE ATENCIÓN
          </span>
        )}
      </div>

      {/* Checklist items */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <div className={`p-2 rounded-xl border flex items-center gap-2 ${
          hasCompletedRender 
            ? 'bg-emerald-950/20 border-emerald-800/30 text-emerald-300' 
            : 'bg-rose-950/20 border-rose-800/30 text-rose-300'
        }`}>
          {hasCompletedRender ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
          <span className="text-[11px] font-medium">Render MP4 Listo</span>
        </div>

        <div className={`p-2 rounded-xl border flex items-center gap-2 ${
          isRenderApproved 
            ? 'bg-emerald-950/20 border-emerald-800/30 text-emerald-300' 
            : 'bg-amber-950/20 border-amber-800/30 text-amber-300'
        }`}>
          {isRenderApproved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
          <span className="text-[11px] font-medium">Aprobado</span>
        </div>

        <div className={`p-2 rounded-xl border flex items-center gap-2 ${
          errors.filter(e => e.field.startsWith('copy')).length === 0 
            ? 'bg-emerald-950/20 border-emerald-800/30 text-emerald-300' 
            : 'bg-rose-950/20 border-rose-800/30 text-rose-300'
        }`}>
          {errors.filter(e => e.field.startsWith('copy')).length === 0 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
          <span className="text-[11px] font-medium">Copy & Tags</span>
        </div>

        <div className={`p-2 rounded-xl border flex items-center gap-2 ${
          errors.filter(e => e.field.startsWith('media')).length === 0 
            ? 'bg-emerald-950/20 border-emerald-800/30 text-emerald-300' 
            : 'bg-rose-950/20 border-rose-800/30 text-rose-300'
        }`}>
          {errors.filter(e => e.field.startsWith('media')).length === 0 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
          <span className="text-[11px] font-medium">Formato & Duración</span>
        </div>
      </div>

      {/* Errors list */}
      {errors.length > 0 && (
        <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-800/40 space-y-1 text-xs">
          <p className="font-bold text-rose-300 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            El contenido requiere corrección antes de publicar ({errors.length}):
          </p>
          <ul className="list-disc list-inside space-y-0.5 text-rose-200/90 text-[11px]">
            {errors.map((err, i) => (
              <li key={i}>
                <strong className="text-white">{err.field}:</strong> {err.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings list */}
      {warnings.length > 0 && (
        <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 space-y-1 text-xs">
          <p className="font-bold text-amber-300 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Recomendaciones de optimización:
          </p>
          <ul className="list-disc list-inside space-y-0.5 text-amber-200/90 text-[11px]">
            {warnings.map((w, i) => (
              <li key={i}>{w.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
