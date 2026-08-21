import { useState, useEffect, useCallback } from 'react';
import { Campaign } from '../../types/campaign';
import { ContentIdea } from '../../types/contentIdea';
import { 
  getAvailableIdeasForCampaign, 
  bulkAssignIdeasToCampaign 
} from '../../services/campaignOrganizationService';
import { Button } from '../common/Button';
import { useToast } from '../../hooks/useToast';
import { 
  Plus, 
  Search, 
  X, 
  Layers, 
  Check, 
  AlertTriangle, 
  Loader2,
  FolderPlus
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface AddIdeaToCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign;
  onIdeasAssigned: () => void;
}

export function AddIdeaToCampaignModal({
  isOpen,
  onClose,
  campaign,
  onIdeasAssigned,
}: AddIdeaToCampaignModalProps) {
  const [ideas, setIdeas] = useState<(ContentIdea & { campaigns?: { id: string; name: string } | null })[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedPillar, setSelectedPillar] = useState<string>('all');
  const [selectedFormat, setSelectedFormat] = useState<string>('all');
  const [page] = useState<number>(1);

  // Selección múltiple
  const [selectedIdeaIds, setSelectedIdeaIds] = useState<string[]>([]);

  const { toast } = useToast();

  const loadIdeas = useCallback(async () => {
    if (!campaign.brand_id) return;

    try {
      setIsLoading(true);
      const res = await getAvailableIdeasForCampaign({
        brandId: campaign.brand_id,
        excludeCampaignId: campaign.id,
        search: searchTerm,
        pillar: selectedPillar,
        format: selectedFormat,
        page,
        limit: 20,
      });

      setIdeas(res.data);
      setTotal(res.total);
    } catch (err: any) {
      console.error('Error al cargar ideas disponibles:', err);
      toast('Error al cargar ideas disponibles', { type: 'error', description: err.message });
    } finally {
      setIsLoading(false);
    }
  }, [campaign.brand_id, campaign.id, searchTerm, selectedPillar, selectedFormat, page, toast]);

  useEffect(() => {
    if (isOpen) {
      loadIdeas();
      setSelectedIdeaIds([]);
    }
  }, [isOpen, loadIdeas]);

  const toggleSelectIdea = (id: string) => {
    setSelectedIdeaIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllOnPage = () => {
    const pageIds = ideas.map((i) => i.id);
    const allSelected = pageIds.every((id) => selectedIdeaIds.includes(id));

    if (allSelected) {
      setSelectedIdeaIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIdeaIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleConfirmAssign = async () => {
    if (selectedIdeaIds.length === 0 || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await bulkAssignIdeasToCampaign(selectedIdeaIds, campaign.id);
      toast(`${selectedIdeaIds.length} ${selectedIdeaIds.length === 1 ? 'idea agregada' : 'ideas agregadas'} a la campaña`, {
        type: 'success',
      });
      onIdeasAssigned();
      onClose();
    } catch (err: any) {
      console.error('Error al asignar ideas a campaña:', err);
      toast('Error al asignar ideas', { type: 'error', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const countWithOtherCampaign = ideas.filter(
    (i) => selectedIdeaIds.includes(i.id) && i.campaign_id && i.campaign_id !== campaign.id
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-dark-900 border border-dark-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-800 bg-dark-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-aura-500/10 border border-aura-500/25 flex items-center justify-center text-aura-400">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Agregar Ideas a la Campaña
              </h2>
              <p className="text-xs text-slate-400">
                Asignando a: <strong className="text-aura-300 font-semibold">{campaign.name}</strong>
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

        {/* Filter Bar */}
        <div className="p-4 bg-dark-950/70 border-b border-dark-800 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por título, concepto o hook..."
              className="w-full bg-dark-900 border border-dark-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-aura-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedPillar}
              onChange={(e) => setSelectedPillar(e.target.value)}
              className="bg-dark-900 border border-dark-700 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-aura-500"
            >
              <option value="all">Todos los Pilares</option>
              <option value="Aventura">Aventura</option>
              <option value="Comunidad">Comunidad</option>
              <option value="Experiencias">Experiencias</option>
              <option value="Educativo">Educativo</option>
            </select>

            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              className="bg-dark-900 border border-dark-700 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-aura-500"
            >
              <option value="all">Todos los Formatos</option>
              <option value="Reel">Reel / Video Vertical</option>
              <option value="Carrusel">Carrusel</option>
              <option value="Post">Post Estático</option>
              <option value="Story">Historia</option>
            </select>

            {ideas.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAllOnPage}
                className="text-xs text-slate-300 h-8"
              >
                {ideas.every((i) => selectedIdeaIds.includes(i.id))
                  ? 'Deseleccionar todo'
                  : 'Seleccionar página'}
              </Button>
            )}
          </div>
        </div>

        {/* Warning if moving ideas from other campaigns */}
        {countWithOtherCampaign > 0 && (
          <div className="px-6 py-3 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              {countWithOtherCampaign} de las ideas seleccionadas ya pertenecen a otra campaña. Al confirmar, se moverán a <strong>{campaign.name}</strong>.
            </span>
          </div>
        )}

        {/* Ideas List Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-7 h-7 text-aura-500 animate-spin" />
              <p className="text-xs text-slate-400">Consultando ideas disponibles...</p>
            </div>
          ) : ideas.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-dark-950/50 border border-dark-800 space-y-2">
              <Layers className="w-8 h-8 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-white">No se encontraron ideas</h4>
              <p className="text-xs text-slate-400">
                Todas las ideas de la marca ya pertenecen a esta campaña o no coinciden con los filtros aplicados.
              </p>
            </div>
          ) : (
            ideas.map((idea) => {
              const isSelected = selectedIdeaIds.includes(idea.id);
              const otherCampaignName = idea.campaigns?.name;

              return (
                <div
                  key={idea.id}
                  onClick={() => toggleSelectIdea(idea.id)}
                  className={cn(
                    "p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5",
                    isSelected
                      ? "bg-aura-500/10 border-aura-500/40 shadow-md shadow-aura-950/20"
                      : "bg-dark-950/70 border-dark-800/80 hover:border-dark-700"
                  )}
                >
                  {/* Custom Checkbox */}
                  <div
                    className={cn(
                      "w-5 h-5 rounded-lg border flex items-center justify-center transition-colors shrink-0 mt-0.5",
                      isSelected
                        ? "bg-aura-500 border-aura-400 text-dark-950"
                        : "border-dark-700 bg-dark-900"
                    )}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>

                  {/* Idea Details */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold text-white truncate">
                        {idea.title}
                      </h4>

                      {idea.pillar && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-dark-900 border border-dark-800 text-slate-300">
                          {idea.pillar}
                        </span>
                      )}

                      {idea.format && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-aura-500/10 text-aura-300 border border-aura-500/20">
                          {idea.format}
                        </span>
                      )}

                      {otherCampaignName && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          En: {otherCampaignName}
                        </span>
                      )}

                      {!idea.campaign_id && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                          Evergreen
                        </span>
                      )}
                    </div>

                    {idea.hook && (
                      <p className="text-[11px] text-slate-300 italic line-clamp-1">
                        "{idea.hook}"
                      </p>
                    )}

                    {idea.concept && (
                      <p className="text-[11px] text-slate-400 line-clamp-1">
                        {idea.concept}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer with Bulk Actions */}
        <div className="p-4 border-t border-dark-800 bg-dark-900/90 flex items-center justify-between gap-4">
          <span className="text-xs text-slate-400">
            {selectedIdeaIds.length} {selectedIdeaIds.length === 1 ? 'idea seleccionada' : 'ideas seleccionadas'} de {total}
          </span>

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose} className="text-xs">
              Cancelar
            </Button>

            <Button
              variant="primary"
              onClick={handleConfirmAssign}
              isLoading={isSubmitting}
              disabled={selectedIdeaIds.length === 0}
              leftIcon={<Plus className="w-4 h-4" />}
              className="text-xs bg-aura-600 hover:bg-aura-500 text-white font-semibold"
            >
              {selectedIdeaIds.length > 0
                ? `Agregar ${selectedIdeaIds.length} ${selectedIdeaIds.length === 1 ? 'idea' : 'ideas'} a la campaña`
                : 'Seleccionar ideas'}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
