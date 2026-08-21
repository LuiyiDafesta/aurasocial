import { useState, useEffect } from 'react';
import { Brand } from '../types/database';
import { Campaign, CampaignStatus } from '../types/campaign';
import { useCampaigns } from '../hooks/useCampaigns';
import { CampaignCard } from '../components/campaigns/CampaignCard';
import { CampaignFormModal } from '../components/campaigns/CampaignFormModal';
import { CampaignWorkspace } from './CampaignWorkspace';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { 
  Target, 
  Plus, 
  Search, 
  Sparkles, 
  Loader2, 
  FolderPlus,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { cn } from '../lib/utils';

interface CampaignsPageProps {
  workspaceId?: string;
  brands?: Brand[];
  currentBrand?: Brand | null;
  onSelectBrand?: (brandId: string) => void;
  onRefreshBrands?: () => void;
  onEditBrand?: (brand: Brand) => void;
  isSwitchingBrand?: boolean;
}

export function CampaignsPage({
  workspaceId,
  currentBrand,
  onEditBrand,
}: CampaignsPageProps) {
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [campaignToEdit, setCampaignToEdit] = useState<Campaign | null>(null);

  const {
    campaigns,
    statusFilter,
    searchQuery,
    isLoading,
    error,
    setStatusFilter,
    setSearchQuery,
    refreshCampaigns,
  } = useCampaigns(currentBrand?.id);

  // Cerrar / resetear campaña activa si el usuario cambia de marca global
  useEffect(() => {
    if (selectedCampaign && selectedCampaign.brand_id !== currentBrand?.id) {
      setSelectedCampaign(null);
    }
  }, [currentBrand?.id, selectedCampaign]);

  // Si no hay marca seleccionada
  if (!currentBrand) {
    return (
      <div className="bg-dark-900/60 border border-dark-800 rounded-3xl p-12 text-center space-y-4 max-w-lg mx-auto my-12">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
          <Target className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white">Selecciona una marca para ver sus campañas</h3>
        <p className="text-xs text-slate-400">
          Las campañas están estrictamente vinculadas al Brand Brain de cada marca activa.
        </p>
      </div>
    );
  }

  // Si hay una campaña abierta, renderizar el CampaignWorkspace
  if (selectedCampaign) {
    return (
      <CampaignWorkspace
        campaign={selectedCampaign}
        currentBrand={currentBrand}
        onBack={() => {
          setSelectedCampaign(null);
          refreshCampaigns();
        }}
        onCampaignUpdated={(updated) => {
          setSelectedCampaign(updated);
          refreshCampaigns();
        }}
        onEditBrand={onEditBrand}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-dark-900/90 border border-dark-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-aura-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-aura-400 bg-aura-500/10 px-2.5 py-0.5 rounded-full border border-aura-500/20">
              <Sparkles className="w-3 h-3" />
              Campaign Studio · Fase 8
            </span>
            <span className="text-xs text-slate-400 bg-dark-950 px-2.5 py-0.5 rounded-md border border-dark-800">
              {currentBrand.name}
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Target className="w-6 h-6 text-aura-400" />
            <span>Campañas Estratégicas</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-xl">
            Espacios de trabajo estratégicos que unifican sesiones creativas, ideas y contenidos multicanal para cumplir objetivos de negocio.
          </p>
        </div>

        <div className="flex items-center gap-2.5 z-10">
          <Button
            variant="outline"
            onClick={() => refreshCampaigns()}
            disabled={isLoading}
            className="text-xs bg-dark-950/60 hover:bg-dark-800"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", isLoading && "animate-spin")} />
            Actualizar
          </Button>

          <Button
            onClick={() => {
              setCampaignToEdit(null);
              setIsCreateModalOpen(true);
            }}
            className="text-xs bg-gradient-to-r from-aura-500 to-indigo-600 hover:from-aura-600 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-aura-500/20"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nueva Campaña
          </Button>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-dark-900/60 border border-dark-800 p-3 rounded-2xl">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {[
            { id: 'all' as CampaignStatus | 'all', label: 'Todas' },
            { id: 'active' as CampaignStatus | 'all', label: 'Activas' },
            { id: 'draft' as CampaignStatus | 'all', label: 'Borradores' },
            { id: 'paused' as CampaignStatus | 'all', label: 'Pausadas' },
            { id: 'completed' as CampaignStatus | 'all', label: 'Completadas' },
            { id: 'archived' as CampaignStatus | 'all', label: 'Archivadas' },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0",
                  isActive
                    ? "bg-aura-500 text-white shadow-md shadow-aura-500/10"
                    : "text-slate-400 hover:text-white hover:bg-dark-800"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre u objetivo..."
            className="pl-9 bg-dark-950/80 border-dark-700 text-xs h-9"
          />
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid or Empty States */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-aura-400" />
          <span className="text-xs font-medium">Cargando campañas de {currentBrand.name}...</span>
        </div>
      ) : campaigns.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onSelect={(c) => setSelectedCampaign(c)}
              onEdit={(c) => {
                setCampaignToEdit(c);
                setIsCreateModalOpen(true);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="bg-dark-900/60 border border-dark-800 rounded-3xl p-12 text-center space-y-4 max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-aura-500/10 border border-aura-500/20 flex items-center justify-center text-aura-400 mx-auto">
            <FolderPlus className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">
              {statusFilter !== 'all' || searchQuery
                ? 'No se encontraron campañas con los filtros aplicados'
                : `No hay campañas creadas para ${currentBrand.name}`}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Crea tu primera campaña para agrupar sesiones creativas, ideas y contenidos multicanal bajo un objetivo estratégico.
            </p>
          </div>
          <Button
            onClick={() => {
              setCampaignToEdit(null);
              setIsCreateModalOpen(true);
            }}
            className="text-xs bg-aura-500 hover:bg-aura-600 text-white font-semibold"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Crear Primera Campaña
          </Button>
        </div>
      )}

      {/* Modal de Crear / Editar Campaña */}
      {isCreateModalOpen && workspaceId && currentBrand && (
        <CampaignFormModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          workspaceId={workspaceId}
          brandId={currentBrand.id}
          brandName={currentBrand.name}
          campaignToEdit={campaignToEdit}
          onSaved={() => {
            refreshCampaigns();
          }}
        />
      )}
    </div>
  );
}
