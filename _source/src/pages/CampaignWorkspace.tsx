import { useState, useEffect, useCallback } from 'react';
import { Campaign, CampaignStatus } from '../types/campaign';
import { Brand } from '../types/database';
import { GenerationRun } from '../types/generationRun';
import { ContentIdea } from '../types/contentIdea';
import { ContentItem } from '../types/contentItem';
import { getCampaignSummaryCounts } from '../services/campaignService';
import { getWorkspaceGenerationRuns } from '../services/generationService';
import { getContentIdeas } from '../services/ideasService';
import { getContentItems } from '../services/contentItemsService';
import { Button } from '../components/common/Button';
import { IdeaCard } from '../components/ideas/IdeaCard';
import { GenerationCard } from '../components/ideas/GenerationCard';
import { GenerationDetailModal } from '../components/ideas/GenerationDetailModal';
import { ProduceContentModal } from '../components/contents/ProduceContentModal';
import { ContentCard } from '../components/content/ContentCard';
import { ContentDetailView } from '../components/content/ContentDetailView';
import { CampaignFormModal } from '../components/campaigns/CampaignFormModal';
import { AddIdeaToCampaignModal } from '../components/campaigns/AddIdeaToCampaignModal';
import { AddContentToCampaignModal } from '../components/campaigns/AddContentToCampaignModal';
import { AssetManagementStudio } from '../components/assets/AssetManagementStudio';
import { 
  ArrowLeft, 
  Target, 
  Zap, 
  Lightbulb, 
  Layers, 
  FolderGit2, 
  Calendar, 
  Users, 
  Radio, 
  TrendingUp, 
  DollarSign,
  FileText,
  Sparkles,
  Edit,
  Loader2,
  Plus
} from 'lucide-react';
import { cn } from '../lib/utils';

interface CampaignWorkspaceProps {
  campaign: Campaign;
  currentBrand: Brand;
  onBack: () => void;
  onCampaignUpdated: (updated: Campaign) => void;
  onEditBrand?: (brand: Brand) => void;
}

type WorkspaceTab = 'strategy' | 'sessions' | 'ideas' | 'contents' | 'assets';

