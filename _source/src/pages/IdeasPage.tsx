import { useState } from 'react';
import { useIdeas } from '../hooks/useIdeas';
import { useIdeaGeneration } from '../hooks/useIdeaGeneration';
import { IdeaCard } from '../components/ideas/IdeaCard';
import { GenerationBanner } from '../components/ideas/GenerationBanner';
import { GenerateIdeasModal } from '../components/ideas/GenerateIdeasModal';
import { IdeaPriority, ContentIdea } from '../types/contentIdea';
import { GenerationContext } from '../types/generationRun';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { useToast } from '../hooks/useToast';
import { 
  Lightbulb, 
  Sparkles, 
  RefreshCw, 
  Search, 
  Loader2,
  Inbox
} from 'lucide-react';
import { cn } from '../lib/utils';

interface IdeasPageProps {
  workspaceId?: string | null;
  brandId?: string | null;
  brandName?: string;
}

export function IdeasPage({ workspaceId, brandId, brandName }: IdeasPageProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<IdeaPriority | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const { toast } = useToast();

  const { ideas, isLoading, error, refreshIdeas } = useIdeas({
    workspaceId,
    brandId,
    priority: priorityFilter,
    searchQuery,
  });

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

  const priorityOptions = [
    { id: 'all' as const, label: 'Todas las Prioridades' },
    { id: 'high' as const, label: 'Alta Prioridad' },
    { id: 'normal' as const, label: 'Media' },
    { id: 'low' as const, label: 'Baja' },
  ];

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
            Estrategia y conceptos diseñados por IA para la marca activa <strong className="text-white">{brandName || 'TravelRockChannel'}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refreshIdeas();
              toast('Lista de ideas actualizada', { type: 'info', duration: 2000 });
            }}
            isLoading={isLoading}
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

      {/* Search & Filter Bar */}
      <div className="bg-dark-900/90 border border-dark-800 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Buscar por título, concepto, pilar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>

        {/* Priority Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {priorityOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setPriorityFilter(opt.id)}
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
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={refreshIdeas}>
            Reintentar
          </Button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="p-12 flex flex-col items-center justify-center space-y-3 min-h-[300px]">
          <Loader2 className="w-8 h-8 text-aura-500 animate-spin" />
          <p className="text-xs text-slate-400 font-medium">Cargando banco de ideas...</p>
        </div>
      )}

      {/* Ideas Grid */}
      {!isLoading && ideas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {ideas.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              onProduceContent={handleProduceContent}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && ideas.length === 0 && (
        <div className="p-12 text-center bg-dark-900/60 border border-dark-800 rounded-2xl space-y-4 my-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 mx-auto">
            <Inbox className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white tracking-tight">
              No hay ideas para mostrar
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery || priorityFilter !== 'all'
                ? 'No se encontraron ideas con los filtros aplicados.'
                : 'Todavía no hay ideas generadas para esta marca. Presioná "Generar Nuevas Ideas" para que la IA diseñe conceptos a medida.'}
            </p>
          </div>
          {(!searchQuery && priorityFilter === 'all') && (
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

      {/* Config Modal */}
      <GenerateIdeasModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onGenerate={handleConfirmGeneration}
        brandName={brandName || 'TravelRockChannel'}
        isGenerating={isGenerating}
      />
    </div>
  );
}
