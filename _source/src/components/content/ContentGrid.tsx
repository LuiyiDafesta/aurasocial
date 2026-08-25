import { ContentItem } from '../../types/contentItem';
import { ContentCard } from './ContentCard';
import { Inbox, RotateCcw } from 'lucide-react';
import { Button } from '../common/Button';

interface ContentGridProps {
  items: ContentItem[];
  isLoading: boolean;
  onReview: (item: ContentItem) => void;
  onResetFilters?: () => void;
  onAssignCampaign?: (item: ContentItem) => void;
  onDelete?: (item: ContentItem) => void;
  selectedItemIds?: string[];
  onToggleSelect?: (item: ContentItem) => void;
}

export function ContentGrid({
  items,
  isLoading,
  onReview,
  onResetFilters,
  onAssignCampaign,
  onDelete,
  selectedItemIds = [],
  onToggleSelect,
}: ContentGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-dark-900/60 border border-dark-800 rounded-2xl p-5 space-y-4 animate-pulse"
          >
            <div className="flex items-center justify-between">
              <div className="w-24 h-5 bg-dark-800 rounded-lg"></div>
              <div className="w-16 h-5 bg-dark-800 rounded-full"></div>
            </div>
            <div className="w-full h-8 bg-dark-800/80 rounded-xl"></div>
            <div className="space-y-2">
              <div className="w-full h-4 bg-dark-800 rounded"></div>
              <div className="w-3/4 h-4 bg-dark-800 rounded"></div>
            </div>
            <div className="pt-4 border-t border-dark-800/80 flex items-center justify-between">
              <div className="w-28 h-4 bg-dark-800 rounded"></div>
              <div className="w-20 h-8 bg-dark-800 rounded-xl"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-dark-900/60 border border-dark-800 rounded-2xl p-12 text-center space-y-4 max-w-md mx-auto my-8">
        <div className="w-14 h-14 rounded-2xl bg-dark-800 border border-dark-700 flex items-center justify-center text-slate-400 mx-auto">
          <Inbox className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">No se encontraron contenidos</h3>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            No hay elementos que coincidan con los filtros seleccionados o todavía no se generaron contenidos para esta red.
          </p>
        </div>
        {onResetFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onResetFilters}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            className="mt-2"
          >
            Restablecer Filtros
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {items.map((item) => (
        <ContentCard
          key={item.id}
          item={item}
          isSelected={selectedItemIds.includes(item.id)}
          onToggleSelect={onToggleSelect}
          onDelete={onDelete}
          onReview={onReview}
          onAssignCampaign={onAssignCampaign}
        />
      ))}
    </div>
  );
}
