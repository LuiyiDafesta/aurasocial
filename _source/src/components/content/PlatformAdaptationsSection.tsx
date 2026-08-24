import { useState, useEffect, useCallback } from 'react';
import { PlatformAdaptation, TargetPlatform } from '../../types/platformAdaptation';
import { ContentItem } from '../../types/contentItem';
import { SocialPlatform } from '../../types/publishing';
import { RenderJob } from '../../types/renderJob';
import { 
  getPlatformAdaptations, 
  createPlatformAdaptation, 
  deletePlatformAdaptation, 
  calculatePlatformReadiness 
} from '../../services/platformAdaptationService';
import { getRenderJobsForAdaptation } from '../../services/renderJobService';
import { publishMultiPlatform, prepareManualPublishing } from '../../services/publishingOutboxService';
import { PlatformKey } from '../../config/platformProfiles';
import { PlatformAdaptationView } from './PlatformAdaptationView';
import { PlatformPublicationPreview } from '../publishing/PlatformPublicationPreview';
import { FinalContentEditor } from '../publishing/FinalContentEditor';
import { PublishingConfirmationModal } from '../publishing/PublishingConfirmationModal';
import { PublishingHistoryModal } from '../publishing/PublishingHistoryModal';
import { Button } from '../common/Button';
import { useToast } from '../../hooks/useToast';
import { 
  Smartphone, 
  Plus, 
  Eye, 
  Trash2, 
  X, 
  RefreshCw, 
  Send, 
  History, 
  Instagram, 
  Facebook, 
  Video, 
  Youtube, 
  Linkedin,
  LayoutGrid,
  Tv,
  Sliders
} from 'lucide-react';

interface PlatformAdaptationsSectionProps {
  contentItem: ContentItem;
}

const SUPPORTED_CREATION_PLATFORMS: Array<{ key: PlatformKey; label: string; ratio: string; res: string; icon: React.ReactNode }> = [
  { key: 'instagram', label: 'Instagram Reel', ratio: '9:16', res: '1080x1920', icon: <Instagram className="w-4 h-4 text-pink-400" /> },
  { key: 'tiktok', label: 'TikTok Video', ratio: '9:16', res: '1080x1920', icon: <Video className="w-4 h-4 text-teal-400" /> },
  { key: 'facebook', label: 'Facebook Feed', ratio: '1:1', res: '1080x1080', icon: <Facebook className="w-4 h-4 text-blue-400" /> },
  { key: 'linkedin', label: 'LinkedIn Post', ratio: '1:1', res: '1080x1080', icon: <Linkedin className="w-4 h-4 text-sky-400" /> },
  { key: 'youtube_shorts', label: 'YouTube Shorts', ratio: '9:16', res: '1080x1920', icon: <Youtube className="w-4 h-4 text-red-400" /> },
];

