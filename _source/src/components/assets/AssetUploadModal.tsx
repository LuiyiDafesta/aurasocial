import { useState, useRef } from 'react';
import { AssetScope, AssetType } from '../../types/contentAsset';
import { uploadAsset, ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from '../../services/contentAssetService';
import { Button } from '../common/Button';
import { useToast } from '../../hooks/useToast';
import { 
  UploadCloud, 
  X, 
  FileText, 
  Target, 
  Sparkles, 
  Layers 
} from 'lucide-react';

interface AssetUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  brandId: string;
  brandName?: string;
  scope: AssetScope;
  campaignId?: string | null;
  campaignName?: string;
  contentItemId?: string | null;
  contentTitle?: string;
  onAssetUploaded: () => void;
}

export function AssetUploadModal({
  isOpen,
  onClose,
  workspaceId,
  brandId,
  brandName,
  scope,
  campaignId,
  campaignName,
  contentItemId,
  contentTitle,
  onAssetUploaded,
}: AssetUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [assetName, setAssetName] = useState<string>('');
  const [assetType, setAssetType] = useState<AssetType>('image');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  if (!isOpen) return null;

  const handleFileSelect = (file: File) => {
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast(`El archivo supera los 500 MB permitidos (${(file.size / (1024 * 1024)).toFixed(1)} MB)`, {
        type: 'error',
      });
      return;
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      toast(`Formato "${file.type || 'desconocido'}" no permitido. Formatos válidos: PNG, JPG, WebP, GIF, MP4, MOV, MP3, WAV, PDF.`, {
        type: 'error',
      });
      return;
    }

    setSelectedFile(file);
    setAssetName(file.name.replace(/\.[^/.]+$/, ''));

    // Auto-detect assetType based on MIME
    if (file.type.startsWith('image/')) {
      setAssetType('image');
    } else if (file.type.startsWith('video/')) {
      setAssetType('video');
    } else if (file.type.startsWith('audio/')) {
      setAssetType('audio');
    } else if (file.type === 'application/pdf') {
      setAssetType('document');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setUploadProgress(20);

      await uploadAsset({
        file: selectedFile,
        workspaceId,
        brandId,
        scope,
        campaignId: scope === 'campaign' ? campaignId : null,
        contentItemId: scope === 'content' ? contentItemId : null,
        assetType,
        name: assetName.trim() || selectedFile.name,
      });

      setUploadProgress(100);
      toast('Asset multimedia subido y registrado con éxito', { type: 'success' });
      onAssetUploaded();
      handleClose();
    } catch (err: any) {
      console.error('Error al subir asset:', err);
      toast('Error al subir asset', { type: 'error', description: err.message });
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setAssetName('');
    setAssetType('image');
    setIsSubmitting(false);
    setUploadProgress(0);
    onClose();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-dark-900 border border-dark-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-800 bg-dark-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-pink-500/10 border border-pink-500/25 flex items-center justify-center text-pink-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Subir Asset Multimedia
              </h2>
              <p className="text-xs text-slate-400">
                Almacenamiento seguro en bucket privado <strong className="text-pink-300 font-mono">aura-media</strong>
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-dark-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          
          {/* Target Scope Context Box */}
          <div className="p-3 rounded-2xl bg-dark-950/70 border border-dark-800 space-y-1 text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Destino y Contexto
            </span>
            <div className="flex items-center gap-2 text-slate-300 flex-wrap">
              <span className="font-semibold text-white">{brandName || 'Marca Activa'}</span>
              <span>➔</span>
              {scope === 'brand' && (
                <span className="inline-flex items-center gap-1 font-semibold text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                  <Sparkles className="w-3 h-3" /> Asset de Marca (Global)
                </span>
              )}
              {scope === 'campaign' && (
                <span className="inline-flex items-center gap-1 font-semibold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 truncate">
                  <Target className="w-3 h-3" /> Campaña: {campaignName || 'Campaña Activa'}
                </span>
              )}
              {scope === 'content' && (
                <span className="inline-flex items-center gap-1 font-semibold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 truncate">
                  <Layers className="w-3 h-3" /> Contenido: {contentTitle || 'Pieza de Contenido'}
                </span>
              )}
            </div>
          </div>

          {/* Drag and Drop Zone */}
          {!selectedFile ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 border-2 border-dashed rounded-2xl text-center space-y-3 cursor-pointer transition-all ${
                isDragOver
                  ? 'border-aura-500 bg-aura-500/10'
                  : 'border-dark-700 hover:border-dark-600 bg-dark-950/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/quicktime,audio/mpeg,audio/wav,application/pdf"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />
              <div className="w-12 h-12 rounded-2xl bg-dark-800 flex items-center justify-center text-slate-400 mx-auto">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-white">
                  Arrastrá un archivo aquí o <span className="text-aura-400 underline">explorá</span>
                </p>
                <p className="text-[11px] text-slate-400">
                  PNG, JPG, WebP, MP4, MOV, MP3, WAV o PDF (Máximo 500 MB)
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-dark-950 border border-dark-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-pink-500/10 border border-pink-500/25 flex items-center justify-center text-pink-400 shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{selectedFile.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {formatFileSize(selectedFile.size)} • {selectedFile.type || 'MIME Desconocido'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedFile(null)}
                  className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-dark-900 rounded-lg border border-dark-800"
                >
                  Cambiar
                </button>
              </div>

              {/* Upload Progress Bar */}
              {isSubmitting && (
                <div className="space-y-1.5 pt-1">
                  <div className="w-full bg-dark-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-aura-500 h-1.5 rounded-full transition-all duration-300 animate-pulse"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-aura-300 font-mono text-right">
                    Subiendo archivo...
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Asset Metadata Form */}
          {selectedFile && (
            <div className="space-y-3 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                  Nombre descriptivo
                </label>
                <input
                  type="text"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  placeholder="Ej: Logo Principal Blanco"
                  className="w-full bg-dark-950 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-aura-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                  Tipo de Asset
                </label>
                <select
                  value={assetType}
                  onChange={(e) => setAssetType(e.target.value as AssetType)}
                  className="w-full bg-dark-950 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-aura-500"
                >
                  <option value="image">Imagen / Foto</option>
                  <option value="video">Video</option>
                  <option value="audio">Audio / Música / Voz</option>
                  <option value="document">Documento / PDF</option>
                  <option value="thumbnail">Thumbnail</option>
                  <option value="b_roll">B-Roll</option>
                  <option value="raw_footage">Raw Footage</option>
                  <option value="logo">Logo</option>
                  <option value="brand_book">Brand Book</option>
                  <option value="font">Fuente Tipográfica</option>
                  <option value="palette">Paleta de Colores</option>
                </select>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-dark-800 bg-dark-900/90 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={handleClose} disabled={isSubmitting} className="text-xs">
            Cancelar
          </Button>

          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={!selectedFile}
            leftIcon={<UploadCloud className="w-4 h-4" />}
            className="text-xs bg-aura-600 hover:bg-aura-500 text-white font-semibold"
          >
            Subir Asset
          </Button>
        </div>

      </div>
    </div>
  );
}
