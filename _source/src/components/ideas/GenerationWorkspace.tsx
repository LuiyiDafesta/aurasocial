import { useState, useEffect, useCallback } from 'react';
import { GenerationRun } from '../../types/generationRun';
import { ContentIdea } from '../../types/contentIdea';
import { IdeaCard } from './IdeaCard';
import { Button } from '../common/Button';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { deleteIdea, deleteIdeasBulk } from '../../services/ideasService';
import { supabase } from '../../lib/supabase';
import { formatInArgentina } from '../../lib/dateUtils';
import { useToast } from '../../hooks/useToast';
import { 
  ArrowLeft, 
  Sparkles, 
  Calendar, 
  Layers, 
  Tag, 
  Globe, 
  Target, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2,
  Info,
  Trash2,
  CheckSquare,
  Square
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface GenerationWorkspaceProps {
  generation: GenerationRun;
  indexNumber?: number;
  onBack: () => void;
  onViewContext: (generation: GenerationRun) => void;
  onProduceContent?: (idea: ContentIdea) => void;
  onDeleteGeneration?: (generation: GenerationRun) => void;
}

export function GenerationWorkspace({
  generation,
  indexNumber,
  onBack,
  onViewContext,
  onProduceContent,
  onDeleteGeneration,
}: GenerationWorkspaceProps) {
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selección Masiva y Eliminación
  const [selectedIdeaIds, setSelectedIdeaIds] = useState<string[]>([]);
  const [ideaToDelete, setIdeaToDelete] = useState<ContentIdea | null>(null);
  const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);

  const { toast } = useToast();

  const ctx = generation.generation_context;
  const topic = ctx?.topic || 'Estrategia Abierta de Marca';
  const keywords = ctx?.keywords || [];
  const objective = ctx?.objective || 'Aumentar engagement, interacción y reconocimiento de marca';
  const format = ctx?.preferred_format || 'any';
  const hasWebResearch = ctx?.web_research ?? true;

  // Consulta determinística de ideas por generation_run_id
  const loadGenerationIdeas = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: queryErr } = await supabase
        .from('content_ideas')
        .select('*')
        .eq('generation_run_id', generation.id)
        .order('created_at', { ascending: true });

      if (queryErr) throw queryErr;
      setIdeas((data as ContentIdea[]) || []);
    } catch (err: any) {
      console.error('Error al cargar ideas de la generación:', err);
      setError(err.message || 'Error al cargar las ideas de esta generación');
    } finally {
      setIsLoading(false);
    }
  }, [generation.id]);

  useEffect(() => {
    if (generation.id) {
      loadGenerationIdeas();
    }
  }, [generation.id, loadGenerationIdeas]);

  const handleToggleSelectIdea = (idea: ContentIdea) => {
    setSelectedIdeaIds((prev) =>
      prev.includes(idea.id)
        ? prev.filter((id) => id !== idea.id)
        : [...prev, idea.id]
    );
  };

  const isAllCurrentPageSelected = ideas.length > 0 && ideas.every((i) => selectedIdeaIds.includes(i.id));

  const handleToggleSelectAllIdeas = () => {
    const pageIds = ideas.map((i) => i.id);
    if (isAllCurrentPageSelected) {
      setSelectedIdeaIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIdeaIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleDeleteIdeaConfirm = async () => {
    if (!ideaToDelete || isDeleting) return;
    try {
      setIsDeleting(true);
      await deleteIdea(ideaToDelete.id);
      toast(`Idea "${ideaToDelete.title}" eliminada correctamente`, { type: 'success' });
      setIdeaToDelete(null);
      setSelectedIdeaIds((prev) => prev.filter((id) => id !== ideaToDelete.id));
      await loadGenerationIdeas();
    } catch (err: any) {
      toast('Error al eliminar idea', { type: 'error', description: err.message });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDeleteIdeasConfirm = async () => {
    if (selectedIdeaIds.length === 0 || isBulkDeleting) return;
    try {
      setIsBulkDeleting(true);
      const res = await deleteIdeasBulk(selectedIdeaIds);
      toast(`Se eliminaron ${res.deletedCount} ideas de esta sesión correctamente`, { type: 'success' });
      setSelectedIdeaIds([]);
      setIsBulkConfirmOpen(false);
      await loadGenerationIdeas();
    } catch (err: any) {
      toast('Error al eliminar ideas en lote', { type: 'error', description: err.message });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const getFormatBadge = (fmt: string) => {
    switch (fmt?.toLowerCase()) {
      case 'tiktok': return 'TikTok';
      case 'reel': return 'Instagram Reel';
      case 'video': return 'Video';
      case 'carousel': return 'Carrusel';
      case 'post': return 'Post / Imagen';
      default: return 'Cualquier Formato';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Completada con éxito
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/25">
            <XCircle className="w-3.5 h-3.5" />
            Fallida
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-aura-500/10 text-aura-300 border border-aura-500/25 animate-pulse">
            <Clock className="w-3.5 h-3.5" />
            En curso
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Back Navigation Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          className="text-xs"
        >
          Volver a Generaciones
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewContext(generation)}
            leftIcon={<Info className="w-3.5 h-3.5" />}
            className="text-xs"
          >
            Ver Contexto Completo y Fuentes
          </Button>

          {onDeleteGeneration && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => onDeleteGeneration(generation)}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              className="text-xs bg-rose-600/80 hover:bg-rose-500 text-white font-semibold"
            >
              Eliminar Sesión
            </Button>
          )}
        </div>
      </div>

      {/* Generation Strategic Header Container */}
      <div className="bg-dark-900 border border-dark-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-aura-500/10 via-pink-500/5 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-dark-800/80 pb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500/20 to-aura-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold font-mono">
                <Sparkles className="w-3.5 h-3.5" />
                GENERACIÓN {indexNumber !== undefined ? `#${indexNumber}` : ''}
              </span>
              {getStatusBadge(generation.status)}
            </div>

            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight leading-tight">
              ✨ {topic}
            </h1>
          </div>

          <div className="text-xs text-slate-400 font-mono flex md:flex-col items-start md:items-end gap-2 shrink-0">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {formatInArgentina(generation.created_at)}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-dark-950 border border-dark-800 text-slate-300">
              {ideas.length || generation.ideas_created || 5} ideas en esta sesión
            </span>
          </div>
        </div>

        {/* Strategic Insumos Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Objective */}
          <div className="p-4 rounded-2xl bg-dark-950/70 border border-dark-800/80 space-y-1.5 md:col-span-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-pink-400" />
              Objetivo Estratégico Solicitado
            </span>
            <p className="text-slate-200 leading-relaxed font-medium">
              {objective}
            </p>
          </div>

          {/* Formats & Research */}
          <div className="p-4 rounded-2xl bg-dark-950/70 border border-dark-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-aura-400" />
                Formato
              </span>
              <span className="font-semibold text-white">{getFormatBadge(format)}</span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-dark-800/60">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-sky-400" />
                Investigación
              </span>
              <span className={cn('font-semibold', hasWebResearch ? 'text-sky-300' : 'text-slate-400')}>
                {hasWebResearch ? 'Web Trends Activo' : 'Sin Búsqueda'}
              </span>
            </div>
          </div>
        </div>

        {/* Keywords */}
        {keywords.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              Keywords:
            </span>
            {keywords.map((kw, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[11px] font-mono font-medium"
              >
                #{kw}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Bulk Action Floating Toolbar */}
      {selectedIdeaIds.length > 0 && (
        <div className="bg-dark-900/95 border border-aura-500/40 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4 flex-wrap animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-aura-500/15 border border-aura-500/30 flex items-center justify-center text-aura-400 font-bold text-xs">
              {selectedIdeaIds.length}
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                {selectedIdeaIds.length} {selectedIdeaIds.length === 1 ? 'idea seleccionada' : 'ideas seleccionadas'}
              </h4>
              <p className="text-xs text-slate-400">
                Podés eliminarlas de esta sesión estratégica simultáneamente.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedIdeaIds([])}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancelar selección
            </Button>

            <Button
              variant="danger"
              size="sm"
              onClick={() => setIsBulkConfirmOpen(true)}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              className="text-xs bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-lg shadow-rose-950/30"
            >
              Eliminar seleccionadas ({selectedIdeaIds.length})
            </Button>
          </div>
        </div>
      )}

      {/* Ideas Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-aura-400" />
          Ideas Generadas en Esta Sesión ({ideas.length})
        </h2>

        <div className="flex items-center gap-2">
          {ideas.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleSelectAllIdeas}
              leftIcon={isAllCurrentPageSelected ? <CheckSquare className="w-3.5 h-3.5 text-aura-400" /> : <Square className="w-3.5 h-3.5" />}
              className="text-xs h-9 bg-dark-900 border-dark-800 hover:bg-dark-800"
            >
              {isAllCurrentPageSelected ? 'Deseleccionar Todas' : 'Seleccionar Todas'}
            </Button>
          )}
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="p-12 flex flex-col items-center justify-center space-y-3 min-h-[250px]">
          <Loader2 className="w-8 h-8 text-aura-500 animate-spin" />
          <p className="text-xs text-slate-400 font-medium">Cargando ideas de la generación...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center justify-between">
          <span>{error}</span>
        </div>
      )}

      {/* Ideas Grid */}
      {!isLoading && ideas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {ideas.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              isSelected={selectedIdeaIds.includes(idea.id)}
              onToggleSelect={handleToggleSelectIdea}
              onDelete={(i) => setIdeaToDelete(i)}
              onProduceContent={onProduceContent}
            />
          ))}
        </div>
      )}

      {/* Empty ideas inside run */}
      {!isLoading && ideas.length === 0 && !error && (
        <div className="p-12 text-center bg-dark-900/60 border border-dark-800 rounded-3xl space-y-3">
          <p className="text-sm font-semibold text-white">
            No se encontraron ideas vinculadas a esta generación.
          </p>
          <p className="text-xs text-slate-400">
            Esta corrida puede encontrarse en proceso o haber finalizado sin insertar registros.
          </p>
        </div>
      )}

      {/* Diálogo de Confirmación para Eliminación Individual de Idea */}
      <ConfirmDialog
        isOpen={!!ideaToDelete}
        onClose={() => setIdeaToDelete(null)}
        onConfirm={handleDeleteIdeaConfirm}
        title={`¿Eliminar idea "${ideaToDelete?.title}"?`}
        message="Esta acción eliminará de forma permanente la idea de esta sesión estratégica. No se puede deshacer."
        confirmText={isDeleting ? 'Eliminando...' : 'Eliminar Idea'}
        cancelText="Cancelar"
        type="danger"
        isLoading={isDeleting}
      />

      {/* Diálogo de Confirmación para Eliminación Masiva de Ideas */}
      <ConfirmDialog
        isOpen={isBulkConfirmOpen}
        onClose={() => setIsBulkConfirmOpen(false)}
        onConfirm={handleBulkDeleteIdeasConfirm}
        title={`¿Eliminar ${selectedIdeaIds.length} ideas seleccionadas?`}
        message={`Esta acción eliminará de forma permanente las ${selectedIdeaIds.length} ideas seleccionadas de esta sesión de generación. No se puede revertir.`}
        confirmText={isBulkDeleting ? 'Eliminando en lote...' : `Eliminar ${selectedIdeaIds.length} Ideas`}
        cancelText="Cancelar"
        type="danger"
        isLoading={isBulkDeleting}
      />
    </div>
  );
}
