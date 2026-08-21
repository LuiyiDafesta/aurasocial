import { useState, useEffect, useCallback } from 'react';
import { ContentItem } from '../../types/contentItem';
import { 
  getContentItemById, 
  approveContent, 
  rejectContent, 
  scheduleContent 
} from '../../services/contentItemsService';
import { PlatformBadge } from './PlatformBadge';
import { StatusBadge } from './StatusBadge';
import { ScheduleModal } from './ScheduleModal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { formatInArgentina } from '../../lib/dateUtils';
import { Button } from '../common/Button';
import { useToast } from '../../hooks/useToast';
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle2, 
  UserCheck, 
  Sparkles, 
  Quote, 
  FileText, 
  Hash, 
  Compass, 
  CheckSquare2, 
  Film, 
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  Check,
  X,
  CalendarCheck,
  Clapperboard,
  Video,
  Layers,
  FolderTree,
  Mic,
  Monitor,
  MoveRight
} from 'lucide-react';

interface ContentDetailViewProps {
  contentId: string;
  onBack: () => void;
  onContentUpdated?: () => void;
}

export function ContentDetailView({ contentId, onBack, onContentUpdated }: ContentDetailViewProps) {
  const [item, setItem] = useState<ContentItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);

  // Modales de confirmación y programación
  const [isRejectConfirmOpen, setIsRejectConfirmOpen] = useState<boolean>(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState<boolean>(false);

  const { toast } = useToast();

  const fetchDetail = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getContentItemById(contentId);
      setItem(data);
    } catch (err: any) {
      console.error('Error al cargar detalle de contenido:', err);
      setError(err.message || 'No se pudo cargar el contenido.');
    } finally {
      setIsLoading(false);
    }
  }, [contentId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // 1. Acción: Aprobar
  const handleApprove = async () => {
    if (!item || isActionLoading) return;

    try {
      setIsActionLoading(true);
      await approveContent(item.id);
      toast('Contenido aprobado correctamente', { type: 'success' });
      const updated = await getContentItemById(item.id);
      setItem(updated);
      onContentUpdated?.();
    } catch (err: any) {
      console.error('Error al aprobar contenido:', err);
      toast('Error al aprobar contenido', { type: 'error', description: err.message });
    } finally {
      setIsActionLoading(false);
    }
  };

  // 2. Acción: Rechazar (tras confirmación)
  const handleConfirmReject = async () => {
    if (!item || isActionLoading) return;

    try {
      setIsActionLoading(true);
      await rejectContent(item.id);
      setIsRejectConfirmOpen(false);
      toast('Contenido rechazado correctamente', { type: 'info' });
      const updated = await getContentItemById(item.id);
      setItem(updated);
      onContentUpdated?.();
    } catch (err: any) {
      console.error('Error al rechazar contenido:', err);
      toast('Error al rechazar contenido', { type: 'error', description: err.message });
    } finally {
      setIsActionLoading(false);
    }
  };

  // 3. Acción: Programar
  const handleConfirmSchedule = async (scheduledAtIso: string) => {
    if (!item || isActionLoading) return;

    try {
      setIsActionLoading(true);
      await scheduleContent(item.id, scheduledAtIso);
      setIsScheduleModalOpen(false);
      toast('Contenido programado correctamente', { type: 'success' });
      const updated = await getContentItemById(item.id);
      setItem(updated);
      onContentUpdated?.();
    } catch (err: any) {
      console.error('Error al programar contenido:', err);
      toast('Error al programar contenido', { type: 'error', description: err.message });
      throw err;
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-5xl mx-auto flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-8 h-8 text-aura-500 animate-spin" />
        <p className="text-sm text-slate-400 font-medium">Cargando contenido...</p>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-6">
        <Button variant="outline" size="sm" onClick={onBack} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Volver a Contenidos
        </Button>
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-3">
          <div className="flex items-center gap-2 font-semibold text-base">
            <AlertCircle className="w-5 h-5" />
            Error al cargar el contenido
          </div>
          <p className="text-xs text-rose-200">{error || 'No se encontró el elemento solicitado.'}</p>
          <Button variant="outline" size="sm" onClick={fetchDetail}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  const accountName = item.social_accounts?.account_name || 'Cuenta vinculada';
  const avatarUrl = item.social_accounts?.metadata?.avatar_url;
  const isVideo = item.content_type?.toLowerCase().includes('video') || item.content_type?.toLowerCase().includes('reel');

  // Procesar hashtags
  const hashtagsList: string[] = Array.isArray(item.hashtags)
    ? item.hashtags
    : typeof item.hashtags === 'string'
    ? (item.hashtags as string).split(/[\s,]+/).filter(Boolean)
    : [];

  // Procesar requerimientos multimedia
  const mediaReqsList: string[] = Array.isArray(item.media_requirements)
    ? item.media_requirements
    : typeof item.media_requirements === 'string'
    ? [item.media_requirements]
    : [];

  const scenes = Array.isArray(item.scenes) ? item.scenes : [];

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Top Bar: Back & State Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-dark-800/80">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            className="hover:border-dark-700 text-slate-300"
          >
            Volver
          </Button>
          <div className="h-5 w-px bg-dark-800" />
          <div className="flex items-center gap-2">
            <PlatformBadge platform={item.platform} size="md" />
            <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase px-2.5 py-1 rounded-lg bg-dark-800 text-slate-300 border border-dark-700">
              {isVideo ? <Film className="w-3.5 h-3.5 text-aura-400" /> : <ImageIcon className="w-3.5 h-3.5 text-slate-400" />}
              {item.content_type || 'Post'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <StatusBadge status={item.status} size="md" />
        </div>
      </div>

      {/* Main Header & Actions */}
      <div className="bg-dark-900/90 border border-dark-800 rounded-3xl p-6 md:p-8 shadow-xl shadow-black/20 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="space-y-3 flex-1 min-w-0">
            {/* Read-Only Account Header */}
            <div className="inline-flex items-center gap-2 py-1.5 px-3 rounded-xl bg-dark-950/80 border border-dark-800/80 text-xs text-slate-300">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={accountName}
                  className="w-4 h-4 rounded-full object-cover shrink-0"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <UserCheck className="w-4 h-4 text-aura-400 shrink-0" />
              )}
              <span>Cuenta vinculada: <strong className="text-white font-medium">{accountName}</strong></span>
              <span className="text-[10px] text-slate-400 ml-1 font-mono uppercase bg-dark-900 px-1.5 py-0.5 rounded border border-dark-800">
                Solo Lectura
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
              {item.title || 'Sin título'}
            </h1>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {item.status === 'published' ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-aura-500/10 border border-aura-500/30 text-xs font-semibold text-aura-300">
                <CheckCircle2 className="w-4 h-4 text-aura-400" />
                Publicado en {item.platform}
              </div>
            ) : (
              <>
                {item.status !== 'approved' && item.status !== 'scheduled' && (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleApprove}
                    isLoading={isActionLoading}
                    leftIcon={<Check className="w-4 h-4" />}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-950/40"
                  >
                    Aprobar
                  </Button>
                )}

                {item.status !== 'rejected' && (
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => setIsRejectConfirmOpen(true)}
                    isLoading={isActionLoading}
                    leftIcon={<X className="w-4 h-4" />}
                    className="hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-300 text-slate-300 font-semibold"
                  >
                    Rechazar
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setIsScheduleModalOpen(true)}
                  isLoading={isActionLoading}
                  leftIcon={<CalendarCheck className="w-4 h-4" />}
                  className="hover:border-sky-500/50 hover:bg-sky-500/10 hover:text-sky-300 text-slate-300 font-semibold"
                >
                  {item.status === 'scheduled' ? 'Reprogramar' : 'Programar'}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Trazabilidad y Linaje de Fase 7 */}
      <div className="bg-dark-900/60 border border-dark-800/80 rounded-2xl p-5 shadow-lg space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
          <FolderTree className="w-3.5 h-3.5" />
          Trazabilidad Determinística (Fase 7)
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-dark-950/60 border border-dark-800/60 space-y-1">
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <Layers className="w-3 h-3 text-purple-400" />
              Idea de Origen
            </div>
            <div className="font-medium text-purple-300 truncate">
              {item.content_ideas?.title || item.idea_id || 'Generado directamente'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-dark-950/60 border border-dark-800/60 space-y-1">
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <Clapperboard className="w-3 h-3 text-sky-400" />
              Sesión de Generación
            </div>
            <div className="font-medium text-sky-300 font-mono text-[11px] truncate">
              {item.generation_run_id ? item.generation_run_id.substring(0, 18) + '...' : 'Sesión directa'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-dark-950/60 border border-dark-800/60 space-y-1">
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" />
              Fecha de Creación (UTC-3)
            </div>
            <div className="font-medium text-slate-200">
              {formatInArgentina(item.created_at)}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-dark-950/60 border border-dark-800/60 space-y-1">
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Programación
            </div>
            <div className="font-medium text-emerald-300">
              {item.scheduled_at ? formatInArgentina(item.scheduled_at) : 'No programado'}
            </div>
          </div>
        </div>
      </div>

      {/* Desglose de Escenas Audiovisuales (Fase 7) */}
      {scenes.length > 0 && (
        <div className="bg-dark-900/90 border border-purple-500/30 rounded-3xl p-6 md:p-8 shadow-xl shadow-purple-950/10 space-y-6">
          <div className="flex items-center justify-between border-b border-dark-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Clapperboard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Guion y Desglose de Escenas
                  <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {scenes.length} Escenas Secuenciales
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Estructura técnica lista para grabación, edición y puesta en escena
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {scenes.map((scene, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-dark-950/70 border border-dark-800/80 hover:border-purple-500/40 transition-all space-y-3"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold uppercase tracking-wider">
                    <Video className="w-3.5 h-3.5" />
                    Escena {scene.scene_number || idx + 1}
                  </span>

                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-dark-900 border border-dark-700 text-slate-300 text-xs font-mono">
                    <Clock className="w-3 h-3 text-amber-400" />
                    {scene.duration_seconds ? `${scene.duration_seconds} segundos` : 'Duración estimada'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  {/* Puesta en escena y Cámara */}
                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-sky-400" />
                      Puesta en Escena y Cámara
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed bg-dark-900/60 p-3 rounded-xl border border-dark-800/60">
                      {scene.visual_direction}
                      {scene.camera_direction && (
                        <span className="block mt-1.5 text-sky-300/90 font-medium">
                          🎥 Cámara: {scene.camera_direction}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Texto en Pantalla */}
                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Monitor className="w-3.5 h-3.5 text-emerald-400" />
                      Texto en Pantalla (On-Screen Text)
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-xs font-semibold text-emerald-200 leading-relaxed">
                      "{scene.on_screen_text}"
                    </div>
                  </div>
                </div>

                {/* Locución / Voiceover */}
                {scene.voiceover && (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5 text-pink-400" />
                      Locución / Diálogo (Voiceover)
                    </div>
                    <div className="p-3.5 rounded-xl bg-pink-950/20 border border-pink-800/30 text-xs text-pink-100 italic leading-relaxed">
                      "{scene.voiceover}"
                    </div>
                  </div>
                )}

                {/* Transición */}
                {scene.transition && (
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
                    <MoveRight className="w-3.5 h-3.5 text-purple-400" />
                    <span>Transición hacia siguiente escena: <strong className="text-slate-300">{scene.transition}</strong></span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Structured Content Sections */}
      <div className="grid grid-cols-1 gap-5">
        {/* Hook / Gancho */}
        {item.hook && (
          <div className="bg-dark-900/90 border border-dark-800 rounded-2xl p-5 shadow-lg space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
              <Quote className="w-4 h-4" />
              Hook / Gancho Inicial
            </div>
            <div className="p-4 rounded-xl bg-dark-950/80 border border-dark-800/80 text-sm italic text-amber-100/90 leading-relaxed">
              "{item.hook}"
            </div>
          </div>
        )}

        {/* Script / Guion Completo */}
        {item.script && (
          <div className="bg-dark-900/90 border border-dark-800 rounded-2xl p-5 shadow-lg space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-aura-400">
              <FileText className="w-4 h-4" />
              Guion Completo de Locución
            </div>
            <div className="p-4 rounded-xl bg-dark-950/80 border border-dark-800/80 text-sm text-slate-200 whitespace-pre-line leading-relaxed font-sans">
              {item.script}
            </div>
          </div>
        )}

        {/* Caption / Copy */}
        {item.caption && (
          <div className="bg-dark-900/90 border border-dark-800 rounded-2xl p-5 shadow-lg space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-400">
                <Sparkles className="w-4 h-4" />
                Caption / Texto del Post
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {item.caption.length} caracteres
              </span>
            </div>
            <div className="p-4 rounded-xl bg-dark-950/80 border border-dark-800/80 text-sm text-slate-200 whitespace-pre-line leading-relaxed">
              {item.caption}
            </div>
          </div>
        )}

        {/* Hashtags */}
        {hashtagsList.length > 0 && (
          <div className="bg-dark-900/90 border border-dark-800 rounded-2xl p-5 shadow-lg space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-pink-400">
              <Hash className="w-4 h-4" />
              Hashtags ({hashtagsList.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {hashtagsList.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-medium bg-pink-500/10 text-pink-300 border border-pink-500/25"
                >
                  {tag.startsWith('#') ? tag : `#${tag}`}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* CTA (Call to Action) */}
        {item.cta && (
          <div className="bg-dark-900/90 border border-dark-800 rounded-2xl p-5 shadow-lg space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
              <Sparkles className="w-4 h-4" />
              Llamado a la Acción (CTA)
            </div>
            <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs font-medium text-emerald-200 leading-relaxed">
              {item.cta}
            </div>
          </div>
        )}

        {/* Creative Direction */}
        {item.creative_direction && (
          <div className="bg-dark-900/90 border border-dark-800 rounded-2xl p-5 shadow-lg space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
              <Compass className="w-4 h-4" />
              Dirección Creativa y Tono
            </div>
            <div className="p-4 rounded-xl bg-dark-950/80 border border-dark-800/80 text-xs text-slate-300 leading-relaxed">
              {item.creative_direction}
            </div>
          </div>
        )}

        {/* Media Requirements */}
        {mediaReqsList.length > 0 && (
          <div className="bg-dark-900/90 border border-dark-800 rounded-2xl p-5 shadow-lg space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-violet-400">
              <CheckSquare2 className="w-4 h-4" />
              Requerimientos Multimedia y Planos Técnicos ({mediaReqsList.length})
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {mediaReqsList.map((req, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-dark-950/60 border border-dark-800/60 text-xs text-slate-300"
                >
                  <div className="w-4 h-4 rounded bg-violet-500/10 border border-violet-500/30 text-violet-400 flex items-center justify-center shrink-0 mt-0.5">
                    ✓
                  </div>
                  <span className="leading-snug">{req}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Confirm Reject Dialog */}
      <ConfirmDialog
        isOpen={isRejectConfirmOpen}
        onClose={() => setIsRejectConfirmOpen(false)}
        onConfirm={handleConfirmReject}
        title="¿Rechazar contenido?"
        message="El estado del contenido pasará a 'rechazado'. Podrás revisarlo nuevamente más tarde si es necesario."
        confirmText="Rechazar contenido"
        cancelText="Cancelar"
        type="danger"
        isLoading={isActionLoading}
      />

      {/* Schedule Modal (Strict Argentina Timezone) */}
      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onConfirm={handleConfirmSchedule}
        item={item}
        isLoading={isActionLoading}
      />
    </div>
  );
}
