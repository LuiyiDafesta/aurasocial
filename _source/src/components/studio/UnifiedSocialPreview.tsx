import { useState } from 'react';
import { PublicationPackage } from '../../types/platformAdaptation';
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
  Globe 
} from 'lucide-react';

interface UnifiedSocialPreviewProps {
  publicationPackage: PublicationPackage;
  currentSceneNumber?: number;
}

export function UnifiedSocialPreview({
  publicationPackage: pkg,
  currentSceneNumber = 1,
}: UnifiedSocialPreviewProps) {
  const [showSafeArea, setShowSafeArea] = useState<boolean>(false);
  const [isExpandedCaption, setIsExpandedCaption] = useState<boolean>(false);

  const platform = pkg.platform || 'instagram';
  const format = pkg.format || 'reel';
  const brandName = pkg.brand_profile.brand_name || 'Aura Social';
  const handle = pkg.brand_profile.handle || 'aurasocial';
  const avatarUrl = pkg.brand_profile.avatar_url;

  const currentOverlay = pkg.text_overlays.find((t) => t.scene_number === currentSceneNumber) || pkg.text_overlays[0];
  const mediaUrl = pkg.media.render_url || 'https://placehold.co/1080x1920/1e1b4b/c084fc?text=Aura+Render';

  const isVertical = pkg.media.aspect_ratio === '9:16' || format === 'reel' || platform === 'tiktok';

  return (
    <div className="flex flex-col h-full bg-dark-950 border border-dark-800 rounded-3xl p-5 shadow-2xl space-y-4">
      {/* Header Controls */}
      <div className="flex items-center justify-between pb-3 border-b border-dark-800/80">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Live Social Preview — {platform.toUpperCase()} ({format.toUpperCase()})
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
            {/* Background Media Image/Mock */}
            <img
              src={mediaUrl}
              alt="Render Preview"
              className="absolute inset-0 w-full h-full object-cover opacity-90"
            />

            {/* Safe Area Guides Overlay */}
            {showSafeArea && (
              <div className="absolute inset-0 pointer-events-none z-30 border border-dashed border-amber-400/80 m-3 rounded-2xl flex flex-col justify-between p-2">
                <div className="bg-amber-500/20 text-amber-300 text-[9px] font-mono px-1 rounded self-start">
                  Top Safe Area (15%)
                </div>
                <div className="bg-amber-500/20 text-amber-300 text-[9px] font-mono px-1 rounded self-end">
                  Side Buttons Area
                </div>
                <div className="bg-amber-500/20 text-amber-300 text-[9px] font-mono px-1 rounded self-start">
                  Bottom UI Safe Area (20%)
                </div>
              </div>
            )}

            {/* Top Bar */}
            <div className="relative z-10 flex items-center justify-between text-white drop-shadow-md">
              <span className="text-[11px] font-bold tracking-tight">
                {platform === 'tiktok' ? 'Siguiendo | Para ti' : 'Reels'}
              </span>
              <MoreHorizontal className="w-4 h-4" />
            </div>

            {/* Center Deterministic Text Overlay */}
            {currentOverlay && currentOverlay.text && (
              <div className="relative z-20 my-auto text-center px-4">
                <span className="inline-block px-3 py-1.5 rounded-xl bg-black/75 backdrop-blur-md text-white font-extrabold text-sm sm:text-base leading-tight tracking-tight shadow-xl border border-white/10">
                  {currentOverlay.text}
                </span>
              </div>
            )}

            {/* Bottom Meta & Right Action Sidebar */}
            <div className="relative z-10 flex items-end justify-between gap-3">
              {/* Left Details */}
              <div className="flex-1 space-y-1.5 text-white drop-shadow-lg text-left">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-aura-600 flex items-center justify-center text-[10px] font-bold uppercase overflow-hidden border border-white/40">
                    {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : brandName.slice(0, 2)}
                  </div>
                  <span className="text-xs font-bold">@{handle}</span>
                </div>

                {/* Caption & Hashtags */}
                <div className="text-[11px] leading-snug line-clamp-2">
                  <span className="font-semibold mr-1">{brandName}:</span>
                  <span>{pkg.caption}</span>
                  {pkg.hashtags.length > 0 && (
                    <span className="text-sky-300 ml-1 font-semibold">
                      {pkg.hashtags.map((t) => (t.startsWith('#') ? t : `#${t}`)).join(' ')}
                    </span>
                  )}
                </div>

                {/* Audio track */}
                <div className="flex items-center gap-1 text-[10px] opacity-80">
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
              {isExpandedCaption ? pkg.caption : `${pkg.caption.slice(0, 160)}${pkg.caption.length > 160 ? '...' : ''}`}
              {pkg.caption.length > 160 && (
                <button
                  onClick={() => setIsExpandedCaption(!isExpandedCaption)}
                  className="text-aura-400 font-semibold ml-1 hover:underline text-[11px]"
                >
                  {isExpandedCaption ? 'Ver menos' : 'Ver más'}
                </button>
              )}

              {pkg.hashtags.length > 0 && (
                <div className="text-aura-300 font-medium text-[11px] mt-1.5">
                  {pkg.hashtags.map((t) => (t.startsWith('#') ? t : `#${t}`)).join(' ')}
                </div>
              )}
            </div>

            {/* Media Image / Render */}
            <div className="relative aspect-square bg-black flex items-center justify-center overflow-hidden">
              <img src={mediaUrl} alt="Post media" className="w-full h-full object-cover" />
              {currentOverlay && currentOverlay.text && (
                <div className="absolute inset-x-4 bottom-6 text-center">
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
        <span className="font-mono">
          PKG: <strong className="text-slate-200">{pkg.package_id.slice(0, 24)}...</strong>
        </span>
        <span className="font-mono">
          Dim: <strong className="text-slate-200">{pkg.media.width}x{pkg.media.height} ({pkg.media.aspect_ratio})</strong>
        </span>
        <span>
          Duración: <strong className="text-slate-200">{pkg.media.duration_seconds || 0}s</strong>
        </span>
      </div>
    </div>
  );
}
