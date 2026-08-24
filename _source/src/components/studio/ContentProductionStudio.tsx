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
} from '../../services/platformAdaptationService';
import { composeAndRenderAdaptation } from '../../services/renderService';
import { SceneMediaPlannerPanel } from './SceneMediaPlannerPanel';
import { UnifiedSocialPreview } from './UnifiedSocialPreview';
import { PlatformAdaptationPanel } from './PlatformAdaptationPanel';
import { AssetPickerModal } from '../assets/AssetPickerModal';
import { Button } from '../common/Button';
import { useToast } from '../../hooks/useToast';
import { 
  Clapperboard, 
  ArrowLeft, 
  RefreshCw, 
  Loader2 
} from 'lucide-react';

interface ContentProductionStudioProps {
  item: ContentItem;
  currentVersion?: ContentVersion | null;
  onBack: () => void;
}

export function ContentProductionStudio({
  item,
  currentVersion,
  onBack,
}: ContentProductionStudioProps) {
  const [adaptations, setAdaptations] = useState<PlatformAdaptation[]>([]);
  const [activePlatform, setActivePlatform] = useState<TargetPlatform>('instagram');
  const [activeSceneNumber, setActiveSceneNumber] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedSceneForAsset, setSelectedSceneForAsset] = useState<number | null>(null);
  const [isAssetPickerOpen, setIsAssetPickerOpen] = useState<boolean>(false);

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
  }, [item, currentVersion]);

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

  const handleSelectAssetForScene = async (asset: ContentAsset) => {
    if (!activeAdaptation || selectedSceneForAsset === null) return;

    try {
      const updated = await updateAdaptationSceneAsset(
        activeAdaptation,
        selectedSceneForAsset,
        asset,
        item.brands?.name || 'Aura Social'
      );

      setAdaptations((prev) =>
        prev.map((a) => (a.id === updated.id ? updated : a))
      );

      toast('Asset Asignado', {
        type: 'success',
        description: `Se asignó "${asset.name}" a la Escena #${selectedSceneForAsset}.`,
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

  const handleUsePlaceholder = async (sceneNumber: number) => {
    if (!activeAdaptation) return;

    const updatedScenes = activeAdaptation.scene_mappings.map((s) => {
      if (s.scene_number === sceneNumber) {
        return {
          ...s,
          source: 'placeholder' as const,
          asset_name: `Placeholder Escena ${sceneNumber}`,
          status: 'resolved' as const,
          asset_url: 'https://placehold.co/1080x1920/1e1b4b/c084fc?text=Placeholder',
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

  const handleApproveAdaptation = async (adaptationId: string) => {
    const approved = await approvePlatformAdaptation(adaptationId);
    setAdaptations((prev) =>
      prev.map((a) => (a.id === approved.id ? approved : a))
    );
  };

  if (isLoading) {
    return (
      <div className="p-12 max-w-6xl mx-auto flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-8 h-8 text-aura-500 animate-spin" />
        <p className="text-sm text-slate-400 font-medium">Inicializando Content Production Studio...</p>
      </div>
    );
  }

  const pkg = (activeAdaptation?.publication_package as PublicationPackage) || {
    package_id: `pkg_${item.id}_${activePlatform}`,
    content_item_id: item.id,
    version_number: currentVersion?.version_number || 1,
    platform: activePlatform,
    format: activeAdaptation?.format || 'reel',
    brand_id: item.brand_id,
    workspace_id: item.workspace_id,
    campaign_id: item.campaign_id || null,
    title: item.title || '',
    caption: activeAdaptation?.caption || item.caption || '',
    hashtags: activeAdaptation?.hashtags || [],
    cta: activeAdaptation?.cta || '',
    media: {
      render_url: '',
      aspect_ratio: activeAdaptation?.dimensions?.aspect_ratio || '9:16',
      width: activeAdaptation?.dimensions?.width || 1080,
      height: activeAdaptation?.dimensions?.height || 1920,
      scenes: activeAdaptation?.scene_mappings || [],
    },
    text_overlays: [],
    brand_profile: {
      brand_name: item.brands?.name || 'Aura Social',
    },
    validation_snapshot: {
      isValid: false,
      isBlocked: false,
      errors: [],
      warnings: [],
      validatedAt: new Date().toISOString(),
    },
    readiness_status: 'draft',
    created_at: new Date().toISOString(),
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200 pb-16">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-dark-800">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            className="text-xs bg-dark-900 border-dark-800"
          >
            Volver al Detalle
          </Button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-aura-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-aura-950/40">
              <Clapperboard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Content Production Studio
                <span className="text-xs font-mono font-normal text-slate-400">
                  (v{currentVersion?.version_number || 1})
                </span>
              </h2>
              <p className="text-xs text-slate-400 truncate max-w-md">
                {item.title}
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadOrCreateAdaptations}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          className="text-xs"
        >
          Regenerar Adaptaciones
        </Button>
      </div>

      {/* 3-Panel Studio Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[640px]">
        {/* PANEL IZQUIERDO: Escenas & Media Planner (col-span 4) */}
        <div className="lg:col-span-4 h-full">
          <SceneMediaPlannerPanel
            scenes={activeAdaptation?.scene_mappings || []}
            activeSceneNumber={activeSceneNumber}
            onSelectActiveScene={setActiveSceneNumber}
            onSelectSceneForAsset={(sceneNum) => {
              setSelectedSceneForAsset(sceneNum);
              setActiveSceneNumber(sceneNum);
              setIsAssetPickerOpen(true);
            }}
            onUpdateSceneText={handleUpdateSceneText}
            onUsePlaceholder={handleUsePlaceholder}
          />
        </div>

        {/* PANEL CENTRAL: Unified Live Preview (col-span 4) */}
        <div className="lg:col-span-4 h-full">
          <UnifiedSocialPreview
            publicationPackage={pkg}
            activeAdaptation={activeAdaptation}
            currentSceneNumber={activeSceneNumber}
          />
        </div>

        {/* PANEL DERECHO: Platform Adaptations & Validation (col-span 4) */}
        <div className="lg:col-span-4 h-full">
          <PlatformAdaptationPanel
            adaptations={adaptations}
            activePlatform={activePlatform}
            onSelectPlatform={setActivePlatform}
            onUpdateCaption={handleUpdateCaption}
            onUpdateCta={() => {}}
            onApproveAdaptation={handleApproveAdaptation}
            onRevalidate={loadOrCreateAdaptations}
          />
        </div>
      </div>

      {/* Modal Selector de Assets para Escenas */}
      <AssetPickerModal
        isOpen={isAssetPickerOpen}
        onClose={() => {
          setIsAssetPickerOpen(false);
          setSelectedSceneForAsset(null);
        }}
        brandId={item.brand_id || ''}
        title={`Vincular Asset a la Escena #${selectedSceneForAsset}`}
        onSelectAsset={handleSelectAssetForScene}
      />
    </div>
  );
}
