import { useState, useEffect } from 'react';
import { useIdeas } from '../hooks/useIdeas';
import { useIdeaGeneration } from '../hooks/useIdeaGeneration';
import { useGenerationRuns } from '../hooks/useGenerationRuns';
import { IdeaCard } from '../components/ideas/IdeaCard';
import { GenerationBanner } from '../components/ideas/GenerationBanner';
import { GenerateIdeasModal } from '../components/ideas/GenerateIdeasModal';
import { GenerationCard } from '../components/ideas/GenerationCard';
import { GenerationDetailModal } from '../components/ideas/GenerationDetailModal';
import { PaginationControls } from '../components/ideas/PaginationControls';
import { IdeaPriority, ContentIdea, IdeaSortBy } from '../types/contentIdea';
import { GenerationContext, GenerationRun } from '../types/generationRun';
import { getBrandIdeaPillars } from '../services/ideasService';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { useToast } from '../hooks/useToast';
import { 
  Lightbulb, 
  Sparkles, 
  RefreshCw, 
  Search, 
  Loader2,
  Inbox,
  Layers,
  History,
  LayoutGrid,
  FolderTree,
  Filter,
  X,
  ArrowUpDown
} from 'lucide-react';
import { cn } from '../lib/utils';

interface IdeasPageProps {
  workspaceId?: string | null;
  brandId?: string | null;
  brandName?: string;
}

type MainTab = 'ideas' | 'generations';
type ViewMode = 'grid' | 'grouped';

