import { ContentAsset } from '../../types/contentAsset';
import { AssetCard } from './AssetCard';
import { FolderGit2, Plus } from 'lucide-react';
import { Button } from '../common/Button';

interface AssetGridProps {
  assets: ContentAsset[];
  isLoading: boolean;
  onPreview: (asset: ContentAsset) => void;
  onViewDetails: (asset: ContentAsset) => void;
  onDelete: (asset: ContentAsset) => void;
  onUploadClick?: () => void;
  onSelect?: (asset: ContentAsset) => void;
  isSelectable?: boolean;
  selectedAssetIds?: string[];
  emptyTitle?: string;
  emptyDescription?: string;
}

export function AssetGrid({
  assets,
  isLoading,
  onPreview,
  onViewDetails,
  onDelete,
  onUploadClick,
  onSelect,
  isSelectable = false,
  selectedAssetIds = [],
  emptyTitle = 'No se encontraron assets',
  emptyDescription = 'Subí archivos de imagen, video, audio o documentos para comenzar a enriquecer tu biblioteca.',
}: AssetGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="bg-dark-900/60 border border-dark-800 rounded-2xl p-4 space-y-3 animate-pulse"
          >
            <div className="aspect-video bg-dark-800 rounded-xl"></div>
            <div className="flex items-center justify-between">
              <div className="w-16 h-4 bg-dark-800 rounded"></div>
              <div className="w-12 h-4 bg-dark-800 rounded"></div>
            </div>
            <div className="w-3/4 h-4 bg-dark-800 rounded"></div>
            <div className="pt-2 border-t border-dark-800 flex justify-between">
              <div className="w-14 h-4 bg-dark-800 rounded"></div>
              <div className="w-14 h-4 bg-dark-800 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="bg-dark-900/60 border border-dark-800 rounded-3xl p-12 text-center space-y-4 max-w-lg mx-auto my-8">
        <div className="w-14 h-14 rounded-2xl bg-pink-500/10 border border-pink-500/25 flex items-center justify-center text-pink-400 mx-auto">
          <FolderGit2 className="w-7 h-7" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-white tracking-tight">{emptyTitle}</h3>
          <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
            {emptyDescription}
          </p>
        </div>
        {onUploadClick && (
          <div className="pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={onUploadClick}
              leftIcon={<Plus className="w-4 h-4" />}
              className="bg-aura-600 hover:bg-aura-500 text-white font-semibold text-xs"
            >
              + Subir Primer Asset
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
      {assets.map((asset) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          onPreview={onPreview}
          onViewDetails={onViewDetails}
          onDelete={onDelete}
          onSelect={onSelect}
          isSelectable={isSelectable}
          isSelected={selectedAssetIds.includes(asset.id)}
        />
      ))}
    </div>
  );
}
