import { ContentVersion, VersionType } from '../../types/contentVersion';
import { formatInArgentina } from '../../lib/dateUtils';
import { Button } from '../common/Button';
import { 
  History, 
  X, 
  Sparkles, 
  Quote, 
  FileText, 
  Hash, 
  CheckSquare2, 
  Clapperboard, 
  Compass, 
  Clock, 
  RotateCcw,
  User,
  Radio,
  CheckCircle2,
  Film
} from 'lucide-react';

interface VersionSnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  version: ContentVersion | null;
  isCurrentVersion?: boolean;
  onRestore?: (version: ContentVersion) => void;
}

export function VersionSnapshotModal({
  isOpen,
  onClose,
  version,
  isCurrentVersion = false,
  onRestore,
}: VersionSnapshotModalProps) {
  if (!isOpen || !version) return null;

  const getVersionTypeBadge = (type: VersionType) => {
    switch (type) {
      case 'ai_draft':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-aura-500/10 text-aura-300 border border-aura-500/25">
            <Sparkles className="w-3 h-3 text-aura-400" />
            AI Draft (Luna)
          </span>
        );
      case 'human_edit':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/25">
            <User className="w-3 h-3 text-sky-400" />
            Edición Manual
          </span>
        );
      case 'restored_from_version':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
            <RotateCcw className="w-3 h-3 text-emerald-400" />
            Versión Restaurada
          </span>
        );
      case 'platform_adaptation':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-pink-500/10 text-pink-300 border border-pink-500/25">
            <Radio className="w-3 h-3 text-pink-400" />
            Adaptación de Plataforma
          </span>
        );
      case 'revision':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/25">
            <Clock className="w-3 h-3 text-amber-400" />
            Revisión
          </span>
        );
      case 'final':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/25">
            <CheckCircle2 className="w-3 h-3 text-indigo-400" />
            Versión Final
          </span>
        );
      case 'historical_snapshot':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-300 border border-slate-500/25">
            <History className="w-3 h-3 text-slate-400" />
            Snapshot Histórico
          </span>
        );
    }
  };

  const hashtagsList: string[] = Array.isArray(version.hashtags)
    ? version.hashtags
    : typeof version.hashtags === 'string'
    ? (version.hashtags as string).split(/[\s,]+/).filter(Boolean)
    : [];

  const mediaReqsList: string[] = Array.isArray(version.media_requirements)
    ? version.media_requirements
    : [];

  const scenesList = Array.isArray(version.scenes) ? version.scenes : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-dark-900 border border-dark-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-800 bg-dark-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-aura-500/10 border border-aura-500/25 flex items-center justify-center text-aura-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  Snapshot Inmutable v{version.version_number}
                </h2>
                {getVersionTypeBadge(version.version_type)}
                {isCurrentVersion && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Estado Vigente
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <Clock className="w-3 h-3 text-slate-400" />
                Registrado el {formatInArgentina(version.created_at)}
                {version.change_summary && (
                  <span>• "{version.change_summary}"</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isCurrentVersion && onRestore && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onRestore(version);
                  onClose();
                }}
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                className="text-xs hover:border-emerald-500/40 hover:bg-emerald-500/10 text-emerald-300"
              >
                Restaurar esta versión
              </Button>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-dark-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title Header */}
          <div className="p-5 rounded-2xl bg-dark-950/70 border border-dark-800 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Título del Contenido
            </span>
            <h1 className="text-xl font-bold text-white">
              {version.title}
            </h1>
            <div className="flex items-center gap-2 pt-1 text-xs text-slate-400">
              <span className="capitalize px-2 py-0.5 rounded-md bg-dark-900 border border-dark-800">
                {version.platform || 'General'}
              </span>
              <span className="uppercase px-2 py-0.5 rounded-md bg-dark-900 border border-dark-800">
                {version.content_type || 'Post'}
              </span>
            </div>
          </div>

          {/* Hook */}
          {version.hook && (
            <div className="p-5 rounded-2xl bg-dark-950/60 border border-dark-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <Quote className="w-3.5 h-3.5" />
                <span>Hook / Gancho Inicial</span>
              </div>
              <p className="text-sm font-semibold text-slate-100 italic bg-amber-500/5 p-3 rounded-xl border border-amber-500/15">
                "{version.hook}"
              </p>
            </div>
          )}

          {/* Script / Locución */}
          {version.script && (
            <div className="p-5 rounded-2xl bg-dark-950/60 border border-dark-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-wider">
                <FileText className="w-3.5 h-3.5" />
                <span>Guion Completo de Locución</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line bg-dark-900/60 p-4 rounded-xl border border-dark-800">
                {version.script}
              </p>
            </div>
          )}

          {/* Caption */}
          {version.caption && (
            <div className="p-5 rounded-2xl bg-dark-950/60 border border-dark-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-aura-400 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Caption / Texto del Post</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line bg-dark-900/60 p-4 rounded-xl border border-dark-800">
                {version.caption}
              </p>
            </div>
          )}

          {/* CTA & Dirección Creativa */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {version.cta && (
              <div className="p-4 rounded-2xl bg-dark-950/60 border border-dark-800 space-y-1.5">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckSquare2 className="w-3.5 h-3.5" />
                  Llamado a la Acción (CTA)
                </span>
                <p className="text-xs text-slate-200 font-medium">
                  {version.cta}
                </p>
              </div>
            )}

            {version.creative_direction && (
              <div className="p-4 rounded-2xl bg-dark-950/60 border border-dark-800 space-y-1.5">
                <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5" />
                  Dirección Creativa
                </span>
                <p className="text-xs text-slate-200">
                  {version.creative_direction}
                </p>
              </div>
            )}
          </div>

          {/* Escenas Audiovisuales */}
          {scenesList.length > 0 && (
            <div className="p-5 rounded-2xl bg-dark-950/60 border border-purple-500/25 space-y-4">
              <div className="flex items-center justify-between border-b border-dark-800 pb-2">
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clapperboard className="w-4 h-4" />
                  Desglose de Escenas ({scenesList.length})
                </span>
              </div>

              <div className="space-y-3">
                {scenesList.map((scene, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-dark-900/80 border border-dark-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-purple-300">
                        Escena {scene.scene_number || idx + 1}
                      </span>
                      {scene.duration_seconds && (
                        <span className="text-[11px] text-slate-400 font-mono">
                          {scene.duration_seconds}s
                        </span>
                      )}
                    </div>
                    {scene.visual_direction && (
                      <p className="text-xs text-slate-300">
                        <strong className="text-slate-400">Visual:</strong> {scene.visual_direction}
                      </p>
                    )}
                    {scene.on_screen_text && (
                      <p className="text-xs text-emerald-300">
                        <strong className="text-slate-400">Texto:</strong> "{scene.on_screen_text}"
                      </p>
                    )}
                    {scene.voiceover && (
                      <p className="text-xs text-slate-200 italic">
                        <strong className="text-slate-400 not-italic">Locución:</strong> "{scene.voiceover}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hashtags & Requisitos Multimedia */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hashtagsList.length > 0 && (
              <div className="p-4 rounded-2xl bg-dark-950/60 border border-dark-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-aura-400" />
                  Hashtags
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {hashtagsList.map((tag, idx) => (
                    <span key={idx} className="text-xs text-aura-300 bg-dark-900 px-2 py-0.5 rounded-md border border-dark-800">
                      #{tag.replace(/^#/, '')}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {mediaReqsList.length > 0 && (
              <div className="p-4 rounded-2xl bg-dark-950/60 border border-dark-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-pink-400" />
                  Requisitos Multimedia
                </span>
                <ul className="space-y-1 text-xs text-slate-300">
                  {mediaReqsList.map((req, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-pink-400">•</span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-dark-800 bg-dark-900 flex items-center justify-end">
          <Button variant="ghost" onClick={onClose} className="text-xs">
            Cerrar Snapshot
          </Button>
        </div>

      </div>
    </div>
  );
}
