import { useState, useEffect, useCallback } from 'react';
import { ContentItem } from '../../types/contentItem';
import { ContentVersion } from '../../types/contentVersion';
import { ContentAsset } from '../../types/contentAsset';
import {
  PlatformAdaptation,
  TargetPlatform,
  PublicationPackage,
} from '../../types/platformAdaptation';
import {
  getPlatformAdaptations,
  generateDefaultAdaptations,
  updateAdaptationSceneAsset,
  savePlatformAdaptation,
  approvePlatformAdaptation,
  syncScenesToAllAdaptations,
} from '../../services/platformAdaptationService';
import { composeAndRenderAdaptation } from '../../services/renderService';
import { SceneMediaPlannerPanel } from './SceneMediaPlannerPanel';
import { UnifiedSocialPreview } from './UnifiedSocialPreview';
import { PlatformAdaptationPanel } from './PlatformAdaptationPanel';
import { AssetPickerModal } from '../assets/AssetPickerModal';
import { AssignToCampaignModal } from '../campaigns/AssignToCampaignModal';
import { Button } from '../common/Button';
import { useToast } from '../../hooks/useToast';
import { 
  ArrowLeft, 
  Loader2,
  MoreVertical,
  Code2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Target
} from 'lucide-react';

interface ContentWorkspaceProps {
  item: ContentItem;
  currentVersion?: ContentVersion | null;
  onBack: () => void;
  onContentUpdated?: () => void;
}

