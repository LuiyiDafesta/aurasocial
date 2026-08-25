import { useState, useEffect } from 'react';
import { ContentFilterBar } from '../components/content/ContentFilterBar';
import { ContentGrid } from '../components/content/ContentGrid';
import { ContentWorkspace } from '../components/studio/ContentWorkspace';
import { AssignToCampaignModal } from '../components/campaigns/AssignToCampaignModal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useContentItems } from '../hooks/useContentItems';
import { ContentItem, ContentStatus, SocialPlatform } from '../types/contentItem';
import { ContentVersion } from '../types/contentVersion';
import { getContentVersions } from '../services/contentVersionService';
import { deleteContentItem, deleteContentItemsBulk } from '../services/contentItemsService';
import { RefreshCw, Sparkles, Layers, Trash2, CheckSquare, Square } from 'lucide-react';
import { Button } from '../components/common/Button';
import { useToast } from '../hooks/useToast';

interface ContenidosPageProps {
  workspaceId?: string | null;
  brandId?: string | null;
  onContentMutated?: () => void;
}

export function ContenidosPage({ workspaceId, brandId, onContentMutated }: ContenidosPageProps) {
  const [selectedContentItem, setSelectedContentItem] = useState<ContentItem | null>(null);
  const [selectedContentVersion, setSelectedContentVersion] = useState<ContentVersion | null>(null);
  const [contentToAssignCampaign, setContentToAssignCampaign] = useState<ContentItem | null>(null);
  const [statusFilter, setStatusFilter] = useState<ContentStatus | 'all'>('all');
  const [platformFilter, setPlatformFilter] = useState<SocialPlatform | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selección masiva y eliminación
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [itemToDelete, setItemToDelete] = useState<ContentItem | null>(null);
  const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);

  const { toast } = useToast();

  const { items, isLoading, error, refreshItems } = useContentItems({
    status: statusFilter,
    platform: platformFilter,
    searchQuery: searchQuery,
    workspaceId: workspaceId,
    brandId: brandId,
  });

  // Limpiar selección al cambiar filtros o marca
  useEffect(() => {
    setSelectedItemIds([]);
  }, [brandId, statusFilter, platformFilter, searchQuery]);

  const handleResetFilters = () => {
    setStatusFilter('all');
    setPlatformFilter('all');
    setSearchQuery('');
  };

  const handleReview = async (item: ContentItem) => {
    setSelectedContentItem(item);
    try {
      const versions = await getContentVersions(item.id);
      setSelectedContentVersion(versions && versions.length > 0 ? versions[0] : null);
    } catch {
      setSelectedContentVersion(null);
    }
  };

  const handleToggleSelectItem = (item: ContentItem) => {
    setSelectedItemIds((prev) =>
      prev.includes(item.id)
        ? prev.filter((id) => id !== item.id)
        : [...prev, item.id]
    );
  };

  const isAllCurrentPageSelected = items.length > 0 && items.every((i) => selectedItemIds.includes(i.id));

  const handleToggleSelectAllItems = () => {
    const pageIds = items.map((i) => i.id);
    if (isAllCurrentPageSelected) {
      setSelectedItemIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedItemIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleDeleteItemConfirm = async () => {
    if (!itemToDelete || isDeleting) return;
    try {
      setIsDeleting(true);
      await deleteContentItem(itemToDelete.id);
      toast(`Contenido "${itemToDelete.title}" eliminado correctamente`, { type: 'success' });
      setItemToDelete(null);
      setSelectedItemIds((prev) => prev.filter((id) => id !== itemToDelete.id));
      refreshItems();
      onContentMutated?.();
    } catch (err: any) {
      toast('Error al eliminar contenido', { type: 'error', description: err.message });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDeleteItemsConfirm = async () => {
    if (selectedItemIds.length === 0 || isBulkDeleting) return;
    try {
      setIsBulkDeleting(true);
      const res = await deleteContentItemsBulk(selectedItemIds);
      toast(`Se eliminaron ${res.deletedCount} contenidos en cascada correctamente`, { type: 'success' });
      setSelectedItemIds([]);
      setIsBulkConfirmOpen(false);
      refreshItems();
      onContentMutated?.();
    } catch (err: any) {
      toast('Error al eliminar contenidos en lote', { type: 'error', description: err.message });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Si hay un contenido seleccionado, renderizar el Content Workspace unificado
  if (selectedContentItem) {
    return (
      <ContentWorkspace
        item={selectedContentItem}
        currentVersion={selectedContentVersion}
        onBack={() => {
          setSelectedContentItem(null);
          setSelectedContentVersion(null);
        }}
        onContentUpdated={() => {
          refreshItems();
          onContentMutated?.();
        }}
      />
    );
  }

  // De lo contrario, renderizar el listado general con filtros
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
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

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {items.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleSelectAllItems}
              leftIcon={isAllCurrentPageSelected ? <CheckSquare className="w-3.5 h-3.5 text-aura-400" /> : <Square className="w-3.5 h-3.5" />}
              className="text-xs h-9 bg-dark-900 border-dark-800 hover:bg-dark-800"
            >
              {isAllCurrentPageSelected ? 'Deseleccionar Página' : 'Seleccionar Todos'}
            </Button>
          )}

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
            Revisión de Contenidos
          </span>
        </div>
      </div>

      {/* Bulk Action Floating Toolbar */}
      {selectedItemIds.length > 0 && (
        <div className="bg-dark-900/95 border border-aura-500/40 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4 flex-wrap animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-aura-500/15 border border-aura-500/30 flex items-center justify-center text-aura-400 font-bold text-xs">
              {selectedItemIds.length}
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                {selectedItemIds.length} {selectedItemIds.length === 1 ? 'contenido seleccionado' : 'contenidos seleccionados'}
              </h4>
              <p className="text-xs text-slate-400">
                Podés eliminarlos en cascada de la plataforma y de Backblaze B2 Storage.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedItemIds([])}
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
              Eliminar seleccionados ({selectedItemIds.length})
            </Button>
          </div>
        </div>
      )}

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
        selectedItemIds={selectedItemIds}
        onToggleSelect={handleToggleSelectItem}
        onDelete={(it) => setItemToDelete(it)}
        onReview={handleReview}
        onResetFilters={handleResetFilters}
        onAssignCampaign={(it) => setContentToAssignCampaign(it)}
      />

      {/* Modal de Asignación a Campaña */}
      {contentToAssignCampaign && (
        <AssignToCampaignModal
          isOpen={!!contentToAssignCampaign}
          onClose={() => setContentToAssignCampaign(null)}
          entityType="content"
          entityId={contentToAssignCampaign.id}
          entityTitle={contentToAssignCampaign.title}
          brandId={brandId || ''}
          currentCampaignId={contentToAssignCampaign.campaign_id}
          onAssigned={() => {
            refreshItems();
            onContentMutated?.();
          }}
        />
      )}

      {/* Diálogo de Confirmación para Eliminación Individual de Contenido */}
      <ConfirmDialog
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDeleteItemConfirm}
        title={`¿Eliminar contenido "${itemToDelete?.title}"?`}
        message="Esta acción eliminará de forma permanente el contenido, sus adaptaciones, versiones y assets asociados en Backblaze B2. No se puede deshacer."
        confirmText={isDeleting ? 'Eliminando...' : 'Eliminar Contenido'}
        cancelText="Cancelar"
        type="danger"
        isLoading={isDeleting}
      />

      {/* Diálogo de Confirmación para Eliminación Masiva de Contenidos */}
      <ConfirmDialog
        isOpen={isBulkConfirmOpen}
        onClose={() => setIsBulkConfirmOpen(false)}
        onConfirm={handleBulkDeleteItemsConfirm}
        title={`¿Eliminar ${selectedItemIds.length} contenidos seleccionados?`}
        message={`Esta acción eliminará de forma permanente los ${selectedItemIds.length} contenidos y todos sus recursos multimedia asociados en Backblaze B2. No se puede revertir.`}
        confirmText={isBulkDeleting ? 'Eliminando en lote...' : `Eliminar ${selectedItemIds.length} Contenidos`}
        cancelText="Cancelar"
        type="danger"
        isLoading={isBulkDeleting}
      />
    </div>
  );
}
