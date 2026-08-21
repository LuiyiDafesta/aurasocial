import { useState, useEffect, useCallback } from 'react';
import { ContentItem } from '../../types/contentItem';
import { ContentVersion } from '../../types/contentVersion';
import { 
  getContentItemById, 
  updateContent,
  approveContent, 
  rejectContent, 
  scheduleContent 
} from '../../services/contentItemsService';
import { 
  getContentVersions, 
  restoreContentVersion 
} from '../../services/contentVersionService';
import { PlatformBadge } from './PlatformBadge';
import { StatusBadge } from './StatusBadge';
import { ScheduleModal } from './ScheduleModal';
import { VersionSnapshotModal } from './VersionSnapshotModal';
import { VersionDiffModal } from './VersionDiffModal';
import { VersionHistoryTimeline } from './VersionHistoryTimeline';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { AssignToCampaignModal } from '../campaigns/AssignToCampaignModal';
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
  MoveRight,
  History,
  Edit3,
  Save,
  FolderPlus,
  Target
} from 'lucide-react';

interface ContentDetailViewProps {
  contentId: string;
  onBack: () => void;
  onContentUpdated?: () => void;
}

export function ContentDetailView({ contentId, onBack, onContentUpdated }: ContentDetailViewProps) {
  const [item, setItem] = useState<ContentItem | null>(null);
  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isVersionsLoading, setIsVersionsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);

  // Modo edición manual
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editHook, setEditHook] = useState<string>('');
  const [editScript, setEditScript] = useState<string>('');
  const [editCaption, setEditCaption] = useState<string>('');
  const [editCta, setEditCta] = useState<string>('');
  const [editCreativeDirection, setEditCreativeDirection] = useState<string>('');
  const [editHashtags, setEditHashtags] = useState<string>('');
  const [editChangeSummary, setEditChangeSummary] = useState<string>('');

  // Modales de versionado
  const [selectedSnapshotVersion, setSelectedSnapshotVersion] = useState<ContentVersion | null>(null);
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState<boolean>(false);
  const [diffVersionA, setDiffVersionA] = useState<ContentVersion | null>(null);
  const [diffVersionB, setDiffVersionB] = useState<ContentVersion | null>(null);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState<boolean>(false);
  const [versionToRestore, setVersionToRestore] = useState<ContentVersion | null>(null);
  const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState<boolean>(false);

  // Modales de acciones editoriales
  const [isRejectConfirmOpen, setIsRejectConfirmOpen] = useState<boolean>(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState<boolean>(false);
  const [isAssignCampaignModalOpen, setIsAssignCampaignModalOpen] = useState<boolean>(false);

  const { toast } = useToast();

  const fetchVersions = useCallback(async () => {
    try {
      setIsVersionsLoading(true);
      const vList = await getContentVersions(contentId);
      setVersions(vList);
    } catch (err: any) {
      console.error('Error al cargar versiones de contenido:', err);
    } finally {
      setIsVersionsLoading(false);
    }
  }, [contentId]);

  const fetchDetail = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getContentItemById(contentId);
      setItem(data);
      
      // Inicializar campos de edición
      setEditTitle(data.title || '');
      setEditHook(data.hook || '');
      setEditScript(data.script || '');
      setEditCaption(data.caption || '');
      setEditCta(data.cta || '');
      setEditCreativeDirection(data.creative_direction || '');
      const tags = Array.isArray(data.hashtags) 
        ? data.hashtags.join(' ') 
        : typeof data.hashtags === 'string' 
        ? data.hashtags 
        : '';
      setEditHashtags(tags);
      setEditChangeSummary('');
    } catch (err: any) {
      console.error('Error al cargar detalle de contenido:', err);
      setError(err.message || 'No se pudo cargar el contenido.');
    } finally {
      setIsLoading(false);
    }
  }, [contentId]);

  useEffect(() => {
    fetchDetail();
    fetchVersions();
  }, [fetchDetail, fetchVersions]);

  // Guardar Edición Manual (crea versión append-only)
  const handleSaveEdit = async () => {
    if (!item || isActionLoading) return;
    if (!editTitle.trim()) {
      toast('El título del contenido es requerido', { type: 'error' });
      return;
    }

    try {
      setIsActionLoading(true);
      const cleanTags = editHashtags
        .split(/[\s,]+/)
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean);

      const updated = await updateContent(item.id, {
        title: editTitle.trim(),
        hook: editHook.trim() || null,
        script: editScript.trim() || null,
        caption: editCaption.trim() || null,
        cta: editCta.trim() || null,
        creative_direction: editCreativeDirection.trim() || null,
        hashtags: cleanTags,
        change_summary: editChangeSummary.trim() || 'Edición manual de contenido',
      });

      setItem(updated);
      setIsEditing(false);
      await fetchVersions();
      toast('Nueva versión guardada con éxito', { type: 'success' });
      onContentUpdated?.();
    } catch (err: any) {
      console.error('Error al guardar edición:', err);
      toast('Error al guardar cambios', { type: 'error', description: err.message });
    } finally {
      setIsActionLoading(false);
    }
  };

  // Restaurar Versión
  const handleConfirmRestore = async () => {
    if (!item || !versionToRestore || isActionLoading) return;

    try {
      setIsActionLoading(true);
      await restoreContentVersion(item.id, versionToRestore);
      setIsRestoreConfirmOpen(false);
      setVersionToRestore(null);
      
      toast(`Versión v${versionToRestore.version_number} restaurada con éxito`, { type: 'success' });
      await fetchDetail();
      await fetchVersions();
      onContentUpdated?.();
    } catch (err: any) {
      console.error('Error al restaurar versión:', err);
      toast('Error al restaurar versión', { type: 'error', description: err.message });
    } finally {
      setIsActionLoading(false);
    }
  };

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

  // 2. Acción: Rechazar
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

  const hashtagsList: string[] = Array.isArray(item.hashtags)
    ? item.hashtags
    : typeof item.hashtags === 'string'
    ? (item.hashtags as string).split(/[\s,]+/).filter(Boolean)
    : [];

  const mediaReqsList: string[] = Array.isArray(item.media_requirements)
    ? item.media_requirements
    : [];

  const scenes = Array.isArray(item.scenes) ? item.scenes : [];
  const currentVersionNumber = versions.length > 0 ? Math.max(...versions.map((v) => v.version_number)) : 1;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200 pb-16">
      
      {/* Top Breadcrumb & Status Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            className="text-xs bg-dark-900/80 border-dark-800 hover:bg-dark-800"
          >
            Volver
          </Button>

          <PlatformBadge platform={item.platform} />

          {item.content_type && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold uppercase tracking-wider bg-dark-900 border border-dark-800 text-slate-300">
              {isVideo ? <Film className="w-3.5 h-3.5 text-pink-400" /> : <ImageIcon className="w-3.5 h-3.5 text-sky-400" />}
              {item.content_type}
            </span>
          )}

          {/* Current Version Pill */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold font-mono bg-aura-500/10 text-aura-300 border border-aura-500/25">
            <History className="w-3.5 h-3.5 text-aura-400" />
            v{currentVersionNumber}
          </span>

          {/* Campaign Pill */}
          {item.campaigns?.name ? (
            <button
              onClick={() => setIsAssignCampaignModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/25 transition-colors"
              title="Organizar en campaña"
            >
              <Target className="w-3.5 h-3.5 text-amber-400" />
              <span>{item.campaigns.name}</span>
            </button>
          ) : (
            <button
              onClick={() => setIsAssignCampaignModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-slate-500/10 hover:bg-slate-500/20 text-slate-400 border border-slate-500/25 transition-colors"
              title="Asignar a una campaña"
            >
              <Sparkles className="w-3.5 h-3.5 text-slate-400" />
              <span>Evergreen</span>
            </button>
          )}
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

            {isEditing ? (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase text-aura-400 tracking-wider">
                  Título del Contenido
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full text-xl font-bold bg-dark-950 border border-aura-500/40 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-aura-400"
                  placeholder="Título descriptivo..."
                />
              </div>
            ) : (
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
                {item.title || 'Sin título'}
              </h1>
            )}
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {!isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setIsEditing(true)}
                  leftIcon={<Edit3 className="w-4 h-4 text-aura-400" />}
                  className="hover:border-aura-500/50 hover:bg-aura-500/10 text-white font-semibold"
                >
                  Editar Contenido
                </Button>

                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setIsAssignCampaignModalOpen(true)}
                  leftIcon={<FolderPlus className="w-4 h-4 text-aura-400" />}
                  className="hover:border-aura-500/50 hover:bg-aura-500/10 text-slate-200"
                >
                  {item.campaign_id ? 'Mover Campaña' : 'Asignar a Campaña'}
                </Button>

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
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => setIsEditing(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSaveEdit}
                  isLoading={isActionLoading}
                  leftIcon={<Save className="w-4 h-4" />}
                  className="bg-aura-600 hover:bg-aura-500 text-white font-semibold shadow-lg shadow-aura-950/40"
                >
                  Guardar Nueva Versión
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Origen y Estrategia del Contenido */}
      <div className="bg-dark-900/60 border border-dark-800/80 rounded-2xl p-5 shadow-lg space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-aura-400 flex items-center gap-1.5">
          <FolderTree className="w-3.5 h-3.5" />
          Estrategia y Origen del Contenido
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-dark-950/60 border border-dark-800/60 space-y-1">
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <Layers className="w-3 h-3 text-aura-400" />
              Idea de Origen
            </div>
            <div className="font-medium text-slate-200 truncate">
              {item.content_ideas?.title || 'Estrategia abierta'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-dark-950/60 border border-dark-800/60 space-y-1">
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <Clapperboard className="w-3 h-3 text-sky-400" />
              Sesión Creativa
            </div>
            <div className="font-medium text-sky-300 truncate">
              {item.generation_run_id ? 'Sesión de Marca' : 'Producción directa'}
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

      {/* Formulario de Edición Manual */}
      {isEditing && (
        <div className="bg-dark-900 border border-aura-500/40 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-dark-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-aura-500/10 border border-aura-500/30 flex items-center justify-center text-aura-400">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  Editor de Contenido (Nueva Versión)
                </h3>
                <p className="text-xs text-slate-400">
                  Cada guardado genera un snapshot inmutable append-only en el historial.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5">
            {/* Hook */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Quote className="w-3.5 h-3.5" />
                Hook / Gancho Inicial
              </label>
              <textarea
                value={editHook}
                onChange={(e) => setEditHook(e.target.value)}
                rows={2}
                className="w-full bg-dark-950 border border-dark-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-aura-500 leading-relaxed"
                placeholder="El gancho principal de los primeros segundos o líneas..."
              />
            </div>

            {/* Script */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-aura-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Guion Completo de Locución
              </label>
              <textarea
                value={editScript}
                onChange={(e) => setEditScript(e.target.value)}
                rows={4}
                className="w-full bg-dark-950 border border-dark-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-aura-500 leading-relaxed font-mono text-[11px]"
                placeholder="Guion estructurado paso a paso..."
              />
            </div>

            {/* Caption */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Caption / Copia del Post
              </label>
              <textarea
                value={editCaption}
                onChange={(e) => setEditCaption(e.target.value)}
                rows={4}
                className="w-full bg-dark-950 border border-dark-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-aura-500 leading-relaxed"
                placeholder="Texto final para publicación..."
              />
            </div>

            {/* CTA & Dirección Creativa */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckSquare2 className="w-3.5 h-3.5" />
                  Llamado a la Acción (CTA)
                </label>
                <input
                  type="text"
                  value={editCta}
                  onChange={(e) => setEditCta(e.target.value)}
                  className="w-full bg-dark-950 border border-dark-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-aura-500"
                  placeholder="Ej: Dejanos tu comentario o visitá el enlace..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5" />
                  Dirección Creativa y Tono
                </label>
                <input
                  type="text"
                  value={editCreativeDirection}
                  onChange={(e) => setEditCreativeDirection(e.target.value)}
                  className="w-full bg-dark-950 border border-dark-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-aura-500"
                  placeholder="Ej: Tono dinámico, colores cálidos..."
                />
              </div>
            </div>

            {/* Hashtags */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-pink-400 uppercase tracking-wider flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5" />
                Hashtags (separados por espacio o coma)
              </label>
              <input
                type="text"
                value={editHashtags}
                onChange={(e) => setEditHashtags(e.target.value)}
                className="w-full bg-dark-950 border border-dark-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-aura-500"
                placeholder="#viajes #experiencias #aventura"
              />
            </div>

            {/* Resumen del Cambio */}
            <div className="space-y-1.5 p-4 rounded-2xl bg-dark-950/80 border border-aura-500/20">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-aura-400" />
                Resumen del Cambio (Auditoría de Versión)
              </label>
              <input
                type="text"
                value={editChangeSummary}
                onChange={(e) => setEditChangeSummary(e.target.value)}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-aura-500"
                placeholder="Ej: Ajuste del hook inicial y corrección de CTA"
              />
            </div>
          </div>
        </div>
      )}

      {/* Desglose de Escenas Audiovisuales */}
      {!isEditing && scenes.length > 0 && (
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
      {!isEditing && (
        <div className="grid grid-cols-1 gap-5">
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
      )}

      {/* Historial Inmutable de Versiones */}
      <div className="bg-dark-900/90 border border-dark-800 rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
        <VersionHistoryTimeline
          versions={versions}
          isLoading={isVersionsLoading}
          onViewSnapshot={(ver) => {
            setSelectedSnapshotVersion(ver);
            setIsSnapshotModalOpen(true);
          }}
          onCompareWithCurrent={(ver) => {
            const currentVer = versions[0];
            setDiffVersionA(ver);
            setDiffVersionB(currentVer);
            setIsDiffModalOpen(true);
          }}
          onRestoreVersion={(ver) => {
            setVersionToRestore(ver);
            setIsRestoreConfirmOpen(true);
          }}
        />
      </div>

      {/* Modales de Snapshot y Diff */}
      <VersionSnapshotModal
        isOpen={isSnapshotModalOpen}
        onClose={() => {
          setIsSnapshotModalOpen(false);
          setSelectedSnapshotVersion(null);
        }}
        version={selectedSnapshotVersion}
        isCurrentVersion={selectedSnapshotVersion?.version_number === currentVersionNumber}
        onRestore={(ver) => {
          setVersionToRestore(ver);
          setIsRestoreConfirmOpen(true);
        }}
      />

      <VersionDiffModal
        isOpen={isDiffModalOpen}
        onClose={() => setIsDiffModalOpen(false)}
        versions={versions}
        initialVersionA={diffVersionA}
        initialVersionB={diffVersionB}
      />

      {/* Modal Confirmar Restauración */}
      <ConfirmDialog
        isOpen={isRestoreConfirmOpen}
        onClose={() => {
          setIsRestoreConfirmOpen(false);
          setVersionToRestore(null);
        }}
        onConfirm={handleConfirmRestore}
        title={`¿Restaurar versión v${versionToRestore?.version_number}?`}
        message={`Se creará una nueva versión histórica (v${currentVersionNumber + 1}) con el contenido exacto de v${versionToRestore?.version_number}. Todas las versiones anteriores permanecerán intactas.`}
        confirmText="Confirmar Restauración"
        cancelText="Cancelar"
        type="warning"
        isLoading={isActionLoading}
      />

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

      {/* Schedule Modal */}
      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onConfirm={handleConfirmSchedule}
        item={item}
        isLoading={isActionLoading}
      />

      {/* Modal de Asignación a Campaña */}
      <AssignToCampaignModal
        isOpen={isAssignCampaignModalOpen}
        onClose={() => setIsAssignCampaignModalOpen(false)}
        entityType="content"
        entityId={item.id}
        entityTitle={item.title}
        brandId={item.brand_id || ''}
        currentCampaignId={item.campaign_id}
        onAssigned={() => {
          fetchDetail();
          onContentUpdated?.();
        }}
      />

    </div>
  );
}
