import { useState, useEffect, useRef } from 'react';
import { PublicationPackage, PlatformAdaptation, SceneMediaPlan } from '../../types/platformAdaptation';
import { 
  Heart, 
  MessageCircle, 
  Bookmark, 
  Share2, 
  Music2, 
  MoreHorizontal, 
  Eye, 
  EyeOff, 
  ThumbsUp, 
  Globe,
  Film,
  MoveVertical,
  Activity,
  Volume2,
  VolumeX,
  Play
} from 'lucide-react';
import { getB2CdnUrl } from '../../lib/b2Storage';

interface SequenceVideoPlayerProps {
  scenes: SceneMediaPlan[];
  mode: 'single' | 'full';
  selectedSceneNumber: number;
  isMuted: boolean;
  onActiveSceneChange?: (sceneNumber: number) => void;
  className?: string;
}

function SequenceVideoPlayer({
  scenes,
  mode,
  selectedSceneNumber,
  isMuted = true,
  onActiveSceneChange,
  className = 'w-full h-full object-cover',
}: SequenceVideoPlayerProps) {
  const [playingIndex, setPlayingIndex] = useState<number>(() => {
    const idx = scenes.findIndex((s) => s.scene_number === selectedSceneNumber);
    return idx >= 0 ? idx : 0;
  });
  const [isPlaying] = useState<boolean>(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Sincronizar inmediatamente cuando el usuario selecciona una escena (ej. al hacer clic en las barritas de arriba o en el media planner)
  useEffect(() => {
    const idx = scenes.findIndex((s) => s.scene_number === selectedSceneNumber);
    if (idx >= 0 && idx !== playingIndex) {
      setPlayingIndex(idx);
    }
  }, [selectedSceneNumber, scenes]);

  const activeSceneIndex = playingIndex >= 0 && playingIndex < scenes.length ? playingIndex : 0;
  const currentScene = scenes[activeSceneIndex] || scenes[0];

  // Determinar URL del asset
  let currentMediaUrl = currentScene?.asset_url;
  if (!currentMediaUrl && currentScene?.storage_path) {
    currentMediaUrl = getB2CdnUrl(currentScene.storage_path);
  }
  if (!currentMediaUrl || currentMediaUrl.includes('placehold.co')) {
    currentMediaUrl = 'https://placehold.co/1080x1920/1e1b4b/c084fc?text=Aura+Render';
  }

  const isCurrentVideo = Boolean(
    (currentScene?.mime_type && currentScene.mime_type.startsWith('video/')) ||
    currentScene?.asset_type === 'video' ||
    (currentMediaUrl && (currentMediaUrl.includes('.mp4') || currentMediaUrl.includes('.mov') || currentMediaUrl.includes('.webm')))
  );

  const startSec = typeof currentScene?.source_start_seconds === 'number' && currentScene.source_start_seconds >= 0
    ? currentScene.source_start_seconds
    : 0;

  const endSec = typeof currentScene?.source_end_seconds === 'number' && currentScene.source_end_seconds > startSec
    ? currentScene.source_end_seconds
    : (startSec + (currentScene?.duration_seconds || 5));

  // Notificar al padre cuando cambia de escena automáticamente en modo full
  useEffect(() => {
    if (currentScene && onActiveSceneChange) {
      onActiveSceneChange(currentScene.scene_number);
    }
  }, [activeSceneIndex]);

  // Manejo de imágenes en modo Full Video (timer de transición automática)
  useEffect(() => {
    if (mode === 'full' && !isCurrentVideo && isPlaying && scenes.length > 1) {
      const durMs = (currentScene?.duration_seconds || 5) * 1000;
      const timer = setTimeout(() => {
        setPlayingIndex((prev) => (prev + 1) % scenes.length);
      }, durMs);

      return () => clearTimeout(timer);
    }
  }, [mode, isCurrentVideo, isPlaying, currentScene?.duration_seconds, activeSceneIndex, scenes.length]);

  // Manejo de video
  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = startSec;
    if (isPlaying) {
      video.play().catch(() => {});
    }
  };

  const handleSeeked = () => {
    const video = videoRef.current;
    if (video && isPlaying) {
      video.play().catch(() => {});
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    const currentPos = video.currentTime;

    // Si alcanzó el final del fragmento recortado
    if (currentPos >= endSec - 0.05 || currentPos < startSec - 0.1) {
      if (mode === 'full' && scenes.length > 1) {
        // Pasar a la siguiente escena en la secuencia
        setPlayingIndex((prev) => (prev + 1) % scenes.length);
      } else {
        // Loopear el fragmento de la misma escena
        video.currentTime = startSec;
        if (isPlaying) video.play().catch(() => {});
      }
    }
  };

  // Asegurar que el video siempre salta a startSec inmediatamente al cambiar de escena o recorte
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = startSec;
    if (isPlaying) {
      video.play().catch(() => {});
    }
  }, [activeSceneIndex, startSec, endSec, currentMediaUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = isMuted;
  }, [isMuted]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center">
      {isCurrentVideo ? (
        <video
          ref={videoRef}
          key={`seq_${activeSceneIndex}_${currentMediaUrl}_${startSec}_${endSec}`}
          src={currentMediaUrl}
          onLoadedMetadata={handleLoadedMetadata}
          onSeeked={handleSeeked}
          onTimeUpdate={handleTimeUpdate}
          autoPlay={isPlaying}
          muted={isMuted}
          playsInline
          className={className}
        />
      ) : (
        <img
          key={`img_${currentMediaUrl}_${activeSceneIndex}`}
          src={currentMediaUrl}
          alt="Scene media"
          className="w-full h-full object-cover"
        />
      )}
    </div>
  );
}

