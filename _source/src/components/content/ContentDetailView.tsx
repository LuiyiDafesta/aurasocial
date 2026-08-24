import { useState, useEffect, useCallback, useMemo } from 'react';
import { ContentItem } from '../../types/contentItem';
import { ContentVersion } from '../../types/contentVersion';
import { ContentAsset } from '../../types/contentAsset';
import { PlatformAdaptation } from '../../types/platformAdaptation';
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
import { 
  getContentAssets, 
  deleteAsset, 
  linkExistingAssetToContent 
} from '../../services/contentAssetService';
import { getPlatformAdaptations } from '../../services/platformAdaptationService';
import { SceneMediaBuilder } from './SceneMediaBuilder';
import { PlatformAdaptationsSection } from './PlatformAdaptationsSection';
import { SocialConnectionsPanel } from '../publishing/SocialConnectionsPanel';
import { PlatformBadge } from './PlatformBadge';
import { StatusBadge } from './StatusBadge';
import { ScheduleModal } from './ScheduleModal';
import { VersionSnapshotModal } from './VersionSnapshotModal';
import { VersionDiffModal } from './VersionDiffModal';
import { VersionHistoryTimeline } from './VersionHistoryTimeline';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { AssignToCampaignModal } from '../campaigns/AssignToCampaignModal';
import { AssetCard } from '../assets/AssetCard';
import { AssetUploadModal } from '../assets/AssetUploadModal';
import { AssetPickerModal } from '../assets/AssetPickerModal';
import { AssetPreviewModal } from '../assets/AssetPreviewModal';
import { AssetDetailsModal } from '../assets/AssetDetailsModal';
import { formatInArgentina } from '../../lib/dateUtils';
import { Button } from '../common/Button';
import { ContentProductionStudio } from '../studio/ContentProductionStudio';
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
  Film, 
  Image as ImageIcon,
  Loader2, 
  AlertCircle, 
  Check, 
  X, 
  CalendarCheck, 
  Clapperboard, 
  Layers, 
  FolderTree, 
  History,
  Edit3,
  Save,
  FolderPlus,
  Target,
  UploadCloud,
  Send,
  Smartphone,
  AlertTriangle
} from 'lucide-react';

interface ContentDetailViewProps {
  contentId: string;
  onBack: () => void;
  onContentUpdated?: () => void;
}

