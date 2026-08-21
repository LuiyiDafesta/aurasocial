import { useState, useEffect, useMemo } from 'react';
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
  Loader2, 
  FolderPlus,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Layers,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useToast } from '../hooks/useToast';

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
  const { toast } = useToast();

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

  // Contadores globales agregados para el banner superior
  const statsOverview = useMemo(() => {
    const total = campaigns.length;
    const active = campaigns.filter(c => c.status === 'active').length;
    const totalIdeas = campaigns.reduce((acc, c) => acc + (c.total_ideas || 0), 0);
    const totalContents = campaigns.reduce((acc, c) => acc + (c.total_contents || 0), 0);
    return { total, active, totalIdeas, totalContents };
  }, [campaigns]);

  // Si no hay marca seleccionada
  if (!currentBrand) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <div className="bg-dark-900/60 border border-dark-800 rounded-3xl p-12 text-center space-y-4 max-w-lg mx-auto my-12">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
            <Target className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">Selecciona una marca para ver sus campañas</h3>
          <p className="text-xs text-slate-400">
            Las campañas están estrictamente vinculadas al Brand Brain de cada marca activa.
          </p>
        </div>
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
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      
      {/* Top Header Section (Aligned with IdeasPage and ContenidosPage) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-dark-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-aura-500/10 border border-aura-500/30 flex items-center justify-center text-aura-400 shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Campañas Estratégicas
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-dark-900 border border-dark-700 text-aura-300">
                {currentBrand.name}
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Espacios de trabajo estratégicos que unifican sesiones creativas, ideas y contenidos multicanal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refreshCampaigns();
              toast('Campañas actualizadas', { type: 'info', duration: 2000 });
            }}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Actualizar
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setCampaignToEdit(null);
              setIsCreateModalOpen(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
            className="shadow-aura-500/20"
          >
            + Nueva Campaña
          </Button>
        </div>
      </div>

      {/* Metric Highlights Overview Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-dark-900/90 border border-dark-800/90 shadow-lg shadow-black/20 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-aura-500/10 border border-aura-500/20 flex items-center justify-center text-aura-400 shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-black text-white">{statsOverview.total}</span>
            <span className="text-[11px] text-slate-400 block font-medium">Total Campañas</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-dark-900/90 border border-dark-800/90 shadow-lg shadow-black/20 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-black text-white">{statsOverview.active}</span>
            <span className="text-[11px] text-slate-400 block font-medium">Campañas Activas</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-dark-900/90 border border-dark-800/90 shadow-lg shadow-black/20 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-black text-white">{statsOverview.totalIdeas}</span>
            <span className="text-[11px] text-slate-400 block font-medium">Ideas en Campañas</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-dark-900/90 border border-dark-800/90 shadow-lg shadow-black/20 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-black text-white">{statsOverview.totalContents}</span>
            <span className="text-[11px] text-slate-400 block font-medium">Contenidos Producidos</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-dark-900/80 border border-dark-800 p-2.5 rounded-2xl">
        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
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
                  "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0",
                  isActive
                    ? "bg-aura-500 text-white shadow-md shadow-aura-500/20"
                    : "text-slate-400 hover:text-white hover:bg-dark-800"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-72 shrink-0">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, tema u objetivo..."
            className="pl-9 pr-8 bg-dark-950/90 border-dark-700 text-xs h-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Error State Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid or Empty States */}
      {isLoading ? (
        <div className="py-24 text-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-aura-400" />
          <span className="text-xs font-medium">Cargando campañas estratégicas de {currentBrand.name}...</span>
        </div>
      ) : campaigns.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        <div className="bg-dark-900/60 border border-dark-800 rounded-3xl p-14 text-center space-y-4 max-w-lg mx-auto my-8">
          <div className="w-14 h-14 rounded-2xl bg-aura-500/10 border border-aura-500/20 flex items-center justify-center text-aura-400 mx-auto">
            <FolderPlus className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-white">
              {statusFilter !== 'all' || searchQuery
                ? 'No se encontraron campañas con los filtros aplicados'
                : `No hay campañas creadas para ${currentBrand.name}`}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Crea tu primera campaña para agrupar sesiones creativas, ideas y contenidos multicanal bajo un objetivo estratégico medible.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setCampaignToEdit(null);
              setIsCreateModalOpen(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
            className="shadow-aura-500/20 mx-auto"
          >
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
