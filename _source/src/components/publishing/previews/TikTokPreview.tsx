import { useState } from 'react';
import { PublicationPackage } from '../../../types/publishing';
import { SafeAreaOverlay } from './SafeAreaOverlay';
import { 
  Heart, 
  MessageSquare, 
  Share2, 
  Bookmark, 
  Music, 
  Search, 
  Plus, 
  Film 
} from 'lucide-react';

interface TikTokPreviewProps {
  publicationPackage: PublicationPackage;
  brandName?: string;
  avatarUrl?: string;
  showSafeAreas?: boolean;
}

export function TikTokPreview({
  publicationPackage,
  brandName = 'Mi Marca',
  avatarUrl,
  showSafeAreas = false,
}: TikTokPreviewProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const mediaItem = publicationPackage.media.find((m) => m.type === 'video') || publicationPackage.media[0];
  const videoUrl = mediaItem?.signed_url;

  const caption = publicationPackage.caption || '';
  const hashtags = publicationPackage.hashtags || [];
  const handle = brandName.toLowerCase().replace(/\s+/g, '_');

  return (
    <div className="w-full max-w-[310px] mx-auto aspect-[9/16] rounded-3xl overflow-hidden bg-black border-2 border-dark-700 shadow-2xl relative select-none flex flex-col justify-between">
      
      {/* Video Real / Poster Background */}
      {videoUrl ? (
        <video
          src={videoUrl}
          controls
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-dark-950 p-6 text-center text-slate-500 z-0">
          <Film className="w-10 h-10 text-slate-600 mb-2" />
          <p className="text-xs font-semibold text-slate-400">Video TikTok pendiente de render</p>
          <p className="text-[10px] text-slate-600 mt-1">1080x1920 • 9:16</p>
        </div>
      )}

      {/* Safe Area Visual Overlay */}
      <SafeAreaOverlay platform="tiktok" isVisible={showSafeAreas} />

      {/* Top Bar Header */}
      <div className="relative z-10 p-3 flex items-center justify-between text-white/90 bg-gradient-to-b from-black/70 via-black/20 to-transparent pointer-events-none">
        <div className="w-6" />
        <div className="flex items-center gap-3 text-xs font-bold drop-shadow-md">
          <span className="text-white/60">Siguiendo</span>
          <span className="text-white border-b-2 border-white pb-0.5">Para ti</span>
        </div>
        <Search className="w-4 h-4 text-white/80" />
      </div>

      {/* Main Bottom Overlay & Right Action Bar */}
      <div className="relative z-10 p-3 pb-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-end justify-between gap-2 pointer-events-none">
        
        {/* Left Bottom Profile, Caption & Audio */}
        <div className="flex-1 space-y-2 pointer-events-auto pr-1">
          {/* Identity */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-white drop-shadow-md truncate max-w-[170px]">
              @{handle}
            </span>
          </div>

          {/* Caption & Hashtags */}
          <div className="text-xs text-white/95 leading-relaxed drop-shadow-md">
            <p className={`${isExpanded ? '' : 'line-clamp-2'} text-[11px]`}>
              {caption || 'Sin texto de caption'}
            </p>
            {hashtags.length > 0 && (
              <p className={`${isExpanded ? '' : 'line-clamp-1'} text-[11px] font-bold text-white pt-0.5`}>
                {hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')}
              </p>
            )}
            {caption.length > 60 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-[10px] text-slate-300 font-semibold hover:underline block pt-0.5 pointer-events-auto"
              >
                {isExpanded ? 'menos' : 'más'}
              </button>
            )}
          </div>

          {/* Sound Ticker */}
          <div className="flex items-center gap-1.5 text-[10px] text-white/90 font-medium truncate pt-0.5">
            <Music className="w-3 h-3 shrink-0 animate-spin text-teal-300" style={{ animationDuration: '3s' }} />
            <span className="truncate">Sonido original - {brandName}</span>
          </div>
        </div>

        {/* Right Action Bar */}
        <div className="flex flex-col items-center gap-3 text-white pointer-events-auto shrink-0 pb-1">
          {/* Avatar with red plus */}
          <div className="relative mb-1">
            <div className="w-8 h-8 rounded-full border border-white overflow-hidden bg-dark-800 flex items-center justify-center text-[10px] font-bold text-white uppercase">
              {avatarUrl ? (
                <img src={avatarUrl} alt={brandName} className="w-full h-full object-cover" />
              ) : (
                brandName.charAt(0)
              )}
            </div>
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-red-500 text-white flex items-center justify-center">
              <Plus className="w-2.5 h-2.5" />
            </div>
          </div>

          {/* Heart */}
          <div className="flex flex-col items-center gap-0.5 cursor-pointer hover:scale-110 transition-transform">
            <Heart className="w-6 h-6 text-white drop-shadow fill-white" />
            <span className="text-[9px] font-bold">45.2K</span>
          </div>

          {/* Comment */}
          <div className="flex flex-col items-center gap-0.5 cursor-pointer hover:scale-110 transition-transform">
            <MessageSquare className="w-6 h-6 text-white drop-shadow fill-white" />
            <span className="text-[9px] font-bold">892</span>
          </div>

          {/* Bookmark */}
          <div className="flex flex-col items-center gap-0.5 cursor-pointer hover:scale-110 transition-transform">
            <Bookmark className="w-6 h-6 text-white drop-shadow fill-white" />
            <span className="text-[9px] font-bold">3.1K</span>
          </div>

          {/* Share */}
          <div className="flex flex-col items-center gap-0.5 cursor-pointer hover:scale-110 transition-transform">
            <Share2 className="w-6 h-6 text-white drop-shadow" />
            <span className="text-[9px] font-bold">Share</span>
          </div>

          {/* Rotating vinyl record */}
          <div className="w-7 h-7 rounded-full bg-dark-950 border-2 border-slate-700 p-1 flex items-center justify-center animate-spin" style={{ animationDuration: '3s' }}>
            <div className="w-full h-full rounded-full bg-gradient-to-tr from-teal-400 to-cyan-500" />
          </div>
        </div>

      </div>

    </div>
  );
}