export function CampaignWorkspace({
  campaign: initialCampaign,
  currentBrand,
  onBack,
  onCampaignUpdated,
  onEditBrand,
}: CampaignWorkspaceProps) {
  const [campaign, setCampaign] = useState<Campaign>(initialCampaign);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('strategy');
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  // Contadores
  const [counts, setCounts] = useState({
    sessions: campaign.total_generations || 0,
    ideas: campaign.total_ideas || 0,
    contents: campaign.total_contents || 0,
    assets: 0,
  });

  // Datos de cada subtab
  const [sessions, setSessions] = useState<GenerationRun[]>([]);
  const [isSessionsLoading, setIsSessionsLoading] = useState<boolean>(false);
  const [selectedSession, setSelectedSession] = useState<GenerationRun | null>(null);

  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [isIdeasLoading, setIsIdeasLoading] = useState<boolean>(false);
  const [ideaToProduce, setIdeaToProduce] = useState<ContentIdea | null>(null);

  const [contents, setContents] = useState<ContentItem[]>([]);
  const [isContentsLoading, setIsContentsLoading] = useState<boolean>(false);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);

  // Modales de asignación a campaña
  const [isAddIdeaModalOpen, setIsAddIdeaModalOpen] = useState<boolean>(false);
  const [isAddContentModalOpen, setIsAddContentModalOpen] = useState<boolean>(false);

  // Sincronizar campaña inicial si cambia prop
  useEffect(() => {
    setCampaign(initialCampaign);
  }, [initialCampaign]);

  // Cargar contadores actualizados
  const loadSummaryCounts = useCallback(async () => {
    try {
      const summary = await getCampaignSummaryCounts(campaign.id);
      setCounts({
        sessions: summary.sessions_count,
        ideas: summary.ideas_count,
        contents: summary.contents_count,
        assets: summary.assets_count,
      });
    } catch (err) {
      console.error('Error al cargar contadores de campaña:', err);
    }
  }, [campaign.id]);

  useEffect(() => {
    loadSummaryCounts();
  }, [loadSummaryCounts]);

  // Cargar Sesiones de la campaña
  const loadSessions = useCallback(async () => {
    try {
      setIsSessionsLoading(true);
      const res = await getWorkspaceGenerationRuns(campaign.workspace_id, currentBrand.id, 1, 50);
      const campaignSessions = res.runs.filter((r: GenerationRun) => r.campaign_id === campaign.id);
      setSessions(campaignSessions);
    } catch (err) {
      console.error('Error al cargar sesiones de campaña:', err);
    } finally {
      setIsSessionsLoading(false);
    }
  }, [campaign.workspace_id, currentBrand.id, campaign.id]);

  // Cargar Ideas de la campaña
  const loadIdeas = useCallback(async () => {
    try {
      setIsIdeasLoading(true);
      const res = await getContentIdeas({
        brandId: currentBrand.id,
        campaignId: campaign.id,
        pageSize: 50,
      });
      setIdeas(res.ideas);
    } catch (err) {
      console.error('Error al cargar ideas de campaña:', err);
    } finally {
      setIsIdeasLoading(false);
    }
  }, [currentBrand.id, campaign.id]);

  // Cargar Contenidos de la campaña
  const loadContents = useCallback(async () => {
    try {
      setIsContentsLoading(true);
      const items = await getContentItems({
        brandId: currentBrand.id,
        campaignId: campaign.id,
        status: 'all',
      });
      setContents(items);
    } catch (err) {
      console.error('Error al cargar contenidos de campaña:', err);
    } finally {
      setIsContentsLoading(false);
    }
  }, [currentBrand.id, campaign.id]);

  // Cargar datos según el tab activo
  useEffect(() => {
    if (activeTab === 'sessions') loadSessions();
    else if (activeTab === 'ideas') loadIdeas();
    else if (activeTab === 'contents') loadContents();
  }, [activeTab, loadSessions, loadIdeas, loadContents]);

  const getStatusBadge = (status: CampaignStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Activa
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            Borrador
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
            Pausada
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            Completada
          </span>
        );
      case 'archived':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            Archivada
          </span>
        );
    }
  };

  const formatDateRange = (start?: string | null, end?: string | null) => {
    if (!start && !end) return 'Fechas abiertas';
    if (start && !end) return `Desde ${new Date(start + 'T00:00:00').toLocaleDateString()}`;
    if (!start && end) return `Hasta ${new Date(end + 'T00:00:00').toLocaleDateString()}`;
    return `${new Date(start + 'T00:00:00').toLocaleDateString()} - ${new Date(end + 'T00:00:00').toLocaleDateString()}`;
  };

  // Si hay un contenido abierto para detalle
  if (selectedContentId) {
    return (
      <ContentDetailView
        contentId={selectedContentId}
        onBack={() => {
          setSelectedContentId(null);
          loadContents();
          loadSummaryCounts();
        }}
        onContentUpdated={() => {
          loadContents();
          loadSummaryCounts();
        }}
      />
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Navigation & Campaign Header */}
      <div className="bg-dark-900/90 border border-dark-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-aura-500/5 rounded-full blur-3xl pointer-events-none"></div>

        {/* Back button & Action */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white bg-dark-950/60 hover:bg-dark-800 px-3 py-1.5 rounded-xl border border-dark-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Campañas</span>
          </button>

          <Button
            variant="outline"
            onClick={() => setIsEditModalOpen(true)}
            className="text-xs flex items-center gap-1.5 bg-dark-950/60 hover:bg-dark-800"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Editar Campaña</span>
          </Button>
        </div>

        {/* Campaign Info */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-mono text-aura-400 bg-aura-500/10 px-2.5 py-0.5 rounded-lg border border-aura-500/20 font-semibold">
                /{campaign.slug}
              </span>
              {getStatusBadge(campaign.status)}
              <span className="text-xs text-slate-400 bg-dark-950 px-2.5 py-0.5 rounded-md border border-dark-800">
                {currentBrand.name}
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              {campaign.name}
            </h1>
            {campaign.strategic_theme && (
              <p className="text-xs font-semibold text-aura-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Concepto Eje: "{campaign.strategic_theme}"</span>
              </p>
            )}
          </div>

          {/* Quick Real Metric Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
            <div 
              onClick={() => setActiveTab('sessions')}
              className={cn(
                "px-3.5 py-2.5 rounded-2xl border transition-all cursor-pointer text-center",
                activeTab === 'sessions' ? "bg-dark-800 border-amber-500/40" : "bg-dark-950/60 border-dark-800 hover:border-dark-700"
              )}
            >
              <div className="flex items-center justify-center gap-1 text-amber-400 font-black text-lg">
                <Zap className="w-4 h-4" />
                <span>{counts.sessions}</span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Sesiones</span>
            </div>

            <div 
              onClick={() => setActiveTab('ideas')}
              className={cn(
                "px-3.5 py-2.5 rounded-2xl border transition-all cursor-pointer text-center",
                activeTab === 'ideas' ? "bg-dark-800 border-aura-500/40" : "bg-dark-950/60 border-dark-800 hover:border-dark-700"
              )}
            >
              <div className="flex items-center justify-center gap-1 text-aura-400 font-black text-lg">
                <Lightbulb className="w-4 h-4" />
                <span>{counts.ideas}</span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Ideas</span>
            </div>

            <div 
              onClick={() => setActiveTab('contents')}
              className={cn(
                "px-3.5 py-2.5 rounded-2xl border transition-all cursor-pointer text-center",
                activeTab === 'contents' ? "bg-dark-800 border-indigo-500/40" : "bg-dark-950/60 border-dark-800 hover:border-dark-700"
              )}
            >
              <div className="flex items-center justify-center gap-1 text-indigo-400 font-black text-lg">
                <Layers className="w-4 h-4" />
                <span>{counts.contents}</span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Contenidos</span>
            </div>

            <div 
              onClick={() => setActiveTab('assets')}
              className={cn(
                "px-3.5 py-2.5 rounded-2xl border transition-all cursor-pointer text-center",
                activeTab === 'assets' ? "bg-dark-800 border-pink-500/40" : "bg-dark-950/60 border-dark-800 hover:border-dark-700"
              )}
            >
              <div className="flex items-center justify-center gap-1 text-pink-400 font-black text-lg">
                <FolderGit2 className="w-4 h-4" />
                <span>{counts.assets}</span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Assets</span>
            </div>
          </div>
        </div>

        {/* Subtabs Bar */}
        <div className="flex items-center gap-2 border-t border-dark-800/80 pt-4 mt-5 overflow-x-auto">
          {[
            { id: 'strategy' as WorkspaceTab, label: 'Estrategia & Brief', icon: Target },
            { id: 'sessions' as WorkspaceTab, label: `Sesiones (${counts.sessions})`, icon: Zap },
            { id: 'ideas' as WorkspaceTab, label: `Ideas (${counts.ideas})`, icon: Lightbulb },
            { id: 'contents' as WorkspaceTab, label: `Contenidos (${counts.contents})`, icon: Layers },
            { id: 'assets' as WorkspaceTab, label: `Assets (${counts.assets})`, icon: FolderGit2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0",
                  isActive
                    ? "bg-aura-500 text-white shadow-lg shadow-aura-500/20"
                    : "text-slate-400 hover:text-white bg-dark-950/50 hover:bg-dark-800 border border-dark-800"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SUBTAB 1: ESTRATEGIA & BRIEF */}
      {activeTab === 'strategy' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-150">
          {/* Main Briefing Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Strategic Objective Card */}
            <div className="bg-dark-900/90 border border-dark-800 rounded-3xl p-6 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-aura-400 uppercase tracking-wider">
                <Target className="w-4 h-4" />
                <span>Objetivo Estratégico de Campaña</span>
              </div>
              <p className="text-sm text-slate-100 leading-relaxed font-medium">
                {campaign.strategic_objective}
              </p>
            </div>

            {/* Description */}
            {campaign.description && (
              <div className="bg-dark-900/90 border border-dark-800 rounded-3xl p-6 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <FileText className="w-4 h-4" />
                  <span>Descripción y Contexto del Negocio</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                  {campaign.description}
                </p>
              </div>
            )}

            {/* KPIs & Goals */}
            <div className="bg-dark-900/90 border border-dark-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                <TrendingUp className="w-4 h-4" />
                <span>Indicadores Clave de Éxito (KPIs)</span>
              </div>
              {campaign.kpis && campaign.kpis.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {campaign.kpis.map((kpi, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl bg-dark-950/60 border border-dark-800 flex items-center justify-between">
                      <span className="text-xs text-slate-300 font-medium">{kpi.name}</span>
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                        {kpi.target}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  No se definieron KPIs específicos para esta campaña.
                </p>
              )}
            </div>
          </div>

          {/* Sidebar Strategic Parameters */}
          <div className="space-y-6">
            <div className="bg-dark-900/90 border border-dark-800 rounded-3xl p-6 space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Parámetros de Ejecución
              </h3>

              <div className="space-y-3 text-xs">
                {/* Audiencia */}
                <div className="p-3 rounded-2xl bg-dark-950/60 border border-dark-800 space-y-1">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                    Audiencia Objetivo
                  </span>
                  <p className="font-semibold text-slate-200">
                    {campaign.target_audience || 'No especificada'}
                  </p>
                </div>

                {/* Canal Principal */}
                <div className="p-3 rounded-2xl bg-dark-950/60 border border-dark-800 space-y-1">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
                    <Radio className="w-3.5 h-3.5 text-pink-400" />
                    Canal Principal
                  </span>
                  <p className="font-semibold text-slate-200">
                    {campaign.primary_channel || 'Omnicanal'}
                  </p>
                </div>

                {/* Fechas */}
                <div className="p-3 rounded-2xl bg-dark-950/60 border border-dark-800 space-y-1">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    Vigencia de Campaña
                  </span>
                  <p className="font-semibold text-slate-200">
                    {formatDateRange(campaign.start_date, campaign.end_date)}
                  </p>
                </div>

                {/* Presupuesto */}
                {campaign.budget_context && (
                  <div className="p-3 rounded-2xl bg-dark-950/60 border border-dark-800 space-y-1">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
                      <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                      Presupuesto / Inversión
                    </span>
                    <p className="font-semibold text-slate-200">
                      {campaign.budget_context}
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <Button
                  onClick={() => setIsEditModalOpen(true)}
                  className="w-full text-xs bg-dark-800 hover:bg-dark-700 text-white"
                >
                  <Edit className="w-3.5 h-3.5 mr-1.5" />
                  Modificar Briefing
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: SESIONES */}
      {activeTab === 'sessions' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {isSessionsLoading ? (
            <div className="py-16 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-aura-400" />
              <span className="text-xs">Cargando sesiones creativas de la campaña...</span>
            </div>
          ) : sessions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessions.map((session) => (
                <GenerationCard
                  key={session.id}
                  run={session}
                  onOpenGeneration={(r) => setSelectedSession(r)}
                  onViewContext={(r) => setSelectedSession(r)}
                />
              ))}
            </div>
          ) : (
            <div className="bg-dark-900/60 border border-dark-800 rounded-3xl p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white">Esta campaña todavía no tiene sesiones creativas</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Las sesiones de generación con IA vinculadas a esta campaña agruparán automáticamente las ideas generadas.
              </p>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: IDEAS */}
      {activeTab === 'ideas' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between gap-4 flex-wrap pb-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Ideas Estratégicas de la Campaña ({ideas.length})
            </h3>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddIdeaModalOpen(true)}
              leftIcon={<Plus className="w-3.5 h-3.5 text-aura-400" />}
              className="text-xs bg-dark-900 border-dark-700 hover:bg-dark-800 text-white"
            >
              Agregar idea existente
            </Button>
          </div>

          {isIdeasLoading ? (
            <div className="py-16 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-aura-400" />
              <span className="text-xs">Cargando ideas de la campaña...</span>
            </div>
          ) : ideas.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ideas.map((idea) => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  onProduceContent={(i) => setIdeaToProduce(i)}
                />
              ))}
            </div>
          ) : (
            <div className="bg-dark-900/60 border border-dark-800 rounded-3xl p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-aura-500/10 border border-aura-500/20 flex items-center justify-center text-aura-400 mx-auto">
                <Lightbulb className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">Esta campaña todavía no tiene ideas</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Podés vincular ideas existentes de la marca o generar nuevas ideas para esta campaña.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setIsAddIdeaModalOpen(true)}
                  leftIcon={<Plus className="w-4 h-4 text-aura-400" />}
                  className="text-xs bg-dark-950 border-dark-700 hover:bg-dark-800 text-white"
                >
                  Agregar idea existente
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 4: CONTENIDOS */}
      {activeTab === 'contents' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between gap-4 flex-wrap pb-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Piezas de Contenido Producidas ({contents.length})
            </h3>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddContentModalOpen(true)}
              leftIcon={<Plus className="w-3.5 h-3.5 text-aura-400" />}
              className="text-xs bg-dark-900 border-dark-700 hover:bg-dark-800 text-white"
            >
              Agregar contenido existente
            </Button>
          </div>

          {isContentsLoading ? (
            <div className="py-16 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-aura-400" />
              <span className="text-xs">Cargando contenidos de la campaña...</span>
            </div>
          ) : contents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contents.map((item) => (
                <ContentCard
                  key={item.id}
                  item={item}
                  onReview={(it) => setSelectedContentId(it.id)}
                />
              ))}
            </div>
          ) : (
            <div className="bg-dark-900/60 border border-dark-800 rounded-3xl p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto">
                <Layers className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">Esta campaña todavía no tiene contenidos</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Podés asociar piezas de contenido existentes o producir contenido desde las ideas de la campaña.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setIsAddContentModalOpen(true)}
                  leftIcon={<Plus className="w-4 h-4 text-aura-400" />}
                  className="text-xs bg-dark-950 border-dark-700 hover:bg-dark-800 text-white"
                >
                  Agregar contenido existente
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 5: ASSETS (Asset Management Studio) */}
      {activeTab === 'assets' && (
        <AssetManagementStudio
          workspaceId={campaign.workspace_id}
          brand={currentBrand}
          campaign={campaign}
          onAssetsChanged={() => loadSummaryCounts()}
        />
      )}

      {/* Modal de edición de campaña */}
      {isEditModalOpen && (
        <CampaignFormModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          workspaceId={campaign.workspace_id}
          brandId={campaign.brand_id}
          brandName={currentBrand.name}
          campaignToEdit={campaign}
          onSaved={(updated) => {
            setCampaign(updated);
            onCampaignUpdated(updated);
            loadSummaryCounts();
          }}
        />
      )}

      {/* Modal de producción de contenido desde idea */}
      {ideaToProduce && (
        <ProduceContentModal
          isOpen={!!ideaToProduce}
          onClose={() => {
            setIdeaToProduce(null);
            loadSummaryCounts();
            if (activeTab === 'contents') loadContents();
          }}
          idea={ideaToProduce}
          brand={currentBrand}
          workspaceId={campaign.workspace_id}
          onOpenBrandBrain={() => onEditBrand?.(currentBrand)}
        />
      )}

      {/* Modal de detalle de sesión */}
      {selectedSession && (
        <GenerationDetailModal
          isOpen={!!selectedSession}
          onClose={() => setSelectedSession(null)}
          run={selectedSession}
        />
      )}

      {/* Modal para agregar ideas existentes */}
      <AddIdeaToCampaignModal
        isOpen={isAddIdeaModalOpen}
        onClose={() => setIsAddIdeaModalOpen(false)}
        campaign={campaign}
        onIdeasAssigned={() => {
          loadIdeas();
          loadSummaryCounts();
        }}
      />

      {/* Modal para agregar contenidos existentes */}
      <AddContentToCampaignModal
        isOpen={isAddContentModalOpen}
        onClose={() => setIsAddContentModalOpen(false)}
        campaign={campaign}
        onContentsAssigned={() => {
          loadContents();
          loadSummaryCounts();
        }}
      />
    </div>
  );
}
