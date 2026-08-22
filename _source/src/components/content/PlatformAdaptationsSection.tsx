import { useState, useEffect, useCallback } from 'react';
import { PlatformAdaptation, TargetPlatform } from '../../types/platformAdaptation';
import { ContentItem } from '../../types/contentItem';
import { 
  getPlatformAdaptations, 
  createPlatformAdaptation, 
  deletePlatformAdaptation, 
  calculatePlatformReadiness 
} from '../../services/platformAdaptationService';
import { PLATFORM_PROFILES, PlatformKey } from '../../config/platformProfiles';
import { PlatformAdaptationView } from './PlatformAdaptationView';
import { Button } from '../common/Button';
import { useToast } from '../../hooks/useToast';
import { 
  Smartphone, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  Trash2, 
  X,
  RefreshCw 
} from 'lucide-react';

interface PlatformAdaptationsSectionProps {
  contentItem: ContentItem;
}

const SUPPORTED_CREATION_PLATFORMS: Array<{ key: PlatformKey; label: string; ratio: string; res: string }> = [
  { key: 'instagram', label: 'Instagram Reel', ratio: '9:16', res: '1080x1920' },
  { key: 'tiktok', label: 'TikTok Video', ratio: '9:16', res: '1080x1920' },
  { key: 'facebook', label: 'Facebook Feed', ratio: '1:1', res: '1080x1080' },
  { key: 'linkedin', label: 'LinkedIn Post', ratio: '1:1', res: '1080x1080' },
  { key: 'youtube_shorts', label: 'YouTube Shorts', ratio: '9:16', res: '1080x1920' },
];