export function ContentWorkspace({
  item,
  currentVersion,
  onBack,
  onContentUpdated,
}: ContentWorkspaceProps) {
  const [adaptations, setAdaptations] = useState<PlatformAdaptation[]>([]);
  const [activePlatform, setActivePlatform] = useState<TargetPlatform>('instagram');
  const [activeSceneNumber, setActiveSceneNumber] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedSceneForAsset, setSelectedSceneForAsset] = useState<number | null>(null);
  
  // Modals
  const [isAssetPickerOpen, setIsAssetPickerOpen] = useState<boolean>(false);
  const [isAssignCampaignOpen, setIsAssignCampaignOpen] = useState<boolean>(false);
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState<boolean>(false);
  const [isSecondaryMenuOpen, setIsSecondaryMenuOpen] = useState<boolean>(false);

  const { toast } = useToast();

  const loadOrCreateAdaptations = useCallback(async () => {
    try {
      setIsLoading(true);
      const existing = await getPlatformAdaptations(item.id, currentVersion?.id);

      if (existing && existing.length > 0) {
        setAdaptations(existing);
      } else {
        const created = await generateDefaultAdaptations(item, currentVersion);
        setAdaptations(created);
      }
    } catch (err: any) {
      console.error('Error al inicializar adaptaciones:', err);
      toast('Error al cargar adaptaciones', {
        type: 'error',
        description: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [item, currentVersion, toast]);

  useEffect(() => {
    loadOrCreateAdaptations();
  }, [loadOrCreateAdaptations]);

  const activeAdaptation =
    adaptations.find((a) => a.platform === activePlatform) || adaptations[0];

  const handleUpdateSceneText = async (sceneNumber: number, newText: string) => {
    if (!activeAdaptation) return;

    const updatedScenes = activeAdaptation.scene_mappings.map((s) => {
      if (s.scene_number === sceneNumber) {
        return { ...s, on_screen_text: newText };
      }
      return s;
    });

    const { renderOutput, publicationPackage, validation } = await composeAndRenderAdaptation({
      adaptation: { ...activeAdaptation, scene_mappings: updatedScenes },
      scenes: updatedScenes,
      brandName: item.brands?.name || 'Aura Social',
      campaignId: item.campaign_id,
    });

    const updated = await savePlatformAdaptation({
      ...activeAdaptation,
      scene_mappings: updatedScenes,
      render_output: renderOutput,
      validation_status: validation.isValid ? 'valid' : 'blocked',
      validation_errors: validation.errors,
      validation_warnings: validation.warnings,
      readiness_status: publicationPackage.readiness_status,
      publication_package: publicationPackage,
    });

    setAdaptations((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a))
    );
  };

  const handleUpdateSceneTextPosition = async (
    sceneNumber: number,
    position: 'top' | 'middle' | 'bottom',
    alignment: 'left' | 'center' | 'right' = 'center'
  ) => {
    if (!activeAdaptation) return;

    const updatedScenes = activeAdaptation.scene_mappings.map((s) => {
      if (s.scene_number === sceneNumber) {
        return {
          ...s,
          text_position: position,
          text_alignment: alignment,
        };
      }
      return s;
    });

    const { renderOutput, publicationPackage, validation } = await composeAndRenderAdaptation({
      adaptation: { ...activeAdaptation, scene_mappings: updatedScenes },
      scenes: updatedScenes,
      brandName: item.brands?.name || 'Aura Social',
      campaignId: item.campaign_id,
    });

    const updated = await savePlatformAdaptation({
      ...activeAdaptation,
      scene_mappings: updatedScenes,
      render_output: renderOutput,
      validation_status: validation.isValid ? 'valid' : 'blocked',
      validation_errors: validation.errors,
      validation_warnings: validation.warnings,
      readiness_status: publicationPackage.readiness_status,
      publication_package: publicationPackage,
    });

    setAdaptations((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a))
    );
  };

  const handleUpdateCaption = async (platform: TargetPlatform, newCaption: string) => {
    const target = adaptations.find((a) => a.platform === platform);
    if (!target) return;

    const { renderOutput, publicationPackage, validation } = await composeAndRenderAdaptation({
      adaptation: { ...target, caption: newCaption },
      scenes: target.scene_mappings,
      brandName: item.brands?.name || 'Aura Social',
      campaignId: item.campaign_id,
    });

    const updated = await savePlatformAdaptation({
      ...target,
      caption: newCaption,
      render_output: renderOutput,
      validation_status: validation.isValid ? 'valid' : 'blocked',
      validation_errors: validation.errors,
      validation_warnings: validation.warnings,
      readiness_status: publicationPackage.readiness_status,
      publication_package: publicationPackage,
    });

    setAdaptations((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a))
    );
  };

  const handleUpdateCta = async (platform: TargetPlatform, newCta: string) => {
    const target = adaptations.find((a) => a.platform === platform);
    if (!target) return;

    const updated = await savePlatformAdaptation({
      ...target,
      cta: newCta,
    });

    setAdaptations((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a))
    );
  };

  const handleSelectAssetForScene = async (asset: ContentAsset) => {
    if (!activeAdaptation || selectedSceneForAsset === null) return;

    try {
      const updated = await updateAdaptationSceneAsset(
        activeAdaptation,
        selectedSceneForAsset,
        asset,
        item.brands?.name || 'Aura Social'
      );

      const allSynced = await syncScenesToAllAdaptations(
        item.id,
        updated.scene_mappings,
        item.brands?.name || 'Aura Social',
        currentVersion?.id
      );
      setAdaptations(allSynced);

      toast('¡Asset asignado y sincronizado!', {
        type: 'success',
        description: `Se vinculó "${asset.name}" a la Escena ${selectedSceneForAsset} en todas las plataformas.`,
      });
      setIsAssetPickerOpen(false);
      setSelectedSceneForAsset(null);
    } catch (err: any) {
      toast('Error al asignar asset', {
        type: 'error',
        description: err.message,
      });
    }
  };

  const handleUsePlaceholderForScene = async (sceneNumber: number) => {
    if (!activeAdaptation) return;

    try {
      const placeholderAsset: ContentAsset = {
        id: 'placeholder_' + sceneNumber,
        workspace_id: item.workspace_id || '',
        brand_id: item.brand_id || '',
        name: `Placeholder Escena ${sceneNumber}`,
        storage_bucket: 'aura-media',
        storage_path: 'https://placehold.co/1080x1920/1e1b4b/c084fc?text=Escena+' + sceneNumber,
        mime_type: 'image/png',
        asset_type: 'image',
        asset_scope: 'brand',
        file_size_bytes: 1024,
        width: 1080,
        height: 1920,
        duration_seconds: 5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const updated = await updateAdaptationSceneAsset(
        activeAdaptation,
        sceneNumber,
        placeholderAsset,
        item.brands?.name || 'Aura Social'
      );

      const allSynced = await syncScenesToAllAdaptations(
        item.id,
        updated.scene_mappings,
        item.brands?.name || 'Aura Social',
        currentVersion?.id
      );
      setAdaptations(allSynced);

      toast('Placeholder asignado', {
        type: 'info',
        description: `Escena ${sceneNumber} actualizada con placeholder determinista.`,
      });
    } catch (err: any) {
      toast('Error al asignar placeholder', {
        type: 'error',
        description: err.message,
      });
    }
  };

  const handleApproveAdaptation = async (adaptationId: string) => {
    try {
      const approved = await approvePlatformAdaptation(adaptationId);
      setAdaptations((prev) =>
        prev.map((a) => (a.id === approved.id ? approved : a))
      );
      onContentUpdated?.();
    } catch (err: any) {
      throw err;
    }
  };

  const handleSyncAllPlatforms = async () => {
    if (!activeAdaptation) return;
    try {
      const synced = await syncScenesToAllAdaptations(
        item.id,
        activeAdaptation.scene_mappings,
        item.brands?.name || 'Aura Social',
        currentVersion?.id
      );
      setAdaptations(synced);
      toast('¡Escenas sincronizadas!', {
        type: 'success',
        description: 'La estructura de medios y overlays se aplicó a todas las plataformas.',
      });
    } catch (err: any) {
      toast('Error de sincronización', {
        type: 'error',
        description: err.message,
      });
    }
  };

  // Derive visible status for user
  const getUserVisibleStatus = () => {
    const isNeedsAssets = adaptations.some((a) => a.readiness_status === 'needs_assets' || a.validation_status === 'blocked');
    const isAllApproved = adaptations.length > 0 && adaptations.every((a) => a.readiness_status === 'approved');
    const isAllValid = adaptations.length > 0 && adaptations.every((a) => a.readiness_status === 'valid' || a.readiness_status === 'approved');

    if (item.status === 'published') {
      return {
        label: 'Publicado',
        color: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
        icon: CheckCircle2,
      };
    }
    if (isAllApproved) {
      return {
        label: 'Listo para Publicar',
        color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
        icon: CheckCircle2,
      };
    }
    if (isAllValid) {
      return {
        label: 'Listo (Quality Gate OK)',
        color: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
        icon: Sparkles,
      };
    }
    if (isNeedsAssets) {
      return {
        label: 'Producción Pendiente (Faltan Medios)',
        color: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
        icon: AlertCircle,
      };
    }
    return {
      label: 'Borrador',
      color: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
      icon: Clock,
    };
  };

  const statusBadge = getUserVisibleStatus();

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-[1720px] mx-auto p-4 md:p-6 gap-4 animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-dark-800/80 shrink-0 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            className="text-slate-400 hover:text-white"
          >
            Volver
          </Button>

          <div className="h-4 w-[1px] bg-dark-800" />

          <div>
            <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span className="truncate max-w-md">{item.title || 'Contenido sin título'}</span>
            </h1>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
              <span className="font-medium text-slate-300">{item.brands?.name || 'Marca'}</span>
              <span>•</span>
              <button
                type="button"
                onClick={() => setIsAssignCampaignOpen(true)}
                className="hover:text-aura-300 transition-colors flex items-center gap-1 font-medium text-aura-400"
              >
                <Target className="w-3 h-3" />
                {item.campaigns?.name ? `Campaña: ${item.campaigns.name}` : 'Sin campaña asignada (Asignar +)'}
              </button>
            </div>
          </div>
        </div>

        {/* Header Right: Status Badge & Secondary Menu */}
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${statusBadge.color}`}>
            <statusBadge.icon className="w-3.5 h-3.5" />
            {statusBadge.label}
          </span>

          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSecondaryMenuOpen(!isSecondaryMenuOpen)}
              className="text-xs bg-dark-950 border-dark-800 text-slate-300 hover:text-white"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </Button>

            {isSecondaryMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-dark-900 border border-dark-800 shadow-2xl p-1.5 z-50 space-y-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsSecondaryMenuOpen(false);
                    setIsAssignCampaignOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-slate-300 hover:bg-dark-800 hover:text-white flex items-center gap-2"
                >
                  <Target className="w-3.5 h-3.5 text-aura-400" />
                  Cambiar Campaña
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSecondaryMenuOpen(false);
                    setIsDiagnosticOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-slate-300 hover:bg-dark-800 hover:text-white flex items-center gap-2"
                >
                  <Code2 className="w-3.5 h-3.5 text-sky-400" />
                  Diagnóstico Técnico
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main 3-Column Content Production Grid */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-2">
          <Loader2 className="w-8 h-8 text-aura-500 animate-spin" />
          <span className="text-xs font-medium">Inicializando Content Workspace...</span>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0">
          {/* Column 1: Scene Media Planner & Script (4 cols) */}
          <div className="lg:col-span-4 h-full min-h-0">
            <SceneMediaPlannerPanel
              scenes={activeAdaptation?.scene_mappings || []}
              activeSceneNumber={activeSceneNumber}
              onSelectActiveScene={(sceneNum) => setActiveSceneNumber(sceneNum)}
              onSelectSceneForAsset={(sceneNum) => {
                setSelectedSceneForAsset(sceneNum);
                setIsAssetPickerOpen(true);
              }}
              onUpdateSceneText={handleUpdateSceneText}
              onUpdateSceneTextPosition={handleUpdateSceneTextPosition}
              onUsePlaceholder={handleUsePlaceholderForScene}
              onSyncToAllPlatforms={handleSyncAllPlatforms}
            />
          </div>

          {/* Column 2: Mobile Live Social Preview (4 cols) */}
          <div className="lg:col-span-4 h-full min-h-0 flex items-center justify-center">
            {activeAdaptation?.publication_package ? (
              <UnifiedSocialPreview
                publicationPackage={activeAdaptation.publication_package as PublicationPackage}
                activeAdaptation={activeAdaptation}
                currentSceneNumber={activeSceneNumber}
                onUpdateSceneTextPosition={handleUpdateSceneTextPosition}
              />
            ) : (
              <div className="text-center p-8 bg-dark-900 border border-dark-800 rounded-3xl text-slate-400 text-xs">
                Generando paquete de previsualización...
              </div>
            )}
          </div>

          {/* Column 3: Platform Adaptations & Dispatch (4 cols) */}
          <div className="lg:col-span-4 h-full min-h-0">
            <PlatformAdaptationPanel
              adaptations={adaptations}
              activePlatform={activePlatform}
              workspaceId={item.workspace_id || undefined}
              brandId={item.brand_id || undefined}
              contentId={item.id}
              onSelectPlatform={(plat) => {
                setActivePlatform(plat);
                setActiveSceneNumber(1);
              }}
              onUpdateCaption={handleUpdateCaption}
              onUpdateCta={handleUpdateCta}
              onApproveAdaptation={handleApproveAdaptation}
              onRevalidate={loadOrCreateAdaptations}
            />
          </div>
        </div>
      )}

      {/* Asset Picker Modal */}
      {isAssetPickerOpen && (
        <AssetPickerModal
          isOpen={isAssetPickerOpen}
          onClose={() => {
            setIsAssetPickerOpen(false);
            setSelectedSceneForAsset(null);
          }}
          brandId={item.brand_id || ''}
          onSelectAsset={handleSelectAssetForScene}
        />
      )}

      {/* Campaign Assignment Modal */}
      {isAssignCampaignOpen && (
        <AssignToCampaignModal
          isOpen={isAssignCampaignOpen}
          onClose={() => setIsAssignCampaignOpen(false)}
          entityType="content"
          entityId={item.id}
          entityTitle={item.title}
          brandId={item.brand_id || ''}
          currentCampaignId={item.campaign_id}
          onAssigned={() => {
            setIsAssignCampaignOpen(false);
            onContentUpdated?.();
          }}
        />
      )}

      {/* Technical Diagnostic Modal (Hidden by default) */}
      {isDiagnosticOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-dark-800 rounded-3xl max-w-2xl w-full p-6 space-y-4 text-xs font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-dark-800 text-white font-bold">
              <span className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-sky-400" /> Diagnóstico Técnico del Contenido
              </span>
              <button
                type="button"
                onClick={() => setIsDiagnosticOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="bg-dark-950 p-4 rounded-2xl border border-dark-800 text-slate-300 max-h-96 overflow-y-auto space-y-2">
              <div><strong>content_id:</strong> {item.id}</div>
              <div><strong>workspace_id:</strong> {item.workspace_id}</div>
              <div><strong>brand_id:</strong> {item.brand_id}</div>
              <div><strong>campaign_id:</strong> {item.campaign_id || 'null'}</div>
              <div><strong>active_adaptation_id:</strong> {activeAdaptation?.id}</div>
              <div><strong>readiness_status:</strong> {activeAdaptation?.readiness_status}</div>
              <div><strong>validation_status:</strong> {activeAdaptation?.validation_status}</div>
              <div><strong>render_output:</strong> {JSON.stringify(activeAdaptation?.render_output, null, 2)}</div>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setIsDiagnosticOpen(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
