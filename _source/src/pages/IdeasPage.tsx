import { useState, useEffect } from 'react';
import { useIdeas } from '../hooks/useIdeas';
import { useIdeaGeneration } from '../hooks/useIdeaGeneration';
import { useGenerationRuns } from '../hooks/useGenerationRuns';
import { Brand } from '../types/database';
import { IdeaCard } from '../components/ideas/IdeaCard';
import { GenerationBanner } from '../components/ideas/GenerationBanner';
import { GenerateIdeasModal } from '../components/ideas/GenerateIdeasModal';
import { GenerationCard } from '../components/ideas/GenerationCard';
import { GenerationDetailModal } from '../components/ideas/GenerationDetailModal';
import { GenerationWorkspace } from '../components/ideas/GenerationWorkspace';
import { PaginationControls } from '../components/ideas/PaginationControls';
import { ProduceContentModal } from '../components/contents/ProduceContentModal';
import { AssignToCampaignModal } from '../components/campaigns/AssignToCampaignModal';
import { IdeaPriority, ContentIdea, IdeaSortBy } from '../types/contentIdea';
import { GenerationContext, GenerationRun } from '../types/generationRun';
import { getBrandIdeaPillars } from '../services/ideasService';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { useToast } from '../hooks/useToast';
import { 
  Sparkles, 
  RefreshCw, 
  Search, 
  Loader2,
  Inbox,
  Layers,
  History,
  ArrowUpDown,
  Filter
} from 'lucide-react';
import { cn } from '../lib/utils';

interface IdeasPageProps {
  workspaceId?: string | null;
  brands?: Brand[];
  currentBrand?: Brand | null;
  onSelectBrand?: (brandId: string) => void;
  onRefreshBrands?: () => void;
  onEditBrand?: (brand: Brand) => void;
  isSwitchingBrand?: boolean;
}

type MainTab = 'generations' | 'ideas';