export function PlatformAdaptationsSection({ contentItem }: PlatformAdaptationsSectionProps) {
  const [adaptations, setAdaptations] = useState<PlatformAdaptation[]>([]);
  const [renderJobsMap, setRenderJobsMap] = useState<Record<string, RenderJob>>({});
  const [viewMode, setViewMode] = useState<'cards' | 'preview' | 'editor'>('cards');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedAdaptation, setSelectedAdaptation] = useState<PlatformAdaptation | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [selectedPlatformsToAdd, setSelectedPlatformsToAdd] = useState<PlatformKey[]>([]);

  // Multi-platform publish states
  const [selectedForBatchPublish, setSelectedForBatchPublish] = useState<string[]>([]);
  const [isBatchPublishing, setIsBatchPublishing] = useState<boolean>(false);
  const [showBatchConfirmModal, setShowBatchConfirmModal] = useState<boolean>(false);
  const [historyAdaptationId, setHistoryAdaptationId] = useState<string | null>(null);

  const { toast } = useToast();

  const fetchAdaptations = useCallback(async () => {
    if (!contentItem?.id) return;
    try {
      setIsLoading(true);
      const data = await getPlatformAdaptations(contentItem.id);
      setAdaptations(data);

      // Cargar render jobs completados para cada adaptación
      const jobsMap: Record<string, RenderJob> = {};
      for (const adapt of data) {
        const jobs = await getRenderJobsForAdaptation(adapt.id);
        const completedJob = jobs.find(j => j.status === 'completed');
        if (completedJob) {
          jobsMap[adapt.id] = completedJob;
        }
      }
      setRenderJobsMap(jobsMap);
    } catch (err: any) {
      console.error('Error al cargar adaptaciones:', err);
    } finally {
      setIsLoading(false);
    }
  }, [contentItem?.id]);

  useEffect(() => {
    fetchAdaptations();
  }, [fetchAdaptations]);

  const handleDelete = async (adaptationId: string) => {
    try {
      await deletePlatformAdaptation(adaptationId);
      toast('Adaptación eliminada', { type: 'success' });
      fetchAdaptations();
    } catch (err: any) {
      toast(`Error al eliminar: ${err.message}`, { type: 'error' });
    }
  };

  const handleCreateQuick = async (platformKey: PlatformKey) => {
    try {
      setIsCreating(true);
      await createPlatformAdaptation(contentItem, platformKey as TargetPlatform);
      toast(`Adaptación para ${platformKey.toUpperCase()} creada con éxito`, { type: 'success' });
      await fetchAdaptations();
    } catch (err: any) {
      toast(`Error al crear adaptación: ${err.message}`, { type: 'error' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateSelected = async () => {
    if (selectedPlatformsToAdd.length === 0) return;
    try {
      setIsCreating(true);
      for (const platform of selectedPlatformsToAdd) {
        await createPlatformAdaptation(contentItem, platform as TargetPlatform);
      }
      toast(`${selectedPlatformsToAdd.length} adaptación(es) creada(s)`, { type: 'success' });
      setIsAddModalOpen(false);
      setSelectedPlatformsToAdd([]);
      fetchAdaptations();
    } catch (err: any) {
      toast(`Error al crear adaptaciones: ${err.message}`, { type: 'error' });
    } finally {
      setIsCreating(false);
    }
  };

  // Toggle platform for batch publish
  const toggleSelectForPublish = (platform: string) => {
    setSelectedForBatchPublish(prev => 
      prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
    );
  };

  // Execute multi-platform publish
  const handleExecuteBatchPublish = async (mode: 'manual' | 'mock' | 'real' = 'manual') => {
    if (selectedForBatchPublish.length === 0) return;
    try {
      setIsBatchPublishing(true);
      const targetAdaptations = adaptations.filter(a => selectedForBatchPublish.includes(a.platform));
      const renderJobsMap: Record<string, RenderJob> = {};

      for (const adapt of targetAdaptations) {
        const jobs = await getRenderJobsForAdaptation(adapt.id);
        const completedJob = jobs.find(j => j.status === 'completed');
        if (completedJob) {
          renderJobsMap[adapt.id] = completedJob;
        }
      }

      if (mode === 'manual') {
        for (const adapt of targetAdaptations) {
          const job = renderJobsMap[adapt.id];
          if (job) {
            await prepareManualPublishing({
              adaptation: adapt,
              renderJob: job,
              brandName: contentItem.brands?.name || 'Marca',
              campaignName: contentItem.campaigns?.name || 'Campaña',
            });
          }
        }
        toast(`¡${targetAdaptations.length} publicaciones manuales preparadas con éxito!`, { type: 'success' });
      } else {
        const results = await publishMultiPlatform({
          adaptations: targetAdaptations,
          renderJobsMap,
          brandName: contentItem.brands?.name || 'Marca',
          campaignName: contentItem.campaigns?.name || 'Campaña',
        });
        toast(`¡Publicadas ${results.length} adaptaciones en redes!`, { type: 'success' });
      }

      setShowBatchConfirmModal(false);
      setSelectedForBatchPublish([]);
      fetchAdaptations();
    } catch (err: any) {
      toast(`Error al procesar lote: ${err.message}`, { type: 'error' });
    } finally {
      setIsBatchPublishing(false);
    }
  };

  const existingMap = new Map(adaptations.map((a) => [a.platform, a]));

  return (
    <div className="bg-dark-900/90 border border-dark-800 rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
      
      {/* Section Header */}
      <div className="flex items-center justify-between pb-3 border-b border-dark-800/80 flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              Adaptaciones por Plataforma
            </h3>
            <p className="text-[11px] text-slate-400">
              Transformaciones derivadas optimizadas para cada red social
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-dark-900 border border-dark-800 rounded-xl p-1 text-xs">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition-all ${
                viewMode === 'cards'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Tarjetas</span>
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition-all ${
                viewMode === 'preview'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Preview Visual</span>
            </button>
            <button
              onClick={() => setViewMode('editor')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition-all ${
                viewMode === 'editor'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Editor Final</span>
            </button>
          </div>

          {selectedForBatchPublish.length > 0 && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowBatchConfirmModal(true)}
              leftIcon={<Send className="w-3.5 h-3.5" />}
              className="text-xs bg-gradient-to-r from-purple-600 to-aura-600 text-white font-bold animate-pulse"
            >
              Publicar ({selectedForBatchPublish.length}) en redes
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5 text-purple-400" />}
            className="text-xs border-dark-700 hover:border-purple-500/50 text-slate-200"
          >
            + Adaptar
          </Button>
        </div>
      </div>

      {/* Conditional Content based on viewMode */}
      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-xs text-slate-400">
          <RefreshCw className="w-4 h-4 animate-spin text-purple-400 mr-2" />
          Cargando adaptaciones de plataforma...
        </div>
      ) : viewMode === 'editor' ? (
        <FinalContentEditor
          contentItem={contentItem}
          adaptations={adaptations}
          renderJobsMap={renderJobsMap}
          brandName={contentItem.brands?.name}
          avatarUrl={contentItem.brands?.avatar_url || undefined}
          onAdaptationsChange={fetchAdaptations}
        />
      ) : viewMode === 'preview' ? (
        <PlatformPublicationPreview
          adaptations={adaptations}
          renderJobsMap={renderJobsMap}
          brandName={contentItem.brands?.name}
          avatarUrl={contentItem.brands?.avatar_url || undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SUPPORTED_CREATION_PLATFORMS.map((platformMeta) => {
            const adaptation = existingMap.get(platformMeta.key);

            if (!adaptation) {
              // Plataforma NO adaptada aún
              return (
                <div
                  key={platformMeta.key}
                  className="p-5 rounded-2xl bg-dark-950/40 border border-dashed border-dark-800 flex flex-col justify-between space-y-4 hover:border-dark-700 transition-all opacity-80 hover:opacity-100"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {platformMeta.icon}
                        <h4 className="text-xs font-bold text-white uppercase">{platformMeta.label}</h4>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-dark-900 border border-dark-800 text-slate-400">
                        {platformMeta.ratio}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      ⚪ No preparado para esta red social
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isCreating}
                    onClick={() => handleCreateQuick(platformMeta.key)}
                    leftIcon={<Plus className="w-3.5 h-3.5 text-purple-400" />}
                    className="w-full text-xs border-dark-700 hover:border-purple-500/50 hover:bg-purple-500/10 text-slate-300 font-semibold"
                  >
                    Adaptar a {platformMeta.label}
                  </Button>
                </div>
              );
            }

            // Plataforma YA adaptada
            const readiness = calculatePlatformReadiness(adaptation, contentItem);
            const isApproved = adaptation.readiness_status === 'approved';
            const isRendered = adaptation.render_status === 'rendered';
            const isRendering = adaptation.render_status === 'rendering';

            return (
              <div
                key={adaptation.id}
                className="p-5 rounded-2xl bg-dark-950/90 border border-dark-800 hover:border-dark-700 transition-all flex flex-col justify-between space-y-4 shadow-lg"
              >
                <div className="space-y-3">
                  {/* Top Platform & Checkbox */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedForBatchPublish.includes(adaptation.platform)}
                        onChange={() => toggleSelectForPublish(adaptation.platform)}
                        className="rounded border-dark-700 bg-dark-900 text-purple-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                        title="Seleccionar para publicar en lote"
                      />
                      {platformMeta.icon}
                      <span className="text-xs font-bold text-white uppercase font-mono">
                        {platformMeta.label}
                      </span>
                    </div>

                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-dark-900 border border-dark-800 text-slate-300">
                      {adaptation.dimensions?.aspect_ratio || platformMeta.ratio}
                    </span>
                  </div>

                  {/* Status Badges */}
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                    <div className={`p-1.5 rounded-lg border flex items-center gap-1 ${
                      isRendered || isApproved
                        ? 'bg-emerald-950/30 border-emerald-800/30 text-emerald-300'
                        : isRendering
                        ? 'bg-amber-950/30 border-amber-800/30 text-amber-300'
                        : 'bg-dark-900 border-dark-800 text-slate-400'
                    }`}>
                      {isApproved ? '🟢 Aprobado' : isRendered ? '🟢 Render Listo' : isRendering ? '🟡 Renderizando...' : '⚪ Falta Render'}
                    </div>

                    <div className={`p-1.5 rounded-lg border flex items-center gap-1 ${
                      readiness.textReady
                        ? 'bg-emerald-950/30 border-emerald-800/30 text-emerald-300'
                        : 'bg-rose-950/30 border-rose-800/30 text-rose-300'
                    }`}>
                      {readiness.textReady ? '🟢 Copy Validado' : '🔴 Error Copy'}
                    </div>
                  </div>

                  {/* Caption preview snippet */}
                  <p className="text-[11px] text-slate-300 line-clamp-2 italic bg-dark-900/60 p-2 rounded-xl border border-dark-800/60">
                    "{adaptation.caption || 'Sin caption configurado'}"
                  </p>
                </div>

                {/* Card Actions Toolbar */}
                <div className="flex items-center justify-between pt-3 border-t border-dark-800/80 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedAdaptation(adaptation)}
                    leftIcon={<Eye className="w-3.5 h-3.5 text-purple-400" />}
                    className="text-xs border-dark-700 hover:border-purple-500/50 text-slate-200 flex-1"
                  >
                    Ver Preview
                  </Button>

                  <button
                    onClick={() => setHistoryAdaptationId(adaptation.id)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-dark-900"
                    title="Historial de outbox"
                  >
                    <History className="w-4 h-4" />
                  </button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(adaptation.id)}
                    leftIcon={<Trash2 className="w-3.5 h-3.5 text-rose-400" />}
                    className="text-xs text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 px-2"
                    title="Eliminar adaptación"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add Multiple Adaptations */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-dark-950 border border-dark-700 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-dark-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-400" />
                Adaptar a Nuevas Plataformas
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Selecciona las plataformas para las que deseas derivar y optimizar este contenido:
            </p>

            <div className="space-y-2">
              {SUPPORTED_CREATION_PLATFORMS.map((platform) => {
                const alreadyExists = existingMap.has(platform.key);
                const isSelected = selectedPlatformsToAdd.includes(platform.key);

                return (
                  <div
                    key={platform.key}
                    onClick={() => {
                      if (alreadyExists) return;
                      setSelectedPlatformsToAdd(prev => 
                        isSelected ? prev.filter(p => p !== platform.key) : [...prev, platform.key]
                      );
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                      alreadyExists
                        ? 'bg-dark-900/40 border-dark-800 opacity-50 cursor-not-allowed'
                        : isSelected
                        ? 'bg-purple-950/40 border-purple-500/50 text-white'
                        : 'bg-dark-900 border-dark-800 hover:border-dark-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        disabled={alreadyExists}
                        checked={isSelected || alreadyExists}
                        onChange={() => {}}
                        className="rounded border-dark-700 bg-dark-950 text-purple-600"
                      />
                      <div className="flex items-center gap-2">
                        {platform.icon}
                        <span className="text-xs font-bold uppercase">{platform.label}</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">
                      {alreadyExists ? 'Ya creada' : `${platform.ratio} • ${platform.res}`}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-dark-800">
              <Button variant="ghost" size="sm" onClick={() => setIsAddModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={selectedPlatformsToAdd.length === 0 || isCreating}
                isLoading={isCreating}
                onClick={handleCreateSelected}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold"
              >
                Crear {selectedPlatformsToAdd.length} Adaptación(es)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Full Platform Adaptation View */}
      {selectedAdaptation && (
        <PlatformAdaptationView
          isOpen={Boolean(selectedAdaptation)}
          adaptation={selectedAdaptation}
          contentItem={contentItem}
          onClose={() => setSelectedAdaptation(null)}
          onAdaptationUpdated={fetchAdaptations}
        />
      )}

      {/* Modal: Batch Publishing Confirmation */}
      <PublishingConfirmationModal
        isOpen={showBatchConfirmModal}
        onClose={() => setShowBatchConfirmModal(false)}
        onConfirm={handleExecuteBatchPublish}
        platforms={selectedForBatchPublish as SocialPlatform[]}
        contentTitle={contentItem.title || 'Contenido'}
        isPublishing={isBatchPublishing}
      />

      {/* Modal: History for individual adaptation */}
      {historyAdaptationId && (
        <PublishingHistoryModal
          isOpen={Boolean(historyAdaptationId)}
          onClose={() => setHistoryAdaptationId(null)}
          adaptationId={historyAdaptationId}
        />
      )}
    </div>
  );
}