export function ContentDetailView({ contentId, onBack, onContentUpdated }: ContentDetailViewProps) {
  const [item, setItem] = useState<ContentItem | null>(null);
  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [adaptations, setAdaptations] = useState<PlatformAdaptation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isVersionsLoading, setIsVersionsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);

  // Tab activo de flujo de trabajo
  const [activeTab, setActiveTab] = useState<'content' | 'production' | 'adaptations' | 'publishing'>('content');

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
  const [isStudioOpen, setIsStudioOpen] = useState<boolean>(false);
  const [isRejectConfirmOpen, setIsRejectConfirmOpen] = useState<boolean>(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState<boolean>(false);
  const [isAssignCampaignModalOpen, setIsAssignCampaignModalOpen] = useState<boolean>(false);

  // Estados de Media & Assets
  const [contentAssets, setContentAssets] = useState<ContentAsset[]>([]);
  const [isAssetsLoading, setIsAssetsLoading] = useState<boolean>(false);
  const [isUploadAssetModalOpen, setIsUploadAssetModalOpen] = useState<boolean>(false);
  const [isAssetPickerModalOpen, setIsAssetPickerModalOpen] = useState<boolean>(false);
  const [previewAsset, setPreviewAsset] = useState<ContentAsset | null>(null);
  const [detailsAsset, setDetailsAsset] = useState<ContentAsset | null>(null);
  const [assetToDelete, setAssetToDelete] = useState<ContentAsset | null>(null);
  const [isDeletingAsset, setIsDeletingAsset] = useState<boolean>(false);

  const { toast } = useToast();

  const fetchAssets = useCallback(async () => {
    if (!contentId) return;
    try {
      setIsAssetsLoading(true);
      const res = await getContentAssets(contentId, item?.brand_id || '');
      setContentAssets(res.data);
    } catch (err: any) {
      console.error('Error al cargar assets de contenido:', err);
    } finally {
      setIsAssetsLoading(false);
    }
  }, [contentId, item?.brand_id]);

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

  const fetchAdaptations = useCallback(async () => {
    try {
      const adList = await getPlatformAdaptations(contentId);
      setAdaptations(adList);
    } catch (err) {
      console.error('Error al cargar adaptaciones:', err);
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
    fetchAssets();
    fetchAdaptations();
  }, [fetchDetail, fetchVersions, fetchAssets, fetchAdaptations]);

  // Cálculo de Progreso de Ciclo de Vida de Producción
  const lifecycle = useMemo(() => {
    const hasContentGenerated = Boolean(item?.title && (item?.caption || item?.hook || item?.script));
    
    // Media asignada: escenas tienen sus slots requeridos resueltos
    let missingMediaScenes: number[] = [];
    if (item?.scenes && item.scenes.length > 0) {
      item.scenes.forEach((sc, idx) => {
        if (sc.media_slots && sc.media_slots.length > 0) {
          const reqUnresolved = sc.media_slots.some(sl => sl.required && !sl.asset_id);
          if (reqUnresolved) missingMediaScenes.push(idx + 1);
        }
      });
    }
    const hasMediaAssigned = missingMediaScenes.length === 0;

    const hasAdaptationsCreated = adaptations.length > 0;
    const hasRenderGenerated = adaptations.some(a => a.render_status === 'rendered');
    const hasQualityApproved = adaptations.some(a => a.readiness_status === 'approved');

    // Determinación de estado y faltantes
    let missingItems: string[] = [];
    if (!hasContentGenerated) missingItems.push('Título o copy maestro incompleto');
    if (!hasMediaAssigned) missingItems.push(`Recursos multimedia pendientes en Escena(s): ${missingMediaScenes.join(', ')}`);
    if (!hasAdaptationsCreated) missingItems.push('Crear al menos una adaptación de plataforma');
    if (hasAdaptationsCreated && !hasRenderGenerated) missingItems.push('Generar render real de video (MP4)');
    if (hasRenderGenerated && !hasQualityApproved) missingItems.push('Aprobar adaptación en Quality Gate');

    const isReadyToPublish = hasContentGenerated && hasMediaAssigned && hasAdaptationsCreated && hasRenderGenerated && hasQualityApproved;

    return {
      hasContentGenerated,
      hasMediaAssigned,
      hasAdaptationsCreated,
      hasRenderGenerated,
      hasQualityApproved,
      isReadyToPublish,
      missingItems,
      missingMediaScenes,
    };
  }, [item, adaptations]);

  const handleLinkExistingAsset = async (sourceAsset: ContentAsset) => {
    if (!item) return;
    try {
      await linkExistingAssetToContent(sourceAsset, item.id);
      toast(`Asset "${sourceAsset.name}" vinculado a esta pieza de contenido`, { type: 'success' });
      fetchAssets();
    } catch (err: any) {
      console.error('Error al vincular asset:', err);
      toast('Error al vincular asset', { type: 'error', description: err.message });
    }
  };

  const handleDeleteAssetConfirm = async () => {
    if (!assetToDelete || isDeletingAsset) return;
    try {
      setIsDeletingAsset(true);
      await deleteAsset(assetToDelete.id);
      toast(`Asset "${assetToDelete.name}" eliminado correctamente`, { type: 'success' });
      setAssetToDelete(null);
      fetchAssets();
    } catch (err: any) {
      console.error('Error al eliminar asset:', err);
      toast('Error al eliminar asset', { type: 'error', description: err.message });
    } finally {
      setIsDeletingAsset(false);
    }
  };

  // Guardar Edición Manual (crea versión append-only)
  const handleSaveEdit = async () => {
    if (!item || isActionLoading) return;
    if (!editTitle.trim()) {
      toast('El título del contenido es requerido', { type: 'error' });
      return;
    }

    try {
      setIsActionLoading(true);
      const hashtagsArr = editHashtags
        .split(/[\s,]+/)
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => (t.startsWith('#') ? t : `#${t}`));

      const updated = await updateContent(item.id, {
        title: editTitle.trim(),
        hook: editHook.trim() || undefined,
        script: editScript.trim() || undefined,
        caption: editCaption.trim() || undefined,
        cta: editCta.trim() || undefined,
        creative_direction: editCreativeDirection.trim() || undefined,
        hashtags: hashtagsArr,
        change_summary: editChangeSummary.trim() || 'Edición manual de contenido',
      });

      setItem(updated);
      setIsEditing(false);
      toast('Contenido actualizado y nueva versión registrada', { type: 'success' });
      await fetchVersions();
      if (onContentUpdated) onContentUpdated();
    } catch (err: any) {
      console.error('Error al guardar edición:', err);
      toast('Error al actualizar contenido', { type: 'error', description: err.message });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!item || isActionLoading) return;
    try {
      setIsActionLoading(true);
      await approveContent(item.id);
      await fetchDetail();
      toast('Contenido aprobado exitosamente', { type: 'success' });
      await fetchVersions();
      if (onContentUpdated) onContentUpdated();
    } catch (err: any) {
      toast('Error al aprobar contenido', { type: 'error', description: err.message });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!item || isActionLoading) return;
    try {
      setIsActionLoading(true);
      await rejectContent(item.id);
      await fetchDetail();
      setIsRejectConfirmOpen(false);
      toast('Contenido marcado como rechazado', { type: 'success' });
      await fetchVersions();
      if (onContentUpdated) onContentUpdated();
    } catch (err: any) {
      toast('Error al rechazar contenido', { type: 'error', description: err.message });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleScheduleConfirm = async (scheduledAt: string) => {
    if (!item || isActionLoading) return;
    try {
      setIsActionLoading(true);
      await scheduleContent(item.id, scheduledAt);
      await fetchDetail();
      setIsScheduleModalOpen(false);
      toast(`Contenido programado para ${formatInArgentina(scheduledAt)}`, { type: 'success' });
      await fetchVersions();
      if (onContentUpdated) onContentUpdated();
    } catch (err: any) {
      toast('Error al programar contenido', { type: 'error', description: err.message });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRestoreVersion = async () => {
    if (!item || !versionToRestore || isActionLoading) return;
    try {
      setIsActionLoading(true);
      await restoreContentVersion(item.id, versionToRestore);
      await fetchDetail();
      setIsRestoreConfirmOpen(false);
      setVersionToRestore(null);
      toast(`Contenido restaurado a versión v${versionToRestore.version_number}`, { type: 'success' });
      await fetchVersions();
      if (onContentUpdated) onContentUpdated();
    } catch (err: any) {
      toast('Error al restaurar versión', { type: 'error', description: err.message });
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-aura-500" />
        <p className="text-sm text-slate-400">Cargando detalles de producción...</p>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="p-8 rounded-3xl bg-dark-900 border border-dark-800 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-white">Error al cargar contenido</h2>
        <p className="text-sm text-slate-400">{error || 'El contenido no fue encontrado.'}</p>
        <Button variant="outline" size="md" onClick={onBack} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Volver a la lista
        </Button>
      </div>
    );
  }

  const isVideo = item.content_type?.toLowerCase().includes('video') || item.content_type?.toLowerCase().includes('reel');
  const rawHashtags: any = item.hashtags;
  const hashtagsList: string[] = Array.isArray(rawHashtags)
    ? rawHashtags
    : typeof rawHashtags === 'string' && rawHashtags.trim().length > 0
    ? rawHashtags.split(/[\s,]+/).filter(Boolean)
    : [];
  const scenes = Array.isArray(item.scenes) ? item.scenes : [];
  const currentVersionNumber = versions.length > 0 ? versions[0].version_number : 1;
  const accountName = `@${item.brands?.name?.toLowerCase().replace(/\s+/g, '') || 'aura'}`;
  const avatarUrl = undefined;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      
      {/* Navigation and Metadata Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-2">
        <div className="flex items-center gap-3 flex-wrap">
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
                  variant="primary"
                  size="md"
                  onClick={() => setIsStudioOpen(true)}
                  leftIcon={<Clapperboard className="w-4 h-4" />}
                  className="bg-gradient-to-r from-aura-600 to-purple-600 hover:from-aura-500 hover:to-purple-500 text-white font-semibold shadow-lg shadow-aura-950/40"
                >
                  Estudio de Producción
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

      {/* ============================================================ */}
      {/* PRODUCTION READINESS & LIFECYCLE PROGRESS BAR (FASE 9E.1)    */}
      {/* ============================================================ */}
      <div className="bg-dark-900/90 border border-dark-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-aura-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">
              Estado de Producción y Publicación
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {lifecycle.isReadyToPublish ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 font-mono animate-pulse">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                🟢 LISTO PARA PUBLICAR
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 font-mono">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                🟡 EN PRODUCCIÓN
              </span>
            )}
          </div>
        </div>

        {/* 5 Stages Progress Checklist */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
          <div className={`p-3 rounded-2xl border flex items-center gap-2 text-xs ${
            lifecycle.hasContentGenerated 
              ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300' 
              : 'bg-dark-950/60 border-dark-800 text-slate-500'
          }`}>
            <span className="font-bold">{lifecycle.hasContentGenerated ? '✓' : '1.'}</span>
            <span className="font-medium">Contenido</span>
          </div>

          <div className={`p-3 rounded-2xl border flex items-center gap-2 text-xs ${
            lifecycle.hasMediaAssigned 
              ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300' 
              : 'bg-dark-950/60 border-dark-800 text-slate-500'
          }`}>
            <span className="font-bold">{lifecycle.hasMediaAssigned ? '✓' : '2.'}</span>
            <span className="font-medium">Media Slots</span>
          </div>

          <div className={`p-3 rounded-2xl border flex items-center gap-2 text-xs ${
            lifecycle.hasAdaptationsCreated 
              ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300' 
              : 'bg-dark-950/60 border-dark-800 text-slate-500'
          }`}>
            <span className="font-bold">{lifecycle.hasAdaptationsCreated ? '✓' : '3.'}</span>
            <span className="font-medium">Adaptaciones</span>
          </div>

          <div className={`p-3 rounded-2xl border flex items-center gap-2 text-xs ${
            lifecycle.hasRenderGenerated 
              ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300' 
              : 'bg-dark-950/60 border-dark-800 text-slate-500'
          }`}>
            <span className="font-bold">{lifecycle.hasRenderGenerated ? '✓' : '4.'}</span>
            <span className="font-medium">Render MP4</span>
          </div>

          <div className={`p-3 rounded-2xl border flex items-center gap-2 text-xs ${
            lifecycle.hasQualityApproved 
              ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300' 
              : 'bg-dark-950/60 border-dark-800 text-slate-500'
          }`}>
            <span className="font-bold">{lifecycle.hasQualityApproved ? '✓' : '5.'}</span>
            <span className="font-medium">Quality Gate</span>
          </div>
        </div>

        {/* Diagnostic Missing items info banner */}
        {!lifecycle.isReadyToPublish && lifecycle.missingItems.length > 0 && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between flex-wrap gap-3">
            <div className="space-y-1">
              <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Paso(s) pendiente(s) para completar la producción:</span>
              </div>
              <ul className="text-[11px] text-amber-200/80 list-disc list-inside space-y-0.5">
                {lifecycle.missingItems.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!lifecycle.hasMediaAssigned) setActiveTab('production');
                else if (!lifecycle.hasAdaptationsCreated || !lifecycle.hasRenderGenerated) setActiveTab('adaptations');
                else setActiveTab('publishing');
              }}
              className="text-xs border-amber-500/40 text-amber-300 hover:bg-amber-500/10 font-bold"
            >
              Resolver Siguiente Paso →
            </Button>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* WORKFLOW TABS NAVIGATION                                     */}
      {/* ============================================================ */}
      <div className="flex items-center gap-2 border-b border-dark-800 pb-2 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveTab('content')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'content'
              ? 'bg-aura-600 text-white shadow-lg shadow-aura-950/50'
              : 'bg-dark-900/60 text-slate-400 hover:text-white hover:bg-dark-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>1. Contenido Master</span>
        </button>

        <button
          onClick={() => setActiveTab('production')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'production'
              ? 'bg-aura-600 text-white shadow-lg shadow-aura-950/50'
              : 'bg-dark-900/60 text-slate-400 hover:text-white hover:bg-dark-800'
          }`}
        >
          <Clapperboard className="w-4 h-4" />
          <span>2. Producción & Media Slots</span>
          {scenes.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-dark-950 text-[10px] text-aura-300 font-mono">
              {scenes.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('adaptations')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'adaptations'
              ? 'bg-aura-600 text-white shadow-lg shadow-aura-950/50'
              : 'bg-dark-900/60 text-slate-400 hover:text-white hover:bg-dark-800'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>3. Adaptaciones & Video Real</span>
          {adaptations.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-dark-950 text-[10px] text-purple-300 font-mono">
              {adaptations.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('publishing')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'publishing'
              ? 'bg-aura-600 text-white shadow-lg shadow-aura-950/50'
              : 'bg-dark-900/60 text-slate-400 hover:text-white hover:bg-dark-800'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>4. Canales & Publicación</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: CONTENIDO & CONCEPTO MASTER                           */}
      {/* ============================================================ */}
      {activeTab === 'content' && (
        <div className="space-y-6 animate-in fade-in duration-150">
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

          {/* Structured Content Sections */}
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
          </div>

          {/* Historial de Versiones */}
          <VersionHistoryTimeline
            versions={versions}
            isLoading={isVersionsLoading}
            onViewSnapshot={(v) => {
              setSelectedSnapshotVersion(v);
              setIsSnapshotModalOpen(true);
            }}
            onCompareWithCurrent={(v) => {
              setDiffVersionA(v);
              setDiffVersionB(versions[0] || v);
              setIsDiffModalOpen(true);
            }}
            onRestoreVersion={(v) => {
              setVersionToRestore(v);
              setIsRestoreConfirmOpen(true);
            }}
          />
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: PRODUCCIÓN & MEDIA SLOTS                              */}
      {/* ============================================================ */}
      {activeTab === 'production' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Escenas Estructuradas */}
          {scenes.length > 0 && (
            <div className="bg-dark-900/90 border border-dark-800 rounded-3xl p-6 md:p-8 shadow-xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-dark-800/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400">
                    <Clapperboard className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                      Estructura de Escenas ({scenes.length})
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Dirección visual y locución escena por escena
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {scenes.map((scene, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-dark-950/80 border border-dark-800/80 space-y-3 shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-sky-300 uppercase font-mono">
                        Escena {scene.scene_number || idx + 1}
                      </span>
                      {scene.duration_seconds && (
                        <span className="text-[11px] font-mono text-slate-400 bg-dark-900 px-2 py-0.5 rounded border border-dark-800">
                          {scene.duration_seconds}s
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-200 leading-relaxed bg-dark-900/60 p-3 rounded-xl border border-dark-800/60">
                      <strong className="text-slate-400 font-semibold uppercase text-[10px] block mb-1">Dirección Visual:</strong>
                      {scene.visual_direction}
                    </div>

                    {scene.voiceover && (
                      <div className="text-xs text-pink-200 leading-relaxed bg-pink-950/20 p-3 rounded-xl border border-pink-800/30 italic">
                        <strong className="text-pink-400 font-semibold uppercase text-[10px] block not-italic mb-1">Locución:</strong>
                        "{scene.voiceover}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Media Plan & SceneMediaBuilder */}
          {scenes.length > 0 && (
            <SceneMediaBuilder
              contentItem={item}
              contentAssets={contentAssets}
              onScenesUpdated={(updatedScenes) => {
                setItem((prev) => prev ? { ...prev, scenes: updatedScenes } : null);
              }}
              onRefreshAssets={fetchAssets}
            />
          )}

          {/* Media & Assets Multimedia Asociados */}
          <div className="bg-dark-900/60 border border-dark-800/80 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap pb-1 border-b border-dark-800/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-pink-500/10 border border-pink-500/25 flex items-center justify-center text-pink-400">
                  <Film className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                    Media & Assets Multimedia ({contentAssets.length})
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Recursos almacenados en Backblaze B2 vinculados a este contenido
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAssetPickerModalOpen(true)}
                  leftIcon={<FolderPlus className="w-3.5 h-3.5 text-aura-400" />}
                  className="text-xs bg-dark-950 border-dark-700 hover:bg-dark-800 text-white"
                >
                  Vincular de Biblioteca
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsUploadAssetModalOpen(true)}
                  leftIcon={<UploadCloud className="w-3.5 h-3.5" />}
                  className="text-xs bg-aura-600 hover:bg-aura-500 text-white font-semibold"
                >
                  + Subir Asset
                </Button>
              </div>
            </div>

            {isAssetsLoading ? (
              <div className="py-8 text-center text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-pink-400" />
                <span className="text-xs">Cargando assets asociados...</span>
              </div>
            ) : contentAssets.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {contentAssets.map((asset) => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    onPreview={() => setPreviewAsset(asset)}
                    onViewDetails={() => setDetailsAsset(asset)}
                    onDelete={() => setAssetToDelete(asset)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border border-dashed border-dark-800 rounded-2xl bg-dark-950/40">
                <Film className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No hay assets multimedia vinculados directamente a este contenido.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: ADAPTACIONES & VIDEO REAL                             */}
      {/* ============================================================ */}
      {activeTab === 'adaptations' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <PlatformAdaptationsSection contentItem={item} />
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 4: CANALES & PUBLICACIÓN                                 */}
      {/* ============================================================ */}
      {activeTab === 'publishing' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {item.brand_id && item.workspace_id && (
            <SocialConnectionsPanel
              brandId={item.brand_id}
              workspaceId={item.workspace_id}
              brandName={item.brands?.name}
            />
          )}

          {/* Quick Platform Adaptations for Publishing */}
          <PlatformAdaptationsSection contentItem={item} />
        </div>
      )}

      {/* Modales de Gestión de Assets */}
      {isUploadAssetModalOpen && (
        <AssetUploadModal
          isOpen={isUploadAssetModalOpen}
          onClose={() => setIsUploadAssetModalOpen(false)}
          workspaceId={item.workspace_id || ''}
          brandId={item.brand_id || ''}
          brandName={item.brands?.name}
          scope="content"
          campaignId={item.campaign_id || null}
          campaignName={item.campaigns?.name}
          contentItemId={item.id}
          contentTitle={item.title}
          onAssetUploaded={() => {
            setIsUploadAssetModalOpen(false);
            fetchAssets();
          }}
        />
      )}

      {isAssetPickerModalOpen && (
        <AssetPickerModal
          isOpen={isAssetPickerModalOpen}
          onClose={() => setIsAssetPickerModalOpen(false)}
          brandId={item.brand_id || ''}
          onSelectAsset={handleLinkExistingAsset}
        />
      )}

      {previewAsset && (
        <AssetPreviewModal
          isOpen={Boolean(previewAsset)}
          onClose={() => setPreviewAsset(null)}
          asset={previewAsset}
        />
      )}

      {detailsAsset && (
        <AssetDetailsModal
          isOpen={Boolean(detailsAsset)}
          onClose={() => setDetailsAsset(null)}
          asset={detailsAsset}
          onPreview={(asset) => {
            setDetailsAsset(null);
            setPreviewAsset(asset);
          }}
          onDelete={(asset) => {
            setDetailsAsset(null);
            setAssetToDelete(asset);
          }}
        />
      )}

      {assetToDelete && (
        <ConfirmDialog
          isOpen={Boolean(assetToDelete)}
          title="Eliminar Asset Multimedia"
          message={`¿Estás seguro de que deseas eliminar permanentemente el asset "${assetToDelete.name}" de Backblaze B2?`}
          confirmText="Eliminar Asset"
          type="danger"
          isLoading={isDeletingAsset}
          onConfirm={handleDeleteAssetConfirm}
          onClose={() => setAssetToDelete(null)}
        />
      )}

      {/* Modales de Versionado */}
      {isSnapshotModalOpen && selectedSnapshotVersion && (
        <VersionSnapshotModal
          isOpen={isSnapshotModalOpen}
          onClose={() => setIsSnapshotModalOpen(false)}
          version={selectedSnapshotVersion}
        />
      )}

      {isDiffModalOpen && diffVersionA && diffVersionB && (
        <VersionDiffModal
          isOpen={isDiffModalOpen}
          onClose={() => setIsDiffModalOpen(false)}
          versions={versions}
          initialVersionA={diffVersionA}
          initialVersionB={diffVersionB}
        />
      )}

      {isRestoreConfirmOpen && versionToRestore && (
        <ConfirmDialog
          isOpen={isRestoreConfirmOpen}
          title={`Restaurar a versión v${versionToRestore.version_number}`}
          message={`¿Confirmas que deseas restaurar el contenido a la versión v${versionToRestore.version_number}? Se creará una nueva versión con los datos restaurados.`}
          confirmText="Restaurar Versión"
          type="warning"
          isLoading={isActionLoading}
          onConfirm={handleRestoreVersion}
          onClose={() => setIsRestoreConfirmOpen(false)}
        />
      )}

      {/* Modales Editoriales */}
      {isScheduleModalOpen && (
        <ScheduleModal
          isOpen={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(false)}
          onConfirm={handleScheduleConfirm}
          item={item}
        />
      )}

      {isAssignCampaignModalOpen && (
        <AssignToCampaignModal
          isOpen={isAssignCampaignModalOpen}
          onClose={() => setIsAssignCampaignModalOpen(false)}
          entityType="content"
          entityId={item.id}
          entityTitle={item.title || 'Contenido'}
          brandId={item.brand_id || ''}
          currentCampaignId={item.campaign_id || null}
          onAssigned={() => {
            fetchDetail();
            if (onContentUpdated) onContentUpdated();
          }}
        />
      )}

      {isRejectConfirmOpen && (
        <ConfirmDialog
          isOpen={isRejectConfirmOpen}
          title="Rechazar Contenido"
          message="Por favor indica el motivo por el cual rechazas este contenido:"
          confirmText="Rechazar Contenido"
          type="danger"
          isLoading={isActionLoading}
          onConfirm={handleReject}
          onClose={() => setIsRejectConfirmOpen(false)}
        />
      )}

      {isStudioOpen && (
        <div className="fixed inset-0 z-50 bg-dark-950/95 backdrop-blur-xl overflow-y-auto p-4 md:p-8">
          <ContentProductionStudio
            item={item}
            currentVersion={versions[0] || null}
            onBack={() => {
              setIsStudioOpen(false);
              fetchDetail();
              fetchVersions();
              fetchAssets();
              fetchAdaptations();
              if (onContentUpdated) onContentUpdated();
            }}
          />
        </div>
      )}

    </div>
  );
}
