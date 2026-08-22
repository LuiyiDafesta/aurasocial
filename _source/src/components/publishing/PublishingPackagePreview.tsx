import { useState, useMemo } from 'react';
import { PlatformAdaptation } from '../../types/platformAdaptation';
import { RenderJob } from '../../types/renderJob';
import { ContentItem } from '../../types/contentItem';
import { 
  createOutboxEntry, 
  dispatchOutbox 
} from '../../services/publishingOutboxService';
import { 
  validatePublishPackage, 
  validateAdaptationAndRenderForPublishing 
} from '../../services/publishingValidationService';
import { buildPublishPackage } from '../../services/publishingOutboxService';
import { PublishingValidationPanel } from './PublishingValidationPanel';
import { PublishingHistoryModal } from './PublishingHistoryModal';
import { Button } from '../common/Button';
import { useToast } from '../../hooks/useToast';
import { 
  Send, 
  Calendar, 
  Clock, 
  History, 
  Sparkles 
} from 'lucide-react';

interface PublishingPackagePreviewProps {
  adaptation: PlatformAdaptation;
  renderJob: RenderJob | null;
  contentItem: ContentItem;
  onPublished?: () => void;
}

export function PublishingPackagePreview({
  adaptation,
  renderJob,
  contentItem,
  onPublished,
}: PublishingPackagePreviewProps) {
  const { toast } = useToast();
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [isScheduling, setIsScheduling] = useState<boolean>(false);
  const [scheduledDateTime, setScheduledDateTime] = useState<string>('');
  const [showScheduleInput, setShowScheduleInput] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  const brandName = contentItem.brands?.name || 'Aura';
  const campaignName = contentItem.campaigns?.name;

  // Construir PublishPackage snapshot previo para validación
  const previewPackage = useMemo(() => {
    if (!renderJob) return null;
    return buildPublishPackage(adaptation, renderJob, brandName, campaignName);
  }, [adaptation, renderJob, brandName, campaignName]);

  // Validaciones
  const validationResult = useMemo(() => {
    if (!renderJob) {
      return validateAdaptationAndRenderForPublishing(adaptation, null);
    }
    return validatePublishPackage(previewPackage!);
  }, [adaptation, renderJob, previewPackage]);

  const isRenderApproved = adaptation.readiness_status === 'approved';
  const hasCompletedRender = renderJob?.status === 'completed';
  const canPublish = validationResult.isValid && isRenderApproved && hasCompletedRender;

  const handlePublishNow = async () => {
    if (!renderJob || !canPublish) return;

    try {
      setIsPublishing(true);
      const outbox = await createOutboxEntry({
        adaptation,
        renderJob,
        brandName,
        campaignName,
      });

      const dispatched = await dispatchOutbox(outbox.id);
      toast(`¡Publicado en modo Mock para ${adaptation.platform.toUpperCase()}!`, { type: 'success' });

      if (onPublished) onPublished();
      setShowHistoryModal(true);
      return dispatched;
    } catch (err: any) {
      console.error('Error al publicar:', err);
      toast(`Error al publicar: ${err.message}`, { type: 'error' });
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
        brandName,
        campaignName,
        scheduledAt: new Date(scheduledDateTime).toISOString(),
      });

      toast(`Publicación programada para el ${new Date(scheduledDateTime).toLocaleString()}`, { type: 'success' });
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
    <div className="space-y-4 p-5 rounded-2xl bg-dark-950 border border-dark-800 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Send className="w-4 h-4 text-purple-400" />
            Despacho a Canales Sociales (Fase 9E Outbox)
          </h3>
          <p className="text-[11px] text-slate-400">
            Publicación simulada con costo $0.00 USD. No se envían datos a APIs externas.
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

      {/* Validation Panel */}
      <PublishingValidationPanel
        validationResult={validationResult}
        isRenderApproved={isRenderApproved}
        hasCompletedRender={Boolean(hasCompletedRender)}
      />

      {/* Schedule Input (if toggled) */}
      {showScheduleInput && (
        <div className="p-4 rounded-xl bg-dark-900 border border-dark-700 space-y-3 animate-in fade-in">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            Programar Fecha y Hora de Publicación
          </label>
          <div className="flex items-center gap-2">
            <input
              type="datetime-local"
              value={scheduledDateTime}
              onChange={(e) => setScheduledDateTime(e.target.value)}
              className="bg-dark-950 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-aura-500 font-mono"
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
          <Sparkles className="w-3.5 h-3.5 text-aura-400" />
          <span>Destino: <strong className="text-white uppercase font-mono">{adaptation.platform}</strong></span>
        </div>

        <div className="flex items-center gap-2">
          {!showScheduleInput && (
            <Button
              variant="outline"
              size="sm"
              disabled={!canPublish}
              onClick={() => setShowScheduleInput(true)}
              leftIcon={<Calendar className="w-3.5 h-3.5 text-amber-400" />}
              className="text-xs border-dark-700 text-slate-300 hover:border-amber-500/50"
            >
              Programar
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            disabled={!canPublish}
            isLoading={isPublishing}
            onClick={handlePublishNow}
            leftIcon={<Send className="w-4 h-4" />}
            className={`text-xs font-bold text-white shadow-lg ${
              canPublish
                ? 'bg-gradient-to-r from-purple-600 to-aura-600 hover:from-purple-500 hover:to-aura-500'
                : 'bg-dark-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            Publicar Ahora (Mock)
          </Button>
        </div>
      </div>

      {/* Modal de Historial */}
      {showHistoryModal && (
        <PublishingHistoryModal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          adaptationId={adaptation.id}
        />
      )}
    </div>
  );
}
