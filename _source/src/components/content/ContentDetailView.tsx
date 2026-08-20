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
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Send, 
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
  CalendarCheck
} from 'lucide-react';

interface ContentDetailViewProps {
  contentId: string;
  onBack: () => void;
}

export function ContentDetailView({ contentId, onBack }: ContentDetailViewProps) {
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
      // Re-consultar el registro actualizado desde Supabase
      const updated = await getContentItemById(item.id);
      setItem(updated);
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
      // Re-consultar el registro actualizado desde Supabase
      const updated = await getContentItemById(item.id);
      setItem(updated);
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
      // Re-consultar el registro actualizado desde Supabase
      const updated = await getContentItemById(item.id);
      setItem(updated);
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
      <div className="p-8 max-w-2xl mx-auto my-12 bg-dark-900 border border-dark-800 rounded-2xl text-center space-y-4 shadow-xl">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400 mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-white tracking-tight">Contenido no encontrado</h3>
        <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
          {error || 'El contenido solicitado no existe o no tenés permisos para acceder a él.'}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          className="mt-4"
        >
          Volver a Contenidos
        </Button>
      </div>
    );
  }

  // Parsear hashtags (seguro ante array, string json o string)
  const parseHashtags = (raw: any): string[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return raw.split(/[,\s]+/).filter(Boolean);
      }
    }
    return [];
  };

  // Parsear media requirements (seguro ante array, string json o string)
  const parseMediaRequirements = (raw: any): string[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return [raw];
      }
    }
    if (typeof raw === 'object') {
      return Object.values(raw).map((v) => String(v));
    }
    return [];
  };

  const hashtagsList = parseHashtags(item.hashtags);
  const mediaReqList = parseMediaRequirements(item.media_requirements);
  const accountName = item.social_accounts?.account_name || 'Cuenta vinculada';
  const accountUsername = item.social_accounts?.username;
  const avatarUrl = item.social_accounts?.metadata?.avatar_url;
  const isVideo = item.content_type?.toLowerCase().includes('video') || item.content_type?.toLowerCase().includes('reel');

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-dark-800/80">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          className="hover:border-aura-500/50 hover:bg-aura-500/10 text-slate-300"
        >
          Volver a Contenidos
        </Button>

        <div className="flex items-center gap-2">
          <StatusBadge status={item.status} size="md" />
        </div>
      </div>

      {/* Main Title and Badges */}
      <div className="space-y-4 bg-dark-900/90 border border-dark-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <PlatformBadge platform={item.platform} size="md" />
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase px-2.5 py-1 rounded-lg bg-dark-800 text-slate-200 border border-dark-700">
              {isVideo ? <Film className="w-3.5 h-3.5 text-aura-400" /> : <ImageIcon className="w-3.5 h-3.5 text-slate-400" />}
              {item.content_type || 'Post'}
            </span>
          </div>

          {/* Quick status message */}
          {item.status === 'scheduled' && item.scheduled_at && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/25">
              <Clock className="w-3.5 h-3.5" />
              Programado: {formatInArgentina(item.scheduled_at)}
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white tracking-tight leading-snug">
          {item.title || 'Sin título'}
        </h1>

        {/* Read-Only Connected Social Account Card */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-dark-950/70 border border-dark-800 text-xs">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={accountName}
                className="w-8 h-8 rounded-full object-cover border border-dark-700 shrink-0"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-dark-800 border border-dark-700 flex items-center justify-center text-aura-400 shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
            )}
            <div>
              <div className="font-semibold text-white">
                {accountName}
              </div>
              {accountUsername && (
                <div className="text-[11px] text-slate-400 font-mono">
                  @{accountUsername}
                </div>
              )}
            </div>
          </div>

          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-dark-800 text-slate-400 border border-dark-700">
            Cuenta Social Vinculada
          </span>
        </div>
      </div>

      {/* Action Bar (Barra de Decisiones con la RPC manage_content_item) */}
      <div className="bg-dark-900/90 border border-dark-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-aura-400" />
              Decisión sobre el Contenido
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Ejecuta acciones de estado mediante la función segura de Supabase.
            </p>
          </div>

          {/* Action Buttons depending on status */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Published content is strictly read-only */}
            {item.status === 'published' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-aura-500/10 text-aura-300 border border-aura-500/25">
                <Send className="w-3.5 h-3.5" />
                Contenido ya publicado en red social
              </span>
            ) : (
              <>
                {/* Botón Rechazar (disponible para draft, approved, scheduled) */}
                {item.status !== 'rejected' && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setIsRejectConfirmOpen(true)}
                    disabled={isActionLoading}
                    leftIcon={<X className="w-4 h-4" />}
                  >
                    Rechazar
                  </Button>
                )}

                {/* Botón Aprobar (disponible para draft o rejected) */}
                {(item.status === 'draft' || item.status === 'rejected') && (
                  <Button
                    variant="success"
                    size="sm"
                    onClick={handleApprove}
                    isLoading={isActionLoading}
                    leftIcon={<Check className="w-4 h-4" />}
                  >
                    Aprobar
                  </Button>
                )}

                {/* Botón Programar (disponible para draft, approved, rejected o scheduled como reprogramación) */}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsScheduleModalOpen(true)}
                  disabled={isActionLoading}
                  leftIcon={<CalendarCheck className="w-4 h-4" />}
                  className="shadow-aura-500/25"
                >
                  {item.status === 'scheduled' ? 'Reprogramar' : 'Programar'}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Timestamps Section (Strict Argentina Timezone UTC-3) */}
      <div className="bg-dark-900/60 border border-dark-800/80 rounded-2xl p-5 shadow-lg">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          Historial y Tiempos (Hora Oficial Argentina UTC-3)
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Creado */}
          <div className="p-3 rounded-xl bg-dark-950/60 border border-dark-800/60 space-y-1">
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              Fecha de Creación
            </div>
            <div className="font-medium text-slate-200">
              {formatInArgentina(item.created_at)}
            </div>
          </div>

          {/* Programado */}
          <div className="p-3 rounded-xl bg-dark-950/60 border border-dark-800/60 space-y-1">
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-sky-400" />
              Fecha de Programación
            </div>
            <div className="font-medium text-sky-300">
              {item.scheduled_at ? formatInArgentina(item.scheduled_at) : 'No programado'}
            </div>
          </div>

          {/* Aprobado */}
          <div className="p-3 rounded-xl bg-dark-950/60 border border-dark-800/60 space-y-1">
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Fecha de Aprobación
            </div>
            <div className="font-medium text-emerald-300">
              {item.approved_at ? formatInArgentina(item.approved_at) : 'No aprobado aún'}
            </div>
          </div>

          {/* Rechazado / Publicado */}
          <div className="p-3 rounded-xl bg-dark-950/60 border border-dark-800/60 space-y-1">
            {item.rejected_at ? (
              <>
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <XCircle className="w-3 h-3 text-rose-400" />
                  Fecha de Rechazo
                </div>
                <div className="font-medium text-rose-300">
                  {formatInArgentina(item.rejected_at)}
                </div>
              </>
            ) : item.published_at ? (
              <>
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Send className="w-3 h-3 text-aura-400" />
                  Fecha de Publicación
                </div>
                <div className="font-medium text-aura-300">
                  {formatInArgentina(item.published_at)}
                </div>
              </>
            ) : (
              <>
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  Publicación
                </div>
                <div className="font-medium text-slate-400">
                  Pendiente
                </div>
              </>
            )}
          </div>
        </div>
      </div>

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

        {/* Script / Guion */}
        {item.script && (
          <div className="bg-dark-900/90 border border-dark-800 rounded-2xl p-5 shadow-lg space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-aura-400">
              <FileText className="w-4 h-4" />
              Script / Guion de Producción
            </div>
            <div className="p-4 rounded-xl bg-dark-950/80 border border-dark-800/80 text-sm text-slate-200 whitespace-pre-line leading-relaxed">
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

        {/* Hashtags Visual Badge List */}
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
              Dirección Creativa
            </div>
            <div className="p-4 rounded-xl bg-dark-950/80 border border-dark-800/80 text-xs text-slate-300 whitespace-pre-line leading-relaxed">
              {item.creative_direction}
            </div>
          </div>
        )}

        {/* Media Requirements as List */}
        {mediaReqList.length > 0 && (
          <div className="bg-dark-900/90 border border-dark-800 rounded-2xl p-5 shadow-lg space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
              <CheckSquare2 className="w-4 h-4" />
              Requisitos de Medios y Producción
            </div>
            <div className="space-y-2">
              {mediaReqList.map((req, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-dark-950/60 border border-dark-800/60 text-xs text-slate-300 leading-relaxed"
                >
                  <span className="text-emerald-400 font-bold shrink-0 mt-0.5">✓</span>
                  <span>{req}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Back Button */}
      <div className="pt-4 border-t border-dark-800/80 flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Volver a Contenidos
        </Button>
        <span className="text-xs text-slate-400">
          Aura Social · Gobernanza de Contenido
        </span>
      </div>

      {/* Modal de Confirmación de Rechazo */}
      <ConfirmDialog
        isOpen={isRejectConfirmOpen}
        onClose={() => setIsRejectConfirmOpen(false)}
        onConfirm={handleConfirmReject}
        title="¿Querés rechazar este contenido?"
        message="El contenido pasará al estado Rechazado y no será considerado para publicación automática."
        confirmText="Sí, rechazar contenido"
        cancelText="Cancelar"
        type="danger"
        isLoading={isActionLoading}
      />

      {/* Modal de Programación (Hora Argentina) */}
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
