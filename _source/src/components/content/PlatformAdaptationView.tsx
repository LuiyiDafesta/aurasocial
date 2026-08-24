import { useState, useMemo, useEffect, useCallback } from 'react';
import { PlatformAdaptation } from '../../types/platformAdaptation';
import { ContentItem } from '../../types/contentItem';
import { RenderJob } from '../../types/renderJob';
import { getPlatformProfile } from '../../config/platformProfiles';
import { 
  updatePlatformAdaptation, 
  buildRenderPackage 
} from '../../services/platformAdaptationService';
import { 
  createRenderJob, 
  getRenderJob, 
  getRenderJobsForAdaptation, 
  approveRender,
  validateMediaForRender
} from '../../services/renderJobService';
import { validatePlatformTexts } from '../../services/platformTextValidator';
import { Button } from '../common/Button';
import { useToast } from '../../hooks/useToast';
import { PublishingPackagePreview } from '../publishing/PublishingPackagePreview';
import { 
  X, 
  Smartphone, 
  AlertCircle, 
  Save, 
  Code, 
  Eye, 
  Tag, 
  MessageSquare, 
  Play, 
  Download, 
  ExternalLink, 
  CheckCircle2, 
  RefreshCw, 
  Clock, 
  Check, 
  Video
} from 'lucide-react';

interface PlatformAdaptationViewProps {
  isOpen: boolean;
  onClose: () => void;
  adaptation: PlatformAdaptation;
  contentItem: ContentItem;
  onAdaptationUpdated?: (updated: PlatformAdaptation) => void;
}

