import { useState, useMemo } from 'react';
import { ContentVersion } from '../../types/contentVersion';
import { computeVersionDiff } from '../../services/contentVersionService';
import { formatInArgentina } from '../../lib/dateUtils';
import { Button } from '../common/Button';
import { 
  GitCompare, 
  X, 
  ArrowRight, 
  Equal
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface VersionDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  versions: ContentVersion[];
  initialVersionA?: ContentVersion | null;
  initialVersionB?: ContentVersion | null;
}

export function VersionDiffModal({
  isOpen,
  onClose,
  versions,
  initialVersionA,
  initialVersionB,
}: VersionDiffModalProps) {
  // Ordenar versiones de la más antigua a la más nueva para selección lógica
  const sortedVersions = useMemo(() => {
    return [...versions].sort((a, b) => a.version_number - b.version_number);
  }, [versions]);

  const [versionAId, setVersionAId] = useState<string>(
    initialVersionA?.id || sortedVersions[0]?.id || ''
  );
  const [versionBId, setVersionBId] = useState<string>(
    initialVersionB?.id || sortedVersions[sortedVersions.length - 1]?.id || ''
  );

  const versionA = useMemo(() => {
    return versions.find((v) => v.id === versionAId) || versions[0];
  }, [versions, versionAId]);

  const versionB = useMemo(() => {
    return versions.find((v) => v.id === versionBId) || versions[versions.length - 1];
  }, [versions, versionBId]);

  const diffResult = useMemo(() => {
    if (!versionA || !versionB) return null;
    return computeVersionDiff(versionA, versionB);
  }, [versionA, versionB]);

  if (!isOpen || !versionA || !versionB || !diffResult) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-dark-900 border border-dark-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-800 bg-dark-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Comparador Estructural de Versiones (Diff Viewer)
              </h2>
              <p className="text-xs text-slate-400">
                Auditoría de cambios entre estados inmutables del contenido
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-dark-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Version Selectors Bar */}
        <div className="p-4 bg-dark-950/70 border-b border-dark-800 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Version A Selector (Baseline) */}
          <div className="flex-1 w-full p-3 rounded-2xl bg-dark-900 border border-dark-800 space-y-1">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
              Versión Base (Antes)
            </span>
            <select
              value={versionAId}
              onChange={(e) => setVersionAId(e.target.value)}
              className="w-full bg-dark-950 border border-dark-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-aura-500"
            >
              {sortedVersions.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.version_number} — {v.version_type} ({formatInArgentina(v.created_at)})
                </option>
              ))}
            </select>
            {versionA.change_summary && (
              <span className="text-[11px] text-slate-400 block truncate">
                "{versionA.change_summary}"
              </span>
            )}
          </div>

          <div className="w-8 h-8 rounded-full bg-dark-800 flex items-center justify-center text-slate-400 shrink-0">
            <ArrowRight className="w-4 h-4" />
          </div>

          {/* Version B Selector (Comparison) */}
          <div className="flex-1 w-full p-3 rounded-2xl bg-dark-900 border border-dark-800 space-y-1">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
              Versión Comparada (Después)
            </span>
            <select
              value={versionBId}
              onChange={(e) => setVersionBId(e.target.value)}
              className="w-full bg-dark-950 border border-dark-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-aura-500"
            >
              {sortedVersions.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.version_number} — {v.version_type} ({formatInArgentina(v.created_at)})
                </option>
              ))}
            </select>
            {versionB.change_summary && (
              <span className="text-[11px] text-slate-400 block truncate">
                "{versionB.change_summary}"
              </span>
            )}
          </div>
        </div>

        {/* Diff Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {!diffResult.hasAnyChange && (
            <div className="p-8 rounded-2xl bg-dark-950/60 border border-dark-800 text-center space-y-2">
              <Equal className="w-8 h-8 text-emerald-400 mx-auto" />
              <h3 className="text-sm font-bold text-white">Versiones Idénticas</h3>
              <p className="text-xs text-slate-400">
                No se detectaron diferencias en los campos de contenido entre v{versionA.version_number} y v{versionB.version_number}.
              </p>
            </div>
          )}

          {diffResult.fields.map((field) => (
            <div
              key={field.fieldName}
              className={cn(
                "p-4 rounded-2xl border transition-all space-y-3",
                field.hasChanged
                  ? "bg-dark-950/90 border-aura-500/30"
                  : "bg-dark-950/40 border-dark-800/60"
              )}
            >
              {/* Field Label & Change Badge */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <span>{field.label}</span>
                </span>
                {field.hasChanged ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    Modificado
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-dark-800 text-slate-400 border border-dark-700">
                    Sin cambios
                  </span>
                )}
              </div>

              {/* Side-by-Side Comparison */}
              {field.hasChanged ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Before */}
                  <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-1">
                    <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">
                      v{versionA.version_number} (Antes)
                    </span>
                    <div className="text-slate-300 whitespace-pre-line font-mono text-[11px] leading-relaxed">
                      {field.isStructured 
                        ? JSON.stringify(field.valueA, null, 2) 
                        : (field.valueA || <span className="text-slate-400 italic">Vacío</span>)}
                    </div>
                  </div>

                  {/* After */}
                  <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                      v{versionB.version_number} (Después)
                    </span>
                    <div className="text-slate-200 whitespace-pre-line font-mono text-[11px] leading-relaxed font-medium">
                      {field.isStructured 
                        ? JSON.stringify(field.valueB, null, 2) 
                        : (field.valueB || <span className="text-slate-400 italic">Vacío</span>)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 font-mono text-[11px] bg-dark-900/60 p-2.5 rounded-xl border border-dark-800">
                  {field.isStructured 
                    ? JSON.stringify(field.valueA, null, 2) 
                    : (field.valueA || <span className="italic">Sin contenido</span>)}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-dark-800 bg-dark-900 flex items-center justify-end">
          <Button variant="ghost" onClick={onClose} className="text-xs">
            Cerrar Comparador
          </Button>
        </div>

      </div>
    </div>
  );
}
