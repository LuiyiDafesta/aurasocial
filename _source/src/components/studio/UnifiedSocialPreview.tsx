import { useState } from 'react';
import { PublicationPackage, PlatformAdaptation } from '../../types/platformAdaptation';
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
  Sparkles
} from 'lucide-react';

interface UnifiedSocialPreviewProps {
  publicationPackage: PublicationPackage;
  activeAdaptation?: PlatformAdaptation;
  currentSceneNumber?: number;
}

export function UnifiedSocialPreview({
  publicationPackage: pkg,
  activeAdaptation,
  currentSceneNumber = 1,
}: UnifiedSocialPreviewProps) {
  const [showSafeArea, setShowSafeArea] = useState<boolean>(false);
  const [isExpandedCaption, setIsExpandedCaption] = useState<boolean>(false);

  const platform = pkg.platform || activeAdaptation?.platform || 'instagram';
  const format = pkg.format || activeAdaptation?.format || 'reel';
  const brandName = pkg.brand_profile?.brand_name || 'Aura Social';
  const handle = pkg.brand_profile?.handle || 'aurasocial';
  const avatarUrl = pkg.brand_profile?.avatar_url;

  // 1. Obtener la escena activa seleccionada
  const scenes = activeAdaptation?.scene_mappings || pkg.media?.scenes || [];
  const currentScene = scenes.find((s) => s.scene_number === currentSceneNumber) || scenes[0];

  // 2. Determinar la URL del recurso multimedia (video o foto)
  let mediaUrl = currentScene?.asset_url;
  if (!mediaUrl && currentScene?.storage_path) {
    mediaUrl = `https://f004.backblazeb2.com/file/AuraSocial/${currentScene.storage_path}`;
  }
  if (!mediaUrl) {
    mediaUrl = pkg.media?.render_url;
  }
  if (!mediaUrl || mediaUrl.includes('placehold.co')) {
    mediaUrl = 'https://placehold.co/1080x1920/1e1b4b/c084fc?text=Aura+Render';
  }

  // 3. Determinar si el asset actual es un video
  const isVideo = Boolean(
    (currentScene?.mime_type && currentScene.mime_type.startsWith('video/')) ||
    currentScene?.asset_type === 'video' ||
    (mediaUrl && (mediaUrl.includes('.mp4') || mediaUrl.includes('.mov') || mediaUrl.includes('.webm') || mediaUrl.includes('video')))
  );

  const currentOverlay = (pkg.text_overlays || []).find((t) => t.scene_number === currentSceneNumber) ||
    (currentScene?.on_screen_text ? { text: currentScene.on_screen_text, safe_area_valid: true } : (pkg.text_overlays || [])[0]);

  const isVertical = pkg.media?.aspect_ratio === '9:16' || format === 'reel' || platform === 'tiktok' || format === 'short';

  return (
    <div className="flex flex-col h-full bg-dark-950 border border-dark-800 rounded-3xl p-5 shadow-2xl space-y-4">
      {/* Header Controls */}
      <div className="flex items-center justify-between pb-3 border-b border-dark-800/80">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Live Preview — {platform.toUpperCase()} ({format.toUpperCase()})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSafeArea(!showSafeArea)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-colors ${
              showSafeArea
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-dark-900 border border-dark-800 text-slate-400 hover:text-white'
            }`}
          >
            {showSafeArea ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            Safe Area Guides
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
            {/* Background Media: Video or Image */}
            {isVideo ? (
              <div className="absolute inset-0 w-full h-full bg-black overflow-hidden flex items-center justify-center">
                <video
                  key={mediaUrl}
                  src={mediaUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <img
                key={mediaUrl}
                src={mediaUrl}
                alt="Render Preview"
                className="absolute inset-0 w-full h-full object-cover opacity-90"
              />
            )}

            {/* Subtle Gradient Overlay for Readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/75 pointer-events-none z-10" />

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

            {/* Top Bar */}
            <div className="relative z-20 flex items-center justify-between text-white drop-shadow-md">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold tracking-tight">
                  {platform === 'tiktok' ? 'Siguiendo | Para ti' : 'Reels'}
                </span>
                {currentScene && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/20">
                    E{currentScene.scene_number} ({currentScene.duration_seconds || 5}s)
                  </span>
                )}
              </div>
              <MoreHorizontal className="w-4 h-4" />
            </div>

            {/* Center Deterministic Text Overlay */}
            {currentOverlay && currentOverlay.text && (
              <div className="relative z-20 my-auto text-center px-4">
                <span className="inline-block px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md text-white font-extrabold text-xs sm:text-sm leading-tight tracking-tight shadow-xl border border-white/15">
                  {currentOverlay.text}
                </span>
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
              {isVideo ? (
                <video
                  key={mediaUrl}
                  src={mediaUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <img key={mediaUrl} src={mediaUrl} alt="Post media" className="w-full h-full object-cover" />
              )}
              {currentOverlay && currentOverlay.text && (
                <div className="absolute inset-x-4 bottom-6 text-center z-10">
                  <span className="inline-block px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md text-white font-bold text-xs shadow-lg border border-white/10">
                    {currentOverlay.text}
                  </span>
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
        <span className="font-mono flex items-center gap-1">
          {isVideo ? <Film className="w-3.5 h-3.5 text-emerald-400" /> : <Sparkles className="w-3.5 h-3.5 text-aura-400" />}
          PKG: <strong className="text-slate-200">{pkg.package_id ? pkg.package_id.slice(0, 24) : 'pkg_draft'}...</strong>
        </span>
        <span className="font-mono">
          Dim: <strong className="text-slate-200">{pkg.media?.width || 1080}x{pkg.media?.height || 1920} ({pkg.media?.aspect_ratio || '9:16'})</strong>
        </span>
        <span>
          Duración: <strong className="text-slate-200">{pkg.media?.duration_seconds || 15}s</strong>
        </span>
      </div>
    </div>
  );
}
