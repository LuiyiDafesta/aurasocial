import { PublicationPackage } from '../../../types/publishing';
import { 
  ThumbsUp, 
  MessageSquare, 
  Share2, 
  Globe, 
  MoreHorizontal, 
  Film 
} from 'lucide-react';

interface FacebookFeedPreviewProps {
  publicationPackage: PublicationPackage;
  brandName?: string;
  avatarUrl?: string;
}

export function FacebookFeedPreview({
  publicationPackage,
  brandName = 'Mi Página de Facebook',
  avatarUrl,
}: FacebookFeedPreviewProps) {
  const mediaItem = publicationPackage.media.find((m) => m.type === 'video') || publicationPackage.media[0];
  const videoUrl = mediaItem?.signed_url;

  const caption = publicationPackage.caption || '';
  const hashtags = publicationPackage.hashtags || [];

  return (
    <div className="w-full max-w-[420px] mx-auto bg-dark-900 border border-dark-800 rounded-2xl shadow-xl overflow-hidden text-slate-100 select-none">
      
      {/* Post Header */}
      <div className="p-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-blue-600 overflow-hidden flex items-center justify-center text-xs font-bold text-white uppercase border border-dark-700">
            {avatarUrl ? (
              <img src={avatarUrl} alt={brandName} className="w-full h-full object-cover" />
            ) : (
              brandName.charAt(0)
            )}
          </div>
          <div>
            <h4 className="text-xs font-bold text-white leading-tight hover:underline cursor-pointer">
              {brandName}
            </h4>
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <span>Publicidad</span>
              <span>•</span>
              <Globe className="w-3 h-3 text-slate-400" />
            </div>
          </div>
        </div>

        <button className="text-slate-400 hover:text-white p-1">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Post Copy */}
      <div className="px-3.5 pb-3 text-xs text-slate-200 leading-relaxed space-y-2">
        <p className="whitespace-pre-line">{caption || 'Sin texto de caption'}</p>
        {hashtags.length > 0 && (
          <p className="font-semibold text-blue-400 font-mono text-[11px]">
            {hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')}
          </p>
        )}
      </div>

      {/* Media Canvas (1:1 / native) */}
      <div className="w-full aspect-square bg-black relative flex items-center justify-center overflow-hidden border-y border-dark-800">
        {videoUrl ? (
          <video
            src={videoUrl}
            controls
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center text-slate-500">
            <Film className="w-10 h-10 text-slate-600 mb-2" />
            <p className="text-xs font-semibold text-slate-400">Video Facebook Feed pendiente de render</p>
            <p className="text-[10px] text-slate-600 mt-1">1080x1080 • 1:1</p>
          </div>
        )}
      </div>

      {/* Post Engagement Bar */}
      <div className="px-3.5 py-2 border-b border-dark-800 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white text-[9px]">👍</span>
          <span className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-white text-[9px] -ml-2">❤️</span>
          <span className="ml-1">324</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span>42 comentarios</span>
          <span>•</span>
          <span>18 veces compartido</span>
        </div>
      </div>

      {/* Action Buttons Bar */}
      <div className="px-2 py-1 flex items-center justify-around text-xs text-slate-400 font-semibold">
        <button className="flex-1 py-1.5 hover:bg-dark-800 rounded-lg flex items-center justify-center gap-1.5 transition-colors text-slate-300">
          <ThumbsUp className="w-3.5 h-3.5 text-blue-400" />
          <span>Me gusta</span>
        </button>
        <button className="flex-1 py-1.5 hover:bg-dark-800 rounded-lg flex items-center justify-center gap-1.5 transition-colors text-slate-300">
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Comentar</span>
        </button>
        <button className="flex-1 py-1.5 hover:bg-dark-800 rounded-lg flex items-center justify-center gap-1.5 transition-colors text-slate-300">
          <Share2 className="w-3.5 h-3.5" />
          <span>Compartir</span>
        </button>
      </div>

    </div>
  );
}
