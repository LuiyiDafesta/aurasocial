import { useState, useMemo, useEffect } from 'react';
import { PlatformAdaptation, TargetPlatform } from '../../types/platformAdaptation';
import { RenderJob } from '../../types/renderJob';
import { ContentItem } from '../../types/contentItem';
import { SocialPlatform } from '../../types/publishing';
import { PlatformPreviewShell } from './PlatformPreviewShell';
import { ApprovalModal } from './ApprovalModal';
import { MarkAsPublishedModal } from './MarkAsPublishedModal';
import { PublishingHistoryModal } from './PublishingHistoryModal';
import { 
  updatePlatformAdaptation, 
  approvePlatformAdaptation, 
  rejectPlatformAdaptation,
  calculateGlobalPublicationReadiness 
} from '../../services/platformAdaptationService';
import { 
  buildStructuredPublicationPackage, 
  prepareManualPublishing, 
  getMediaDownloadUrl
} from '../../services/publishingOutboxService';
import { 
  sanitizePublicationText, 
  formatFullPublicationText, 
  validateTextForPlaceholders, 
  sanitizeAndValidateHashtags 
} from '../../services/copySanitizerService';
import { getPlatformProfile } from '../../config/platformProfiles';
import { Button } from '../common/Button';
import { useToast } from '../../hooks/useToast';
import { 
  Save, 
  CheckCircle2, 
  XCircle, 
  Copy, 
  Download, 
  AlertCircle, 
  Check, 
  Clock, 
  History, 
  ShieldCheck, 
  FileText, 
  Sliders,
  Zap
} from 'lucide-react';
import { n8nOrchestratorService } from '../../services/n8n/n8nOrchestratorService';

interface FinalContentEditorProps {
  contentItem: ContentItem;
  adaptations: PlatformAdaptation[];
  renderJobsMap: Record<string, RenderJob>;
  brandName?: string;
  avatarUrl?: string;
  onAdaptationsChange?: () => void;
  onClose?: () => void;
}

