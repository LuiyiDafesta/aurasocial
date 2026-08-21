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
import { BrandSwitcher } from '../components/brands/BrandSwitcher';
import { BrandFormModal } from '../components/brands/BrandFormModal';
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
  isSwitchingBrand?: boolean;
}

type MainTab = 'generations' | 'ideas';

export function IdeasPage({ 
  workspaceId, 
  brands = [], 
  currentBrand, 
  onSelectBrand,
  onRefreshBrands,
  isSwitchingBrand = false,
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
  const [isBrandModalOpen, setIsBrandModalOpen] = useState<boolean>(false);
  const [brandToEdit, setBrandToEdit] = useState<Brand | null>(null);
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
    error: ideasError, 
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
    error: runsError,
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
    toast(`Seleccionaste: "${idea.title}"`, {
      type: 'info',
      description: 'La integración con el workflow de producción WF02 se habilitará en la siguiente fase.',
    });
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
      // If run is not on the current page, construct a minimal run descriptor
      setActiveWorkspaceGeneration({
        id: generationRunId,
        workspace_id: workspaceId || '',
        brand_id: brandId || '',
        user_id: '',
        workflow_name: 'WF01',
        status: 'completed',
        ideas_created: 5,
        created_at: new Date().toISOString(),
      });
    }
  };

  const priorityOptions = [
    { id: 'all' as const, label: 'Todas las Prioridades' },
    { id: 'high' as const, label: 'Alta Prioridad' },
    { id: 'normal' as const, label: 'Media' },
    { id: 'low' as const, label: 'Baja' },
  ];

  const formatOptions = [
    { id: 'all', label: 'Todos los formatos' },
    { id: 'tiktok', label: 'TikTok' },
    { id: 'reel', label: 'Reels' },
    { id: 'carousel', label: 'Carruseles' },
    { id: 'post', label: 'Posts' },
    { id: 'video', label: 'Video' },
  ];

  const sortOptions: { id: IdeaSortBy; label: string }[] = [
    { id: 'newest', label: 'Más recientes primero' },
    { id: 'oldest', label: 'Más antiguas primero' },
    { id: 'priority', label: 'Por prioridad (Alta a Baja)' },
    { id: 'title', label: 'Por título (A–Z)' },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Header Section with Brand Switcher */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-dark-800/80">
        <div className="flex items-center gap-4 flex-wrap">
          {onSelectBrand && (
            <BrandSwitcher
              brands={brands}
              currentBrand={currentBrand || null}
              onSelectBrand={onSelectBrand}
              onCreateNewBrand={() => {
                setBrandToEdit(null);
                setIsBrandModalOpen(true);
              }}
              onEditBrandBrain={() => {
                setBrandToEdit(currentBrand || null);
                setIsBrandModalOpen(true);
              }}
              isSwitching={isSwitchingBrand}
            />
          )}

          <div className="text-xs text-slate-400">
            <span className="text-slate-500 font-mono">Rubro:</span>{' '}
            <strong className="text-slate-200">{currentBrand?.industry || 'General'}</strong>
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
          {/* TAB 1: HISTORIAL DE GENERACIONES (PRIMARY CONTAINER VIEW) */}
          {/* ========================================================================= */}
          {activeTab === 'generations' && (
            <div className="space-y-6">
              {/* Search & Filter Bar for Generations */}
              <div className="bg-dark-900 border border-dark-800 rounded-3xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex-1 w-full max-w-md">
                  <Input
                    placeholder="Buscar generación por tema, keywords, objetivo..."
                    value={genSearchQuery}
                    onChange={(e) => setGenSearchQuery(e.target.value)}
                    leftIcon={<Search className="w-4 h-4 text-slate-400" />}
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <select
                    value={genFormatFilter}
                    onChange={(e) => setGenFormatFilter(e.target.value)}
                    className="bg-dark-950 border border-dark-800 text-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-aura-500 transition-colors"
                  >
                    {formatOptions.map((fmt) => (
                      <option key={fmt.id} value={fmt.id}>
                        {fmt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Error alert */}
              {runsError && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center justify-between">
                  <span>{runsError}</span>
                  <Button variant="outline" size="sm" onClick={refreshRuns}>
                    Reintentar
                  </Button>
                </div>
              )}

              {/* Loading state */}
              {isRunsLoading && (
                <div className="p-12 flex flex-col items-center justify-center space-y-3 min-h-[300px]">
                  <Loader2 className="w-8 h-8 text-aura-500 animate-spin" />
                  <p className="text-xs text-slate-400 font-medium">Cargando sesiones de generación...</p>
                </div>
              )}

              {/* Runs Grid */}
              {!isRunsLoading && filteredRuns.length > 0 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredRuns.map((run, idx) => {
                      const seqNum = totalRunsCount - ((runsPage - 1) * 12 + idx);
                      return (
                        <GenerationCard
                          key={run.id}
                          run={run}
                          indexNumber={seqNum}
                          onOpenGeneration={handleOpenGenerationWorkspace}
                          onViewContext={(r) => setInspectedRun(r)}
                        />
                      );
                    })}
                  </div>

                  {/* Server-Side Pagination Bar for Generations */}
                  <PaginationControls
                    currentPage={runsPage}
                    totalPages={totalRunPages}
                    totalCount={totalRunsCount}
                    pageSize={12}
                    itemLabel="sesiones de generación"
                    onPageChange={(p) => setRunsPage(p)}
                    isLoading={isRunsLoading}
                  />
                </div>
              )}

              {/* Empty Runs */}
              {!isRunsLoading && filteredRuns.length === 0 && (
                <div className="p-16 text-center bg-dark-900/60 border border-dark-800 rounded-3xl space-y-4 my-6">
                  <div className="w-14 h-14 rounded-3xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 mx-auto">
                    <History className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-white tracking-tight">
                      Tu historial creativo empieza acá
                    </h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Cada vez que presiones "Generar Nuevas Ideas" se creará una sesión estratégica con su investigación y 5 conceptos exclusivos.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleOpenGenerateModal}
                    disabled={isGenerating}
                    isLoading={isGenerating}
                    leftIcon={<Sparkles className="w-4 h-4" />}
                    className="shadow-aura-500/20"
                  >
                    ✨ Iniciar Primera Sesión de Generación
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: BANCO GLOBAL DE IDEAS (GLOBAL LIBRARY) */}
          {/* ========================================================================= */}
          {activeTab === 'ideas' && (
            <div className="space-y-6">
              {/* Search & Filters Bar */}
              <div className="bg-dark-900 border border-dark-800 rounded-3xl p-4 shadow-xl space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 max-w-md">
                    <Input
                      placeholder="Buscar por título, concepto, pilar, hook..."
                      value={ideaSearchQuery}
                      onChange={(e) => setIdeaSearchQuery(e.target.value)}
                      leftIcon={<Search className="w-4 h-4 text-slate-400" />}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <select
                      value={sortBy}
                      onChange={(e) => {
                        setSortBy(e.target.value as IdeaSortBy);
                        setIdeasPage(1);
                      }}
                      className="bg-dark-950 border border-dark-800 text-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-aura-500 transition-colors"
                    >
                      {sortOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-dark-800/80">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                    {priorityOptions.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setPriorityFilter(opt.id);
                          setIdeasPage(1);
                        }}
                        className={cn(
                          'px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all',
                          priorityFilter === opt.id
                            ? 'bg-aura-500/20 text-aura-300 border border-aura-500/30'
                            : 'bg-dark-950 text-slate-400 border border-dark-800 hover:text-slate-200'
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {availablePillars.length > 0 && (
                      <select
                        value={pillarFilter}
                        onChange={(e) => {
                          setPillarFilter(e.target.value);
                          setIdeasPage(1);
                        }}
                        className="bg-dark-950 border border-dark-800 text-slate-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-aura-500 transition-colors"
                      >
                        <option value="all">Todos los Pilares</option>
                        {availablePillars.map((pil) => (
                          <option key={pil} value={pil}>
                            {pil}
                          </option>
                        ))}
                      </select>
                    )}

                    <select
                      value={formatFilter}
                      onChange={(e) => {
                        setFormatFilter(e.target.value);
                        setIdeasPage(1);
                      }}
                      className="bg-dark-950 border border-dark-800 text-slate-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-aura-500 transition-colors"
                    >
                      {formatOptions.map((fmt) => (
                        <option key={fmt.id} value={fmt.id}>
                          {fmt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Error alert */}
              {ideasError && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center justify-between">
                  <span>{ideasError}</span>
                  <Button variant="outline" size="sm" onClick={refreshIdeas}>
                    Reintentar
                  </Button>
                </div>
              )}

              {/* Loading state */}
              {isIdeasLoading && (
                <div className="p-12 flex flex-col items-center justify-center space-y-3 min-h-[300px]">
                  <Loader2 className="w-8 h-8 text-aura-500 animate-spin" />
                  <p className="text-xs text-slate-400 font-medium">Cargando banco de ideas...</p>
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

      {/* Brand Create / Edit Brand Brain Modal */}
      {workspaceId && (
        <BrandFormModal
          isOpen={isBrandModalOpen}
          onClose={() => {
            setIsBrandModalOpen(false);
            setBrandToEdit(null);
          }}
          workspaceId={workspaceId}
          brandToEdit={brandToEdit}
          onSaved={() => {
            onRefreshBrands?.();
          }}
        />
      )}
    </div>
  );
}