export function PlatformAdaptationsSection({ contentItem }: PlatformAdaptationsSectionProps) {
  const [adaptations, setAdaptations] = useState<PlatformAdaptation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedAdaptation, setSelectedAdaptation] = useState<PlatformAdaptation | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [selectedPlatformsToAdd, setSelectedPlatformsToAdd] = useState<PlatformKey[]>([]);

  const { toast } = useToast();

  const fetchAdaptations = useCallback(async () => {
    if (!contentItem?.id) return;
    try {
      setIsLoading(true);
      const data = await getPlatformAdaptations(contentItem.id);
      setAdaptations(data);
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

  const existingPlatformKeys = new Set(adaptations.map((a) => a.platform));

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
              Transformaciones derivadas y optimizadas para cada red social (Fase 9C)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            className="text-xs bg-purple-600 hover:bg-purple-500 text-white font-semibold"
          >
            + Adaptar a plataforma
          </Button>
        </div>
      </div>

      {/* Grid of Adaptations */}
      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-xs text-slate-400">
          <RefreshCw className="w-4 h-4 animate-spin text-purple-400 mr-2" />
          Cargando adaptaciones de plataforma...
        </div>
      ) : adaptations.length === 0 ? (
        <div className="text-center py-10 bg-dark-950/40 rounded-2xl border border-dashed border-dark-800 space-y-3">
          <p className="text-xs text-slate-400">
            Aún no se han generado adaptaciones de este contenido para plataformas específicas.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5 text-purple-400" />}
            className="text-xs border-dark-700 hover:border-purple-500/50"
          >
            Crear primera adaptación
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {adaptations.map((adaptation) => {
            const readiness = calculatePlatformReadiness(adaptation, contentItem);
            const profile = PLATFORM_PROFILES[adaptation.platform as PlatformKey] || PLATFORM_PROFILES.instagram;

            return (
              <div
                key={adaptation.id}
                className="p-5 rounded-2xl bg-dark-950/80 border border-dark-800 hover:border-dark-700 transition-all flex flex-col justify-between space-y-4 shadow-lg"
              >
                <div className="space-y-3">
                  {/* Top Platform & Format Pill */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        {profile.name}
                      </span>
                    </div>

                    <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-dark-900 border border-dark-700 text-slate-300">
                      {adaptation.dimensions?.aspect_ratio || '9:16'} • {adaptation.dimensions?.width}x{adaptation.dimensions?.height}
                    </span>
                  </div>

                  {/* Readiness Banner */}
                  <div>
                    {readiness.isReady ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        🟢 LISTO PARA RENDER
                      </span>
                    ) : readiness.status === 'blocked' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                        🔴 BLOQUEADO ({readiness.errors.length} errores)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                        🟡 REQUIERE CORRECCIÓN
                      </span>
                    )}
                  </div>

                  {/* Micro Indicators */}
                  <div className="grid grid-cols-3 gap-1.5 text-[10px] text-center font-medium pt-1">
                    <div className={`p-1.5 rounded-lg border ${
                      readiness.mediaReady 
                        ? 'bg-emerald-950/30 border-emerald-800/30 text-emerald-300' 
                        : 'bg-amber-950/30 border-amber-800/30 text-amber-300'
                    }`}>
                      {readiness.mediaReady ? '🟢 Media Ready' : '🟡 Media Falta'}
                    </div>

                    <div className={`p-1.5 rounded-lg border ${
                      readiness.textReady 
                        ? 'bg-emerald-950/30 border-emerald-800/30 text-emerald-300' 
                        : 'bg-rose-950/30 border-rose-800/30 text-rose-300'
                    }`}>
                      {readiness.textReady ? '🟢 Text Ready' : '🔴 Text Error'}
                    </div>

                    <div className={`p-1.5 rounded-lg border ${
                      readiness.formatReady 
                        ? 'bg-emerald-950/30 border-emerald-800/30 text-emerald-300' 
                        : 'bg-rose-950/30 border-rose-800/30 text-rose-300'
                    }`}>
                      {readiness.formatReady ? '🟢 Format OK' : '🔴 Format Error'}
                    </div>
                  </div>

                  {/* Render & Approval Status Pill */}
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-dark-800/60">
                    <span className="text-slate-400">Estado de Render:</span>
                    {adaptation.readiness_status === 'approved' ? (
                      <span className="font-semibold text-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Aprobado
                      </span>
                    ) : adaptation.render_status === 'rendered' ? (
                      <span className="font-semibold text-emerald-400">
                        🟢 MP4 Listo
                      </span>
                    ) : adaptation.render_status === 'rendering' ? (
                      <span className="font-semibold text-amber-400 animate-pulse">
                        🟡 Renderizando...
                      </span>
                    ) : (
                      <span className="text-slate-500">
                        Sin render
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-dark-800/80">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedAdaptation(adaptation)}
                    leftIcon={<Eye className="w-3.5 h-3.5 text-purple-400" />}
                    className="text-xs border-dark-700 hover:border-purple-500/50 text-slate-200"
                  >
                    Ver Adaptación
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(adaptation.id)}
                    leftIcon={<Trash2 className="w-3.5 h-3.5 text-rose-400" />}
                    className="text-xs text-slate-400 hover:text-rose-300 hover:bg-rose-500/10"
                    title="Eliminar adaptación"
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: View & Edit Adaptation */}
      {selectedAdaptation && (
        <PlatformAdaptationView
          isOpen={true}
          onClose={() => setSelectedAdaptation(null)}
          adaptation={selectedAdaptation}
          contentItem={contentItem}
          onAdaptationUpdated={(updated) => {
            setSelectedAdaptation(updated);
            fetchAdaptations();
          }}
        />
      )}

      {/* Modal: Add Platform Adaptation */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-dark-900 border border-dark-700 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-dark-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Adaptar a Redes Sociales
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Selecciona una o más plataformas para generar derivaciones automáticas con sus perfiles de resolución, safe areas y límites técnicos.
            </p>

            <div className="space-y-2.5">
              {SUPPORTED_CREATION_PLATFORMS.map((platform) => {
                const alreadyExists = existingPlatformKeys.has(platform.key);
                const isSelected = selectedPlatformsToAdd.includes(platform.key);

                return (
                  <label
                    key={platform.key}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      alreadyExists 
                        ? 'bg-dark-950/40 border-dark-800 opacity-60 cursor-not-allowed' 
                        : isSelected 
                          ? 'bg-purple-950/30 border-purple-500/50 text-white' 
                          : 'bg-dark-950/70 border-dark-800 hover:border-dark-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        disabled={alreadyExists}
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPlatformsToAdd([...selectedPlatformsToAdd, platform.key]);
                          } else {
                            setSelectedPlatformsToAdd(selectedPlatformsToAdd.filter((k) => k !== platform.key));
                          }
                        }}
                        className="rounded border-dark-700 bg-dark-900 text-purple-500 focus:ring-0 w-4 h-4"
                      />
                      <div>
                        <div className="text-xs font-bold text-white">{platform.label}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {platform.ratio} • {platform.res}
                        </div>
                      </div>
                    </div>

                    {alreadyExists && (
                      <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                        Ya existe
                      </span>
                    )}
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-dark-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddModalOpen(false)}
              >
                Cancelar
              </Button>

              <Button
                variant="primary"
                size="sm"
                disabled={selectedPlatformsToAdd.length === 0}
                isLoading={isCreating}
                onClick={handleCreateSelected}
                className="bg-purple-600 hover:bg-purple-500 text-white font-semibold"
              >
                Crear {selectedPlatformsToAdd.length} Adaptación(es)
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