export function FinalContentEditor({
  contentItem,
  adaptations,
  renderJobsMap,
  brandName = 'Mi Marca',
  avatarUrl,
  onAdaptationsChange,
}: FinalContentEditorProps) {
  const { toast } = useToast();

  const [activePlatform, setActivePlatform] = useState<SocialPlatform>(
    (adaptations[0]?.platform as SocialPlatform) || 'instagram'
  );

  const currentAdaptation = adaptations.find(
    (a) => a.platform === activePlatform || (activePlatform === 'youtube' && a.platform === 'youtube_shorts')
  );
  const currentRenderJob = currentAdaptation ? renderJobsMap[currentAdaptation.id] : null;
  const currentProfile = getPlatformProfile(activePlatform as TargetPlatform);

  // Form states for the active platform
  const [caption, setCaption] = useState<string>('');
  const [hashtagsText, setHashtagsText] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [cta, setCta] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [isRejecting, setIsRejecting] = useState<boolean>(false);
  const [isDownloadingMedia, setIsDownloadingMedia] = useState<boolean>(false);
  const [isPublishingManual, setIsPublishingManual] = useState<boolean>(false);
  const [isPublishingN8n, setIsPublishingN8n] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Modals
  const [showApprovalModal, setShowApprovalModal] = useState<boolean>(false);
  const [showMarkAsPublishedModal, setShowMarkAsPublishedModal] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [activeOutboxId, setActiveOutboxId] = useState<string | undefined>(undefined);

  // Sync form when active adaptation changes
  useEffect(() => {
    if (currentAdaptation) {
      setCaption(currentAdaptation.caption || '');
      const tags = Array.isArray(currentAdaptation.hashtags)
        ? currentAdaptation.hashtags
        : typeof currentAdaptation.hashtags === 'string'
        ? JSON.parse(currentAdaptation.hashtags || '[]')
        : [];
      setHashtagsText(tags.join(' '));
      setTitle(currentAdaptation.title || '');
      setDescription(currentAdaptation.hook || '');
      setCta(currentAdaptation.cta || '');
    } else {
      setCaption('');
      setHashtagsText('');
      setTitle('');
      setDescription('');
      setCta('');
    }
  }, [currentAdaptation, activePlatform]);

  const handlePublishN8nDryRun = async () => {
    if (!currentAdaptation || !contentItem.workspace_id || !contentItem.brand_id) return;
    try {
      setIsPublishingN8n(true);
      const res = await n8nOrchestratorService.triggerSocialPublishWorkflow({
        workspaceId: contentItem.workspace_id,
        brandId: contentItem.brand_id,
        contentId: currentAdaptation.content_item_id,
        provider: 'socialit',
        mode: 'dry_run',
        targets: [
          {
            platform: activePlatform,
            connectionId: currentAdaptation.id,
            provider: 'socialit',
          }
        ],
        publishPackage: {
          title: title || undefined,
          caption: validationState.cleanCaption || caption,
          hashtags: validationState.parsedHashtags,
          media: currentRenderJob?.output_storage_path
            ? { url: currentRenderJob.output_storage_path, mimeType: 'video/mp4' }
            : undefined,
        }
      });

      if (res.success) {
        toast(`⚡ Orquestación n8n Dry Run exitosa: ${res.accounts_processed} cuenta(s) verificadas sin publicación externa.`, { type: 'success' });
      } else {
        toast(`Error en orquestación n8n: ${res.error || 'Error desconocido'}`, { type: 'error' });
      }
    } catch (e: any) {
      toast(`Error al invocar n8n: ${e.message}`, { type: 'error' });
    } finally {
      setIsPublishingN8n(false);
    }
  };

  // Real-time Text QA & Quality Gate Validation
  const validationState = useMemo(() => {
    const errors: Array<{ field: string; message: string; code: string }> = [];
    const warnings: Array<{ field: string; message: string }> = [];

    // Caption checks
    const cleanCap = sanitizePublicationText(caption);
    const captionPlaceholders = validateTextForPlaceholders(cleanCap, 'Caption');
    for (const p of captionPlaceholders) errors.push(p);

    if (currentProfile.requiresCaption && cleanCap.length === 0) {
      errors.push({ field: 'Caption', message: 'El caption es obligatorio para esta plataforma.', code: 'CAPTION_REQUIRED' });
    }
    if (cleanCap.length > currentProfile.maxCaptionLength) {
      errors.push({
        field: 'Caption',
        message: `Supera el límite de ${currentProfile.maxCaptionLength} caracteres (actual: ${cleanCap.length}).`,
        code: 'CAPTION_TOO_LONG',
      });
    }

    // Title checks (e.g. YouTube)
    const cleanTitle = sanitizePublicationText(title);
    if (currentProfile.requiresTitle && cleanTitle.length === 0) {
      errors.push({ field: 'Título', message: 'El título es obligatorio para esta plataforma.', code: 'TITLE_REQUIRED' });
    }
    if (cleanTitle) {
      const titlePlaceholders = validateTextForPlaceholders(cleanTitle, 'Título');
      for (const p of titlePlaceholders) errors.push(p);
      if (currentProfile.maxTitleLength && cleanTitle.length > currentProfile.maxTitleLength) {
        errors.push({ field: 'Título', message: `Supera el límite de ${currentProfile.maxTitleLength} caracteres.`, code: 'TITLE_TOO_LONG' });
      }
    }

    // Description checks
    const cleanDesc = sanitizePublicationText(description);
    if (cleanDesc) {
      const descPlaceholders = validateTextForPlaceholders(cleanDesc, 'Descripción');
      for (const p of descPlaceholders) errors.push(p);
    }

    // Hashtags checks
    const rawTags = hashtagsText.split(/\s+/).map((t) => t.trim()).filter(Boolean);
    const hashtagValidation = sanitizeAndValidateHashtags(rawTags, currentProfile.maxHashtags);
    for (const issue of hashtagValidation.issues) {
      if (issue.type === 'error') {
        errors.push({ field: 'Hashtags', message: issue.message, code: issue.code });
      } else {
        warnings.push({ field: 'Hashtags', message: issue.message });
      }
    }

    // Media & Render checks
    if (!currentRenderJob || currentRenderJob.status !== 'completed' || !currentRenderJob.output_storage_path) {
      errors.push({ field: 'Render', message: 'Falta render de video MP4 completado.', code: 'NO_COMPLETED_RENDER' });
    }

    const scenes = Array.isArray(currentAdaptation?.scene_mappings) ? currentAdaptation!.scene_mappings : [];
    const missingMedia = scenes.some((s) => s.status !== 'resolved' || !s.asset_id);
    if (missingMedia) {
      errors.push({ field: 'Media', message: 'Hay escenas con assets multimedia pendientes.', code: 'UNRESOLVED_MEDIA_SLOTS' });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      parsedHashtags: hashtagValidation.validHashtags,
      cleanCaption: cleanCap,
      cleanTitle,
      cleanDesc,
    };
  }, [caption, title, description, hashtagsText, currentProfile, currentRenderJob, currentAdaptation]);

  // Construct in-memory PublicationPackage as Single Source of Truth
  const publicationPackage = useMemo(() => {
    if (!currentAdaptation || !currentRenderJob) return null;

    const basePkg = buildStructuredPublicationPackage(
      currentAdaptation,
      currentRenderJob,
      'manual'
    );

    // Override with live editor state
    return {
      ...basePkg,
      caption: validationState.cleanCaption,
      title: validationState.cleanTitle || undefined,
      description: validationState.cleanDesc || undefined,
      hashtags: validationState.parsedHashtags,
      quality_gate: {
        passed: validationState.isValid,
        errors: validationState.errors.map((e) => e.message),
        warnings: validationState.warnings.map((w) => w.message),
      },
    };
  }, [currentAdaptation, currentRenderJob, validationState]);

  // Global Readiness across all supported platforms
  const globalSummary = useMemo(() => {
    return calculateGlobalPublicationReadiness(adaptations, renderJobsMap);
  }, [adaptations, renderJobsMap]);

  const isCurrentApproved = currentAdaptation?.readiness_status === 'approved';
  const isCurrentRejected = currentAdaptation?.readiness_status === 'blocked';
  const isReadyToPublish = isCurrentApproved && validationState.isValid && Boolean(currentRenderJob?.output_storage_path);

  // Character counter helper
  const renderCharCountBadge = (actual: number, max: number) => {
    const ratio = actual / max;
    let badgeColor = 'text-emerald-400';
    if (ratio > 1) badgeColor = 'text-rose-400 font-bold';
    else if (ratio >= 0.85) badgeColor = 'text-amber-400';

    return (
      <span className={`text-[11px] font-mono ${badgeColor}`}>
        {actual.toLocaleString()} / {max.toLocaleString()}
      </span>
    );
  };

  // Actions
  const handleSaveCopy = async () => {
    if (!currentAdaptation) return;
    try {
      setIsSaving(true);
      await updatePlatformAdaptation(
        currentAdaptation.id,
        {
          caption: validationState.cleanCaption,
          title: validationState.cleanTitle || null,
          hook: validationState.cleanDesc || null,
          cta: cta || null,
          hashtags: validationState.parsedHashtags,
        },
        contentItem
      );

      toast('Cambios guardados. Si la adaptación estaba aprobada, se re-evaluará su aprobación.', {
        type: 'success',
      });
      if (onAdaptationsChange) onAdaptationsChange();
    } catch (err: any) {
      toast(`Error al guardar cambios: ${err.message}`, { type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmApproval = async () => {
    if (!currentAdaptation) return;
    try {
      setIsApproving(true);
      await approvePlatformAdaptation(currentAdaptation.id, undefined, currentRenderJob);
      toast(`¡Adaptación para ${currentProfile.name} aprobada con éxito!`, { type: 'success' });
      setShowApprovalModal(false);
      if (onAdaptationsChange) onAdaptationsChange();
    } catch (err: any) {
      toast(`Error al aprobar adaptación: ${err.message}`, { type: 'error' });
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!currentAdaptation) return;
    try {
      setIsRejecting(true);
      await rejectPlatformAdaptation(currentAdaptation.id, 'Rechazado manualmente en el Editor Final');
      toast(`Adaptación para ${currentProfile.name} marcada como rechazada`, { type: 'info' });
      if (onAdaptationsChange) onAdaptationsChange();
    } catch (err: any) {
      toast(`Error al rechazar adaptación: ${err.message}`, { type: 'error' });
    } finally {
      setIsRejecting(false);
    }
  };

  const handlePrepareManualPublishing = async () => {
    if (!currentAdaptation || !currentRenderJob) return;
    try {
      setIsPublishingManual(true);
      const outbox = await prepareManualPublishing({
        adaptation: currentAdaptation,
        renderJob: currentRenderJob,
        brandName,
        campaignName: contentItem.title,
      });
      setActiveOutboxId(outbox.id);
      toast('¡Publicación manual preparada en Outbox!', { type: 'success' });
    } catch (err: any) {
      toast(`Error al preparar publicación manual: ${err.message}`, { type: 'error' });
    } finally {
      setIsPublishingManual(false);
    }
  };

  const copyFullPost = () => {
    if (!publicationPackage) return;
    const fullText = formatFullPublicationText({
      title: publicationPackage.title,
      caption: publicationPackage.caption,
      hashtags: publicationPackage.hashtags,
      description: publicationPackage.description,
      cta: cta || undefined,
    });
    navigator.clipboard.writeText(fullText);
    setCopiedField('Publicación completa');
    toast('¡Publicación completa copiada al portapapeles!', { type: 'success' });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDownloadVideo = async () => {
    if (!currentRenderJob?.output_storage_path) {
      toast('No hay video renderizado disponible para descargar.', { type: 'error' });
      return;
    }
    try {
      setIsDownloadingMedia(true);
      const signedUrl = await getMediaDownloadUrl(currentRenderJob.output_storage_path, 3600);
      const a = document.createElement('a');
      a.href = signedUrl;
      a.download = `AuraSocial_${activePlatform}_${currentAdaptation?.id.slice(0, 8)}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast('Descarga de video iniciada desde Backblaze B2', { type: 'success' });
    } catch (err: any) {
      toast(`Error al descargar video: ${err.message}`, { type: 'error' });
    } finally {
      setIsDownloadingMedia(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100 rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl">
      {/* 1. Global Multi-Platform Approval Header */}
      <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/60 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-white">Final Content Editor & Human Approval Gate</h2>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Revisión editorial, ajuste de copys específicos por canal y aprobación humana definitiva.
          </p>
        </div>

        {/* Global Summary Badges */}
        <div className="flex items-center gap-2 bg-zinc-950/80 px-3.5 py-1.5 rounded-xl border border-zinc-800 text-xs">
          <span className="text-zinc-400 font-medium mr-1">Estado Global:</span>
          <span className="text-emerald-400 font-semibold">{globalSummary.approvedCount} listas</span>
          <span className="text-zinc-600">•</span>
          <span className="text-amber-400 font-medium">{globalSummary.inReviewCount} en revisión</span>
          {globalSummary.notAdaptedCount > 0 && (
            <>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-500">{globalSummary.notAdaptedCount} sin adaptar</span>
            </>
          )}
        </div>
      </div>

      {/* 2. Platform Tabs Switcher */}
      <div className="px-6 pt-3 border-b border-zinc-800/80 bg-zinc-900/30 flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-2">
          {(['instagram', 'tiktok', 'facebook', 'linkedin', 'youtube'] as SocialPlatform[]).map((p) => {
            const statusInfo = globalSummary.platformStatuses[p === 'youtube' ? 'youtube_shorts' : p];
            const isActive = activePlatform === p;
            return (
              <button
                key={p}
                onClick={() => setActivePlatform(p)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-t-lg text-xs font-medium transition-all border-b-2 ${
                  isActive
                    ? 'border-indigo-500 text-white bg-zinc-800/50'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'
                }`}
              >
                <span className="capitalize">{p === 'youtube' ? 'YouTube Shorts' : p}</span>
                {statusInfo && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${statusInfo.badgeColor}`}>
                    {statusInfo.status === 'ready_to_publish' ? '✓ Listo' : statusInfo.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 pb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistoryModal(true)}
            className="text-xs text-zinc-400 hover:text-white gap-1.5"
          >
            <History className="w-3.5 h-3.5" />
            Historial de Outbox
          </Button>
        </div>
      </div>

      {/* 3. Main Split View: Preview (Left) vs Publication Editor (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-zinc-800/80">
        
        {/* LEFT COLUMN: Realistic Visual Preview (col-span-5) */}
        <div className="lg:col-span-5 p-6 flex flex-col items-center justify-start bg-zinc-950/60 overflow-y-auto">
          <div className="w-full max-w-sm">
            {publicationPackage ? (
              <PlatformPreviewShell
                publicationPackage={publicationPackage}
                brandName={brandName}
                avatarUrl={avatarUrl}
                onPlatformChange={setActivePlatform}
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center text-zinc-500 space-y-2">
                <AlertCircle className="w-8 h-8 text-zinc-600" />
                <p className="text-xs">No hay adaptación disponible para previsualizar.</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Live Publication Editor & Controls (col-span-7) */}
        <div className="lg:col-span-7 p-6 flex flex-col justify-between space-y-6 overflow-y-auto bg-zinc-900/20">
          
          <div className="space-y-5">
            {/* Header with platform badge & readiness state */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/70 border border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center font-bold text-xs uppercase text-indigo-400">
                  {activePlatform.slice(0, 2)}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white capitalize">
                    {activePlatform === 'youtube' ? 'YouTube Shorts' : activePlatform} Package
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    {currentProfile.dimensions.aspect_ratio} • Max {currentProfile.maxCaptionLength} car. • Max {currentProfile.maxHashtags} hashtags
                  </p>
                </div>
              </div>

              <div>
                {isCurrentApproved ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    🟢 Aprobado para Publicar
                  </span>
                ) : isCurrentRejected ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30">
                    <XCircle className="w-3.5 h-3.5" />
                    🔴 Rechazado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    <Clock className="w-3.5 h-3.5" />
                    🟡 Requiere Revisión
                  </span>
                )}
              </div>
            </div>

            {/* Editable Field: Title (For YouTube Shorts or platforms requiring title) */}
            {(currentProfile.requiresTitle || currentAdaptation?.title !== undefined) && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-300">
                    Título de la publicación {currentProfile.requiresTitle && <span className="text-rose-400">*</span>}
                  </label>
                  {currentProfile.maxTitleLength && renderCharCountBadge(title.length, currentProfile.maxTitleLength)}
                </div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: El mejor viaje de egresados 2027"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            )}

            {/* Editable Field: Caption */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-300">
                  Caption / Texto principal {currentProfile.requiresCaption && <span className="text-rose-400">*</span>}
                </label>
                {renderCharCountBadge(caption.length, currentProfile.maxCaptionLength)}
              </div>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={4}
                placeholder="Escribe el copy optimizado para este canal..."
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors resize-y leading-relaxed"
              />
            </div>

            {/* Editable Field: Hashtags */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-300">
                  Hashtags (separados por espacio o coma)
                </label>
                <span className="text-[11px] font-mono text-zinc-400">
                  {validationState.parsedHashtags.length} / {currentProfile.maxHashtags} tags
                </span>
              </div>
              <input
                type="text"
                value={hashtagsText}
                onChange={(e) => setHashtagsText(e.target.value)}
                placeholder="#Bariloche #TravelRock #Egresados"
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Editable Field: Description / Hook */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-300">
                  Descripción secundaria / Gancho narrativo
                </label>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Detalle o contexto adicional del contenido..."
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors resize-y"
              />
            </div>

            {/* Editable Field: CTA */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">
                Llamado a la acción (CTA)
              </label>
              <input
                type="text"
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                placeholder="Ej: Comentá 'BARILOCHE' para más info"
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Quality Gate Feedback Box */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-semibold text-zinc-200">Quality Gate & Text Sanitizer</span>
                </div>
                <div>
                  {validationState.isValid ? (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      ✓ Aprobado
                    </span>
                  ) : (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">
                      {validationState.errors.length} Bloqueos
                    </span>
                  )}
                </div>
              </div>

              {/* Errors */}
              {validationState.errors.length > 0 && (
                <div className="space-y-1 pt-1">
                  {validationState.errors.map((err, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-rose-300">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 mt-0.5" />
                      <span><strong>[{err.field}]</strong> {err.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Warnings */}
              {validationState.warnings.length > 0 && (
                <div className="space-y-1 pt-1">
                  {validationState.warnings.map((warn, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-amber-300">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <span><strong>[{warn.field}]</strong> {warn.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Publication Readiness Dashboard */}
            <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-2">
              <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-2">
                Publication Readiness Checklist
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <span className={validationState.cleanCaption ? 'text-emerald-400' : 'text-zinc-500'}>
                    {validationState.cleanCaption ? '✓' : '—'}
                  </span>
                  <span>Copy limpio</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <span className={currentRenderJob?.status === 'completed' ? 'text-emerald-400' : 'text-zinc-500'}>
                    {currentRenderJob?.status === 'completed' ? '✓' : '—'}
                  </span>
                  <span>Render MP4</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <span className={validationState.isValid ? 'text-emerald-400' : 'text-zinc-500'}>
                    {validationState.isValid ? '✓' : '—'}
                  </span>
                  <span>Quality Gate</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <span className={isCurrentApproved ? 'text-emerald-400' : 'text-zinc-500'}>
                    {isCurrentApproved ? '✓' : '—'}
                  </span>
                  <span>Aprobación Humana</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-300 col-span-2">
                  <span className="text-zinc-400 font-medium">Estado Final:</span>
                  {isReadyToPublish ? (
                    <span className="text-emerald-400 font-semibold">🟢 LISTO PARA PUBLICAR</span>
                  ) : (
                    <span className="text-amber-400 font-semibold">🟡 REQUIERE REVISIÓN</span>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* 4. Action Buttons Footer */}
          <div className="pt-6 border-t border-zinc-800 space-y-4">
            
            {/* Primary Editing Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSaveCopy}
                  disabled={isSaving}
                  isLoading={isSaving}
                  className="text-xs gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  Guardar Cambios
                </Button>

                {!isCurrentApproved ? (
                  <Button
                    size="sm"
                    onClick={() => setShowApprovalModal(true)}
                    disabled={!validationState.isValid}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    ✓ Aprobar para Publicar
                  </Button>
                ) : (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleReject}
                    disabled={isRejecting}
                    isLoading={isRejecting}
                    className="text-xs gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Rechazar
                  </Button>
                )}
              </div>

              {/* Clean Copy & Download Utilities */}
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={copyFullPost}
                  className="text-xs gap-1.5 bg-zinc-800 hover:bg-zinc-700"
                >
                  {copiedField === 'Publicación completa' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  Copiar Todo
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDownloadVideo}
                  disabled={isDownloadingMedia || !currentRenderJob?.output_storage_path}
                  isLoading={isDownloadingMedia}
                  className="text-xs gap-1.5 bg-zinc-800 hover:bg-zinc-700"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descargar MP4
                </Button>
              </div>
            </div>

            {/* Publishing Launch Actions */}
            {isReadyToPublish && (
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/50 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Contenido formalmente aprobado y listo para distribución</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handlePublishN8nDryRun}
                    disabled={isPublishingN8n}
                    isLoading={isPublishingN8n}
                    className="bg-purple-600 hover:bg-purple-500 text-white text-xs gap-1.5 shadow-md shadow-purple-600/20"
                    title="Orquestar publicación en modo seguro (Dry Run) mediante n8n"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    ⚡ Publicar vía n8n (Dry Run)
                  </Button>

                  <Button
                    size="sm"
                    onClick={handlePrepareManualPublishing}
                    disabled={isPublishingManual}
                    isLoading={isPublishingManual}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    📋 Preparar Manual
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => setShowMarkAsPublishedModal(true)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Marcar como Publicado
                  </Button>
                </div>
              </div>
            )}

          </div>

        </div>
      </div>

      {/* Modals */}
      {showApprovalModal && currentAdaptation && (
        <ApprovalModal
          isOpen={showApprovalModal}
          onClose={() => setShowApprovalModal(false)}
          onConfirm={handleConfirmApproval}
          adaptation={currentAdaptation}
          renderJob={currentRenderJob}
          platformName={currentProfile.name}
          isApproving={isApproving}
          validationErrors={validationState.errors}
        />
      )}

      {showMarkAsPublishedModal && currentAdaptation && (
        <MarkAsPublishedModal
          isOpen={showMarkAsPublishedModal}
          onClose={() => setShowMarkAsPublishedModal(false)}
          outboxId={activeOutboxId}
          adaptationId={currentAdaptation.id}
          platform={activePlatform}
          onSuccess={() => {
            setShowMarkAsPublishedModal(false);
            if (onAdaptationsChange) onAdaptationsChange();
          }}
        />
      )}

      {showHistoryModal && (
        <PublishingHistoryModal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          adaptationId={currentAdaptation?.id || ''}
        />
      )}
    </div>
  );
}