export function IdeasPage({ 
  workspaceId, 
  currentBrand, 
  onEditBrand,
}: IdeasPageProps) {
  // Navigation: Primary view is 'generations'
  const [activeTab, setActiveTab] = useState<MainTab>('generations');
  const [activeWorkspaceGeneration, setActiveWorkspaceGeneration] = useState<GenerationRun | null>(null);

  // Filters & Search for Ideas
  const [ideaSearchQuery, setIdeaSearchQuery] = useState<string>('');
  const [debouncedIdeaSearch, setDebouncedIdeaSearch] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<IdeaPriority | 'all'>('all');
  const [pillarFilter, setPillarFilter] = useState<string>('all');
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<IdeaSortBy>('newest');

  // Filters & Search for Generations
  const [genSearchQuery, setGenSearchQuery] = useState<string>('');
  const [genFormatFilter, setGenFormatFilter] = useState<string>('all');

  // Pagination states
  const [ideasPage, setIdeasPage] = useState<number>(1);
  const [runsPage, setRunsPage] = useState<number>(1);

  // Modals & Inspection
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState<boolean>(false);
  const [inspectedRun, setInspectedRun] = useState<GenerationRun | null>(null);
  const [producingIdea, setProducingIdea] = useState<ContentIdea | null>(null);
  const [ideaToAssignCampaign, setIdeaToAssignCampaign] = useState<ContentIdea | null>(null);
  const [availablePillars, setAvailablePillars] = useState<string[]>([]);

  const { toast } = useToast();
  const brandId = currentBrand?.id;

  // Reset pagination and active generation view when brand changes
  useEffect(() => {
    setActiveWorkspaceGeneration(null);
    setIdeasPage(1);
    setRunsPage(1);
  }, [brandId]);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedIdeaSearch(ideaSearchQuery);
      setIdeasPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [ideaSearchQuery]);

  // Load distinct pillars
  useEffect(() => {
    if (workspaceId && brandId) {
      getBrandIdeaPillars(workspaceId, brandId)
        .then(setPillars => setAvailablePillars(setPillars))
        .catch(() => {});
    }
  }, [workspaceId, brandId]);

  // Ideas hook (server-side paginated)
  const { 
    ideas, 
    totalCount: totalIdeasCount, 
    totalPages: totalIdeaPages, 
    isLoading: isIdeasLoading, 
    refreshIdeas 
  } = useIdeas({
    workspaceId,
    brandId,
    priority: priorityFilter,
    pillar: pillarFilter,
    format: formatFilter,
    searchQuery: debouncedIdeaSearch,
    sortBy,
    page: ideasPage,
    pageSize: 24,
  });

  // Generations history hook (server-side paginated)
  const {
    runs,
    totalCount: totalRunsCount,
    totalPages: totalRunPages,
    isLoading: isRunsLoading,
    refreshRuns,
  } = useGenerationRuns({
    workspaceId,
    brandId,
    page: runsPage,
    pageSize: 12,
  });

  // Filtered runs for generation search bar
  const filteredRuns = runs.filter((r) => {
    const ctx = r.generation_context;
    const matchSearch = !genSearchQuery.trim() || 
      (ctx?.topic?.toLowerCase().includes(genSearchQuery.toLowerCase())) ||
      (ctx?.objective?.toLowerCase().includes(genSearchQuery.toLowerCase())) ||
      (ctx?.keywords?.some(k => k.toLowerCase().includes(genSearchQuery.toLowerCase())));

    const matchFormat = genFormatFilter === 'all' || 
      ctx?.preferred_format?.toLowerCase() === genFormatFilter.toLowerCase();

    return matchSearch && matchFormat;
  });

  // Generation execution hook
  const {
    isGenerating,
    runStatus,
    ideasCreated,
    currentContext,
    error: generationError,
    startGeneration,
    clearStatus,
  } = useIdeaGeneration({
    workspaceId,
    brandId,
    onGenerationCompleted: () => {
      refreshIdeas();
      refreshRuns();
      toast('5 nuevas ideas generadas y agrupadas en su sesión', { type: 'success' });
    },
  });

  const handleProduceContent = (idea: ContentIdea) => {
    setProducingIdea(idea);
  };

  const handleOpenGenerateModal = () => {
    if (isGenerating || !workspaceId || !brandId) return;
    setIsGenerateModalOpen(true);
  };

  const handleConfirmGeneration = (context: GenerationContext) => {
    startGeneration(context);
  };

  // Open dedicated generation workspace
  const handleOpenGenerationWorkspace = (run: GenerationRun) => {
    setActiveWorkspaceGeneration(run);
  };

  // Navigate to generation workspace directly from an IdeaCard in global bank
  const handleNavigateToGenerationFromIdea = async (generationRunId: string) => {
    const matchingRun = runs.find((r) => r.id === generationRunId);
    if (matchingRun) {
      setActiveWorkspaceGeneration(matchingRun);
    } else {
      toast('Sesión de generación localizada', { type: 'info' });
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-dark-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-aura-500/10 border border-aura-500/30 flex items-center justify-center text-aura-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Banco de Ideas y Sesiones Creativas
              {currentBrand && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-dark-900 border border-dark-700 text-aura-300">
                  {currentBrand.name}
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-400">
              Estrategia multiángulo de contenidos generados por IA (GPT-5.6 Luna) y conectados al Brand Brain
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refreshIdeas();
              refreshRuns();
              toast('Estrategia y sesiones actualizadas', { type: 'info', duration: 2000 });
            }}
            isLoading={isIdeasLoading || isRunsLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Actualizar
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenGenerateModal}
            disabled={isGenerating || !workspaceId || !brandId}
            isLoading={isGenerating}
            leftIcon={<Sparkles className="w-4 h-4" />}
            className="shadow-aura-500/20"
          >
            {isGenerating ? 'Generando Sesión...' : '+ Generar Nuevas Ideas'}
          </Button>
        </div>
      </div>

      {/* Live Generation Banner */}
      <GenerationBanner
        isGenerating={isGenerating}
        status={runStatus}
        brandName={currentBrand?.name}
        topic={currentContext?.topic}
        ideasCreated={ideasCreated}
        errorMessage={generationError}
        onDismiss={clearStatus}
        onRetry={handleOpenGenerateModal}
      />

      {/* ========================================================================= */}
      {/* CASE A: DEDICATED GENERATION WORKSPACE CONTAINER VIEW */}
      {/* ========================================================================= */}
      {activeWorkspaceGeneration ? (
        <GenerationWorkspace
          generation={activeWorkspaceGeneration}
          indexNumber={totalRunsCount - runs.findIndex(r => r.id === activeWorkspaceGeneration.id)}
          onBack={() => setActiveWorkspaceGeneration(null)}
          onViewContext={(r) => setInspectedRun(r)}
          onProduceContent={handleProduceContent}
        />
      ) : (
        /* ========================================================================= */
        /* CASE B: MAIN HUB (GENERATIONS HISTORIAL OR GLOBAL IDEAS BANK) */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* Main Tabs Navigation: Default is [ Historial de Generaciones ] */}
          <div className="flex items-center justify-between border-b border-dark-800 pb-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('generations')}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all',
                  activeTab === 'generations'
                    ? 'bg-aura-500/15 text-aura-300 border border-aura-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-dark-900 border border-transparent'
                )}
              >
                <History className="w-4 h-4 text-amber-400" />
                <span>Historial de Generaciones</span>
                <span className="ml-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-dark-950 text-slate-300 border border-dark-800">
                  {totalRunsCount}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('ideas')}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all',
                  activeTab === 'ideas'
                    ? 'bg-aura-500/15 text-aura-300 border border-aura-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-dark-900 border border-transparent'
                )}
              >
                <Layers className="w-4 h-4 text-aura-400" />
                <span>Banco Global de Ideas</span>
                <span className="ml-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-dark-950 text-slate-300 border border-dark-800">
                  {totalIdeasCount}
                </span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: HISTORIAL DE GENERACIONES (Primary View) */}
          {/* ========================================================================= */}
          {activeTab === 'generations' && (
            <div className="space-y-6">
              {/* Generations Filter Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-dark-900/60 p-3.5 rounded-2xl border border-dark-800">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar por tema, objetivo o palabras clave..."
                    value={genSearchQuery}
                    onChange={(e) => setGenSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-dark-950 border border-dark-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-aura-500 transition-colors"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={genFormatFilter}
                    onChange={(e) => setGenFormatFilter(e.target.value)}
                    className="px-3 py-2 bg-dark-950 border border-dark-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-aura-500"
                  >
                    <option value="all">Todos los Formatos</option>
                    <option value="reel">Reel / Video</option>
                    <option value="carousel">Carrusel</option>
                    <option value="post">Post Estático</option>
                    <option value="thread">Hilo / Texto</option>
                  </select>
                </div>
              </div>

              {/* Loading State */}
              {isRunsLoading && (
                <div className="p-16 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 text-aura-500 animate-spin" />
                  <p className="text-xs text-slate-400">Cargando sesiones de generación...</p>
                </div>
              )}

              {/* Generations Cards Grid */}
              {!isRunsLoading && filteredRuns.length > 0 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredRuns.map((run, idx) => (
                      <GenerationCard
                        key={run.id}
                        run={run}
                        indexNumber={totalRunsCount - ((runsPage - 1) * 12 + idx)}
                        onOpenGeneration={handleOpenGenerationWorkspace}
                        onViewContext={(r) => setInspectedRun(r)}
                      />
                    ))}
                  </div>

                  {/* Server-Side Pagination Bar */}
                  <PaginationControls
                    currentPage={runsPage}
                    totalPages={totalRunPages}
                    totalCount={totalRunsCount}
                    pageSize={12}
                    itemLabel="sesiones"
                    onPageChange={(p) => setRunsPage(p)}
                    isLoading={isRunsLoading}
                  />
                </div>
              )}

              {/* Empty State */}
              {!isRunsLoading && filteredRuns.length === 0 && (
                <div className="p-16 text-center bg-dark-900/60 border border-dark-800 rounded-3xl space-y-4 my-6">
                  <div className="w-14 h-14 rounded-3xl bg-aura-500/10 border border-aura-500/25 flex items-center justify-center text-aura-400 mx-auto">
                    <History className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white tracking-tight">
                      No hay sesiones de generación registradas
                    </h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Inicia tu primera sesión creativa con GPT-5.6 Luna haciendo clic en "+ Generar Nuevas Ideas".
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleOpenGenerateModal}
                    leftIcon={<Sparkles className="w-4 h-4" />}
                  >
                    + Generar Primera Sesión
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: BANCO GLOBAL DE IDEAS (Secondary Flat Grid with Filters) */}
          {/* ========================================================================= */}
          {activeTab === 'ideas' && (
            <div className="space-y-6">
              {/* Ideas Filter Bar */}
              <div className="flex flex-col gap-3 bg-dark-900/60 p-4 rounded-2xl border border-dark-800">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <Input
                      placeholder="Buscar por título, concepto o hook..."
                      value={ideaSearchQuery}
                      onChange={(e) => setIdeaSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-950 border border-dark-800 text-xs text-slate-400">
                      <ArrowUpDown className="w-3.5 h-3.5 text-aura-400" />
                      <span>Ordenar:</span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as IdeaSortBy)}
                        className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
                      >
                        <option value="newest">Más recientes</option>
                        <option value="oldest">Más antiguas</option>
                        <option value="priority_desc">Mayor prioridad</option>
                        <option value="priority_asc">Menor prioridad</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Subfilters */}
                <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-dark-800/60 text-xs">
                  <div className="flex items-center gap-1 text-slate-400 mr-2">
                    <Filter className="w-3.5 h-3.5" />
                    <span>Filtros:</span>
                  </div>

                  {/* Priority filter */}
                  <select
                    value={priorityFilter}
                    onChange={(e) => {
                      setPriorityFilter(e.target.value as IdeaPriority | 'all');
                      setIdeasPage(1);
                    }}
                    className="px-2.5 py-1.5 bg-dark-950 border border-dark-800 rounded-lg text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="all">Todas las Prioridades</option>
                    <option value="high">Alta Prioridad</option>
                    <option value="normal">Prioridad Media</option>
                    <option value="low">Baja Prioridad</option>
                  </select>

                  {/* Pillar filter */}
                  {availablePillars.length > 0 && (
                    <select
                      value={pillarFilter}
                      onChange={(e) => {
                        setPillarFilter(e.target.value);
                        setIdeasPage(1);
                      }}
                      className="px-2.5 py-1.5 bg-dark-950 border border-dark-800 rounded-lg text-xs text-slate-300 focus:outline-none"
                    >
                      <option value="all">Todos los Pilares</option>
                      {availablePillars.map((p) => (
                        <option key={p} value={p}>
                          Pilar: {p}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Format filter */}
                  <select
                    value={formatFilter}
                    onChange={(e) => {
                      setFormatFilter(e.target.value);
                      setIdeasPage(1);
                    }}
                    className="px-2.5 py-1.5 bg-dark-950 border border-dark-800 rounded-lg text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="all">Todos los Formatos</option>
                    <option value="reel">Reel / Video</option>
                    <option value="carousel">Carrusel</option>
                    <option value="post">Post Estático</option>
                    <option value="thread">Hilo / Texto</option>
                  </select>
                </div>
              </div>

              {/* Loading State */}
              {isIdeasLoading && (
                <div className="p-16 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 text-aura-500 animate-spin" />
                  <p className="text-xs text-slate-400">Cargando banco de ideas...</p>
                </div>
              )}

              {/* Ideas Grid */}
              {!isIdeasLoading && ideas.length > 0 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {ideas.map((idea) => (
                      <IdeaCard
                        key={idea.id}
                        idea={idea}
                        onProduceContent={handleProduceContent}
                        onNavigateToGeneration={handleNavigateToGenerationFromIdea}
                        onAssignCampaign={(i) => setIdeaToAssignCampaign(i)}
                      />
                    ))}
                  </div>

                  {/* Server-Side Pagination Bar */}
                  <PaginationControls
                    currentPage={ideasPage}
                    totalPages={totalIdeaPages}
                    totalCount={totalIdeasCount}
                    pageSize={24}
                    itemLabel="ideas"
                    onPageChange={(p) => setIdeasPage(p)}
                    isLoading={isIdeasLoading}
                  />
                </div>
              )}

              {/* Empty State */}
              {!isIdeasLoading && ideas.length === 0 && (
                <div className="p-16 text-center bg-dark-900/60 border border-dark-800 rounded-3xl space-y-4 my-6">
                  <div className="w-14 h-14 rounded-3xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 mx-auto">
                    <Inbox className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white tracking-tight">
                      No hay ideas para mostrar
                    </h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      {ideaSearchQuery || priorityFilter !== 'all' || pillarFilter !== 'all' || formatFilter !== 'all'
                        ? 'No se encontraron ideas con los filtros aplicados.'
                        : 'Todavía no hay ideas generadas para esta marca.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Generation Config Modal */}
      <GenerateIdeasModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        onGenerate={handleConfirmGeneration}
        brandName={currentBrand?.name || 'la marca activa'}
        isGenerating={isGenerating}
      />

      {/* Generation Detail Inspection Modal */}
      <GenerationDetailModal
        run={inspectedRun}
        brand={currentBrand || undefined}
        isOpen={!!inspectedRun}
        onClose={() => setInspectedRun(null)}
        onOpenGeneration={handleOpenGenerationWorkspace}
      />

      {/* Modal de Producción de Contenidos WF02 (Production Studio) */}
      {producingIdea && (
        <ProduceContentModal
          isOpen={!!producingIdea}
          onClose={() => setProducingIdea(null)}
          idea={producingIdea}
          workspaceId={workspaceId || ''}
          brand={currentBrand}
          brandName={currentBrand?.name}
          onOpenBrandBrain={onEditBrand}
          onProductionStarted={(contentItemId) => {
            toast('Producción iniciada exitosamente', {
              type: 'success',
              description: `El contenido #${contentItemId.substring(0, 8)} está siendo redactado y desglosado en escenas por GPT-5.6 Luna.`
            });
          }}
        />
      )}

      {/* Modal de Asignación a Campaña */}
      {ideaToAssignCampaign && (
        <AssignToCampaignModal
          isOpen={!!ideaToAssignCampaign}
          onClose={() => setIdeaToAssignCampaign(null)}
          entityType="idea"
          entityId={ideaToAssignCampaign.id}
          entityTitle={ideaToAssignCampaign.title}
          brandId={currentBrand?.id || ''}
          currentCampaignId={ideaToAssignCampaign.campaign_id}
          onAssigned={() => {
            refreshIdeas();
          }}
        />
      )}
    </div>
  );
}
