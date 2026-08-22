import React, { useState, useEffect, useMemo } from 'react';
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
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Settings2,
  Check,
  RotateCcw,
  Film,
  FileCheck
} from 'lucide-react';
import { produceContentFromIdea } from '../../services/contentItemsService';
import { ContentIdea } from '../../types/contentIdea';
import { Brand } from '../../types/database';
import { ProductionBrief, CampaignContextSnapshot } from '../../types/contentItem';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

interface ProduceContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  idea: ContentIdea | null;
  workspaceId: string;
  brand?: Brand | null;
  brandName?: string;
  onOpenBrandBrain?: (brand: Brand) => void;
  onProductionStarted?: (contentItemId: string) => void;
}

interface FormatOption {
  id: string;
  label: string;
  description: string;
  isVideo: boolean;
  allowedDurations?: { id: string; label: string; seconds: number }[];
}

interface PlatformConfig {
  id: string;
  label: string;
  icon: string;
  badgeColor: string;
  formats: FormatOption[];
}

const PLATFORM_CATALOG: PlatformConfig[] = [
  {
    id: 'instagram',
    label: 'Instagram',
    icon: '📸',
    badgeColor: 'border-pink-500/40 text-pink-300 bg-pink-500/10',
    formats: [
      {
        id: 'reel',
        label: 'Reel / Video Dinámico (9:16)',
        description: 'Formato vertical de alta retención con hook visual y locución.',
        isVideo: true,
        allowedDurations: [
          { id: '15_seconds', label: '15s — Ultra rápido y directo', seconds: 15 },
          { id: '30_seconds', label: '30s — Equilibrado y dinámico (Estándar)', seconds: 30 },
          { id: '45_seconds', label: '45s — Storytelling y desarrollo', seconds: 45 },
          { id: '60_seconds', label: '60s — Explicativo y detallado', seconds: 60 },
          { id: '90_seconds', label: '90s — Máxima profundidad de valor', seconds: 90 },
        ],
      },
      {
        id: 'carousel',
        label: 'Carrusel Visual de Diapositivas',
        description: 'Secuencia de placas educativas o comparativas con copy profundo.',
        isVideo: false,
      },
      {
        id: 'post',
        label: 'Post Estático con Copy',
        description: 'Gráfica conceptual acompañada de un texto estructurado y CTA.',
        isVideo: false,
      },
      {
        id: 'story',
        label: 'Historia Vertical de Interacción',
        description: 'Micro-contenido ágil para generar encuestas, preguntas o tráfico.',
        isVideo: true,
        allowedDurations: [
          { id: '15_seconds', label: '15s — Historia estándar', seconds: 15 },
          { id: '30_seconds', label: '30s — Historia doble / secuencia', seconds: 30 },
        ],
      },
    ],
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    icon: '🎵',
    badgeColor: 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10',
    formats: [
      {
        id: 'video_vertical',
        label: 'Video Vertical Nativo (TikTok)',
        description: 'Ritmo acelerado, ganchos de 2 segundos y lenguaje directo.',
        isVideo: true,
        allowedDurations: [
          { id: '15_seconds', label: '15s — Impacto instantáneo', seconds: 15 },
          { id: '30_seconds', label: '30s — Estándar recomendado', seconds: 30 },
          { id: '45_seconds', label: '45s — Historia / Demostración', seconds: 45 },
          { id: '60_seconds', label: '60s — Tutorial o lección', seconds: 60 },
        ],
      },
      {
        id: 'tiktok_storytelling',
        label: 'TikTok Storytelling / Primera Persona',
        description: 'Relato experiencial auténtico con foco en la emoción y la empatía.',
        isVideo: true,
        allowedDurations: [
          { id: '30_seconds', label: '30s — Relato conciso', seconds: 30 },
          { id: '45_seconds', label: '45s — Relato completo con giro', seconds: 45 },
          { id: '60_seconds', label: '60s — Crónica detallada', seconds: 60 },
        ],
      },
      {
        id: 'tiktok_educativo',
        label: 'TikTok Educativo / Tips Rápidos',
        description: 'Desglose paso a paso de conceptos de alto valor práctico.',
        isVideo: true,
        allowedDurations: [
          { id: '15_seconds', label: '15s — Tip único fulminante', seconds: 15 },
          { id: '30_seconds', label: '30s — 3 Puntos clave', seconds: 30 },
          { id: '45_seconds', label: '45s — Mini masterclass', seconds: 45 },
        ],
      },
      {
        id: 'tiktok_interactivo',
        label: 'TikTok Interactivo / Q&A y Debate',
        description: 'Estructura diseñada para desatar debate en comentarios y respuestas en video.',
        isVideo: true,
        allowedDurations: [
          { id: '15_seconds', label: '15s — Pregunta provocadora', seconds: 15 },
          { id: '30_seconds', label: '30s — Debate guiado', seconds: 30 },
        ],
      },
    ],
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    icon: '💼',
    badgeColor: 'border-sky-500/40 text-sky-300 bg-sky-500/10',
    formats: [
      {
        id: 'post_b2b',
        label: 'Post B2B / Thought Leadership',
        description: 'Texto reflexivo enfocado en ROI, visión estratégica y aprendizajes profesionales.',
        isVideo: false,
      },
      {
        id: 'carousel_doc',
        label: 'Carrusel / Documento PDF',
        description: 'Presentación ejecutiva multipágina de alta retención e interacción.',
        isVideo: false,
      },
      {
        id: 'video_profesional',
        label: 'Video Profesional / Análisis',
        description: 'Exposición ejecutiva o análisis de caso con subtítulos y tono de autoridad.',
        isVideo: true,
        allowedDurations: [
          { id: '30_seconds', label: '30s — Píldora ejecutiva', seconds: 30 },
          { id: '60_seconds', label: '60s — Análisis de caso', seconds: 60 },
          { id: '90_seconds', label: '90s — Presentación en profundidad', seconds: 90 },
        ],
      },
      {
        id: 'articulo',
        label: 'Artículo / Lección de Negocios',
        description: 'Publicación editorial estructurada con hipótesis, desarrollo y conclusiones.',
        isVideo: false,
      },
    ],
  },
  {
    id: 'youtube',
    label: 'YouTube Shorts',
    icon: '▶️',
    badgeColor: 'border-red-500/40 text-red-300 bg-red-500/10',
    formats: [
      {
        id: 'short',
        label: 'Short de Alta Retención (9:16)',
        description: 'Estructura optimizada para el algoritmo de YouTube con bucle (loop) al final.',
        isVideo: true,
        allowedDurations: [
          { id: '15_seconds', label: '15s — Micro-short de alto impacto', seconds: 15 },
          { id: '30_seconds', label: '30s — Estándar recomendado', seconds: 30 },
          { id: '45_seconds', label: '45s — Explicativo con remate', seconds: 45 },
          { id: '60_seconds', label: '60s — Límite máximo de Shorts', seconds: 60 },
        ],
      },
    ],
  },
  {
    id: 'facebook',
    label: 'Facebook',
    icon: '👥',
    badgeColor: 'border-blue-500/40 text-blue-300 bg-blue-500/10',
    formats: [
      {
        id: 'video',
        label: 'Video Dinámico',
        description: 'Video con ganchos emocionales o testimoniales orientados a comunidad y clicks.',
        isVideo: true,
        allowedDurations: [
          { id: '15_seconds', label: '15s — Impacto rápido', seconds: 15 },
          { id: '30_seconds', label: '30s — Video publicitario / contenido', seconds: 30 },
          { id: '60_seconds', label: '60s — Demostración amplia', seconds: 60 },
        ],
      },
      {
        id: 'post',
        label: 'Post con Gráfica y Copy',
        description: 'Publicación orientada a comentarios y tráfico hacia enlace externo.',
        isVideo: false,
      },
      {
        id: 'carousel',
        label: 'Carrusel de Productos o Servicios',
        description: 'Galería visual de catálogo o beneficios interconectados.',
        isVideo: false,
      },
    ],
  },
];

