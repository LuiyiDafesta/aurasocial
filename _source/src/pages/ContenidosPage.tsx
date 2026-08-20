import { useState } from 'react';
import { ContentFilterBar } from '../components/content/ContentFilterBar';
import { ContentGrid } from '../components/content/ContentGrid';
import { useContentItems } from '../hooks/useContentItems';
import { ContentItem, ContentStatus, SocialPlatform } from '../types/contentItem';
import { RefreshCw, Sparkles, Layers } from 'lucide-react';
import { Button } from '../components/common/Button';
import { useToast } from '../hooks/useToast';

interface ContenidosPageProps {
  onSelectContentForReview?: (item: ContentItem) => void;
}

export function ContenidosPage({ onSelectContentForReview }: ContenidosPageProps) {
  const [statusFilter, setStatusFilter] = useState<ContentStatus | 'all'>('all');
  const [platformFilter, setPlatformFilter] = useState<SocialPlatform | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const { toast } = useToast();

  const { items, isLoading, error, refreshItems } = useContentItems({
    status: statusFilter,
    platform: platformFilter,
    searchQuery: searchQuery,
  });

  const handleResetFilters = () => {
    setStatusFilter('all');
    setPlatformFilter('all');
    setSearchQuery('');
  };

  const handleReview = (item: ContentItem) => {
    if (onSelectContentForReview) {
      onSelectContentForReview(item);
    } else {
      toast(`Seleccionaste: "${item.title}"`, {
        type: 'info',
        description: 'El Panel de Revisión Split se conectará en la Fase 5.',
      });
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-dark-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-aura-500/10 border border-aura-500/25 text-aura-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Gestión de Contenidos</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Revisá, aprobá, rechazá y programá los contenidos generados por la IA de forma independiente.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refreshItems();
              toast('Lista actualizada', { type: 'info', duration: 2000 });
            }}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Actualizar
          </Button>

          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-aura-500/10 text-aura-300 border border-aura-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            MVP Fase 4
          </span>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={refreshItems}>
            Reintentar
          </Button>
        </div>
      )}

      {/* Filter Bar */}
      <ContentFilterBar
        currentStatus={statusFilter}
        onSelectStatus={setStatusFilter}
        currentPlatform={platformFilter}
        onSelectPlatform={setPlatformFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalCount={items.length}
      />

      {/* Content Grid */}
      <ContentGrid
        items={items}
        isLoading={isLoading}
        onReview={handleReview}
        onResetFilters={handleResetFilters}
      />
    </div>
  );
}