interface UnifiedSocialPreviewProps {
  publicationPackage: PublicationPackage;
  activeAdaptation?: PlatformAdaptation;
  currentSceneNumber?: number;
  onUpdateSceneTextPosition?: (
    sceneNumber: number,
    position: 'top' | 'middle' | 'bottom',
    alignment?: 'left' | 'center' | 'right'
  ) => void;
  onSelectScene?: (sceneNumber: number) => void;
}

export function UnifiedSocialPreview({
  publicationPackage: pkg,
  activeAdaptation,
  currentSceneNumber = 1,
  onUpdateSceneTextPosition,
  onSelectScene,
}: UnifiedSocialPreviewProps) {
  const [showSafeArea, setShowSafeArea] = useState<boolean>(false);
  const [isExpandedCaption, setIsExpandedCaption] = useState<boolean>(false);
  const [cdnCacheStatus, setCdnCacheStatus] = useState<string>('DETECTING');
  const [previewMuted, setPreviewMuted] = useState<boolean>(true);
  const [previewMode, setPreviewMode] = useState<'single' | 'full'>('single');
  const [sequenceSceneNumber, setSequenceSceneNumber] = useState<number>(currentSceneNumber);

  const platform = pkg.platform || activeAdaptation?.platform || 'instagram';
  const format = pkg.format || activeAdaptation?.format || 'reel';
  const brandName = pkg.brand_profile?.brand_name || 'Aura Social';
  const handle = pkg.brand_profile?.handle || 'aurasocial';
  const avatarUrl = pkg.brand_profile?.avatar_url;

  // Lista de escenas
  const scenes = activeAdaptation?.scene_mappings || pkg.media?.scenes || [];
  const displaySceneNumber = previewMode === 'full' ? sequenceSceneNumber : currentSceneNumber;
  const currentScene = scenes.find((s) => s.scene_number === displaySceneNumber) || scenes[0];

  const totalDuration = scenes.reduce((acc, s) => acc + (s.duration_seconds || 5), 0);

  // Dynamic Cloudflare CDN Probe
  useEffect(() => {
    let mediaUrl = currentScene?.asset_url || (currentScene?.storage_path ? getB2CdnUrl(currentScene.storage_path) : '');
    if (!mediaUrl || !mediaUrl.includes('cdnsocial.lsnethub.com')) {
      setCdnCacheStatus('DIRECT');
      return;
    }

    let isMounted = true;
    fetch(mediaUrl, { method: 'HEAD' })
      .then((res) => {
        if (!isMounted) return;
        const cfHeader = res.headers.get('cf-cache-status') || res.headers.get('CF-Cache-Status');
        if (cfHeader) {
          setCdnCacheStatus(cfHeader.toUpperCase());
        } else if (res.ok) {
          setCdnCacheStatus('READY');
        } else {
          setCdnCacheStatus('UNKNOWN');
        }
      })
      .catch(() => {
        if (isMounted) setCdnCacheStatus('UNKNOWN');
      });

    return () => {
      isMounted = false;
    };
  }, [currentScene?.asset_url, currentScene?.storage_path]);

  const currentOverlay = (pkg.text_overlays || []).find((t) => t.scene_number === displaySceneNumber) ||
    (currentScene?.on_screen_text ? { text: currentScene.on_screen_text, safe_area_valid: true } : (pkg.text_overlays || [])[0]);

  // Ubicación y Alineación Dinámica del Overlay de Texto
  const textPosition = currentScene?.text_position || (currentOverlay as any)?.position || 'middle';
  const textAlignment = currentScene?.text_alignment || (currentOverlay as any)?.alignment || 'center';

  const verticalPosClass = 
    textPosition === 'top' 
      ? 'mt-8 mb-auto' 
      : textPosition === 'bottom' 
      ? 'mt-auto mb-10' 
      : 'my-auto';

  const textAlignClass = 
    textAlignment === 'left' 
      ? 'text-left' 
      : textAlignment === 'right' 
      ? 'text-right' 
      : 'text-center';

  const feedVerticalPosClass = 
    textPosition === 'top' 
      ? 'top-4' 
      : textPosition === 'bottom' 
      ? 'bottom-6' 
      : 'top-1/2 -translate-y-1/2';

  const isVertical = pkg.media?.aspect_ratio === '9:16' || format === 'reel' || platform === 'tiktok' || format === 'short';

  const handleCyclePosition = () => {
    if (!onUpdateSceneTextPosition || !currentScene) return;
    const nextPos = textPosition === 'top' ? 'bottom' : textPosition === 'bottom' ? 'middle' : 'top';
    onUpdateSceneTextPosition(currentScene.scene_number, nextPos, textAlignment);
  };

  return (
    <div className="flex flex-col h-full bg-dark-950 border border-dark-800 rounded-3xl p-5 shadow-2xl space-y-4">
      {/* Header Controls */}
      <div className="flex items-center justify-between pb-3 border-b border-dark-800/80 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Live Preview — {platform.toUpperCase()}
          </span>
        </div>

        {/* Mode Selector Toggle: Escena vs Video Completo */}
        <div className="flex items-center gap-1.5 bg-dark-900 p-1 rounded-2xl border border-dark-800">
          <button
            onClick={() => setPreviewMode('single')}
            className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
              previewMode === 'single'
                ? 'bg-aura-500 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Escena E{currentSceneNumber}
          </button>
          <button
            onClick={() => {
              setPreviewMode('full');
              setSequenceSceneNumber(1);
            }}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
              previewMode === 'full'
                ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-lg shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Play className="w-2.5 h-2.5 fill-current" />
            Video Completo ({totalDuration.toFixed(1)}s)
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio Mute/Unmute */}
          <button
            onClick={() => setPreviewMuted(!previewMuted)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-colors ${
              !previewMuted
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-dark-900 border border-dark-800 text-slate-400 hover:text-white'
            }`}
            title={previewMuted ? 'Activar sonido del preview' : 'Silenciar preview'}
          >
            {!previewMuted ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            {!previewMuted ? 'Audio ON' : 'Audio OFF'}
          </button>

          <button
            onClick={() => setShowSafeArea(!showSafeArea)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-colors ${
              showSafeArea
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-dark-900 border border-dark-800 text-slate-400 hover:text-white'
            }`}
          >
            {showSafeArea ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            Safe Area
          </button>
        </div>
      </div>

      {/* Mockup Container */}
      <div className="flex-1 flex items-center justify-center min-h-[440px] overflow-hidden">
        {/* ========================================================================= */}
        {/* INSTAGRAM REEL & TIKTOK VERTICAL MOCKUP */}
        {/* ========================================================================= */}
        {isVertical ? (
          <div className="relative w-full max-w-[280px] aspect-[9/16] bg-black rounded-3xl overflow-hidden border-2 border-dark-700 shadow-2xl select-none flex flex-col justify-between p-3">
            {/* Multi-Scene Video / Image Sequencer */}
            <div className="absolute inset-0 w-full h-full bg-black overflow-hidden flex items-center justify-center">
              <SequenceVideoPlayer
                scenes={scenes}
                mode={previewMode}
                selectedSceneNumber={currentSceneNumber}
                isMuted={previewMuted}
                onActiveSceneChange={(num) => setSequenceSceneNumber(num)}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Subtle Gradient Overlay for Readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80 pointer-events-none z-10" />

            {/* Safe Area Guides Overlay */}
            {showSafeArea && (
              <div className="absolute inset-0 pointer-events-none z-30 border border-dashed border-amber-400/80 m-3 rounded-2xl flex flex-col justify-between p-2">
                <div className="bg-amber-500/30 text-amber-200 text-[9px] font-mono px-1 rounded self-start backdrop-blur-sm">
                  Top Safe Area (15%)
                </div>
                <div className="bg-amber-500/30 text-amber-200 text-[9px] font-mono px-1 rounded self-end backdrop-blur-sm">
                  Side Buttons Area
                </div>
                <div className="bg-amber-500/30 text-amber-200 text-[9px] font-mono px-1 rounded self-start backdrop-blur-sm">
                  Bottom UI Safe Area (20%)
                </div>
              </div>
            )}

            {/* Top Multi-Segment Timeline (Reel & Story Segmented Bars) */}
            <div className="relative z-20 space-y-1.5">
              <div className="flex items-center gap-1 w-full pt-1">
                {scenes.map((s) => {
                  const isCurrent = s.scene_number === displaySceneNumber;
                  const isPast = s.scene_number < displaySceneNumber;
                  return (
                    <div
                      key={`seg_${s.scene_number}`}
                      onClick={() => {
                        if (onSelectScene) onSelectScene(s.scene_number);
                        setSequenceSceneNumber(s.scene_number);
                      }}
                      className="flex-1 h-1 rounded-full bg-white/30 overflow-hidden cursor-pointer hover:h-1.5 transition-all"
                      title={`Escena ${s.scene_number}: ${s.duration_seconds || 5}s`}
                    >
                      <div
                        className={`h-full transition-all duration-150 ${
                          isCurrent
                            ? 'bg-amber-400 w-full animate-pulse'
                            : isPast
                            ? 'bg-white w-full'
                            : 'bg-transparent w-0'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Top Meta Bar */}
              <div className="flex items-center justify-between text-white drop-shadow-md">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold tracking-tight">
                    {platform === 'tiktok' ? 'Para ti' : 'Reels'}
                  </span>
                  {currentScene && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/20 flex items-center gap-1">
                      <span className="font-bold text-amber-300">E{displaySceneNumber}</span>
                      <span>({(currentScene.duration_seconds || 5).toFixed(1)}s)</span>
                      {previewMode === 'full' && (
                        <span className="text-[8px] bg-emerald-500/30 text-emerald-300 px-1 rounded font-bold">
                          REEL COMPLETO
                        </span>
                      )}
                    </span>
                  )}
                </div>
                <MoreHorizontal className="w-4 h-4" />
              </div>
            </div>

            {/* Dynamic Deterministic Text Overlay (Positionable) */}
            {currentOverlay && currentOverlay.text && (
              <div className={`relative z-20 px-3 ${verticalPosClass} ${textAlignClass} transition-all duration-200`}>
                <div 
                  onClick={handleCyclePosition}
                  title="Clic para cambiar posición del texto (Arriba / Centro / Abajo)"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md text-white font-extrabold text-xs sm:text-sm leading-tight tracking-tight shadow-xl border border-white/15 cursor-pointer hover:bg-black/90 hover:scale-[1.02] active:scale-95 transition-all group"
                >
                  <span>{currentOverlay.text}</span>
                  <MoveVertical className="w-3 h-3 text-aura-400 opacity-40 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            )}

            {/* Bottom Meta & Right Action Sidebar */}
            <div className="relative z-20 flex items-end justify-between gap-3">
              {/* Left Details */}
              <div className="flex-1 space-y-1.5 text-white drop-shadow-lg text-left">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-aura-600 flex items-center justify-center text-[10px] font-bold uppercase overflow-hidden border border-white/40 shadow-sm">
                    {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : brandName.slice(0, 2)}
                  </div>
                  <span className="text-xs font-bold">@{handle}</span>
                </div>

                {/* Caption & Hashtags */}
                <div className="text-[11px] leading-snug line-clamp-2">
                  <span className="font-semibold mr-1">{brandName}:</span>
                  <span>{pkg.caption || activeAdaptation?.caption || ''}</span>
                  {pkg.hashtags && pkg.hashtags.length > 0 && (
                    <span className="text-sky-300 ml-1 font-semibold">
                      {pkg.hashtags.map((t) => (t.startsWith('#') ? t : `#${t}`)).join(' ')}
                    </span>
                  )}
                </div>

                {/* Audio track */}
                <div className="flex items-center gap-1 text-[10px] opacity-85">
                  <Music2 className="w-3 h-3 animate-spin" />
                  <span className="truncate">Sonido original - {brandName}</span>
                </div>
              </div>

              {/* Right Floating Actions */}
              <div className="flex flex-col items-center gap-3 text-white drop-shadow-md shrink-0">
                <div className="flex flex-col items-center">
                  <Heart className="w-5 h-5 text-white hover:text-rose-500 transition-colors" />
                  <span className="text-[9px] font-semibold">24.5K</span>
                </div>
                <div className="flex flex-col items-center">
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-[9px] font-semibold">342</span>
                </div>
                <div className="flex flex-col items-center">
                  <Bookmark className="w-5 h-5" />
                  <span className="text-[9px] font-semibold">1.2K</span>
                </div>
                <div className="flex flex-col items-center">
                  <Share2 className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* FACEBOOK / LINKEDIN / FEED CARD MOCKUP */
          /* ========================================================================= */
          <div className="w-full max-w-[380px] bg-dark-900 border border-dark-800 rounded-2xl shadow-xl overflow-hidden text-left flex flex-col">
            {/* Card Header */}
            <div className="p-3.5 flex items-center justify-between border-b border-dark-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-aura-600 flex items-center justify-center text-xs font-bold text-white overflow-hidden border border-white/20">
                  {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : brandName.slice(0, 2)}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1">
                    {brandName}
                    <span className="text-[10px] text-slate-400 font-normal">
                      • {platform === 'linkedin' ? 'Empresa' : 'Página oficial'}
                    </span>
                  </h4>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <span>Hace un momento</span>
                    <span>•</span>
                    <Globe className="w-2.5 h-2.5" />
                  </div>
                </div>
              </div>
              <MoreHorizontal className="w-4 h-4 text-slate-400" />
            </div>

            {/* Caption Text */}
            <div className="p-3.5 text-xs text-slate-200 leading-relaxed whitespace-pre-line">
              {isExpandedCaption ? (pkg.caption || '') : `${(pkg.caption || '').slice(0, 160)}${(pkg.caption || '').length > 160 ? '...' : ''}`}
              {(pkg.caption || '').length > 160 && (
                <button
                  onClick={() => setIsExpandedCaption(!isExpandedCaption)}
                  className="text-aura-400 font-semibold ml-1 hover:underline text-[11px]"
                >
                  {isExpandedCaption ? 'Ver menos' : 'Ver más'}
                </button>
              )}

              {pkg.hashtags && pkg.hashtags.length > 0 && (
                <div className="text-aura-300 font-medium text-[11px] mt-1.5">
                  {pkg.hashtags.map((t) => (t.startsWith('#') ? t : `#${t}`)).join(' ')}
                </div>
              )}
            </div>

            {/* Media Image / Video / Render */}
            <div className="relative aspect-square bg-black flex items-center justify-center overflow-hidden">
              <SequenceVideoPlayer
                scenes={scenes}
                mode={previewMode}
                selectedSceneNumber={currentSceneNumber}
                isMuted={previewMuted}
                onActiveSceneChange={(num) => setSequenceSceneNumber(num)}
                className="w-full h-full object-cover"
              />
              {currentOverlay && currentOverlay.text && (
                <div className={`absolute inset-x-4 ${feedVerticalPosClass} ${textAlignClass} z-10 transition-all`}>
                  <div 
                    onClick={handleCyclePosition}
                    title="Clic para cambiar posición del texto"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md text-white font-bold text-xs shadow-lg border border-white/10 cursor-pointer hover:bg-black/90 transition-all group"
                  >
                    <span>{currentOverlay.text}</span>
                    <MoveVertical className="w-3 h-3 text-aura-400 opacity-40 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              )}
            </div>

            {/* Footer Engagement Bar */}
            <div className="p-2.5 border-t border-dark-800 flex items-center justify-around text-slate-400 text-xs font-semibold">
              <button className="flex items-center gap-1.5 hover:text-aura-400 transition-colors">
                <ThumbsUp className="w-4 h-4" /> Me gusta
              </button>
              <button className="flex items-center gap-1.5 hover:text-aura-400 transition-colors">
                <MessageCircle className="w-4 h-4" /> Comentar
              </button>
              <button className="flex items-center gap-1.5 hover:text-aura-400 transition-colors">
                <Share2 className="w-4 h-4" /> Compartir
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Package Metadata Footer */}
      <div className="p-3 rounded-2xl bg-dark-900 border border-dark-800/80 flex items-center justify-between text-[11px] text-slate-400 flex-wrap gap-2">
        <span className="font-mono flex items-center gap-1.5">
          <Film className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-300 font-semibold">{format.toUpperCase()}</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">{scenes.length} escenas planificadas</span>
          <span className="text-slate-500">•</span>
          <strong className="text-emerald-300 font-mono">Total: {totalDuration.toFixed(1)}s</strong>
        </span>

        {/* Dynamic Cloudflare CDN Status Badge */}
        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          <Activity className="w-3 h-3 text-sky-400" />
          <span className="text-slate-400">CDN:</span>
          <span
            className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider ${
              cdnCacheStatus === 'HIT'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : cdnCacheStatus === 'MISS'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
            }`}
          >
            {cdnCacheStatus}
          </span>
        </div>
      </div>
    </div>
  );
}