export function IdeasPage({ workspaceId, brandId, brandName }: IdeasPageProps) {
  // Navigation & View Mode
  const [activeTab, setActiveTab] = useState<MainTab>('ideas');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<IdeaPriority | 'all'>('all');
  const [pillarFilter, setPillarFilter] = useState<string>('all');
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<IdeaSortBy>('newest');
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  // Pagination states
  const [ideasPage, setIdeasPage] = useState<number>(1);
  const [runsPage, setRunsPage] = useState<number>(1);

  // Modals & Inspection
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [inspectedRun, setInspectedRun] = useState<GenerationRun | null>(null);
  const [availablePillars, setAvailablePillars] = useState<string[]>([]);

  const { toast } = useToast();

  // Debounce search query to avoid querying on every keystroke
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setIdeasPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load distinct pillars for filtering
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
    searchQuery: debouncedSearch,
    generationRunId: selectedRunId,
    sortBy,
    page: ideasPage,
    pageSize: 24,
  });

  // Generations history hook
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
      toast('5 nuevas ideas agregadas a tu banco', { type: 'success' });
    },
  });

  const handleProduceContent = (idea: ContentIdea) => {
    toast(`Seleccionaste: "${idea.title}"`, {
      type: 'info',
      description: 'La integración con el workflow de producción WF02 se habilitará en la siguiente fase.',
    });
  };

  const handleOpenModal = () => {
    if (isGenerating || !workspaceId || !brandId) return;
    setIsModalOpen(true);
  };

  const handleConfirmGeneration = (context: GenerationContext) => {
    startGeneration(context);
  };

  // Switch to Ideas tab filtered by specific generation
  const handleFilterByRun = (run: GenerationRun) => {
    setSelectedRunId(run.id);
    setActiveTab('ideas');
    setIdeasPage(1);
  };

  const handleClearRunFilter = () => {
    setSelectedRunId(null);
    setIdeasPage(1);
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

  // Group ideas by generation_run_id if grouped mode is active
  const renderGroupedIdeas = () => {
    const groups: { [key: string]: ContentIdea[] } = {};
    const unassigned: ContentIdea[] = [];

    for (const idea of ideas) {
      if (idea.generation_run_id) {
        if (!groups[idea.generation_run_id]) {
          groups[idea.generation_run_id] = [];
        }
        groups[idea.generation_run_id].push(idea);
      } else {
        unassigned.push(idea);
      }
    }

    return (
      <div className="space-y-8">
        {Object.entries(groups).map(([runId, groupIdeas]) => {
          const matchingRun = runs.find((r) => r.id === runId);
          const topic = matchingRun?.generation_context?.topic || (groupIdeas.length > 0 ? `Lote: "${groupIdeas[0].title}"` : 'Generación Temática');
          const format = matchingRun?.generation_context?.preferred_format || (groupIdeas.length > 0 ? groupIdeas[0].format : 'any');

          return (
            <div key={runId} className="space-y-4 bg-dark-900/40 border border-dark-800/80 rounded-2xl p-5 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-dark-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-aura-500/15 border border-aura-500/30 text-aura-300 flex items-center justify-center font-bold text-xs">
                    📁
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white tracking-tight">{topic}</h4>
                    <p className="text-[11px] text-slate-400">
                      {groupIdeas.length} ideas · Formato: <span className="uppercase text-slate-300 font-semibold">{format}</span>
                    </p>
                  </div>
                </div>

                {matchingRun && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInspectedRun(matchingRun)}
                    className="text-xs self-start sm:self-center"
                  >
                    Ver Contexto
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {groupIdeas.map((idea) => (
                  <IdeaCard key={idea.id} idea={idea} onProduceContent={handleProduceContent} />
                ))}
              </div>
            </div>
          );
        })}

        {unassigned.length > 0 && (
          <div className="space-y-4 bg-dark-900/40 border border-dark-800/80 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center gap-3 pb-3 border-b border-dark-800">
              <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs">
                💡
              </div>
              <div>
                <h4 className="text-sm font-bold text-white tracking-tight">Ideas Generales / Anteriores</h4>
                <p className="text-[11px] text-slate-400">{unassigned.length} ideas</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {unassigned.map((idea) => (
                <IdeaCard key={idea.id} idea={idea} onProduceContent={handleProduceContent} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-dark-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center">
              <Lightbulb className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Banco de Ideas</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Estrategia y biblioteca creativa diseñada por IA para la marca activa{' '}
            <strong className="text-white">{brandName || 'la marca activa'}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refreshIdeas();
              refreshRuns();
              toast('Banco de ideas actualizado', { type: 'info', duration: 2000 });
            }}
            isLoading={isIdeasLoading || isRunsLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Actualizar
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenModal}
            disabled={isGenerating || !workspaceId || !brandId}
            isLoading={isGenerating}
            leftIcon={<Sparkles className="w-4 h-4" />}
            className="shadow-aura-500/20"
          >
            {isGenerating ? 'Generando Ideas...' : 'Generar Nuevas Ideas'}
          </Button>
        </div>
      </div>

      {/* Live Generation Banner */}
      <GenerationBanner
        isGenerating={isGenerating}
        status={runStatus}
        brandName={brandName}
        topic={currentContext?.topic}
        ideasCreated={ideasCreated}
        errorMessage={generationError}
        onDismiss={clearStatus}
        onRetry={handleOpenModal}
      />

      {/* Main Tabs Navigation [ Ideas ] [ Generaciones ] */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('ideas')}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all',
              activeTab === 'ideas'
                ? 'bg-aura-500/15 text-aura-300 border border-aura-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-dark-900 border border-transparent'
            )}
          >
            <Layers className="w-4 h-4 text-aura-400" />
            <span>Banco de Ideas</span>
            <span className="ml-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-dark-950 text-slate-300 border border-dark-800">
              {totalIdeasCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('generations')}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all',
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
        </div>

        {/* View Mode Switch (Grid vs Grouped) when inside Ideas tab */}
        {activeTab === 'ideas' && (
          <div className="flex items-center gap-1 bg-dark-950 border border-dark-800 p-1 rounded-xl self-end sm:self-auto">
            <button
              onClick={() => setViewMode('grid')}
              title="Vista Grilla Paginada"
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all',
                viewMode === 'grid'
                  ? 'bg-dark-800 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grilla</span>
            </button>
            <button
              onClick={() => setViewMode('grouped')}
              title="Vista Agrupada por Generación"
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all',
                viewMode === 'grouped'
                  ? 'bg-dark-800 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>Agrupadas</span>
            </button>
          </div>
        )}
      </div>

      {/* Active Run Filter Banner */}
      {selectedRunId && activeTab === 'ideas' && (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-aura-500/10 border border-aura-500/30 text-xs text-aura-300 animate-in fade-in">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-aura-400 shrink-0" />
            <span>
              Filtrando ideas generadas por la corrida: <strong className="text-white font-mono">{selectedRunId.slice(0, 8)}...</strong>
            </span>
          </div>
          <button
            onClick={handleClearRunFilter}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-dark-950 border border-dark-800 hover:bg-dark-900 text-slate-300 text-[11px] font-semibold transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Ver todas las ideas
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: BANCO DE IDEAS */}
      {/* ========================================================================= */}
      {activeTab === 'ideas' && (
        <div className="space-y-6">
          {/* Search & Filters Bar */}
          <div className="bg-dark-900/90 border border-dark-800 rounded-2xl p-4 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Search input */}
              <div className="flex-1 max-w-md">
                <Input
                  placeholder="Buscar por título, concepto, pilar, hook..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<Search className="w-4 h-4 text-slate-400" />}
                />
              </div>

              {/* Sort Order Dropdown */}
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

            {/* Filter Pills Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-dark-800/80">
              {/* Priority Filter Buttons */}
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

              {/* Pillar and Format selects */}
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
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center justify-between">
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

          {/* Ideas Content */}
          {!isIdeasLoading && ideas.length > 0 && (
            <div className="space-y-6">
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {ideas.map((idea) => (
                    <IdeaCard
                      key={idea.id}
                      idea={idea}
                      onProduceContent={handleProduceContent}
                    />
                  ))}
                </div>
              ) : (
                renderGroupedIdeas()
              )}

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
            <div className="p-12 text-center bg-dark-900/60 border border-dark-800 rounded-2xl space-y-4 my-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 mx-auto">
                <Inbox className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white tracking-tight">
                  No hay ideas para mostrar
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {searchQuery || priorityFilter !== 'all' || selectedRunId || pillarFilter !== 'all' || formatFilter !== 'all'
                    ? 'No se encontraron ideas con los filtros aplicados.'
                    : 'Todavía no hay ideas generadas para esta marca. Presioná "Generar Nuevas Ideas" para que la IA diseñe conceptos a medida.'}
                </p>
              </div>
              {(!searchQuery && priorityFilter === 'all' && !selectedRunId) && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleOpenModal}
                  disabled={isGenerating}
                  isLoading={isGenerating}
                  leftIcon={<Sparkles className="w-4 h-4" />}
                >
                  Generar Nuevas Ideas Ahora
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: HISTORIAL DE GENERACIONES */}
      {/* ========================================================================= */}
      {activeTab === 'generations' && (
        <div className="space-y-6">
          {/* Error alert */}
          {runsError && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center justify-between">
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
              <p className="text-xs text-slate-400 font-medium">Cargando historial de generaciones...</p>
            </div>
          )}

          {/* Runs Grid */}
          {!isRunsLoading && runs.length > 0 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {runs.map((run, idx) => {
                  const seqNum = totalRunsCount - ((runsPage - 1) * 12 + idx);
                  return (
                    <GenerationCard
                      key={run.id}
                      run={run}
                      indexNumber={seqNum}
                      onViewIdeas={handleFilterByRun}
                      onViewDetails={(r) => setInspectedRun(r)}
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
                itemLabel="generaciones"
                onPageChange={(p) => setRunsPage(p)}
                isLoading={isRunsLoading}
              />
            </div>
          )}

          {/* Empty Runs */}
          {!isRunsLoading && runs.length === 0 && (
            <div className="p-12 text-center bg-dark-900/60 border border-dark-800 rounded-2xl space-y-4 my-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 mx-auto">
                <History className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white tracking-tight">
                  No hay generaciones registradas
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Cada vez que solicites ideas a la IA se guardará una carpeta con su contexto e insumos.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenModal}
                disabled={isGenerating}
                isLoading={isGenerating}
                leftIcon={<Sparkles className="w-4 h-4" />}
              >
                Iniciar Primera Generación
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Generation Config Modal */}
      <GenerateIdeasModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onGenerate={handleConfirmGeneration}
        brandName={brandName || 'la marca activa'}
        isGenerating={isGenerating}
      />

      {/* Generation Detail Inspection Modal */}
      <GenerationDetailModal
        run={inspectedRun}
        isOpen={!!inspectedRun}
        onClose={() => setInspectedRun(null)}
        onViewIdeas={handleFilterByRun}
      />
    </div>
  );
}
