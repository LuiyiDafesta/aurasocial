import { useState, useEffect, useCallback } from 'react';
import { Brand } from '../../types/database';
import { Campaign } from '../../types/campaign';
import { ContentAsset, AssetType, AssetSortOption, AssetScope } from '../../types/contentAsset';
import { 
  searchAssets, 
  deleteAsset,
  deleteAssetsBulk
} from '../../services/contentAssetService';
import { AssetGrid } from './AssetGrid';
import { AssetFilters } from './AssetFilters';
import { AssetUploadModal } from './AssetUploadModal';
import { AssetPreviewModal } from './AssetPreviewModal';
import { AssetDetailsModal } from './AssetDetailsModal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Button } from '../common/Button';
import { useToast } from '../../hooks/useToast';
import { 
  FolderGit2, 
  Plus, 
  Sparkles, 
  Target, 
  RefreshCw,
  Trash2,
  CheckSquare,
  Square
} from 'lucide-react';

interface AssetManagementStudioProps {
  workspaceId: string;
  brand: Brand;
  campaign?: Campaign | null;
  onAssetsChanged?: () => void;
}

export function AssetManagementStudio({
  workspaceId,
  brand,
  campaign,
  onAssetsChanged,
}: AssetManagementStudioProps) {
  // Vista activa dentro del estudio de assets
  // 'campaign_assets': Assets subidos específicamente a esta campaña
  // 'brand_assets': Assets institucionales globales de la marca disponibles para referenciar
  const [activeStudioTab, setActiveStudioTab] = useState<'campaign_assets' | 'brand_assets'>(
    campaign ? 'campaign_assets' : 'brand_assets'
  );

  const [assets, setAssets] = useState<ContentAsset[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedType, setSelectedType] = useState<AssetType | 'all'>('all');
  const [sortBy, setSortBy] = useState<AssetSortOption>('newest');
  const [page, setPage] = useState<number>(1);

  // Selección Masiva (Bulk Selection)
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState<boolean>(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);

  // Modales
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [previewAsset, setPreviewAsset] = useState<ContentAsset | null>(null);
  const [detailsAsset, setDetailsAsset] = useState<ContentAsset | null>(null);
  const [assetToDelete, setAssetToDelete] = useState<ContentAsset | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const { toast } = useToast();

  const loadAssets = useCallback(async () => {
    if (!brand.id) return;

    try {
      setIsLoading(true);

      const targetScope: AssetScope | undefined = campaign
        ? (activeStudioTab === 'campaign_assets' ? 'campaign' : 'brand')
        : undefined;

      const targetCampaignId = campaign && activeStudioTab === 'campaign_assets'
        ? campaign.id
        : undefined;

      const res = await searchAssets({
        brandId: brand.id,
        campaignId: targetCampaignId,
        scope: targetScope,
        assetType: selectedType,
        search: searchTerm,
        sortBy,
        page,
        limit: 24,
      });

      setAssets(res.data);
      setTotal(res.total);
    } catch (err: any) {
      console.error('Error al cargar assets en AssetManagementStudio:', err);
      toast('Error al cargar assets multimedia', { type: 'error', description: err.message });
    } finally {
      setIsLoading(false);
    }
  }, [brand.id, campaign, activeStudioTab, selectedType, searchTerm, sortBy, page, toast]);

  // Resetear estados y recargar cuando cambia la marca o campaña
  useEffect(() => {
    setPage(1);
    setSelectedAssetIds([]);
    loadAssets();
  }, [brand.id, campaign?.id, activeStudioTab, loadAssets]);

  // Manejador de selección individual / toggle
  const handleToggleSelect = (asset: ContentAsset) => {
    setSelectedAssetIds((prev) =>
      prev.includes(asset.id)
        ? prev.filter((id) => id !== asset.id)
        : [...prev, asset.id]
    );
  };

  // Manejador de Seleccionar Todos / Deseleccionar Todos en la página actual
  const isAllCurrentPageSelected = assets.length > 0 && assets.every((a) => selectedAssetIds.includes(a.id));

  const handleToggleSelectAll = () => {
    const currentPageIds = assets.map((a) => a.id);
    if (isAllCurrentPageSelected) {
      setSelectedAssetIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
    } else {
      setSelectedAssetIds((prev) => Array.from(new Set([...prev, ...currentPageIds])));
    }
  };

  // Eliminación individual
  const handleDeleteConfirm = async () => {
    if (!assetToDelete || isDeleting) return;

    try {
      setIsDeleting(true);
      await deleteAsset(assetToDelete.id);
      toast(`Asset "${assetToDelete.name}" eliminado correctamente de Backblaze B2 y base de datos`, { type: 'success' });
      setAssetToDelete(null);
      setSelectedAssetIds((prev) => prev.filter((id) => id !== assetToDelete.id));
      loadAssets();
      onAssetsChanged?.();
    } catch (err: any) {
      console.error('Error al eliminar asset:', err);
      toast('Error al eliminar asset', { type: 'error', description: err.message });
    } finally {
      setIsDeleting(false);
    }
  };

  // Eliminación masiva en cascada
  const handleBulkDeleteConfirm = async () => {
    if (selectedAssetIds.length === 0 || isBulkDeleting) return;

    try {
      setIsBulkDeleting(true);
      const res = await deleteAssetsBulk(selectedAssetIds);
      toast(`Se eliminaron ${res.deletedCount} assets en cascada de Backblaze B2 y base de datos`, {
        type: 'success',
      });
      setSelectedAssetIds([]);
      setIsBulkConfirmOpen(false);
      loadAssets();
      onAssetsChanged?.();
    } catch (err: any) {
      console.error('Error en eliminación masiva:', err);
      toast('Error al eliminar assets en lote', { type: 'error', description: err.message });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Header & Tabs Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-dark-800/80">
        <div className="flex items-center gap-2">
          {campaign && (
            <div className="flex items-center p-1 rounded-2xl bg-dark-950 border border-dark-800">
              <button
                onClick={() => setActiveStudioTab('campaign_assets')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeStudioTab === 'campaign_assets'
                    ? 'bg-aura-500 text-dark-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Target className="w-4 h-4" />
                <span>Assets de esta Campaña</span>
              </button>

              <button
                onClick={() => setActiveStudioTab('brand_assets')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeStudioTab === 'brand_assets'
                    ? 'bg-aura-500 text-dark-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Assets de Marca Disponibles</span>
              </button>
            </div>
          )}

          {!campaign && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-pink-500/10 border border-pink-500/25 flex items-center justify-center text-pink-400">
                <FolderGit2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Biblioteca de Assets</h3>
                <p className="text-xs text-slate-400">Recursos multimedia y brand assets de {brand.name} ({total} disponibles)</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
          {assets.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleSelectAll}
              leftIcon={isAllCurrentPageSelected ? <CheckSquare className="w-3.5 h-3.5 text-aura-400" /> : <Square className="w-3.5 h-3.5" />}
              className="text-xs h-9 bg-dark-900 border-dark-700 hover:bg-dark-800"
            >
              {isAllCurrentPageSelected ? 'Deseleccionar Página' : 'Seleccionar Todos'}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={loadAssets}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            className="text-xs h-9 bg-dark-900 border-dark-700 hover:bg-dark-800"
          >
            Actualizar
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsUploadModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
            className="text-xs h-9 bg-aura-600 hover:bg-aura-500 text-white font-semibold shadow-lg shadow-aura-950/30"
          >
            + Subir Asset
          </Button>
        </div>
      </div>

      {/* Bulk Action Floating Toolbar */}
      {selectedAssetIds.length > 0 && (
        <div className="bg-dark-900/95 border border-aura-500/40 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4 flex-wrap animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-aura-500/15 border border-aura-500/30 flex items-center justify-center text-aura-400 font-bold text-xs">
              {selectedAssetIds.length}
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                {selectedAssetIds.length} {selectedAssetIds.length === 1 ? 'asset seleccionado' : 'assets seleccionados'}
              </h4>
              <p className="text-xs text-slate-400">
                Podés eliminarlos en cascada de Backblaze B2 y de la base de datos simultáneamente.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedAssetIds([])}
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
              Eliminar seleccionados ({selectedAssetIds.length})
            </Button>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <AssetFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {/* Assets Grid */}
      <AssetGrid
        assets={assets}
        isLoading={isLoading}
        selectedAssetIds={selectedAssetIds}
        onToggleSelect={handleToggleSelect}
        onPreview={(a) => setPreviewAsset(a)}
        onViewDetails={(a) => setDetailsAsset(a)}
        onDelete={(a) => setAssetToDelete(a)}
        onUploadClick={() => setIsUploadModalOpen(true)}
        emptyTitle={
          activeStudioTab === 'campaign_assets'
            ? 'Esta campaña todavía no tiene assets asociados'
            : 'No se encontraron brand assets'
        }
        emptyDescription={
          activeStudioTab === 'campaign_assets'
            ? 'Subí fotos promocionales, videos B-Roll, material gráfico o documentos específicos para esta campaña.'
            : 'Subí logos, brand books, paletas o imágenes institucionales para tenerlos siempre a mano.'
        }
      />

      {/* Upload Modal */}
      <AssetUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        workspaceId={workspaceId}
        brandId={brand.id}
        brandName={brand.name}
        scope={campaign && activeStudioTab === 'campaign_assets' ? 'campaign' : 'brand'}
        campaignId={campaign && activeStudioTab === 'campaign_assets' ? campaign.id : null}
        campaignName={campaign?.name}
        onAssetUploaded={() => {
          loadAssets();
          onAssetsChanged?.();
        }}
      />

      {/* Lightbox Preview Modal */}
      <AssetPreviewModal
        isOpen={!!previewAsset}
        onClose={() => setPreviewAsset(null)}
        asset={previewAsset}
      />

      {/* Technical Details Modal */}
      <AssetDetailsModal
        isOpen={!!detailsAsset}
        onClose={() => setDetailsAsset(null)}
        asset={detailsAsset}
        onPreview={(a) => {
          setDetailsAsset(null);
          setPreviewAsset(a);
        }}
        onDelete={(a) => {
          setDetailsAsset(null);
          setAssetToDelete(a);
        }}
      />

      {/* Individual Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!assetToDelete}
        onClose={() => setAssetToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title={`¿Eliminar asset "${assetToDelete?.name}"?`}
        message="Esta acción eliminará el archivo físico de Backblaze B2 y de la base de datos de manera permanente. No se puede deshacer."
        confirmText={isDeleting ? 'Eliminando...' : 'Eliminar Asset'}
        cancelText="Cancelar"
        type="danger"
        isLoading={isDeleting}
      />

      {/* Bulk Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={isBulkConfirmOpen}
        onClose={() => setIsBulkConfirmOpen(false)}
        onConfirm={handleBulkDeleteConfirm}
        title={`¿Eliminar ${selectedAssetIds.length} assets en cascada?`}
        message={`Esta acción eliminará permanentemente los ${selectedAssetIds.length} archivos físicos de Backblaze B2 Storage y sus registros de la base de datos. Esta operación no se puede deshacer.`}
        confirmText={isBulkDeleting ? 'Eliminando en lote...' : `Eliminar ${selectedAssetIds.length} Assets`}
        cancelText="Cancelar"
        type="danger"
        isLoading={isBulkDeleting}
      />
    </div>
  );
}
