import { useState, useEffect, useCallback } from 'react';
import { ContentAsset, AssetType } from '../../types/contentAsset';
import { searchAssets } from '../../services/contentAssetService';
import { AssetGrid } from './AssetGrid';
import { AssetFilters } from './AssetFilters';
import { AssetPreviewModal } from './AssetPreviewModal';
import { AssetDetailsModal } from './AssetDetailsModal';
import { AssetUploadModal } from './AssetUploadModal';
import { Button } from '../common/Button';
import { useToast } from '../../hooks/useToast';
import { 
  FolderPlus, 
  X, 
  Check,
  UploadCloud
} from 'lucide-react';

interface AssetPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  brandId: string;
  workspaceId?: string;
  brandName?: string;
  contentItemId?: string | null;
  contentTitle?: string;
  onSelectAsset: (asset: ContentAsset) => void;
  title?: string;
  allowedTypes?: AssetType[];
}

export function AssetPickerModal({
  isOpen,
  onClose,
  brandId,
  workspaceId,
  brandName,
  contentItemId,
  contentTitle,
  onSelectAsset,
  title = 'Seleccionar Asset Multimedia',
}: AssetPickerModalProps) {
  const [assets, setAssets] = useState<ContentAsset[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedType, setSelectedType] = useState<AssetType | 'all'>('all');
  const [sortBy, setSortBy] = useState<any>('newest');

  // Selección
  const [selectedAsset, setSelectedAsset] = useState<ContentAsset | null>(null);

  // Modales de preview / detalle / upload
  const [previewAsset, setPreviewAsset] = useState<ContentAsset | null>(null);
  const [detailsAsset, setDetailsAsset] = useState<ContentAsset | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);

  const { toast } = useToast();

  const loadAssets = useCallback(async () => {
    if (!brandId) return;

    try {
      setIsLoading(true);
      const res = await searchAssets({
        brandId,
        search: searchTerm,
        assetType: selectedType,
        sortBy,
        limit: 30,
      });

      setAssets(res.data);
      setTotal(res.total);
    } catch (err: any) {
      console.error('Error al cargar assets para selector:', err);
      toast('Error al cargar assets', { type: 'error', description: err.message });
    } finally {
      setIsLoading(false);
    }
  }, [brandId, searchTerm, selectedType, sortBy, toast]);

  useEffect(() => {
    if (isOpen) {
      loadAssets();
      setSelectedAsset(null);
    }
  }, [isOpen, loadAssets]);

  if (!isOpen) return null;

  const handleConfirmSelection = () => {
    if (!selectedAsset) return;
    onSelectAsset(selectedAsset);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-dark-900 border border-dark-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-800 bg-dark-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-aura-500/10 border border-aura-500/25 flex items-center justify-center text-aura-400">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                {title}
              </h2>
              <p className="text-xs text-slate-400">
                Seleccioná un recurso de la biblioteca multimedia ({total} assets disponibles)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsUploadModalOpen(true)}
              leftIcon={<UploadCloud className="w-4 h-4" />}
              className="text-xs bg-aura-600 hover:bg-aura-500 text-white font-semibold"
            >
              Subir Asset
            </Button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-dark-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 bg-dark-950/70 border-b border-dark-800">
          <AssetFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedType={selectedType}
            onTypeChange={setSelectedType}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />
        </div>

        {/* Assets Grid Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <AssetGrid
            assets={assets}
            isLoading={isLoading}
            onPreview={(a) => setPreviewAsset(a)}
            onViewDetails={(a) => setDetailsAsset(a)}
            onDelete={() => {}}
            onUploadClick={() => setIsUploadModalOpen(true)}
            onSelect={(a) => setSelectedAsset(a)}
            isSelectable={true}
            selectedAssetIds={selectedAsset ? [selectedAsset.id] : []}
            emptyTitle="No se encontraron assets disponibles"
            emptyDescription="Subí tus videos o imágenes para asignarlos a esta escena."
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-dark-800 bg-dark-900/90 flex items-center justify-between gap-4">
          <span className="text-xs text-slate-400">
            {selectedAsset ? (
              <span className="text-white font-semibold flex items-center gap-1.5">
                <Check className="w-4 h-4 text-aura-400" />
                Seleccionado: {selectedAsset.name}
              </span>
            ) : (
              'Ningún asset seleccionado'
            )}
          </span>

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose} className="text-xs">
              Cancelar
            </Button>

            <Button
              variant="primary"
              onClick={handleConfirmSelection}
              disabled={!selectedAsset}
              className="text-xs bg-aura-600 hover:bg-aura-500 text-white font-semibold"
            >
              Vincular Asset Seleccionado
            </Button>
          </div>
        </div>

        {/* Lightbox Previews & Upload Modal */}
        <AssetPreviewModal
          isOpen={!!previewAsset}
          onClose={() => setPreviewAsset(null)}
          asset={previewAsset}
        />

        <AssetDetailsModal
          isOpen={!!detailsAsset}
          onClose={() => setDetailsAsset(null)}
          asset={detailsAsset}
          onPreview={(a) => {
            setDetailsAsset(null);
            setPreviewAsset(a);
          }}
          onDelete={() => {}}
        />

        {isUploadModalOpen && (
          <AssetUploadModal
            isOpen={isUploadModalOpen}
            onClose={() => setIsUploadModalOpen(false)}
            workspaceId={workspaceId || ''}
            brandId={brandId}
            brandName={brandName || 'Aura Brand'}
            scope="brand"
            contentItemId={contentItemId}
            contentTitle={contentTitle}
            onAssetUploaded={() => {
              setIsUploadModalOpen(false);
              loadAssets();
            }}
          />
        )}

      </div>
    </div>
  );
}
