import { useState, useMemo } from 'react';
import { PlatformAdaptation } from '../../types/platformAdaptation';
import { RenderJob } from '../../types/renderJob';
import { ContentItem } from '../../types/contentItem';
import { SocialPlatform } from '../../types/publishing';
import { 
  createOutboxEntry, 
  dispatchOutbox, 
  prepareManualPublishing, 
  getMediaDownloadUrl,
  buildPublishPackage 
} from '../../services/publishingOutboxService';
import { 
  validatePublishPackage, 
  validateAdaptationAndRenderForPublishing 
} from '../../services/publishingValidationService';
import { 
  sanitizePublicationText, 
  formatFullPublicationText 
} from '../../services/copySanitizerService';
import { PublishingValidationPanel } from './PublishingValidationPanel';
import { PublishingHistoryModal } from './PublishingHistoryModal';
import { PublishingConfirmationModal } from './PublishingConfirmationModal';
import { MarkAsPublishedModal } from './MarkAsPublishedModal';
import { Button } from '../common/Button';
import { useToast } from '../../hooks/useToast';
import { 
  Send, 
  Calendar, 
  Clock, 
  History, 
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Globe,
  Copy,
  Download,
  Check,
  ClipboardList,
  CheckSquare
} from 'lucide-react';

interface PublishingPackagePreviewProps {
  adaptation: PlatformAdaptation;
  renderJob?: RenderJob | null;
  contentItem: ContentItem;
  brandName?: string;
  campaignName?: string;
  onPublished?: () => void;
}

