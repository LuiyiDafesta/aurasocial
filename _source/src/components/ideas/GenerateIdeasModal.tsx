import React, { useState, useEffect } from 'react';
import { GenerationContext, PreferredFormat } from '../../types/generationRun';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { 
  Sparkles, 
  X, 
  Tag, 
  Target, 
  Globe, 
  Layers, 
  FileText, 
  Plus, 
  Lightbulb 
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface GenerateIdeasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (context: GenerationContext) => void;
  brandName?: string;
  isGenerating?: boolean;
}

export function GenerateIdeasModal({
  isOpen,
  onClose,
  onGenerate,
  brandName = 'la marca activa',
  isGenerating = false,
}: GenerateIdeasModalProps) {
  const [topic, setTopic] = useState<string>('');
  const [keywordInput, setKeywordInput] = useState<string>('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [objective, setObjective] = useState<string>('');
  const [preferredFormat, setPreferredFormat] = useState<PreferredFormat>('any');
  const [webResearch, setWebResearch] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddKeyword = () => {
    const trimmed = keywordInput.trim().replace(/^,+|,+$/g, '');
    if (!trimmed) return;

    if (keywords.length >= 10) {
      setError('Podés agregar hasta un máximo de 10 palabras clave.');
      return;
    }

    if (trimmed.length > 50) {
      setError('Cada palabra clave puede tener como máximo 50 caracteres.');
      return;
    }

    if (keywords.some((k) => k.toLowerCase() === trimmed.toLowerCase())) {
      setKeywordInput('');
      return;
    }

    setKeywords([...keywords, trimmed]);
    setKeywordInput('');
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  const handleRemoveKeyword = (indexToRemove: number) => {
    setKeywords(keywords.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (topic.trim().length > 250) {
      setError('El tema no puede superar los 250 caracteres.');
      return;
    }

    if (objective.trim().length > 350) {
      setError('El objetivo no puede superar los 350 caracteres.');
      return;
    }

    const context: GenerationContext = {
      topic: topic.trim() || null,
      keywords: keywords.length > 0 ? keywords : [],
      objective: objective.trim() || null,
      preferred_format: preferredFormat,
      web_research: webResearch,
      ideas_count: 5,
    };

    onGenerate(context);
    onClose();
  };

  const formatOptions: { id: PreferredFormat; label: string }[] = [
    { id: 'any', label: 'Cualquiera (Recomendado)' },
    { id: 'reel', label: 'Instagram Reel' },
    { id: 'tiktok', label: 'TikTok' },
    { id: 'video', label: 'Video general' },
    { id: 'carousel', label: 'Carrusel' },
    { id: 'post', label: 'Post / Imagen' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-dark-900 border border-dark-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-dark-800 bg-dark-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-aura-500/15 border border-aura-500/30 text-aura-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Generar Nuevas Ideas con IA
              </h3>
              <p className="text-xs text-slate-400">
                Diseñando conceptos estratégicos para <strong className="text-white">{brandName}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-dark-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* 1. Tema / Campaña */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-aura-400" />
                Tema o Campaña <span className="text-slate-500 font-normal">(Opcional)</span>
              </label>
              <span className="text-[10px] text-slate-500 font-mono">
                {topic.length}/250
              </span>
            </div>
            <Input
              placeholder="Ej: Bariloche 2027: previa, valijas y contratación temprana"
              value={topic}
              maxLength={250}
              onChange={(e) => {
                setTopic(e.target.value);
                if (error) setError(null);
              }}
            />
            <p className="text-[11px] text-slate-500">
              Si lo dejás vacío, la IA generará ideas abiertas basadas en los pilares generales de la marca.
            </p>
          </div>

          {/* 2. Palabras clave */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-emerald-400" />
                Palabras clave / Temáticas <span className="text-slate-500 font-normal">({keywords.length}/10)</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <Input
                placeholder="Escribí una keyword y presioná Enter..."
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={keywords.length >= 10}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddKeyword}
                disabled={!keywordInput.trim() || keywords.length >= 10}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Agregar
              </Button>
            </div>

            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {keywords.map((kw, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium"
                  >
                    #{kw}
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(idx)}
                      className="text-emerald-400 hover:text-emerald-200 ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 3. Objetivo */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-pink-400" />
                Objetivo específico <span className="text-slate-500 font-normal">(Opcional)</span>
              </label>
              <span className="text-[10px] text-slate-500 font-mono">
                {objective.length}/350
              </span>
            </div>
            <textarea
              className="w-full bg-dark-950 border border-dark-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-aura-500 transition-colors resize-none"
              rows={2}
              maxLength={350}
              placeholder="Ej: Generar identificación y humor entre egresados, o aumentar consultas de padres..."
              value={objective}
              onChange={(e) => {
                setObjective(e.target.value);
                if (error) setError(null);
              }}
            />
          </div>

          {/* 4. Formato preferido */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              Formato preferido
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {formatOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPreferredFormat(opt.id)}
                  className={cn(
                    'px-2.5 py-2 rounded-xl text-left text-[11px] font-medium border transition-all truncate',
                    preferredFormat === opt.id
                      ? 'bg-aura-500/15 border-aura-500/40 text-aura-300 font-semibold'
                      : 'bg-dark-950 border-dark-800 text-slate-400 hover:text-slate-200 hover:border-dark-700'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Investigación Web Checkbox */}
          <div className="p-3 rounded-xl bg-dark-950/80 border border-dark-800 flex items-start gap-3">
            <input
              type="checkbox"
              id="web_research_cb"
              checked={webResearch}
              onChange={(e) => setWebResearch(e.target.checked)}
              className="mt-0.5 rounded bg-dark-900 border-dark-700 text-aura-500 focus:ring-aura-500"
            />
            <label htmlFor="web_research_cb" className="cursor-pointer space-y-0.5">
              <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-sky-400" />
                Investigar tendencias actuales en Internet
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Permite a la IA buscar referencias y contenidos que funcionan actualmente sobre la temática.
              </p>
            </label>
          </div>

          {/* 6. Info Fija Cantidad */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 p-2.5 rounded-xl bg-aura-500/5 border border-aura-500/15">
            <span className="flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-aura-400" />
              Cantidad de ideas:
            </span>
            <span className="font-bold text-white">5 ideas estratégicas</span>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-dark-800 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isGenerating}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isGenerating}
              disabled={isGenerating}
              leftIcon={<Sparkles className="w-4 h-4" />}
            >
              Generar 5 Ideas
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