export function PlatformAdaptationView({
  isOpen,
  onClose,
  adaptation,
  contentItem,
  onAdaptationUpdated,
}: PlatformAdaptationViewProps) {
  const { toast } = useToast();
  const profile = getPlatformProfile(adaptation.platform);

  // Estados locales editables de copy
  const [caption, setCaption] = useState<string>(adaptation.caption || '');
  const [title, setTitle] = useState<string>(adaptation.title || '');
  const [hook, setHook] = useState<string>(adaptation.hook || '');
  const [cta, setCta] = useState<string>(adaptation.cta || '');
  const [hashtagsText, setHashtagsText] = useState<string>(
    Array.isArray(adaptation.hashtags) ? adaptation.hashtags.join(' ') : ''
  );
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number>(0);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showJsonModal, setShowJsonModal] = useState<boolean>(false);
  const [previewMode, setPreviewMode] = useState<'structural' | 'rendered'>('structural');

  // Estados de Render Job (Fase 9D)
  const [activeJob, setActiveJob] = useState<RenderJob | null>(null);
  const [isStartingRender, setIsStartingRender] = useState<boolean>(false);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [jobHistory, setJobHistory] = useState<RenderJob[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  // Cargar historial de jobs y estado inicial
  const loadRenderHistory = useCallback(async () => {
    if (!adaptation?.id) return;
    try {
      const history = await getRenderJobsForAdaptation(adaptation.id);
      setJobHistory(history);
      if (history.length > 0) {
        const latest = history[0];
        setActiveJob(latest);
        if (latest.status === 'completed' && adaptation.render_status === 'rendered') {
          setPreviewMode('rendered');
        }
      }
    } catch (err) {
      console.warn('Error al cargar historial de render:', err);
    }
  }, [adaptation?.id, adaptation.render_status]);

  useEffect(() => {
    if (isOpen) {
      loadRenderHistory();
    }
  }, [isOpen, loadRenderHistory]);

  // Polling si hay un job activo en progreso
  useEffect(() => {
    if (!activeJob || !['queued', 'preparing', 'rendering', 'validating', 'uploading'].includes(activeJob.status)) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const updated = await getRenderJob(activeJob.id);
        if (updated) {
          setActiveJob(updated);
          if (updated.status === 'completed') {
            toast('¡Render finalizado con éxito!', { type: 'success' });
            setPreviewMode('rendered');
            loadRenderHistory();
          } else if (updated.status === 'failed') {
            toast(`El render falló: ${updated.error_message || 'Error de procesamiento'}`, { type: 'error' });
          }
        }
      } catch (e) {
        console.error('Error al consultar progreso de render:', e);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activeJob?.id, activeJob?.status, loadRenderHistory, toast]);

  // Validación de textos en tiempo real
  const textValidation = useMemo(() => {
    const tagsArray = hashtagsText
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean);

    return validatePlatformTexts(
      {
        title,
        hook,
        caption,
        hashtags: tagsArray,
        cta,
        sceneTexts: (adaptation.scene_mappings || []).map((s) => ({
          scene_number: s.scene_number,
          on_screen_text: s.on_screen_text || '',
        })),
      },
      profile
    );
  }, [title, hook, caption, hashtagsText, cta, adaptation.scene_mappings, profile]);

  if (!isOpen) return null;

  const scenes = adaptation.scene_mappings || [];
  const activeScene = scenes[selectedSceneIndex] || scenes[0];

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const tagsArray = hashtagsText
        .split(/\s+/)
        .map((t) => t.trim())
        .filter(Boolean);

      const updated = await updatePlatformAdaptation(
        adaptation.id,
        {
          title: title || null,
          hook: hook || null,
          caption: caption || '',
          hashtags: tagsArray,
          cta: cta || null,
        },
        contentItem
      );

      toast('Adaptación actualizada correctamente', { type: 'success' });
      if (onAdaptationUpdated) onAdaptationUpdated(updated);
    } catch (err: any) {
      console.error('Error al guardar adaptación:', err);
      toast(`Error al guardar: ${err.message}`, { type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const renderPackage = buildRenderPackage(adaptation);
  const mediaValidation = useMemo(() => {
    return validateMediaForRender(adaptation);
  }, [adaptation]);

  const handleTriggerRender = async () => {
    if (!mediaValidation.can_render) {
      toast(`Faltan medios para renderizar: ${mediaValidation.summary_message}`, { type: 'error' });
      return;
    }

    try {
      setIsStartingRender(true);
      const job = await createRenderJob(adaptation.id);
      setActiveJob(job);
      toast('Render Job iniciado. Procesando...', { type: 'success' });
    } catch (err: any) {
      console.error('Error al iniciar render:', err);
      toast(`Error al iniciar render: ${err.message}`, { type: 'error' });
    } finally {
      setIsStartingRender(false);
    }
  };

  const handleApprove = async () => {
    try {
      setIsApproving(true);
      const updated = await approveRender(adaptation.id, activeJob?.id);
      toast('¡Render aprobado para publicación!', { type: 'success' });
      if (onAdaptationUpdated) onAdaptationUpdated(updated);
    } catch (err: any) {
      toast(`Error al aprobar: ${err.message}`, { type: 'error' });
    } finally {
      setIsApproving(false);
    }
  };

  const isApproved = adaptation.readiness_status === 'approved';
  const isRendered = adaptation.render_status === 'rendered' || activeJob?.status === 'completed';
  const isRendering = activeJob && ['queued', 'preparing', 'rendering', 'validating', 'uploading'].includes(activeJob.status);

  // URL del video renderizado desde B2
  const renderedVideoUrl = activeJob?.output_metadata?.signed_url || adaptation.render_output?.media_url;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-dark-900 border border-dark-700 rounded-3xl w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-dark-800 flex items-center justify-between bg-dark-950/70 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-aura-500/15 border border-aura-500/30 flex items-center justify-center text-aura-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                Adaptación: {profile.name}
              </h2>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <span className="font-mono text-aura-300">{adaptation.dimensions?.aspect_ratio}</span>
                <span>•</span>
                <span className="font-mono">{adaptation.dimensions?.width}x{adaptation.dimensions?.height}</span>
                <span>•</span>
                <span>{adaptation.target_duration_seconds || 0}s de duración</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowJsonModal(true)}
              leftIcon={<Code className="w-3.5 h-3.5 text-aura-400" />}
              className="text-xs border-dark-700 hover:border-aura-500/50 text-slate-200"
            >
              Render Package
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistoryModal(true)}
              leftIcon={<Clock className="w-3.5 h-3.5 text-slate-400" />}
              className="text-xs border-dark-700 text-slate-300"
            >
              Historial ({jobHistory.length})
            </Button>

            <Button
              variant="primary"
              size="sm"
              isLoading={isSaving}
              onClick={handleSave}
              leftIcon={<Save className="w-3.5 h-3.5" />}
              className="text-xs bg-aura-600 hover:bg-aura-500 text-white font-semibold"
            >
              Guardar Cambios
            </Button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-dark-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Phase 9D Render & Preview Banner */}
        <div className="px-6 py-2.5 bg-aura-950/40 border-b border-aura-800/40 flex items-center justify-between text-xs text-aura-200/90 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-aura-400" />
            <span>
              <strong>Motor de Render Determinista (Fase 9D):</strong> FFmpeg + Backblaze B2. Archivo MP4 real (H.264 / AAC) con costo $0.00 USD.
            </span>
          </div>

          {/* Toggle Preview Mode */}
          <div className="flex items-center gap-1 bg-dark-900 border border-dark-700 p-0.5 rounded-xl">
            <button
              onClick={() => setPreviewMode('structural')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                previewMode === 'structural'
                  ? 'bg-aura-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Vista Estructural
            </button>
            <button
              onClick={() => setPreviewMode('rendered')}
              disabled={!isRendered && !isRendering}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 ${
                previewMode === 'rendered'
                  ? 'bg-emerald-600 text-white'
                  : isRendered
                  ? 'text-slate-300 hover:text-white'
                  : 'text-slate-600 cursor-not-allowed'
              }`}
            >
              {isRendered && <Check className="w-3 h-3 text-emerald-300" />}
              Render MP4 Real
            </button>
          </div>
        </div>

        {/* Body Workspace */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 custom-scrollbar">
          
          {/* Left / Center: Interactive Structural Viewport OR Real Render Video Player (5 cols) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-start space-y-4">
            
            <div className="flex items-center justify-between w-full">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                {previewMode === 'structural' ? (
                  <>
                    <Eye className="w-3.5 h-3.5 text-sky-400" />
                    Simulador Safe Area ({profile.dimensions.aspect_ratio})
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                    Reproductor MP4 Real (Backblaze B2)
                  </>
                )}
              </div>

              {isApproved && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  APROBADO
                </span>
              )}
            </div>

            {/* PREVIEW CONTAINER */}
            {previewMode === 'rendered' && renderedVideoUrl ? (
              /* REAL MP4 VIDEO PLAYER FROM BACKBLAZE B2 */
              <div 
                className="relative w-full max-w-[300px] rounded-3xl bg-black border-2 border-emerald-500/40 shadow-2xl overflow-hidden flex flex-col justify-center"
                style={{
                  aspectRatio: profile.dimensions.aspect_ratio === '9:16' ? '9/16' : profile.dimensions.aspect_ratio === '4:5' ? '4/5' : '1/1',
                  maxHeight: '480px'
                }}
              >
                <video
                  src={renderedVideoUrl}
                  controls
                  playsInline
                  className="w-full h-full object-contain rounded-2xl bg-black"
                />
              </div>
            ) : (
              /* STRUCTURAL VIEWPORT SIMULATOR */
              <div 
                className="relative w-full max-w-[280px] rounded-3xl bg-dark-950 border-2 border-dark-700 shadow-2xl overflow-hidden flex flex-col justify-between"
                style={{
                  aspectRatio: profile.dimensions.aspect_ratio === '9:16' ? '9/16' : profile.dimensions.aspect_ratio === '4:5' ? '4/5' : '1/1',
                  maxHeight: '460px'
                }}
              >
                {/* Media Asset Layer / Background */}
                <div className="absolute inset-0 bg-dark-900 flex items-center justify-center text-center p-4">
                  {activeScene?.asset_name ? (
                    <div className="space-y-1">
                      <span className="text-2xl">🎬</span>
                      <p className="text-[11px] font-semibold text-white truncate max-w-[220px]">
                        {activeScene.asset_name}
                      </p>
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-dark-800 text-slate-400">
                        {activeScene.fit_mode} mode
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1 text-slate-500">
                      <span className="text-2xl">📦</span>
                      <p className="text-[10px]">Sin asset asignado</p>
                    </div>
                  )}
                </div>

                {/* Translucent Safe Area Box */}
                <div
                  className="absolute border border-dashed border-amber-400/60 bg-amber-400/5 pointer-events-none flex items-center justify-center p-2"
                  style={{
                    top: `${profile.safeArea.top}%`,
                    bottom: `${profile.safeArea.bottom}%`,
                    left: `${profile.safeArea.left}%`,
                    right: `${profile.safeArea.right}%`,
                  }}
                >
                  {/* On Screen Text Overlay Preview */}
                  {activeScene?.on_screen_text ? (
                    <div className="text-center font-bold text-white text-xs px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg shadow-lg border border-white/20">
                      {activeScene.on_screen_text}
                    </div>
                  ) : (
                    <span className="text-[9px] text-amber-300/60 uppercase tracking-widest font-mono">
                      Safe Area
                    </span>
                  )}
                </div>

                {/* Top & Bottom Platform UI Overlays */}
                <div className="relative p-2 flex justify-between items-center text-[10px] text-slate-400 z-10 bg-gradient-to-b from-black/60 to-transparent">
                  <span>Escena {activeScene?.scene_number || 1}</span>
                  <span>{activeScene?.duration_seconds || 4}s</span>
                </div>

                <div className="relative p-3 text-[10px] text-white z-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent space-y-1">
                  <p className="font-semibold text-xs truncate">@{contentItem.brands?.name || 'Aura'}</p>
                  <p className="text-[10px] text-slate-200 line-clamp-2">{caption || 'Sin caption...'}</p>
                </div>
              </div>
            )}

            {/* Scene Selector Pills (for structural preview) */}
            {previewMode === 'structural' && (
              <div className="flex items-center gap-1.5 flex-wrap justify-center pt-1">
                {scenes.map((scene, idx) => (
                  <button
                    key={scene.scene_number}
                    onClick={() => setSelectedSceneIndex(idx)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                      selectedSceneIndex === idx
                        ? 'bg-aura-500 text-white shadow-md'
                        : 'bg-dark-950 border border-dark-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Escena {scene.scene_number}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Render Controls & Copy Workspace (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* SECCIÓN PRINCIPAL DE RENDER (FASE 9D) */}
            <div className="p-5 rounded-2xl bg-dark-950 border border-dark-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                    <Video className="w-4 h-4 text-purple-400" />
                    Motor de Render Local (FFmpeg)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Genera el archivo MP4 reproducible fuera de AuraSocial
                  </p>
                </div>

                {/* Render Status Pill */}
                <div>
                  {isRendering ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                      Renderizando ({activeJob?.progress || 15}%)
                    </span>
                  ) : isRendered ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      🟢 RENDER LISTO
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-dark-800 text-slate-300 border border-dark-700">
                      🟡 No renderizado
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Bar (during rendering) */}
              {isRendering && (
                <div className="space-y-2 p-3.5 rounded-xl bg-dark-900 border border-dark-800 animate-in fade-in">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-300 capitalize">
                      {activeJob?.current_step.replace(/_/g, ' ') || 'Procesando...'}
                    </span>
                    <span className="text-amber-400 font-mono font-bold">{activeJob?.progress}%</span>
                  </div>
                  <div className="w-full bg-dark-950 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-amber-500 to-purple-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${activeJob?.progress || 10}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Missing Media Quality Guard Alert */}
              {!mediaValidation.can_render && (
                <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-800/40 space-y-1 text-xs">
                  <div className="font-bold text-amber-300 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    Faltan medios para renderizar ({mediaValidation.missing_slots.length || mediaValidation.errors.length})
                  </div>
                  <p className="text-[11px] text-amber-200/90">
                    {mediaValidation.summary_message}
                  </p>
                  {mediaValidation.missing_slots.length > 0 && (
                    <ul className="list-disc list-inside space-y-0.5 text-amber-300/80 text-[11px] font-mono pt-1">
                      {mediaValidation.missing_slots.map((s, idx) => (
                        <li key={idx}>{s.message}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Render Actions Toolbar */}
              <div className="flex items-center gap-2.5 flex-wrap pt-1">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!mediaValidation.can_render || Boolean(isStartingRender || isRendering)}
                  isLoading={Boolean(isStartingRender || isRendering)}
                  onClick={handleTriggerRender}
                  leftIcon={<Video className="w-4 h-4" />}
                  className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs"
                  title={!mediaValidation.can_render ? mediaValidation.summary_message : 'Generar render MP4'}
                >
                  {isRendered ? 'Re-Renderizar Video' : 'Renderizar Video MP4'}
                </Button>

                {isRendered && renderedVideoUrl && (
                  <>
                    <a
                      href={renderedVideoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-dark-900 border border-dark-700 hover:border-slate-500 text-slate-200 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                      Abrir
                    </a>

                    <a
                      href={renderedVideoUrl}
                      download={`render_${adaptation.platform}_${adaptation.id}.mp4`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-dark-900 border border-dark-700 hover:border-slate-500 text-slate-200 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      Descargar MP4
                    </a>

                    {!isApproved && (
                      <Button
                        variant="secondary"
                        size="sm"
                        isLoading={isApproving}
                        onClick={handleApprove}
                        leftIcon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                        className="bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold ml-auto"
                      >
                        Aprobar Render
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Validation Alerts Bar */}
            {textValidation.errors.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-800/40 space-y-1 text-xs">
                <div className="font-bold text-rose-300 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  Requiere corrección ({textValidation.errors.length})
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-rose-200/90 text-[11px]">
                  {textValidation.errors.map((err, i) => (
                    <li key={i}>{err.message}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Editable Fields */}
            <div className="space-y-4 bg-dark-950/60 p-4 rounded-2xl border border-dark-800">
              
              {/* Title (for YouTube Shorts / Pinterest) */}
              {profile.requiresTitle && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                    <span>Título Obligatorio</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {title.length} / {profile.maxTitleLength || 100}
                    </span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Título del video..."
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-aura-500"
                  />
                </div>
              )}

              {/* Hook Inicial */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                  <span>Hook / Gancho Inicial</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {hook.length} / {profile.maxHookLength || 120}
                  </span>
                </label>
                <input
                  type="text"
                  value={hook}
                  onChange={(e) => setHook(e.target.value)}
                  placeholder="Gancho de apertura de la pieza..."
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-aura-500"
                />
              </div>

              {/* Caption */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-aura-400" />
                    Caption / Copy Específico para {profile.name}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {caption.length} / {profile.maxCaptionLength}
                  </span>
                </label>
                <textarea
                  rows={4}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Escribe el copy optimizado para esta red..."
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-aura-500 leading-relaxed custom-scrollbar"
                />
              </div>

              {/* Hashtags */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-amber-400" />
                    Hashtags
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Máx recomendado: {profile.maxHashtags}
                  </span>
                </label>
                <input
                  type="text"
                  value={hashtagsText}
                  onChange={(e) => setHashtagsText(e.target.value)}
                  placeholder="#bariloche #egresados #viajes"
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-aura-500 font-mono"
                />
              </div>

              {/* CTA */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Llamado a la Acción (CTA)
                </label>
                <input
                  type="text"
                  value={cta}
                  onChange={(e) => setCta(e.target.value)}
                  placeholder="Ej: Comentá VIAJE para recibir toda la info por DM"
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-aura-500"
                />
              </div>

            </div>

            {/* SECCIÓN DE PUBLICACIÓN OUTBOX (FASE 9E) */}
            <PublishingPackagePreview
              adaptation={adaptation}
              renderJob={activeJob}
              contentItem={contentItem}
              onPublished={loadRenderHistory}
            />

          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-dark-800 bg-dark-950/80 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Los renders se almacenan de forma inmutable en Backblaze B2 y pueden reproducirse en cualquier momento.
          </span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>

      </div>

      {/* Render Package JSON Modal */}
      {showJsonModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-dark-950 border border-dark-700 rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-dark-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Code className="w-4 h-4 text-aura-400" />
                Render Package Payload (Fase 9C/9D Contract)
              </h3>
              <button onClick={() => setShowJsonModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <pre className="p-4 rounded-xl bg-dark-900 border border-dark-800 text-[11px] text-aura-200 font-mono overflow-y-auto flex-1 custom-scrollbar">
              {JSON.stringify(renderPackage, null, 2)}
            </pre>

            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowJsonModal(false)}>
                Cerrar Visor
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Historical Renders Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-dark-950 border border-dark-700 rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-dark-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400" />
                Historial de Renders Anteriores ({jobHistory.length})
              </h3>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3 custom-scrollbar">
              {jobHistory.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No hay renders históricos registrados.</p>
              ) : (
                jobHistory.map((job) => (
                  <div key={job.id} className="p-4 rounded-2xl bg-dark-900 border border-dark-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>Job: {job.id.slice(0, 8)}...</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          job.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {job.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 pt-1">
                        {new Date(job.created_at).toLocaleString()} • {job.output_metadata?.width}x{job.output_metadata?.height}
                      </p>
                    </div>

                    {job.output_metadata?.signed_url && (
                      <a
                        href={job.output_metadata.signed_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-dark-800 hover:bg-dark-700 text-slate-200 text-xs flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                        Ver MP4
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowHistoryModal(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