const PRESET_OBJECTIVES = [
  { id: 'awareness', label: 'Awareness / Reconocimiento de Marca', icon: '📢' },
  { id: 'engagement', label: 'Engagement / Debate e Interacción en Comentarios', icon: '💬' },
  { id: 'community', label: 'Comunidad / Pertenencia y Fidelización', icon: '🤝' },
  { id: 'education', label: 'Educación / Valor y Autoridad en el Rubro', icon: '💡' },
  { id: 'conversion', label: 'Conversión / Generación de Leads Calificados', icon: '🎯' },
  { id: 'sales', label: 'Ventas / Oferta Comercial y Cierre Directo', icon: '💰' },
  { id: 'retention', label: 'Retención / Curiosidad y Recordación Sensorial', icon: '🧠' },
  { id: 'authority', label: 'Autoridad / Demostración de Liderazgo y Caso de Éxito', icon: '🏆' },
  { id: 'launch', label: 'Lanzamiento / Presentación de Producto o Novedad', icon: '🚀' },
  { id: 'custom', label: 'Personalizado / Escribir objetivo específico...', icon: '✏️' },
];

export const ProduceContentModal: React.FC<ProduceContentModalProps> = ({
  isOpen,
  onClose,
  idea,
  workspaceId,
  brand,
  brandName,
  onOpenBrandBrain,
  onProductionStarted,
}) => {
  const [requestId, setRequestId] = useState<string>('');
  const [platform, setPlatform] = useState<string>('instagram');
  const [contentType, setContentType] = useState<string>('reel');
  const [duration, setDuration] = useState<string>('30_seconds');
  const [customInstructions, setCustomInstructions] = useState<string>('');

  // Objetivo: Modo heredado o personalizado
  const [isChangingObjective, setIsChangingObjective] = useState<boolean>(false);
  const [selectedObjectivePreset, setSelectedObjectivePreset] = useState<string>('inherited');
  const [customObjectiveText, setCustomObjectiveText] = useState<string>('');

  // UI state
  const [campaignInfo, setCampaignInfo] = useState<{ id: string; name: string } | null>(null);
  const [isIdeaExpanded, setIsIdeaExpanded] = useState<boolean>(false);
  const [productionState, setProductionState] = useState<'idle' | 'preparing' | 'generating' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    content_item_id: string;
    is_new: boolean;
  } | null>(null);

  // Cargar información de la campaña asociada a la idea (si tiene)
  useEffect(() => {
    if (idea?.campaign_id) {
      supabase
        .from('campaigns')
        .select('id, name')
        .eq('id', idea.campaign_id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setCampaignInfo(data);
        });
    } else {
      setCampaignInfo(null);
    }
  }, [idea?.campaign_id]);

  // Inteligencia de recomendación según la idea
  const recommendation = useMemo(() => {
    if (!idea) return { platform: 'instagram', format: 'reel' };
    const rawFmt = (idea.format || '').toLowerCase();
    const rawConcept = (idea.concept || '').toLowerCase();

    if (rawFmt.includes('tiktok') || rawFmt.includes('vertical')) {
      return { platform: 'tiktok', format: 'video_vertical' };
    }
    if (rawFmt.includes('linkedin') || rawFmt.includes('b2b') || rawFmt.includes('profesional')) {
      return { platform: 'linkedin', format: 'post_b2b' };
    }
    if (rawFmt.includes('short') || rawFmt.includes('youtube')) {
      return { platform: 'youtube', format: 'short' };
    }
    if (rawFmt.includes('carousel') || rawFmt.includes('carrusel')) {
      return { platform: 'instagram', format: 'carousel' };
    }
    if (rawFmt.includes('post') || rawConcept.includes('foto') || rawConcept.includes('gráfico')) {
      return { platform: 'instagram', format: 'post' };
    }
    return { platform: 'instagram', format: 'reel' };
  }, [idea]);

  // Inicializar estado del modal cada vez que se abre
  useEffect(() => {
    if (isOpen && idea) {
      const generatedId = `req_prod_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      setRequestId(generatedId);
      setError(null);
      setSuccessResult(null);
      setProductionState('idle');
      setCustomInstructions('');
      setIsIdeaExpanded(false);
      setIsChangingObjective(false);
      setSelectedObjectivePreset('inherited');
      setCustomObjectiveText('');

      // Auto-configurar con recomendación inteligente
      setPlatform(recommendation.platform);
      setContentType(recommendation.format);

      // Configurar duración por defecto si es video
      const platObj = PLATFORM_CATALOG.find((p) => p.id === recommendation.platform);
      const fmtObj = platObj?.formats.find((f) => f.id === recommendation.format);
      if (fmtObj?.isVideo && fmtObj.allowedDurations && fmtObj.allowedDurations.length > 0) {
        setDuration(fmtObj.allowedDurations[0].id);
      } else {
        setDuration('no_video');
      }
    }
  }, [isOpen, idea, recommendation]);

  if (!isOpen || !idea) return null;

  const currentPlatformObj = PLATFORM_CATALOG.find((p) => p.id === platform) || PLATFORM_CATALOG[0];
  const currentFormatObj = currentPlatformObj.formats.find((f) => f.id === contentType) || currentPlatformObj.formats[0];

  const handlePlatformChange = (newPlatformId: string) => {
    setPlatform(newPlatformId);
    const pObj = PLATFORM_CATALOG.find((p) => p.id === newPlatformId);
    if (pObj && pObj.formats.length > 0) {
      const defaultFormat = pObj.formats[0];
      setContentType(defaultFormat.id);
      if (defaultFormat.isVideo && defaultFormat.allowedDurations && defaultFormat.allowedDurations.length > 0) {
        setDuration(defaultFormat.allowedDurations[0].id);
      } else {
        setDuration('no_video');
      }
    }
  };

  const handleFormatChange = (newFormatId: string) => {
    setContentType(newFormatId);
    const fmtObj = currentPlatformObj.formats.find((f) => f.id === newFormatId);
    if (fmtObj?.isVideo && fmtObj.allowedDurations && fmtObj.allowedDurations.length > 0) {
      setDuration(fmtObj.allowedDurations[0].id);
    } else {
      setDuration('no_video');
    }
  };

  // Calcular el objetivo efectivo que se enviará
  const effectiveObjective = useMemo(() => {
    if (selectedObjectivePreset === 'inherited') {
      return idea.objective || 'Generar retención y valor estratégico alineado a la marca.';
    }
    if (selectedObjectivePreset === 'custom') {
      return customObjectiveText.trim() || idea.objective || 'Objetivo personalizado de producción.';
    }
    const preset = PRESET_OBJECTIVES.find((p) => p.id === selectedObjectivePreset);
    return preset ? preset.label : idea.objective;
  }, [selectedObjectivePreset, customObjectiveText, idea.objective]);

  // Extraer reglas destacadas del Brand Brain
  const brandRules = useMemo(() => {
    if (!brand) return [];
    const rulesList: string[] = [];
    if (Array.isArray(brand.rules)) rulesList.push(...brand.rules);
    if (Array.isArray(brand.voice_profile?.rules)) rulesList.push(...brand.voice_profile.rules);
    if (Array.isArray(brand.strategic_limits?.rules)) rulesList.push(...brand.strategic_limits.rules);
    if (Array.isArray(brand.voice_profile?.claims_prohibited)) {
      rulesList.push(...brand.voice_profile.claims_prohibited.map((c) => `No afirmar: "${c}"`));
    }
    if (Array.isArray(brand.strategic_limits?.legal_restrictions)) {
      rulesList.push(...brand.strategic_limits.legal_restrictions);
    }
    return Array.from(new Set(rulesList)).slice(0, 2);
  }, [brand]);

  // Generar placeholder dinámico contextualizado al rubro y tono (sin hardcoding de nombres)
  const dynamicPlaceholder = useMemo(() => {
    const industryDesc = brand?.industry ? `de ${brand.industry}` : 'del rubro';
    const toneDesc = brand?.tone ? `manteniendo tono ${brand.tone}` : 'manteniendo la voz oficial de la marca';
    return `Ej: Enfatizar aspectos clave ${industryDesc}, ${toneDesc} y reforzar el gancho en los primeros segundos...`;
  }, [brand]);

  // Envío a producción
  const handleProduce = async (e: React.FormEvent) => {
    e.preventDefault();
    if (productionState !== 'idle' || successResult) return;

    setProductionState('preparing');
    setError(null);

    try {
      // Cargar snapshot de campaña si la idea pertenece a una campaña
      let campaignContextSnapshot: CampaignContextSnapshot | null = null;
      if (idea.campaign_id) {
        try {
          const { data: campData } = await supabase
            .from('campaigns')
            .select('id, name, strategic_objective, strategic_theme, target_audience, primary_channel, budget_context, kpis, start_date, end_date')
            .eq('id', idea.campaign_id)
            .maybeSingle();

          if (campData) {
            campaignContextSnapshot = {
              campaign_id: campData.id,
              campaign_name: campData.name,
              strategic_objective: campData.strategic_objective,
              strategic_theme: campData.strategic_theme,
              target_audience: campData.target_audience,
              primary_channel: campData.primary_channel,
              budget_context: campData.budget_context,
              kpis: campData.kpis,
              start_date: campData.start_date,
              end_date: campData.end_date,
            };
          }
        } catch (campErr) {
          console.warn('Advertencia al cargar snapshot de campaña para el brief:', campErr);
        }
      }

      // Construir snapshot de contexto inmutable
      const brief: ProductionBrief = {
        target_platform: platform,
        target_format: contentType,
        target_goal: effectiveObjective,
        objective_mode: selectedObjectivePreset === 'inherited' ? 'inherited' : 'custom',
        duration_preference: currentFormatObj.isVideo ? duration : 'no_video',
        custom_instructions: customInstructions.trim(),
        campaign_context: campaignContextSnapshot,
        inherited_idea_context: {
          title: idea.title,
          concept: idea.concept,
          pillar: idea.pillar,
          hook: idea.hook,
          cta: idea.cta,
          original_format: idea.format,
          original_goal: idea.objective,
        },
        brand_context_snapshot: {
          brand_id: idea.brand_id,
          brand_name: brand?.name || brandName || 'Marca Activa',
          industry: brand?.industry || null,
          target_audience: brand?.audience || brand?.audience_profile?.demographics || null,
          voice_tone: brand?.tone || brand?.voice_profile?.personality || null,
          key_rules: brandRules,
        },
      };

      setProductionState('generating');

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
      setProductionState('done');
      if (onProductionStarted) {
        onProductionStarted(result.content_item_id);
      }
    } catch (err: any) {
      console.error('Error al producir contenido:', err);
      setError(err.message || 'Ocurrió un error inesperado al solicitar la producción.');
      setProductionState('idle');
    }
  };

  const isSubmitting = productionState === 'preparing' || productionState === 'generating';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-dark-900 border border-dark-800 rounded-3xl shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Header Premium: Production Studio */}
        <div className="flex items-center justify-between p-5 md:p-6 border-b border-dark-800 bg-gradient-to-r from-aura-950/40 via-dark-900 to-dark-900">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-aura-500/20 to-purple-600/20 border border-aura-500/30 flex items-center justify-center text-aura-400 shadow-lg shadow-aura-950/40 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base md:text-lg font-extrabold text-white tracking-tight">
                  Production Studio
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-aura-500/20 text-aura-300 border border-aura-500/30 font-mono uppercase">
                  Motor WF02 · GPT-5.6 Luna
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Transformación estratégica de idea en guion por escenas y requerimientos multimedia
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-dark-800 transition-colors disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* SECCIÓN 1: IDEA ESTRATÉGICA BASE (Contextual & Expandible) */}
        {/* ========================================================================= */}
        <div className="p-5 md:p-6 bg-dark-950/70 border-b border-dark-800/80 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-lg bg-aura-500/15 text-aura-300 border border-aura-500/30">
                  <Layers className="w-3 h-3" />
                  Idea Base
                </span>
                {campaignInfo && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-pink-500/15 text-pink-300 border border-pink-500/30">
                    Campaña: <strong className="text-white">{campaignInfo.name}</strong>
                  </span>
                )}
                {idea.pillar && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-dark-900 text-slate-300 border border-dark-700">
                    Pilar: <strong className="text-white">{idea.pillar}</strong>
                  </span>
                )}
                {idea.format && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30">
                    Formato Original: {idea.format}
                  </span>
                )}
              </div>
              <h4 className="text-base font-bold text-white tracking-tight leading-snug">
                {idea.title}
              </h4>
            </div>

            <button
              type="button"
              onClick={() => setIsIdeaExpanded(!isIdeaExpanded)}
              className="text-xs font-semibold text-aura-400 hover:text-aura-300 flex items-center gap-1 shrink-0 bg-dark-900 px-3 py-1.5 rounded-xl border border-dark-800 hover:border-aura-500/30 transition-all"
            >
              {isIdeaExpanded ? (
                <>
                  <span>Ocultar detalles</span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>Ver idea completa</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed italic">
            "{idea.concept}"
          </p>

          {/* Detalles expandidos de la idea */}
          {isIdeaExpanded && (
            <div className="pt-3 border-t border-dark-800/80 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs animate-in fade-in duration-150">
              {idea.hook && (
                <div className="p-3 rounded-xl bg-dark-900/80 border border-dark-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block">
                    Gancho / Hook de la Idea:
                  </span>
                  <p className="text-slate-200 italic">"{idea.hook}"</p>
                </div>
              )}

              {idea.cta && (
                <div className="p-3 rounded-xl bg-dark-900/80 border border-dark-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">
                    Llamado a la Acción (CTA):
                  </span>
                  <p className="text-slate-200">{idea.cta}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* SECCIÓN 2: CONTEXTO DE MARCA ACTIVO (Brand Brain Visible) */}
        {/* ========================================================================= */}
        <div className="px-5 py-3.5 md:px-6 bg-gradient-to-r from-purple-950/20 via-dark-900 to-dark-900 border-b border-dark-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-white">{brand?.name || brandName || 'Marca Activa'}</span>
                  <span className="text-slate-500 font-mono">·</span>
                  <span className="text-slate-300 font-medium">{brand?.industry || 'General'}</span>
                  {brand?.tone && (
                    <>
                      <span className="text-slate-500 font-mono">·</span>
                      <span className="text-purple-300">Tono: {brand.tone}</span>
                    </>
                  )}
                </div>
                {brandRules.length > 0 && (
                  <p className="text-[11px] text-slate-400 truncate max-w-lg mt-0.5">
                    Reglas: {brandRules.join(' | ')}
                  </p>
                )}
              </div>
            </div>

            {brand && onOpenBrandBrain && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBrandBrain(brand);
                }}
                className="text-[11px] font-semibold text-slate-400 hover:text-aura-300 flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-lg hover:bg-dark-800 transition-colors self-start sm:self-auto"
              >
                <Settings2 className="w-3.5 h-3.5 text-aura-400" />
                <span>Configurar Brand Brain</span>
              </button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CUERPO DEL MODAL / FORMULARIO */}
        {/* ========================================================================= */}
        <div className="p-5 md:p-6 max-h-[58vh] overflow-y-auto space-y-6">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-3 text-rose-200 animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-0.5">
                <p className="font-bold text-rose-300">No se pudo iniciar la producción</p>
                <p className="text-rose-200/90">{error}</p>
              </div>
            </div>
          )}

          {successResult ? (
            /* Vista de éxito */
            <div className="py-8 text-center space-y-6 animate-in fade-in zoom-in-95">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-950/40">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h4 className="text-xl font-bold text-white tracking-tight">
                  ¡Producción en Proceso con GPT-5.6 Luna!
                </h4>
                <p className="text-xs md:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                  El motor WF02 ha tomado el requerimiento con claim atómico y está generando el guion por escenas, los textos en pantalla y los planos técnicos.
                </p>
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-dark-950 border border-dark-800 text-xs text-slate-300 mt-2 font-mono">
                  <span>Request ID:</span>
                  <span className="text-aura-300">{requestId.substring(0, 20)}...</span>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-aura-600 hover:bg-aura-500 text-white text-xs font-bold transition-all shadow-lg shadow-aura-950/40"
                >
                  Ver en Contenidos
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleProduce} className="space-y-6">
              {/* =================================================================== */}
              {/* PASO 1: SELECCIÓN DE PLATAFORMA */}
              {/* =================================================================== */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-aura-400" />
                    1. Plataforma de Destino
                  </span>
                  {recommendation.platform === platform && (
                    <span className="text-[10px] text-aura-300 font-semibold flex items-center gap-1 lowercase">
                      <Sparkles className="w-3 h-3 text-aura-400" />
                      sugerida por la idea
                    </span>
                  )}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {PLATFORM_CATALOG.map((p) => {
                    const isSelected = platform === p.id;
                    const isRecommended = recommendation.platform === p.id;

                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handlePlatformChange(p.id)}
                        disabled={isSubmitting}
                        className={cn(
                          'relative flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition-all gap-1.5',
                          isSelected
                            ? 'bg-aura-500/15 border-aura-500/60 text-white shadow-lg shadow-aura-950/30 ring-1 ring-aura-500/30'
                            : 'bg-dark-950/60 border-dark-800 text-slate-400 hover:border-dark-700 hover:text-slate-200'
                        )}
                      >
                        <span className="text-xl">{p.icon}</span>
                        <span className="truncate">{p.label}</span>
                        {isRecommended && !isSelected && (
                          <span className="absolute -top-1.5 -right-1.5 w-2 h-2 rounded-full bg-aura-400 animate-pulse" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* =================================================================== */}
              {/* PASO 2: FORMATO ESPECÍFICO CON RECOMENDACIÓN INTELIGENTE */}
              {/* =================================================================== */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-aura-400" />
                  2. Formato en {currentPlatformObj.label}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {currentPlatformObj.formats.map((fmt) => {
                    const isSelected = contentType === fmt.id;
                    const isRecommended = recommendation.platform === platform && recommendation.format === fmt.id;

                    return (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => handleFormatChange(fmt.id)}
                        disabled={isSubmitting}
                        className={cn(
                          'flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all',
                          isSelected
                            ? 'bg-purple-600/15 border-purple-500/60 text-white shadow-md shadow-purple-950/30'
                            : 'bg-dark-950/50 border-dark-800/80 text-slate-400 hover:border-dark-700 hover:text-slate-200'
                        )}
                      >
                        <div className={cn(
                          'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
                          fmt.isVideo
                            ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                            : 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                        )}>
                          {fmt.isVideo ? <Film className="w-4 h-4" /> : <FileCheck className="w-4 h-4" />}
                        </div>
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-white truncate">
                              {fmt.label}
                            </span>
                            {isRecommended && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-aura-500/20 text-aura-300 border border-aura-500/30 shrink-0">
                                ✨ Recomendado
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 leading-tight">
                            {fmt.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* =================================================================== */}
              {/* PASO 3: DURACIÓN AUDIONATURAL (Solo si es formato de video) */}
              {/* =================================================================== */}
              {currentFormatObj.isVideo && currentFormatObj.allowedDurations && currentFormatObj.allowedDurations.length > 0 && (
                <div className="space-y-2.5 animate-in fade-in duration-150">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    3. Duración del Video
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {currentFormatObj.allowedDurations.map((d) => {
                      const isSelected = duration === d.id;
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setDuration(d.id)}
                          disabled={isSubmitting}
                          className={cn(
                            'flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-medium transition-all text-left',
                            isSelected
                              ? 'bg-amber-500/15 border-amber-500/50 text-amber-200 shadow-sm'
                              : 'bg-dark-950/40 border-dark-800 text-slate-400 hover:border-dark-700 hover:text-slate-200'
                          )}
                        >
                          <span>{d.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* =================================================================== */}
              {/* PASO 4: OBJETIVO ESTRATÉGICO (Heredado de la idea por defecto) */}
              {/* =================================================================== */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-emerald-400" />
                    4. Objetivo Estratégico
                  </label>

                  {!isChangingObjective && (
                    <button
                      type="button"
                      onClick={() => setIsChangingObjective(true)}
                      className="text-[11px] font-semibold text-aura-400 hover:text-aura-300 transition-colors"
                    >
                      [ Cambiar objetivo ]
                    </button>
                  )}
                </div>

                {!isChangingObjective ? (
                  /* Objetivo Heredado de la Idea */
                  <div className="p-4 rounded-2xl bg-dark-950/80 border border-emerald-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        <Check className="w-3 h-3" />
                        Heredado de la idea
                      </span>
                    </div>
                    <p className="text-xs text-emerald-100 font-medium leading-relaxed">
                      "{idea.objective || 'Generar curiosidad y retención con la audiencia'}"
                    </p>
                  </div>
                ) : (
                  /* Selector de objetivos alternativos */
                  <div className="p-4 rounded-2xl bg-dark-950 border border-dark-800 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-400">
                        Seleccioná el objetivo para esta pieza específica:
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedObjectivePreset('inherited');
                          setIsChangingObjective(false);
                        }}
                        className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Usar objetivo de la idea</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedObjectivePreset('inherited')}
                        className={cn(
                          'flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold text-left transition-all',
                          selectedObjectivePreset === 'inherited'
                            ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-200'
                            : 'bg-dark-900 border-dark-800 text-slate-400 hover:text-white'
                        )}
                      >
                        <span>🎯</span>
                        <span className="truncate">Objetivo de la Idea</span>
                      </button>

                      {PRESET_OBJECTIVES.map((obj) => {
                        const isSel = selectedObjectivePreset === obj.id;
                        return (
                          <button
                            key={obj.id}
                            type="button"
                            onClick={() => setSelectedObjectivePreset(obj.id)}
                            className={cn(
                              'flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold text-left transition-all',
                              isSel
                                ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-200'
                                : 'bg-dark-900 border-dark-800 text-slate-400 hover:text-white'
                            )}
                          >
                            <span>{obj.icon}</span>
                            <span className="truncate">{obj.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {selectedObjectivePreset === 'custom' && (
                      <input
                        type="text"
                        value={customObjectiveText}
                        onChange={(e) => setCustomObjectiveText(e.target.value)}
                        placeholder="Escribí el objetivo estratégico particular..."
                        className="w-full px-3.5 py-2 rounded-xl bg-dark-900 border border-dark-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-aura-500"
                      />
                    )}
                  </div>
                )}
              </div>

              {/* =================================================================== */}
              {/* PASO 5: PAUTAS O INSTRUCCIONES ESPECÍFICAS */}
              {/* =================================================================== */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-purple-400" />
                  5. Pautas o Instrucciones Específicas (Opcional)
                </label>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Estas instrucciones se suman al Brand Brain y al contexto estratégico. No reemplazan las reglas de la marca.
                </p>
                <textarea
                  rows={2}
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder={dynamicPlaceholder}
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-dark-950 border border-dark-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-aura-500 transition-colors resize-none disabled:opacity-50"
                />
              </div>

              {/* =================================================================== */}
              {/* RESUMEN PRE-PRODUCCIÓN (Pre-flight Check) */}
              {/* =================================================================== */}
              <div className="p-4 rounded-2xl bg-dark-950/90 border border-dark-800/80 space-y-2 text-xs">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-dark-800 pb-2">
                  <span>Resumen de Producción</span>
                  <span className="text-emerald-400 font-normal">Brand Brain: Activo ✓</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Marca:</span>
                    <span className="font-semibold text-slate-200 truncate block">
                      {brand?.name || brandName || 'Marca Activa'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Plataforma:</span>
                    <span className="font-semibold text-aura-300 truncate block">
                      {currentPlatformObj.label}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Formato:</span>
                    <span className="font-semibold text-purple-300 truncate block">
                      {currentFormatObj.label}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Duración:</span>
                    <span className="font-semibold text-amber-300 truncate block">
                      {currentFormatObj.isVideo ? duration.replace('_seconds', ' segundos') : 'No aplica (Post/Gráfico)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* =================================================================== */}
              {/* BOTONES DE ACCIÓN */}
              {/* =================================================================== */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-dark-800">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-dark-800 hover:bg-dark-700 text-slate-300 text-xs font-semibold transition-colors disabled:opacity-40"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={cn(
                    'px-6 py-2.5 rounded-xl text-white text-xs font-bold transition-all shadow-lg flex items-center gap-2',
                    isSubmitting
                      ? 'bg-aura-800 opacity-80 cursor-not-allowed'
                      : 'bg-gradient-to-r from-aura-600 via-purple-600 to-indigo-600 hover:from-aura-500 hover:to-indigo-500 shadow-aura-950/50 hover:scale-[1.02]'
                  )}
                >
                  {productionState === 'preparing' && (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-aura-300" />
                      <span>Preparando producción...</span>
                    </>
                  )}
                  {productionState === 'generating' && (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-purple-300" />
                      <span>Generando contenido con GPT-5.6 Luna...</span>
                    </>
                  )}
                  {productionState === 'idle' && (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>✨ Producir Contenido</span>
                    </>
                  )}
                  {productionState === 'done' && (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>¡Producción Iniciada!</span>
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
