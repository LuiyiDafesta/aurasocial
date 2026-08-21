import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Layers,
  Video,
  Target,
  Clock,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { produceContentFromIdea } from '../../services/contentItemsService';
import { ContentIdea } from '../../types/contentIdea';

interface ProduceContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  idea: ContentIdea | null;
  workspaceId: string;
  brandName?: string;
  onProductionStarted?: (contentItemId: string) => void;
}

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: '📸', formats: ['reel', 'carousel', 'post'] },
  { id: 'tiktok', label: 'TikTok', icon: '🎵', formats: ['video_vertical', 'trend'] },
  { id: 'linkedin', label: 'LinkedIn', icon: '💼', formats: ['post', 'article', 'carousel'] },
  { id: 'youtube', label: 'YouTube Shorts', icon: '▶️', formats: ['short'] },
  { id: 'facebook', label: 'Facebook', icon: '👥', formats: ['post', 'reel'] },
];

const FORMAT_LABELS: Record<string, string> = {
  reel: 'Reel / Video Dinámico (9:16)',
  carousel: 'Carrusel de Diapositivas',
  post: 'Post con Copy y Gráfica',
  video_vertical: 'Video Vertical Nativo (TikTok)',
  trend: 'Adaptación a Tendencia',
  article: 'Artículo / Lección de Negocios',
  short: 'Short de Alta Retención',
};

const GOALS = [
  { id: 'conversion', label: 'Conversión y Cierre (Ventas / Leads)' },
  { id: 'objections', label: 'Derribo de Objeciones y Mitos' },
  { id: 'engagement', label: 'Engagement y Debate en Comentarios' },
  { id: 'education', label: 'Educación y Autoridad de Marca' },
  { id: 'viral_reach', label: 'Alcance y Descubrimiento Orgánico' },
];

const DURATIONS = [
  { id: '15_seconds', label: '15 Segundos (Ultra rápido)' },
  { id: '30_seconds', label: '30 Segundos (Equilibrado / Estándar)' },
  { id: '60_seconds', label: '60 Segundos (Profundo / Explicativo)' },
  { id: 'text_only', label: 'Solo Texto / Copywriter (Sin duración de video)' },
];

