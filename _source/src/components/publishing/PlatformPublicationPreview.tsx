import { useState, useMemo } from 'react';
import { PlatformAdaptation } from '../../types/platformAdaptation';
import { RenderJob } from '../../types/renderJob';
import { SocialPlatform } from '../../types/publishing';
import { PlatformPreviewShell } from './PlatformPreviewShell';
import { 
  buildStructuredPublicationPackage, 
  getMediaDownloadUrl 
} from '../../services/publishingOutboxService';
import { 
  sanitizePublicationText, 
  formatFullPublicationText 
} from '../../services/copySanitizerService';
import { useToast } from '../../hooks/useToast';
import { 
  Copy, 
  Download, 
  Check, 
  AlertCircle, 
  CheckCircle2 
} from 'lucide-react';

interface PlatformPublicationPreviewProps {
  adaptations: PlatformAdaptation[];
  renderJobsMap: Record<string, RenderJob>;
  activePlatform?: SocialPlatform;
  brandName?: string;
  avatarUrl?: string;
  onSelectPlatform?: (platform: SocialPlatform) => void;
}

export function PlatformPublicationPreview({
  adaptations,
  renderJobsMap,
  activePlatform,
  brandName = 'Mi Marca',
  avatarUrl,
  onSelectPlatform,
}: PlatformPublicationPreviewProps) {
  const { toast } = useToast();
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform>(
    activePlatform || (adaptations[0]?.platform as SocialPlatform) || 'instagram'
  );
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  const currentPlatform = activePlatform || selectedPlatform;
  const currentAdaptation = adaptations.find((a) => a.platform === currentPlatform);
  const currentRenderJob = currentAdaptation ? renderJobsMap[currentAdaptation.id] : null;

  // Single Source of Truth: Publication Package
  const publicationPackage = useMemo(() => {
    if (!currentAdaptation || !currentRenderJob) return null;
    return buildStructuredPublicationPackage(
      currentAdaptation,
      currentRenderJob,
      'manual',
      brandName
    );
  }, [currentAdaptation, currentRenderJob, brandName]);

  const handlePlatformChange = (p: SocialPlatform) => {
    setSelectedPlatform(p);
    if (onSelectPlatform) onSelectPlatform(p);
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    const cleanText = sanitizePublicationText(text);
    navigator.clipboard.writeText(cleanText);
    setCopiedField(label);
    toast(`¡${label} copiado al portapapeles!`, { type: 'success' });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyFullPost = () => {
    if (!publicationPackage) return;
    const fullText = formatFullPublicationText({
      title: publicationPackage.title,
      caption: publicationPackage.caption,
      hashtags: publicationPackage.hashtags,
      description: publicationPackage.description,
    });

    navigator.clipboard.writeText(fullText);
    setCopiedField('Publicación completa');
    toast('¡Publicación completa copiada al portapapeles!', { type: 'success' });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDownloadVideo = async () => {
    if (!currentRenderJob?.output_storage_path) {
      toast('No hay video renderizado disponible para descargar.', { type: 'error' });
      return;
    }
    try {
      setIsDownloading(true);
      const signedUrl = await getMediaDownloadUrl(currentRenderJob.output_storage_path, 3600);
      const a = document.createElement('a');
      a.href = signedUrl;
      a.download = `aurasocial_${currentPlatform}_${currentRenderJob.id.slice(0, 8)}.mp4`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast('Descarga iniciada exitosamente.', { type: 'success' });
    } catch (e: any) {
      toast(`Error al descargar video: ${e.message}`, { type: 'error' });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadThumbnail = async () => {
    const thumbPath = currentRenderJob?.output_metadata?.thumbnail_storage_path;
    if (!thumbPath) {
      toast('No hay thumbnail disponible para descargar.', { type: 'error' });
      return;
    }
    try {
      setIsDownloading(true);
      const signedUrl = await getMediaDownloadUrl(thumbPath, 3600);
      const a = document.createElement('a');
      a.href = signedUrl;
      a.download = `thumbnail_${currentPlatform}_${currentRenderJob?.id.slice(0, 8)}.jpg`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast('Descarga de thumbnail iniciada.', { type: 'success' });
    } catch (e: any) {
      toast(`Error al descargar thumbnail: ${e.message}`, { type: 'error' });
    } finally {
      setIsDownloading(false);
    }
  };

  const availablePlatforms: SocialPlatform[] = ['instagram', 'tiktok', 'facebook', 'linkedin', 'youtube'];

  return (
    <div className="bg-dark-950 border border-dark-800 rounded-3xl p-5 md:p-7 space-y-6 shadow-2xl">
      
      {publicationPackage ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Visual Platform Shell Preview */}
          <div className="lg:col-span-6 flex flex-col items-center">
            <PlatformPreviewShell
              publicationPackage={publicationPackage}
              brandName={brandName}
              avatarUrl={avatarUrl}
              onPlatformChange={handlePlatformChange}
              availablePlatforms={availablePlatforms}
            />
          </div>

          {/* Right Column: Publication Data & Clean Copy Actions */}
          <div className="lg:col-span-6 space-y-4">
            
            {/* Header / Copy All Action */}
            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-dark-800">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  Datos de Publicación ({currentPlatform.toUpperCase()})
                </h4>
                <p className="text-[11px] text-slate-400">
                  Fuente de verdad canónica sincronizada con la preview
                </p>
              </div>

              <button
                onClick={copyFullPost}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 text-xs font-bold text-purple-300 transition-all shadow"
              >
                {copiedField === 'Publicación completa' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copiar Todo</span>
              </button>
            </div>

            {/* Title if supported */}
            {publicationPackage.title && (
              <div className="p-3.5 rounded-2xl bg-dark-900 border border-dark-800 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-400 uppercase tracking-wider">Título</span>
                  <button
                    onClick={() => copyToClipboard(publicationPackage.title || '', 'Título')}
                    className="text-slate-400 hover:text-white flex items-center gap-1 text-[10px]"
                  >
                    <Copy className="w-3 h-3" />
                    Copiar
                  </button>
                </div>
                <p className="text-sm font-bold text-white">{publicationPackage.title}</p>
              </div>
            )}

            {/* Caption */}
            <div className="p-4 rounded-2xl bg-dark-900 border border-dark-800 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-400 uppercase tracking-wider">Caption</span>
                <button
                  onClick={() => copyToClipboard(publicationPackage.caption || '', 'Caption')}
                  className="text-slate-400 hover:text-white flex items-center gap-1 text-[10px]"
                >
                  <Copy className="w-3 h-3" />
                  Copiar
                </button>
              </div>
              <p className="text-xs text-slate-200 whitespace-pre-line leading-relaxed">
                {publicationPackage.caption || 'Sin texto de caption'}
              </p>
            </div>

            {/* Hashtags */}
            {publicationPackage.hashtags && publicationPackage.hashtags.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-dark-900 border border-dark-800 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-400 uppercase tracking-wider">
                    Hashtags ({publicationPackage.hashtags.length})
                  </span>
                  <button
                    onClick={() => copyToClipboard(
                      (publicationPackage.hashtags || []).map(h => h.startsWith('#') ? h : `#${h}`).join(' '),
                      'Hashtags'
                    )}
                    className="text-slate-400 hover:text-white flex items-center gap-1 text-[10px]"
                  >
                    <Copy className="w-3 h-3" />
                    Copiar
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {publicationPackage.hashtags.map((h, i) => (
                    <span key={i} className="text-xs font-mono text-purple-300 px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20">
                      {h.startsWith('#') ? h : `#${h}`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Media Downloads */}
            <div className="p-4 rounded-2xl bg-dark-900 border border-dark-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold uppercase tracking-wider text-slate-300">
                  Archivos Multimedia
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {currentAdaptation?.dimensions?.aspect_ratio || '9:16'} • Backblaze B2
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap pt-1">
                <button
                  onClick={handleDownloadVideo}
                  disabled={isDownloading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-dark-950 border border-dark-700 hover:border-purple-500 text-xs font-semibold text-slate-200 transition-all"
                >
                  <Download className="w-3.5 h-3.5 text-purple-400" />
                  <span>{isDownloading ? 'Generando descarga...' : 'Descargar Video MP4'}</span>
                </button>

                {currentRenderJob?.output_metadata?.thumbnail_storage_path && (
                  <button
                    onClick={handleDownloadThumbnail}
                    disabled={isDownloading}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-dark-950 border border-dark-700 hover:border-purple-500 text-xs font-semibold text-slate-200 transition-all"
                  >
                    <Download className="w-3.5 h-3.5 text-purple-400" />
                    <span>Descargar Thumbnail JPG</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quality Gate Status Box */}
            <div className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs ${
              publicationPackage.quality_gate.passed
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}>
              <div className="flex items-center gap-2">
                {publicationPackage.quality_gate.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span className="font-semibold">
                  {publicationPackage.quality_gate.passed
                    ? 'Quality Gate Aprobado — Listo para Publicar'
                    : 'Quality Gate Pendiente — Requisitos Incompletos'}
                </span>
              </div>
            </div>

          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-slate-500 space-y-3">
          <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
          <p className="text-xs text-slate-300 font-semibold">
            No se encontró un Render completado para {currentPlatform.toUpperCase()}.
          </p>
          <p className="text-[11px] text-slate-500">
            Renderice el video en la pestaña de Adaptaciones para habilitar la vista previa y descarga.
          </p>
        </div>
      )}

    </div>
  );
}
