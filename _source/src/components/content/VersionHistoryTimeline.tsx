import { ContentVersion, VersionType } from '../../types/contentVersion';
import { formatInArgentina } from '../../lib/dateUtils';
import { Button } from '../common/Button';
import { 
  History, 
  Sparkles, 
  User, 
  RotateCcw, 
  Radio, 
  Clock, 
  CheckCircle2, 
  Eye, 
  GitCompare 
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface VersionHistoryTimelineProps {
  versions: ContentVersion[];
  onViewSnapshot: (version: ContentVersion) => void;
  onCompareWithCurrent: (version: ContentVersion) => void;
  onRestoreVersion: (version: ContentVersion) => void;
  isLoading?: boolean;
}

export function VersionHistoryTimeline({
  versions,
  onViewSnapshot,
  onCompareWithCurrent,
  onRestoreVersion,
  isLoading = false,
}: VersionHistoryTimelineProps) {
  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-400 text-xs">
        Cargando historial inmutable de versiones...
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="p-8 rounded-2xl bg-dark-950/60 border border-dark-800 text-center space-y-2">
        <History className="w-6 h-6 text-slate-400 mx-auto" />
        <h4 className="text-xs font-bold text-white">Sin historial de versiones</h4>
        <p className="text-[11px] text-slate-400">
          Las versiones se generan automáticamente ante cada edición o producción.
        </p>
      </div>
    );
  }

  const latestVersionNumber = Math.max(...versions.map((v) => v.version_number));

  const getVersionTypeBadge = (type: VersionType) => {
    switch (type) {
      case 'ai_draft':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-aura-500/10 text-aura-300 border border-aura-500/25">
            <Sparkles className="w-3 h-3 text-aura-400" />
            AI Draft (Luna)
          </span>
        );
      case 'human_edit':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/25">
            <User className="w-3 h-3 text-sky-400" />
            Edición Manual
          </span>
        );
      case 'restored_from_version':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
            <RotateCcw className="w-3 h-3 text-emerald-400" />
            Restaurada
          </span>
        );
      case 'platform_adaptation':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-pink-500/10 text-pink-300 border border-pink-500/25">
            <Radio className="w-3 h-3 text-pink-400" />
            Adaptación
          </span>
        );
      case 'revision':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/25">
            <Clock className="w-3 h-3 text-amber-400" />
            Revisión
          </span>
        );
      case 'final':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/25">
            <CheckCircle2 className="w-3 h-3 text-indigo-400" />
            Final
          </span>
        );
      case 'historical_snapshot':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-500/10 text-slate-300 border border-slate-500/25">
            <History className="w-3 h-3 text-slate-400" />
            Snapshot Base
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <History className="w-4 h-4 text-aura-400" />
          <span>Historial Inmutable de Versiones ({versions.length})</span>
        </h3>
        <span className="text-[11px] text-slate-400">
          Orden cronológico descendente
        </span>
      </div>

      <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-dark-800">
        {versions.map((ver) => {
          const isCurrent = ver.version_number === latestVersionNumber;

          return (
            <div
              key={ver.id}
              className={cn(
                "relative p-4 rounded-2xl border transition-all space-y-2.5",
                isCurrent
                  ? "bg-dark-900/95 border-emerald-500/40 shadow-lg shadow-emerald-950/10"
                  : "bg-dark-950/70 border-dark-800/90 hover:border-dark-700"
              )}
            >
              {/* Timeline Indicator Dot */}
              <div
                className={cn(
                  "absolute -left-[27px] top-5 w-3.5 h-3.5 rounded-full border-2 transition-all",
                  isCurrent
                    ? "bg-emerald-400 border-dark-950 ring-4 ring-emerald-500/20"
                    : "bg-dark-800 border-dark-600"
                )}
              />

              {/* Version Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-xs text-white bg-dark-950 px-2 py-0.5 rounded-md border border-dark-800">
                    v{ver.version_number}
                  </span>
                  {getVersionTypeBadge(ver.version_type)}
                  {isCurrent && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Estado Actual
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{formatInArgentina(ver.created_at)}</span>
                </div>
              </div>

              {/* Title & Summary */}
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-white line-clamp-1">
                  {ver.title}
                </h4>
                {ver.change_summary && (
                  <p className="text-[11px] text-slate-300 italic line-clamp-1">
                    "{ver.change_summary}"
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-dark-800/80 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewSnapshot(ver)}
                    leftIcon={<Eye className="w-3.5 h-3.5" />}
                    className="text-xs text-slate-300 hover:text-white h-7 px-2.5"
                  >
                    Ver Snapshot
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCompareWithCurrent(ver)}
                    leftIcon={<GitCompare className="w-3.5 h-3.5 text-indigo-400" />}
                    className="text-xs text-indigo-300 hover:text-indigo-200 h-7 px-2.5"
                  >
                    Comparar
                  </Button>
                </div>

                {!isCurrent && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRestoreVersion(ver)}
                    leftIcon={<RotateCcw className="w-3.5 h-3.5 text-emerald-400" />}
                    className="text-xs hover:border-emerald-500/40 text-emerald-300 h-7 px-2.5"
                  >
                    Restaurar
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
