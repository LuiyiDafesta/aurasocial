import { useState } from 'react';
import { PublicationPackage } from '../../../types/publishing';
import { SafeAreaOverlay } from './SafeAreaOverlay';
import { 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare, 
  Share2, 
  Repeat, 
  Search, 
  Camera, 
  Film,
  Music 
} from 'lucide-react';

interface YouTubeShortsPreviewProps {
  publicationPackage: PublicationPackage;
  brandName?: string;
  avatarUrl?: string;
  showSafeAreas?: boolean;
}

export function YouTubeShortsPreview({
  publicationPackage,
  brandName = 'Mi Canal',
  avatarUrl,
  showSafeAreas = false,
}: YouTubeShortsPreviewProps) {
  const [showDesc, setShowDesc] = useState<boolean>(false);
  const mediaItem = publicationPackage.media.find((m) => m.type === 'video') || publicationPackage.media[0];
  const videoUrl = mediaItem?.signed_url;

  const title = publicationPackage.title || publicationPackage.caption || 'Título de YouTube Shorts';
  const description = publicationPackage.description || publicationPackage.caption || '';
  const hashtags = publicationPackage.hashtags || [];

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
          <p className="text-xs font-semibold text-slate-400">Video YouTube Shorts pendiente de render</p>
          <p className="text-[10px] text-slate-600 mt-1">1080x1920 • 9:16</p>
        </div>
      )}

      {/* Safe Area Visual Overlay */}
      <SafeAreaOverlay platform="youtube" isVisible={showSafeAreas} />

      {/* Top Bar Header */}
      <div className="relative z-10 p-3 flex items-center justify-between text-white/90 bg-gradient-to-b from-black/70 via-black/20 to-transparent pointer-events-none">
        <div className="flex items-center gap-1 font-bold text-xs tracking-wider uppercase text-red-500 drop-shadow">
          <span>Shorts</span>
        </div>
        <div className="flex items-center gap-3">
          <Search className="w-4 h-4 text-white/80" />
          <Camera className="w-4 h-4 text-white/80" />
        </div>
      </div>

      {/* Main Bottom Overlay & Right Action Bar */}
      <div className="relative z-10 p-3 pb-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-end justify-between gap-2 pointer-events-none">
        
        {/* Left Bottom Channel & Title */}
        <div className="flex-1 space-y-2 pointer-events-auto pr-1">
          {/* Channel Identity & Subscribe Button */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-red-600 overflow-hidden flex items-center justify-center text-[10px] font-bold text-white uppercase shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt={brandName} className="w-full h-full object-cover" />
              ) : (
                brandName.charAt(0)
              )}
            </div>
            <span className="text-xs font-bold text-white drop-shadow-md truncate max-w-[110px]">
              @{brandName.toLowerCase().replace(/\s+/g, '')}
            </span>
            <button className="px-2.5 py-1 rounded-full bg-white text-black text-[10px] font-bold hover:bg-slate-200 transition-colors shadow">
              Suscribirse
            </button>
          </div>

          {/* Prominent Title */}
          <div className="text-xs text-white leading-snug drop-shadow-md">
            <h3 className="font-bold text-[12px] line-clamp-2 text-white">
              {title}
            </h3>
            {hashtags.length > 0 && (
              <p className="text-[11px] font-semibold text-blue-400 pt-0.5 line-clamp-1">
                {hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')}
              </p>
            )}
          </div>

          {/* Description Dropdown / Sound */}
          <div className="space-y-1">
            {description && (
              <button
                onClick={() => setShowDesc(!showDesc)}
                className="text-[10px] text-slate-300 hover:text-white underline block"
              >
                {showDesc ? 'Ocultar descripción' : 'Ver descripción completa'}
              </button>
            )}
            {showDesc && (
              <div className="p-2 rounded-lg bg-black/80 text-[10px] text-slate-200 max-h-24 overflow-y-auto leading-relaxed border border-dark-800">
                {description}
              </div>
            )}
            <div className="flex items-center gap-1 text-[10px] text-white/80 font-medium">
              <Music className="w-3 h-3 text-red-400" />
              <span className="truncate">Sonido original • {brandName}</span>
            </div>
          </div>
        </div>

        {/* Right Action Bar */}
        <div className="flex flex-col items-center gap-3.5 text-white pointer-events-auto shrink-0 pb-1">
          <div className="flex flex-col items-center gap-0.5 cursor-pointer hover:scale-110 transition-transform">
            <div className="p-1.5 rounded-full bg-black/40 backdrop-blur-sm">
              <ThumbsUp className="w-5 h-5 text-white drop-shadow" />
            </div>
            <span className="text-[9px] font-bold">142K</span>
          </div>

          <div className="flex flex-col items-center gap-0.5 cursor-pointer hover:scale-110 transition-transform">
            <div className="p-1.5 rounded-full bg-black/40 backdrop-blur-sm">
              <ThumbsDown className="w-5 h-5 text-white drop-shadow" />
            </div>
            <span className="text-[9px] font-bold">No me gusta</span>
          </div>

          <div className="flex flex-col items-center gap-0.5 cursor-pointer hover:scale-110 transition-transform">
            <div className="p-1.5 rounded-full bg-black/40 backdrop-blur-sm">
              <MessageSquare className="w-5 h-5 text-white drop-shadow" />
            </div>
            <span className="text-[9px] font-bold">1.2K</span>
          </div>

          <div className="flex flex-col items-center gap-0.5 cursor-pointer hover:scale-110 transition-transform">
            <div className="p-1.5 rounded-full bg-black/40 backdrop-blur-sm">
              <Share2 className="w-5 h-5 text-white drop-shadow" />
            </div>
            <span className="text-[9px] font-bold">Compartir</span>
          </div>

          <div className="flex flex-col items-center gap-0.5 cursor-pointer hover:scale-110 transition-transform">
            <div className="p-1.5 rounded-full bg-black/40 backdrop-blur-sm">
              <Repeat className="w-5 h-5 text-white drop-shadow" />
            </div>
            <span className="text-[9px] font-bold">Remix</span>
          </div>

          {/* Sound box */}
          <div className="w-6 h-6 rounded-md bg-dark-900 border border-slate-700 flex items-center justify-center text-red-400">
            <Music className="w-3.5 h-3.5" />
          </div>
        </div>

      </div>

    </div>
  );
}
