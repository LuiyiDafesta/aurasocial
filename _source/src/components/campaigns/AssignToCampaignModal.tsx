import { useState, useEffect } from 'react';
import { Campaign } from '../../types/campaign';
import { getCampaigns } from '../../services/campaignService';
import { 
  assignIdeaToCampaign, 
  assignContentToCampaign 
} from '../../services/campaignOrganizationService';
import { Button } from '../common/Button';
import { useToast } from '../../hooks/useToast';
import { 
  FolderTree, 
  X, 
  Target, 
  Check, 
  AlertTriangle, 
  Loader2,
  Sparkles
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface AssignToCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'idea' | 'content';
  entityId: string;
  entityTitle: string;
  brandId: string;
  currentCampaignId?: string | null;
  onAssigned: () => void;
}

export function AssignToCampaignModal({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityTitle,
  brandId,
  currentCampaignId,
  onAssigned,
}: AssignToCampaignModalProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    currentCampaignId || null
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && brandId) {
      setIsLoading(true);
      setSelectedCampaignId(currentCampaignId || null);

      getCampaigns({ brandId })
        .then((res) => {
          setCampaigns(res.campaigns);
        })
        .catch((err) => {
          console.error('Error al cargar campañas:', err);
          toast('Error al cargar campañas', { type: 'error', description: err.message });
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, brandId, currentCampaignId, toast]);

  const currentCampaign = campaigns.find((c) => c.id === currentCampaignId);
  const targetCampaign = campaigns.find((c) => c.id === selectedCampaignId);

  const isChanging = selectedCampaignId !== (currentCampaignId || null);

  const handleConfirm = async () => {
    if (!entityId || isSubmitting) return;

    try {
      setIsSubmitting(true);
      if (entityType === 'idea') {
        await assignIdeaToCampaign(entityId, selectedCampaignId as string);
      } else {
        await assignContentToCampaign(entityId, selectedCampaignId as string);
      }

      if (selectedCampaignId) {
        toast(`Asignado a "${targetCampaign?.name}" con éxito`, { type: 'success' });
      } else {
        toast(`Elemento desvinculado (ahora es Evergreen)`, { type: 'info' });
      }

      onAssigned();
      onClose();
    } catch (err: any) {
      console.error('Error al cambiar campaña:', err);
      toast('Error al organizar campaña', { type: 'error', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-dark-900 border border-dark-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-800 bg-dark-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-aura-500/10 border border-aura-500/25 flex items-center justify-center text-aura-400">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Organizar en Campaña
              </h2>
              <p className="text-xs text-slate-400">
                {entityType === 'idea' ? 'Idea Estratégica' : 'Pieza de Contenido'}
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

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Entity Name Box */}
          <div className="p-3.5 rounded-2xl bg-dark-950/70 border border-dark-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Elemento a organizar
            </span>
            <p className="text-xs font-semibold text-white truncate">
              {entityTitle}
            </p>
          </div>

          {/* Warning / Confirmation of Move */}
          {isChanging && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1.5 animate-in fade-in duration-200">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Confirmación de movimiento</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-200">
                {currentCampaignId && selectedCampaignId
                  ? `Se moverá de "${currentCampaign?.name}" a "${targetCampaign?.name}".`
                  : currentCampaignId && !selectedCampaignId
                  ? `Se quitará de "${currentCampaign?.name}" y quedará como Estrategia Abierta (Evergreen).`
                  : `Se asignará a "${targetCampaign?.name}".`}
              </p>
            </div>
          )}

          {/* Campaign Selection List */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Seleccionar Campaña Destino
            </span>

            {isLoading ? (
              <div className="p-6 flex flex-col items-center justify-center space-y-2">
                <Loader2 className="w-5 h-5 text-aura-500 animate-spin" />
                <p className="text-xs text-slate-400">Cargando campañas...</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {/* Evergreen Option */}
                <div
                  onClick={() => setSelectedCampaignId(null)}
                  className={cn(
                    "p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-xs",
                    selectedCampaignId === null
                      ? "bg-aura-500/10 border-aura-500/40 text-white font-semibold"
                      : "bg-dark-950/60 border-dark-800/80 hover:border-dark-700 text-slate-300"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-slate-400" />
                    <div>
                      <span>Estrategia Abierta / Evergreen</span>
                      <span className="block text-[10px] text-slate-400 font-normal">
                        Sin campaña asociada
                      </span>
                    </div>
                  </div>

                  {selectedCampaignId === null && (
                    <Check className="w-4 h-4 text-aura-400" />
                  )}
                </div>

                {/* Campaigns List */}
                {campaigns.map((camp) => {
                  const isSelected = selectedCampaignId === camp.id;

                  return (
                    <div
                      key={camp.id}
                      onClick={() => setSelectedCampaignId(camp.id)}
                      className={cn(
                        "p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-xs",
                        isSelected
                          ? "bg-aura-500/10 border-aura-500/40 text-white font-semibold"
                          : "bg-dark-950/60 border-dark-800/80 hover:border-dark-700 text-slate-300"
                      )}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Target className="w-4 h-4 text-aura-400 shrink-0" />
                        <div className="truncate">
                          <span className="truncate block">{camp.name}</span>
                          <span className="block text-[10px] text-slate-400 font-mono font-normal">
                            /{camp.slug}
                          </span>
                        </div>
                      </div>

                      {isSelected && (
                        <Check className="w-4 h-4 text-aura-400 shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-dark-800 bg-dark-900/90 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose} className="text-xs">
            Cancelar
          </Button>

          <Button
            variant="primary"
            onClick={handleConfirm}
            isLoading={isSubmitting}
            disabled={!isChanging}
            className="text-xs bg-aura-600 hover:bg-aura-500 text-white font-semibold"
          >
            Guardar Cambios
          </Button>
        </div>

      </div>
    </div>
  );
}
