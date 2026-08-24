import { useState } from 'react';
import { PublicationPackage } from '../../../types/publishing';
import { SafeAreaOverlay } from './SafeAreaOverlay';
import { 
  Heart, 
  MessageCircle, 
  Send, 
  Bookmark, 
  Music, 
  Camera, 
  Film,
  UserCheck
} from 'lucide-react';

interface InstagramReelPreviewProps {
  publicationPackage: PublicationPackage;
  brandName?: string;
  avatarUrl?: string;
  showSafeAreas?: boolean;
}

export function InstagramReelPreview({
  publicationPackage,
  brandName = 'Mi Marca',
  avatarUrl,
  showSafeAreas = false,
}: InstagramReelPreviewProps) {
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
          <p className="text-xs font-semibold text-slate-400">Video Reel pendiente de render</p>
          <p className="text-[10px] text-slate-600 mt-1">1080x1920 • 9:16</p>
        </div>
      )}

      {/* Safe Area Visual Overlay */}
      <SafeAreaOverlay platform="instagram" isVisible={showSafeAreas} />

      {/* Top Bar Header */}
      <div className="relative z-10 p-3.5 flex items-center justify-between text-white/90 bg-gradient-to-b from-black/70 via-black/30 to-transparent pointer-events-none">
        <div className="flex items-center gap-1.5 font-bold text-xs tracking-wider uppercase drop-shadow-md">
          <Film className="w-3.5 h-3.5 text-pink-400" />
          <span>Reels</span>
        </div>
        <Camera className="w-4 h-4 text-white/80" />
      </div>

      {/* Main Bottom Overlay & Right Action Bar */}
      <div className="relative z-10 p-3 pb-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-end justify-between gap-2 pointer-events-none">
        
        {/* Left Bottom Profile, Caption & Audio */}
        <div className="flex-1 space-y-2 pointer-events-auto pr-1">
          {/* Identity */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 p-[1.5px] shrink-0">
              <div className="w-full h-full rounded-full bg-dark-900 overflow-hidden flex items-center justify-center text-[10px] font-bold text-white uppercase">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={brandName} className="w-full h-full object-cover" />
                ) : (
                  brandName.charAt(0)
                )}
              </div>
            </div>
            <span className="text-xs font-bold text-white drop-shadow-md truncate max-w-[130px]">
              @{handle}
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm transition-all flex items-center gap-1 cursor-pointer">
              <UserCheck className="w-2.5 h-2.5" /> Seguir
            </span>
          </div>

          {/* Caption & Hashtags */}
          <div className="text-xs text-white/95 leading-relaxed drop-shadow-md">
            <p className={`${isExpanded ? '' : 'line-clamp-2'} text-[11px]`}>
              {caption || 'Sin texto de caption'}
            </p>
            {hashtags.length > 0 && (
              <p className={`${isExpanded ? '' : 'line-clamp-1'} text-[11px] font-semibold text-pink-300/90 pt-0.5`}>
                {hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')}
              </p>
            )}
            {caption.length > 60 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-[10px] text-slate-300 font-semibold hover:underline block pt-0.5 pointer-events-auto"
              >
                {isExpanded ? 'menos' : '... más'}
              </button>
            )}
          </div>

          {/* Audio Ticker */}
          <div className="flex items-center gap-1.5 text-[10px] text-white/80 font-medium truncate pt-0.5">
            <Music className="w-3 h-3 shrink-0 animate-pulse text-pink-400" />
            <span className="truncate">Audio original • @{handle}</span>
          </div>
        </div>

        {/* Right Action Icons Column */}
        <div className="flex flex-col items-center gap-3.5 text-white pointer-events-auto shrink-0 pb-1">
          <div className="flex flex-col items-center gap-0.5 cursor-pointer hover:scale-110 transition-transform">
            <div className="p-1.5 rounded-full bg-black/30 backdrop-blur-sm">
              <Heart className="w-5 h-5 text-white drop-shadow" />
            </div>
            <span className="text-[9px] font-bold">12.4K</span>
          </div>

          <div className="flex flex-col items-center gap-0.5 cursor-pointer hover:scale-110 transition-transform">
            <div className="p-1.5 rounded-full bg-black/30 backdrop-blur-sm">
              <MessageCircle className="w-5 h-5 text-white drop-shadow" />
            </div>
            <span className="text-[9px] font-bold">482</span>
          </div>

          <div className="flex flex-col items-center gap-0.5 cursor-pointer hover:scale-110 transition-transform">
            <div className="p-1.5 rounded-full bg-black/30 backdrop-blur-sm">
              <Send className="w-5 h-5 text-white drop-shadow" />
            </div>
            <span className="text-[9px] font-bold">Share</span>
          </div>

          <div className="flex flex-col items-center gap-0.5 cursor-pointer hover:scale-110 transition-transform">
            <div className="p-1.5 rounded-full bg-black/30 backdrop-blur-sm">
              <Bookmark className="w-5 h-5 text-white drop-shadow" />
            </div>
          </div>

          {/* Audio Disc icon */}
          <div className="w-6 h-6 rounded-full bg-dark-900 border border-white/60 p-0.5 flex items-center justify-center animate-spin" style={{ animationDuration: '4s' }}>
            <div className="w-full h-full rounded-full bg-gradient-to-tr from-pink-500 to-purple-600" />
          </div>
        </div>

      </div>

    </div>
  );
}