export function PublishingPackagePreview({
  adaptation,
  renderJob,
  contentItem,
  brandName = 'Marca',
  campaignName = 'Campaña',
  onPublished,
}: PublishingPackagePreviewProps) {
  const { toast } = useToast();
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [isScheduling, setIsScheduling] = useState<boolean>(false);
  const [isDownloadingMedia, setIsDownloadingMedia] = useState<boolean>(false);
  const [showScheduleInput, setShowScheduleInput] = useState<boolean>(false);
  const [scheduledDateTime, setScheduledDateTime] = useState<string>('');
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [showMarkAsPublishedModal, setShowMarkAsPublishedModal] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isManualPrepared, setIsManualPrepared] = useState<boolean>(false);
  const [activeOutboxId, setActiveOutboxId] = useState<string | undefined>(undefined);
  const [lastPublishedResult, setLastPublishedResult] = useState<{ id: string; url: string; platform: string } | null>(null);

  // Construir el paquete canónico snapshot si hay renderJob
  const publishPackage = useMemo(() => {
    if (!renderJob) return null;
    try {
      return buildPublishPackage(adaptation, renderJob, brandName, campaignName);
    } catch (e) {
      return null;
    }
  }, [adaptation, renderJob, brandName, campaignName]);

  // Ejecutar validación Quality Gate
  const validationResult = useMemo(() => {
    if (publishPackage) {
      return validatePublishPackage(publishPackage);
    }
    return validateAdaptationAndRenderForPublishing(adaptation, renderJob || null);
  }, [publishPackage, adaptation, renderJob]);

  const isRenderApproved = adaptation.readiness_status === 'approved';
  const hasCompletedRender = renderJob && renderJob.status === 'completed';
  const canPublish = validationResult.isValid && isRenderApproved && Boolean(hasCompletedRender);

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    const cleanText = sanitizePublicationText(text);
    navigator.clipboard.writeText(cleanText);
    setCopiedField(label);
    toast(`¡${label} copiado al portapapeles!`, { type: 'success' });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyFullPost = () => {
    const fullText = formatFullPublicationText({
      title: adaptation.title,
      caption: adaptation.caption,
      hashtags: adaptation.hashtags,
      description: adaptation.hook,
      cta: adaptation.cta,
    });
    navigator.clipboard.writeText(fullText);
    setCopiedField('Publicación completa');
    toast('¡Publicación completa copiada al portapapeles!', { type: 'success' });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDownloadVideo = async () => {
    if (!renderJob?.output_storage_path) {
      toast('No hay video renderizado disponible para descargar.', { type: 'error' });
      return;
    }
    try {
      setIsDownloadingMedia(true);
      const url = await getMediaDownloadUrl(renderJob.output_storage_path, 3600);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aurasocial_${adaptation.platform}_${renderJob.id.slice(0, 8)}.mp4`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast('Descarga de video MP4 iniciada.', { type: 'success' });
    } catch (err: any) {
      toast(`Error al descargar video: ${err.message}`, { type: 'error' });
    } finally {
      setIsDownloadingMedia(false);
    }
  };

  const handleDownloadThumbnail = async () => {
    const thumbPath = renderJob?.output_metadata?.thumbnail_storage_path;
    if (!thumbPath) {
      toast('No hay thumbnail disponible para descargar.', { type: 'error' });
      return;
    }
    try {
      setIsDownloadingMedia(true);
      const url = await getMediaDownloadUrl(thumbPath, 3600);
      const a = document.createElement('a');
      a.href = url;
      a.download = `thumbnail_${adaptation.platform}_${renderJob?.id.slice(0, 8)}.jpg`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast('Descarga de thumbnail JPG iniciada.', { type: 'success' });
    } catch (err: any) {
      toast(`Error al descargar thumbnail: ${err.message}`, { type: 'error' });
    } finally {
      setIsDownloadingMedia(false);
    }
  };

  const handleOpenConfirm = () => {
    if (!canPublish) {
      toast('Por favor completa todos los requisitos de calidad y aprobación antes de publicar.', { type: 'error' });
      return;
    }
    setShowConfirmModal(true);
  };

  const handleExecutePublish = async (mode: 'manual' | 'mock' | 'real') => {
    if (!renderJob || !canPublish) return;

    try {
      setIsPublishing(true);

      if (mode === 'manual') {
        const outbox = await prepareManualPublishing({
          adaptation,
          renderJob,
          brandName,
          campaignName,
        });

        setActiveOutboxId(outbox.id);
        setIsManualPrepared(true);
        setShowConfirmModal(false);
        toast('¡Publicación manual preparada con éxito! Podés copiar y descargar todo el material.', { type: 'success' });
      } else {
        // Modo Automático (Mock o Real)
        const isMock = mode === 'mock';
        const outbox = await createOutboxEntry({
          adaptation,
          renderJob,
          publicationMethod: 'automatic',
          brandName,
          campaignName,
        });

        const dispatched = await dispatchOutbox(outbox.id, { forceMock: isMock });

        setShowConfirmModal(false);
        setLastPublishedResult({
          id: dispatched.external_post_id || (isMock ? 'mock_post' : 'meta_post'),
          url: dispatched.external_post_url || '',
          platform: adaptation.platform,
        });

        if (isMock) {
          toast(`¡Publicado en modo Simulado (Mock) para ${adaptation.platform.toUpperCase()}!`, { type: 'success' });
        } else {
          toast(`¡Publicación real enviada a ${adaptation.platform.toUpperCase()} con éxito!`, { type: 'success' });
        }
      }

      if (onPublished) onPublished();
    } catch (err: any) {
      console.error('Error al procesar publicación:', err);
      toast(`Error: ${err.message}`, { type: 'error' });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSchedulePublish = async () => {
    if (!renderJob || !canPublish || !scheduledDateTime) {
      toast('Por favor selecciona una fecha y hora válida para programar.', { type: 'error' });
      return;
    }

    try {
      setIsScheduling(true);
      const outbox = await createOutboxEntry({
        adaptation,
        renderJob,
        publicationMethod: 'automatic',
        brandName,
        campaignName,
        scheduledAt: new Date(scheduledDateTime).toISOString(),
      });

      toast(`Publicación programada para el ${new Date(scheduledDateTime).toLocaleString()} (Zona Horaria: America/Argentina/Buenos_Aires)`, { type: 'success' });
      setShowScheduleInput(false);
      if (onPublished) onPublished();
      setShowHistoryModal(true);
      return outbox;
    } catch (err: any) {
      toast(`Error al programar: ${err.message}`, { type: 'error' });
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <div className="space-y-4 p-5 rounded-3xl bg-dark-950 border border-dark-800 shadow-xl">
      
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-dark-800">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Send className="w-4 h-4 text-purple-400" />
            Preparar Publicación ({adaptation.platform.toUpperCase()})
          </h3>
          <p className="text-[11px] text-slate-400">
            Revisión de paquete de publicación, Quality Gate, copia y descargas
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowHistoryModal(true)}
          leftIcon={<History className="w-3.5 h-3.5 text-slate-400" />}
          className="text-xs border-dark-700 text-slate-300"
        >
          Historial de Outbox
        </Button>
      </div>

      {/* Manual Prepared Success Banner */}
      {isManualPrepared && (
        <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-wider">
                  ✅ Publicación Manual Preparada
                </p>
                <p className="text-[11px] text-purple-200/90">
                  Todo está listo para publicar manualmente en {adaptation.platform.toUpperCase()}.
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowMarkAsPublishedModal(true)}
              leftIcon={<CheckSquare className="w-3.5 h-3.5" />}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md"
            >
              Marcar como Publicado
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 pt-1 border-t border-purple-500/20">
            <button
              onClick={copyFullPost}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-semibold"
            >
              {copiedField === 'Publicación completa' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              Copiar Todo
            </button>
            <button
              onClick={handleDownloadVideo}
              disabled={isDownloadingMedia}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-900 border border-dark-700 hover:border-purple-500 text-slate-200 text-xs font-semibold"
            >
              <Download className="w-3.5 h-3.5 text-purple-400" />
              Descargar Video MP4
            </button>
            {renderJob?.output_metadata?.thumbnail_storage_path && (
              <button
                onClick={handleDownloadThumbnail}
                disabled={isDownloadingMedia}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-900 border border-dark-700 hover:border-purple-500 text-slate-200 text-xs font-semibold"
              >
                <Download className="w-3.5 h-3.5 text-purple-400" />
                Descargar Thumbnail
              </button>
            )}
          </div>
        </div>
      )}

      {/* Automatic Mock Result Banner */}
      {lastPublishedResult && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ✓ Publicación simulada correctamente en {lastPublishedResult.platform.toUpperCase()}
            </span>
            <button
              onClick={() => setLastPublishedResult(null)}
              className="text-slate-400 hover:text-white text-[11px]"
            >
              Cerrar
            </button>
          </div>
          <div className="p-3 rounded-xl bg-dark-950 border border-emerald-900/50 text-[11px] font-mono flex items-center justify-between flex-wrap gap-2">
            <span className="text-slate-300">ID: {lastPublishedResult.id}</span>
            {lastPublishedResult.url && (
              <a
                href={lastPublishedResult.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:underline flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Ver Enlace Mock</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Section 📋 PUBLICACIÓN LISTA */}
      <div className="p-4 rounded-2xl bg-dark-900 border border-dark-800 space-y-3.5">
        <div className="flex items-center justify-between text-xs flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <ClipboardList className="w-4 h-4 text-purple-400" />
              Publicación Lista
            </span>
            <span className="text-[10px] text-slate-500 font-mono uppercase">
              {adaptation.platform} • {adaptation.dimensions?.aspect_ratio || '9:16'}
            </span>
          </div>

          {/* Quick Copy Whole Post Button */}
          <button
            onClick={copyFullPost}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 text-xs font-bold text-purple-300 transition-all"
          >
            {copiedField === 'Publicación completa' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copiar Publicación Completa</span>
          </button>
        </div>

        {/* Clean Structured Copy Box */}
        <div className="p-4 rounded-xl bg-dark-950 border border-dark-800/80 space-y-3 text-xs">
          {/* Title */}
          {adaptation.title && (
            <div className="flex items-start justify-between gap-2 pb-2 border-b border-dark-800/60">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Título</span>
                <p className="font-bold text-white text-sm">{adaptation.title}</p>
              </div>
              <button
                onClick={() => copyToClipboard(adaptation.title || '', 'Título')}
                className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
              >
                <Copy className="w-3 h-3" />
                Copiar
              </button>
            </div>
          )}

          {/* Caption */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[10px] uppercase font-bold text-slate-500">Caption</span>
              <button
                onClick={() => copyToClipboard(adaptation.caption || '', 'Caption')}
                className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
              >
                <Copy className="w-3 h-3" />
                Copiar
              </button>
            </div>
            <p className="text-slate-200 whitespace-pre-line leading-relaxed text-xs">
              {adaptation.caption || 'Sin texto de caption'}
            </p>
          </div>

          {/* Hashtags */}
          {adaptation.hashtags && adaptation.hashtags.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-dark-800/60">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[10px] uppercase font-bold text-slate-500">
                  Hashtags ({adaptation.hashtags.length})
                </span>
                <button
                  onClick={() => copyToClipboard(
                    (adaptation.hashtags || []).map(h => h.startsWith('#') ? h : `#${h}`).join(' '),
                    'Hashtags'
                  )}
                  className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
                >
                  <Copy className="w-3 h-3" />
                  Copiar
                </button>
              </div>
              <p className="text-purple-400 font-mono text-xs">
                {adaptation.hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ')}
              </p>
            </div>
          )}

          {/* CTA */}
          {adaptation.cta && (
            <div className="flex items-center justify-between pt-2 border-t border-dark-800/60 text-xs">
              <span className="text-emerald-300 font-medium">CTA: {adaptation.cta}</span>
              <button
                onClick={() => copyToClipboard(adaptation.cta || '', 'CTA')}
                className="text-emerald-400 hover:text-emerald-200 flex items-center gap-1 text-[11px]"
              >
                <Copy className="w-3 h-3" />
                Copiar
              </button>
            </div>
          )}
        </div>

        {/* Media Downloads Toolbar */}
        {hasCompletedRender && (
          <div className="flex items-center gap-2 pt-2 border-t border-dark-800 flex-wrap">
            <span className="text-xs text-slate-400 font-semibold">Descargar multimedia:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadVideo}
              disabled={isDownloadingMedia}
              leftIcon={<Download className="w-3.5 h-3.5 text-purple-400" />}
              className="text-xs border-dark-700 text-slate-200"
            >
              Descargar Video MP4
            </Button>
            {renderJob?.output_metadata?.thumbnail_storage_path && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadThumbnail}
                disabled={isDownloadingMedia}
                leftIcon={<Download className="w-3.5 h-3.5 text-purple-400" />}
                className="text-xs border-dark-700 text-slate-200"
              >
                Descargar Thumbnail
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Validation Quality Gate Panel */}
      <PublishingValidationPanel
        validationResult={validationResult}
        isRenderApproved={isRenderApproved}
        hasCompletedRender={Boolean(hasCompletedRender)}
      />

      {/* Schedule Input (if toggled) */}
      {showScheduleInput && (
        <div className="p-4 rounded-2xl bg-dark-900 border border-dark-700 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between text-xs">
            <label className="font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              Programar Fecha y Hora de Publicación
            </label>
            <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
              <Globe className="w-3 h-3 text-slate-500" />
              Zona: America/Argentina/Buenos_Aires
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="datetime-local"
              value={scheduledDateTime}
              onChange={(e) => setScheduledDateTime(e.target.value)}
              className="bg-dark-950 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
            />
            <Button
              variant="primary"
              size="sm"
              isLoading={isScheduling}
              onClick={handleSchedulePublish}
              leftIcon={<Clock className="w-3.5 h-3.5" />}
              className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold"
            >
              Confirmar Programación
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowScheduleInput(false)}
              className="text-xs text-slate-400"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Action Buttons Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-dark-800">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>Canal: <strong className="text-white uppercase font-mono">{adaptation.platform}</strong></span>
        </div>

        <div className="flex items-center gap-2">
          {!showScheduleInput && (
            <Button
              variant="outline"
              size="sm"
              disabled={!canPublish || isPublishing}
              onClick={() => setShowScheduleInput(true)}
              leftIcon={<Calendar className="w-3.5 h-3.5 text-amber-400" />}
              className="text-xs border-dark-700 text-slate-300 hover:border-amber-500/50 hover:bg-amber-500/10 font-semibold disabled:opacity-50"
            >
              Programar
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            disabled={!canPublish || isPublishing}
            isLoading={isPublishing}
            onClick={handleOpenConfirm}
            leftIcon={<Send className="w-3.5 h-3.5" />}
            className="text-xs bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-purple-950/40 disabled:opacity-50"
          >
            Publicar
          </Button>
        </div>
      </div>

      {/* Confirmation & Method Selection Modal */}
      <PublishingConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleExecutePublish}
        platforms={[adaptation.platform as SocialPlatform]}
        contentTitle={contentItem.title || 'Contenido'}
        renderJobId={renderJob?.id}
        isPublishing={isPublishing}
      />

      {/* Mark As Published Modal */}
      <MarkAsPublishedModal
        isOpen={showMarkAsPublishedModal}
        onClose={() => setShowMarkAsPublishedModal(false)}
        outboxId={activeOutboxId}
        adaptationId={adaptation.id}
        renderJobId={renderJob?.id}
        platform={adaptation.platform}
        contentTitle={contentItem.title || 'Contenido'}
        onSuccess={() => {
          setIsManualPrepared(false);
          if (onPublished) onPublished();
        }}
      />

      {/* History Modal */}
      <PublishingHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        adaptationId={adaptation.id}
      />
    </div>
  );
}