export const ProduceContentModal: React.FC<ProduceContentModalProps> = ({
  isOpen,
  onClose,
  idea,
  workspaceId,
  brandName,
  onProductionStarted,
}) => {
  const [requestId, setRequestId] = useState<string>('');
  const [platform, setPlatform] = useState<string>('instagram');
  const [contentType, setContentType] = useState<string>('reel');
  const [goal, setGoal] = useState<string>('conversion');
  const [duration, setDuration] = useState<string>('30_seconds');
  const [customInstructions, setCustomInstructions] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    content_item_id: string;
    is_new: boolean;
  } | null>(null);

  // Generar un request_id único cada vez que se abre el modal
  useEffect(() => {
    if (isOpen && idea) {
      const generatedId = `req_prod_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      setRequestId(generatedId);
      setError(null);
      setSuccessResult(null);
      setCustomInstructions('');

      // Auto-seleccionar formato según la idea
      if (idea.format) {
        const fmt = idea.format.toLowerCase();
        if (fmt.includes('tiktok') || fmt.includes('vertical')) {
          setPlatform('tiktok');
          setContentType('video_vertical');
        } else if (fmt.includes('linkedin')) {
          setPlatform('linkedin');
          setContentType('post');
        } else {
          setPlatform('instagram');
          setContentType('reel');
        }
      }
    }
  }, [isOpen, idea]);

  if (!isOpen || !idea) return null;

  const currentPlatformObj = PLATFORMS.find((p) => p.id === platform) || PLATFORMS[0];

  const handlePlatformChange = (newPlatform: string) => {
    setPlatform(newPlatform);
    const pObj = PLATFORMS.find((p) => p.id === newPlatform);
    if (pObj && !pObj.formats.includes(contentType)) {
      setContentType(pObj.formats[0]);
    }
  };

  const handleProduce = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || successResult) return;

    setLoading(true);
    setError(null);

    try {
      const selectedGoalObj = GOALS.find((g) => g.id === goal);
      const brief = {
        target_platform: platform,
        target_format: contentType,
        target_goal: selectedGoalObj ? selectedGoalObj.label : goal,
        duration_preference: duration,
        custom_instructions: customInstructions.trim(),
      };

      const result = await produceContentFromIdea({
        requestId,
        workspaceId,
        brandId: idea.brand_id,
        ideaId: idea.id,
        generationRunId: idea.generation_run_id,
        platform,
        contentType,
        brief,
      });

      setSuccessResult(result);
      if (onProductionStarted) {
        onProductionStarted(result.content_item_id);
      }
    } catch (err: any) {
      console.error('Error al producir contenido:', err);
      setError(err.message || 'Ocurrió un error inesperado al solicitar la producción.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header con degradado */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800 bg-gradient-to-r from-purple-950/40 via-neutral-900 to-neutral-900">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                Motor de Producción Audiovisual
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  WF02
                </span>
              </h3>
              <p className="text-xs text-neutral-400">
                Transformar idea estratégica en guion por escenas y requerimientos técnicos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumen de la Idea de Origen */}
        <div className="px-6 py-4 bg-neutral-950/60 border-b border-neutral-800/80">
          <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
            <span className="flex items-center gap-1 font-medium text-neutral-300">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              Idea Base:{' '}
              <strong className="text-white font-semibold">{idea.title}</strong>
            </span>
            {brandName && (
              <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                {brandName}
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-400 line-clamp-2 italic">
            "{idea.concept || idea.hook}"
          </p>
        </div>

        {/* Contenido del Modal */}
        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-800/60 flex items-start space-x-3 text-red-200">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-red-300">No se pudo iniciar la producción</p>
                <p className="text-xs text-red-300/80 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {successResult ? (
            <div className="py-8 text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-950/30">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h4 className="text-xl font-semibold text-white">
                  ¡Producción en Proceso con GPT-5.6 Luna!
                </h4>
                <p className="text-sm text-neutral-300 max-w-md mx-auto">
                  El motor de producción WF02 está adaptando el guion por escenas, los requerimientos multimedia y el copy nativo.
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-800 border border-neutral-700 text-xs text-neutral-300 mt-2">
                  <span>ID de Solicitud:</span>
                  <code className="text-purple-300 font-mono">{requestId.substring(0, 18)}...</code>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm font-medium transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleProduce} className="space-y-6">
              {/* Selector de Plataforma */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-purple-400" />
                  1. Plataforma de Destino
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PLATFORMS.map((p) => {
                    const isSelected = platform === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handlePlatformChange(p.id)}
                        className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all text-left ${
                          isSelected
                            ? 'bg-purple-600/15 border-purple-500/60 text-white shadow-sm shadow-purple-950'
                            : 'bg-neutral-950/40 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                        }`}
                      >
                        <span className="text-base">{p.icon}</span>
                        <span>{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Formato y Duración */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-purple-400" />
                    2. Formato Audiovisual
                  </label>
                  <select
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
                  >
                    {currentPlatformObj.formats.map((fmt) => (
                      <option key={fmt} value={fmt}>
                        {FORMAT_LABELS[fmt] || fmt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                    3. Duración Objetivo
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
                  >
                    {DURATIONS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Objetivo del Contenido */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-purple-400" />
                  4. Objetivo Estratégico
                </label>
                <select
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
                >
                  {GOALS.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Instrucciones Adicionales */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-purple-400" />
                  5. Pautas o Instrucciones Específicas (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="Ej: Destacar la plusvalía en USD, incluir disclaimer de imágenes ilustrativas, tono dinámico con remate enérgico..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-purple-500 transition-colors resize-none"
                />
              </div>

              {/* Botón de Acción */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-medium transition-all shadow-lg shadow-purple-950/50 flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Iniciando Producción...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Producir Contenido
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
