import { PublicationPackage } from '../../../types/publishing';
import { 
  ThumbsUp, 
  MessageSquare, 
  Repeat2, 
  Send, 
  MoreHorizontal, 
  Globe, 
  Film 
} from 'lucide-react';

interface LinkedInPostPreviewProps {
  publicationPackage: PublicationPackage;
  brandName?: string;
  avatarUrl?: string;
}

export function LinkedInPostPreview({
  publicationPackage,
  brandName = 'Mi Empresa',
  avatarUrl,
}: LinkedInPostPreviewProps) {
  const mediaItem = publicationPackage.media.find((m) => m.type === 'video') || publicationPackage.media[0];
  const videoUrl = mediaItem?.signed_url;

  const caption = publicationPackage.caption || '';
  const hashtags = publicationPackage.hashtags || [];

  return (
    <div className="w-full max-w-[420px] mx-auto bg-dark-900 border border-dark-800 rounded-2xl shadow-xl overflow-hidden text-slate-100 select-none">
      
      {/* 1. Identity */}
      <div className="p-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-sky-700 overflow-hidden flex items-center justify-center text-xs font-bold text-white uppercase border border-dark-700">
            {avatarUrl ? (
              <img src={avatarUrl} alt={brandName} className="w-full h-full object-cover" />
            ) : (
              brandName.charAt(0)
            )}
          </div>
          <div>
            <h4 className="text-xs font-bold text-white leading-tight hover:underline hover:text-sky-400 cursor-pointer">
              {brandName}
            </h4>
            <p className="text-[10px] text-slate-400">12.450 seguidores</p>
            <div className="flex items-center gap-1 text-[10px] text-slate-500">
              <span>Promocionado</span>
              <span>•</span>
              <Globe className="w-2.5 h-2.5 text-slate-500" />
            </div>
          </div>
        </div>

        <button className="text-slate-400 hover:text-white p-1">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Professional Copy */}
      <div className="px-3.5 pb-3 text-xs text-slate-200 leading-relaxed whitespace-pre-line">
        {caption || 'Sin texto de publicación profesional'}
      </div>

      {/* 3. Media (1:1 or native format) */}
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
            <p className="text-xs font-semibold text-slate-400">Video LinkedIn Post pendiente de render</p>
            <p className="text-[10px] text-slate-600 mt-1">1080x1080 • 1:1</p>
          </div>
        )}
      </div>

      {/* 4. Hashtags */}
      {hashtags.length > 0 && (
        <div className="px-3.5 py-2 text-xs font-semibold text-sky-400 font-mono">
          {hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')}
        </div>
      )}

      {/* Social Counters */}
      <div className="px-3.5 py-1.5 border-b border-dark-800 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-1">
          <span className="w-3.5 h-3.5 rounded-full bg-sky-500 flex items-center justify-center text-white text-[8px]">👍</span>
          <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[8px] -ml-1.5">👏</span>
          <span className="w-3.5 h-3.5 rounded-full bg-purple-500 flex items-center justify-center text-white text-[8px] -ml-1.5">💡</span>
          <span className="ml-1 font-medium">186</span>
        </div>
        <span>24 comentarios</span>
      </div>

      {/* 5. Professional Action Bar */}
      <div className="px-1 py-1 flex items-center justify-around text-xs text-slate-300 font-medium">
        <button className="flex-1 py-1.5 hover:bg-dark-800 rounded-lg flex items-center justify-center gap-1 transition-colors text-slate-300">
          <ThumbsUp className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-[11px]">Recomendar</span>
        </button>
        <button className="flex-1 py-1.5 hover:bg-dark-800 rounded-lg flex items-center justify-center gap-1 transition-colors text-slate-300">
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="text-[11px]">Comentar</span>
        </button>
        <button className="flex-1 py-1.5 hover:bg-dark-800 rounded-lg flex items-center justify-center gap-1 transition-colors text-slate-300">
          <Repeat2 className="w-3.5 h-3.5" />
          <span className="text-[11px]">Republicar</span>
        </button>
        <button className="flex-1 py-1.5 hover:bg-dark-800 rounded-lg flex items-center justify-center gap-1 transition-colors text-slate-300">
          <Send className="w-3.5 h-3.5" />
          <span className="text-[11px]">Enviar</span>
        </button>
      </div>

    </div>
  );
}
