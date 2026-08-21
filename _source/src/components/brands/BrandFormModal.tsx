import { useState, useEffect } from 'react';
import { Brand } from '../../types/database';
import { createBrand, updateBrand, BrandBrainPayload } from '../../services/brandService';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useToast } from '../../hooks/useToast';
import { 
  Building2, 
  X, 
  Sparkles, 
  Target, 
  MessageSquare, 
  ShieldAlert, 
  Plus, 
  Trash2, 
  Layers,
  HeartHandshake,
  AlertTriangle,
  Award
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface BrandFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  brandToEdit?: Brand | null;
  onSaved: (brand: Brand) => void;
}

type TabType = 'identity' | 'strategy' | 'voice' | 'pillars';

const STANDARD_INDUSTRIES = [
  'General',
  'Turismo y Viajes',
  'Inmobiliaria y Real Estate',
  'Gastronomía y Restaurantes',
  'Software y SaaS / B2B',
  'E-commerce y Retail',
  'Salud y Medicina / Estética',
  'Educación y Cursos',
  'Marca Personal / Creador',
  'Fitness y Deportes',
  'Moda y Belleza',
  'Finanzas e Inversiones',
  'Servicios Profesionales / Legal',
  'Automotriz',
  'Entretenimiento y Eventos',
  'Otro / Personalizado'
];

const BUSINESS_MODELS = [
  'B2C (Consumidor final)',
  'B2B (Empresas / Corporativo)',
  'B2B2C',
  'SaaS / Suscripción',
  'Servicios Profesionales',
  'E-commerce / Productos',
  'Marketplace',
  'Mixto / Personalizado'
];

export function BrandFormModal({
  isOpen,
  onClose,
  workspaceId,
  brandToEdit,
  onSaved,
}: BrandFormModalProps) {
  const isEditing = !!brandToEdit;
  const [activeTab, setActiveTab] = useState<TabType>('identity');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // TAB 1: IDENTIDAD
  const [name, setName] = useState<string>('');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('General');
  const [customIndustry, setCustomIndustry] = useState<string>('');
  const [subindustry, setSubindustry] = useState<string>('');
  const [marketGeo, setMarketGeo] = useState<string>('');
  const [businessModel, setBusinessModel] = useState<string>('B2C (Consumidor final)');
  const [description, setDescription] = useState<string>('');

  // TAB 2: AUDIENCIA & PROPUESTA
  const [valueProp, setValueProp] = useState<string>('');
  const [audience, setAudience] = useState<string>('');
  const [pains, setPains] = useState<string[]>([]);
  const [newPain, setNewPain] = useState<string>('');
  const [desires, setDesires] = useState<string[]>([]);
  const [newDesire, setNewDesire] = useState<string>('');
  const [objections, setObjections] = useState<string[]>([]);
  const [newObjection, setNewObjection] = useState<string>('');
  const [differentiators, setDifferentiators] = useState<string[]>([]);
  const [newDifferentiator, setNewDifferentiator] = useState<string>('');

  // TAB 3: VOZ & TONO
  const [tone, setTone] = useState<string>('');
  const [personality, setPersonality] = useState<string>('');
  const [wordsToUse, setWordsToUse] = useState<string[]>([]);
  const [newWordToUse, setNewWordToUse] = useState<string>('');
  const [wordsToAvoid, setWordsToAvoid] = useState<string[]>([]);
  const [newWordToAvoid, setNewWordToAvoid] = useState<string>('');

  // TAB 4: PILARES & REGLAS
  const [pillars, setPillars] = useState<string[]>([]);
  const [newPillar, setNewPillar] = useState<string>('');
  const [objectives, setObjectives] = useState<string[]>([]);
  const [newObjective, setNewObjective] = useState<string>('');
  const [rules, setRules] = useState<string[]>([]);
  const [newRule, setNewRule] = useState<string>('');
  const [limits, setLimits] = useState<string[]>([]);
  const [newLimit, setNewLimit] = useState<string>('');
  const [legalRestrictions, setLegalRestrictions] = useState<string[]>([]);
  const [newLegalRestriction, setNewLegalRestriction] = useState<string>('');

  const { toast } = useToast();

  useEffect(() => {
    if (brandToEdit) {
      setName(brandToEdit.name || '');
      const ind = brandToEdit.industry || 'General';
      if (STANDARD_INDUSTRIES.includes(ind)) {
        setSelectedIndustry(ind);
        setCustomIndustry('');
      } else {
        setSelectedIndustry('Otro / Personalizado');
        setCustomIndustry(ind);
      }
      setSubindustry(brandToEdit.subindustry || '');
      setMarketGeo(brandToEdit.country || '');
      setBusinessModel('B2C (Consumidor final)');
      setDescription(brandToEdit.description || '');

      setValueProp(brandToEdit.business_profile?.value_proposition || '');
      setAudience(brandToEdit.audience || '');
      setPains(brandToEdit.audience_profile?.pains || []);
      setDesires(brandToEdit.audience_profile?.desires || []);
      setObjections(brandToEdit.audience_profile?.objections || []);
      setDifferentiators(brandToEdit.business_profile?.differentiators || []);

      setTone(brandToEdit.tone || '');
      setPersonality(brandToEdit.voice_profile?.personality || '');
      setWordsToUse(brandToEdit.voice_profile?.words_to_use || []);
      setWordsToAvoid(brandToEdit.voice_profile?.words_to_avoid || []);

      setPillars(Array.isArray(brandToEdit.content_pillars) ? brandToEdit.content_pillars : []);
      setObjectives(Array.isArray(brandToEdit.objectives) ? brandToEdit.objectives : []);
      setRules(Array.isArray(brandToEdit.rules) ? brandToEdit.rules : []);
      setLimits((brandToEdit as any)?.strategic_limits?.limits || []);
      setLegalRestrictions((brandToEdit as any)?.strategic_limits?.legal_restrictions || []);
    } else {
      setName('');
      setSelectedIndustry('General');
      setCustomIndustry('');
      setSubindustry('');
      setMarketGeo('');
      setBusinessModel('B2C (Consumidor final)');
      setDescription('');
      setValueProp('');
      setAudience('');
      setPains([]);
      setDesires([]);
      setObjections([]);
      setDifferentiators([]);
      setTone('');
      setPersonality('');
      setWordsToUse([]);
      setWordsToAvoid([]);
      setPillars(['Educación y Valor', 'Experiencias Reales', 'Detrás de Escena', 'Comunidad']);
      setObjectives(['Aumentar reconocimiento de marca', 'Generar interacciones de valor']);
      setRules(['Priorizar contenido auténtico y verificable', 'No inventar testimonios ni datos ficticios']);
      setLimits(['No prometer resultados irreales']);
      setLegalRestrictions([]);
    }
  }, [brandToEdit, isOpen]);

  if (!isOpen) return null;

  // Helper de agregar/quitar chips
  const addChip = (item: string, list: string[], setList: (l: string[]) => void, clearInput: () => void) => {
    const trimmed = item.trim();
    if (!trimmed) return;
    if (!list.includes(trimmed)) setList([...list, trimmed]);
    clearInput();
  };

  const removeChip = (index: number, list: string[], setList: (l: string[]) => void) => {
    setList(list.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast('El nombre de la marca es requerido', { type: 'error' });
      setActiveTab('identity');
      return;
    }

    const finalIndustry = selectedIndustry === 'Otro / Personalizado' 
      ? (customIndustry.trim() || 'Personalizado') 
      : selectedIndustry;

    try {
      setIsSaving(true);
      const payload: BrandBrainPayload = {
        name: name.trim(),
        industry: finalIndustry,
        subindustry: subindustry.trim() || undefined,
        market_geo: marketGeo.trim() || undefined,
        business_model: businessModel,
        description: description.trim() || undefined,
        value_proposition: valueProp.trim() || undefined,
        audience: audience.trim() || undefined,
        pains,
        desires,
        objections,
        differentiators,
        tone: tone.trim() || undefined,
        personality: personality.trim() || undefined,
        words_to_use: wordsToUse,
        words_to_avoid: wordsToAvoid,
        content_pillars: pillars,
        objectives,
        rules,
        limits,
        legal_restrictions: legalRestrictions,
      };

      let resultBrand: Brand;
      if (isEditing && brandToEdit) {
        resultBrand = await updateBrand(brandToEdit.id, payload);
        toast(`Brand Brain de "${resultBrand.name}" actualizado con éxito`, { type: 'success' });
      } else {
        resultBrand = await createBrand(workspaceId, payload);
        toast(`Marca "${resultBrand.name}" creada con éxito`, { type: 'success' });
      }

      onSaved(resultBrand);
      onClose();
    } catch (err: any) {
      console.error('Error al guardar Brand Brain:', err);
      toast(err.message || 'Error al guardar la marca', { type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-dark-900 border border-dark-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-dark-800 bg-dark-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-aura-500/20 to-pink-500/20 border border-aura-500/30 text-aura-300 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {isEditing ? `Brand Brain: ${brandToEdit.name}` : 'Crear Nueva Marca (Brand Brain Onboarding)'}
              </h3>
              <p className="text-xs text-slate-400">
                Cerebro estratégico multirrubro que guía la inteligencia de la IA
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

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-dark-800 px-5 bg-dark-950/60 overflow-x-auto">
          <button
            onClick={() => setActiveTab('identity')}
            className={cn(
              'px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5',
              activeTab === 'identity'
                ? 'border-aura-500 text-aura-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            )}
          >
            <Building2 className="w-3.5 h-3.5" />
            1. Identidad & Rubro
          </button>

          <button
            onClick={() => setActiveTab('strategy')}
            className={cn(
              'px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5',
              activeTab === 'strategy'
                ? 'border-aura-500 text-aura-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            )}
          >
            <Target className="w-3.5 h-3.5" />
            2. Audiencia & Propuesta
          </button>

          <button
            onClick={() => setActiveTab('voice')}
            className={cn(
              'px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5',
              activeTab === 'voice'
                ? 'border-aura-500 text-aura-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            )}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            3. Voz & Tono
          </button>

          <button
            onClick={() => setActiveTab('pillars')}
            className={cn(
              'px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5',
              activeTab === 'pillars'
                ? 'border-aura-500 text-aura-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            )}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            4. Pilares & Reglas
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* TAB 1: IDENTIDAD & RUBRO */}
          {activeTab === 'identity' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                    Nombre de la Marca *
                  </label>
                  <Input
                    placeholder="Ej: Inmobiliaria Alturas, Café Blend, Nova SaaS..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                    Rubro / Industria *
                  </label>
                  <select
                    value={selectedIndustry}
                    onChange={(e) => setSelectedIndustry(e.target.value)}
                    className="w-full bg-dark-950 border border-dark-800 text-white rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-aura-500 transition-colors"
                  >
                    {STANDARD_INDUSTRIES.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedIndustry === 'Otro / Personalizado' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                    Especificar Rubro Personalizado *
                  </label>
                  <Input
                    placeholder="Ej: Biotecnología, Logística Marítima, Joyería Artesanal..."
                    value={customIndustry}
                    onChange={(e) => setCustomIndustry(e.target.value)}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                    Subrubro / Nicho
                  </label>
                  <Input
                    placeholder="Ej: Departamentos en pozo, Cafetería de especialidad..."
                    value={subindustry}
                    onChange={(e) => setSubindustry(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                    Mercado / Ubicación
                  </label>
                  <Input
                    placeholder="Ej: Argentina, LATAM, Palermo Soho..."
                    value={marketGeo}
                    onChange={(e) => setMarketGeo(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                    Modelo de Negocio
                  </label>
                  <select
                    value={businessModel}
                    onChange={(e) => setBusinessModel(e.target.value)}
                    className="w-full bg-dark-950 border border-dark-800 text-white rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-aura-500 transition-colors"
                  >
                    {BUSINESS_MODELS.map((bm) => (
                      <option key={bm} value={bm}>
                        {bm}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Descripción General del Negocio
                </label>
                <textarea
                  rows={3}
                  placeholder="¿Qué hace la marca, a quién ayuda y cómo opera en su día a día?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-dark-950 border border-dark-800 text-white rounded-xl p-3 text-xs focus:outline-none focus:border-aura-500 transition-colors resize-none"
                />
              </div>
            </div>
          )}

          {/* TAB 2: AUDIENCIA & PROPUESTA */}
          {activeTab === 'strategy' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  Propuesta de Valor Principal
                </label>
                <Input
                  placeholder="¿Qué promete la marca y por qué debería importarle al cliente ideal?"
                  value={valueProp}
                  onChange={(e) => setValueProp(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                  Perfil del Público Objetivo
                </label>
                <textarea
                  rows={2}
                  placeholder="Edad, intereses, profesión, estilo de vida y contexto de compra..."
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="w-full bg-dark-950 border border-dark-800 text-white rounded-xl p-3 text-xs focus:outline-none focus:border-aura-500 transition-colors resize-none"
                />
              </div>

              {/* Pains & Desires */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pains */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    Dolores / Frustraciones (Pains)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ej: Falta de tiempo, Pérdida de dinero..."
                      value={newPain}
                      onChange={(e) => setNewPain(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addChip(newPain, pains, setPains, () => setNewPain('')))}
                    />
                    <Button variant="outline" size="sm" onClick={() => addChip(newPain, pains, setPains, () => setNewPain(''))}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {pains.map((p, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20 text-[11px]">
                        {p}
                        <button onClick={() => removeChip(i, pains, setPains)}><X className="w-3 h-3 hover:text-white" /></button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Desires */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    Deseos y Motivaciones (Desires)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ej: Renta predecible, Tranquilidad familiar..."
                      value={newDesire}
                      onChange={(e) => setNewDesire(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addChip(newDesire, desires, setDesires, () => setNewDesire('')))}
                    />
                    <Button variant="outline" size="sm" onClick={() => addChip(newDesire, desires, setDesires, () => setNewDesire(''))}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {desires.map((d, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[11px]">
                        {d}
                        <button onClick={() => removeChip(i, desires, setDesires)}><X className="w-3 h-3 hover:text-white" /></button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Objections & Differentiators */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Objections */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    Objeciones Frecuentes
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ej: Es muy caro, Desconfianza en plazos..."
                      value={newObjection}
                      onChange={(e) => setNewObjection(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addChip(newObjection, objections, setObjections, () => setNewObjection('')))}
                    />
                    <Button variant="outline" size="sm" onClick={() => addChip(newObjection, objections, setObjections, () => setNewObjection(''))}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {objections.map((o, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px]">
                        {o}
                        <button onClick={() => removeChip(i, objections, setObjections)}><X className="w-3 h-3 hover:text-white" /></button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Differentiators */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <HeartHandshake className="w-3.5 h-3.5 text-sky-400" />
                    Diferenciadores Clave
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ej: 15 años de trayectoria, Garantía de entrega..."
                      value={newDifferentiator}
                      onChange={(e) => setNewDifferentiator(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addChip(newDifferentiator, differentiators, setDifferentiators, () => setNewDifferentiator('')))}
                    />
                    <Button variant="outline" size="sm" onClick={() => addChip(newDifferentiator, differentiators, setDifferentiators, () => setNewDifferentiator(''))}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {differentiators.map((diff, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-300 border border-sky-500/20 text-[11px]">
                        {diff}
                        <button onClick={() => removeChip(i, differentiators, setDifferentiators)}><X className="w-3 h-3 hover:text-white" /></button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: VOZ & TONO */}
          {activeTab === 'voice' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-aura-400" />
                    Tono de Comunicación
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ej: Profesional, sobrio, empático y orientado a números / Joven, fresco, divertido y argentino..."
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full bg-dark-950 border border-dark-800 text-white rounded-xl p-3 text-xs focus:outline-none focus:border-aura-500 transition-colors resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                    Personalidad de Marca
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ej: Experta, confiable, disruptiva, cercana, elegante, desafiante..."
                    value={personality}
                    onChange={(e) => setPersonality(e.target.value)}
                    className="w-full bg-dark-950 border border-dark-800 text-white rounded-xl p-3 text-xs focus:outline-none focus:border-aura-500 transition-colors resize-none"
                  />
                </div>
              </div>

              {/* Words to use & avoid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-200">
                    Expresiones / Palabras Preferidas
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ej: plusvalía, rentabilidad, experiencia..."
                      value={newWordToUse}
                      onChange={(e) => setNewWordToUse(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addChip(newWordToUse, wordsToUse, setWordsToUse, () => setNewWordToUse('')))}
                    />
                    <Button variant="outline" size="sm" onClick={() => addChip(newWordToUse, wordsToUse, setWordsToUse, () => setNewWordToUse(''))}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {wordsToUse.map((w, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[11px]">
                        +{w}
                        <button onClick={() => removeChip(i, wordsToUse, setWordsToUse)}><X className="w-3 h-3 hover:text-white" /></button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-200">
                    Expresiones Prohibidas (Qué NUNCA decir)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ej: barato, ganga, garantizado 100%..."
                      value={newWordToAvoid}
                      onChange={(e) => setNewWordToAvoid(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addChip(newWordToAvoid, wordsToAvoid, setWordsToAvoid, () => setNewWordToAvoid('')))}
                    />
                    <Button variant="outline" size="sm" onClick={() => addChip(newWordToAvoid, wordsToAvoid, setWordsToAvoid, () => setNewWordToAvoid(''))}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {wordsToAvoid.map((w, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20 text-[11px]">
                        -{w}
                        <button onClick={() => removeChip(i, wordsToAvoid, setWordsToAvoid)}><X className="w-3 h-3 hover:text-white" /></button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PILARES & REGLAS */}
          {activeTab === 'pillars' && (
            <div className="space-y-5">
              {/* Content Pillars */}
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-pink-400" />
                  Pilares de Contenido
                </label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Ej: Tours de propiedades, Análisis financiero, Testimonios..."
                    value={newPillar}
                    onChange={(e) => setNewPillar(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addChip(newPillar, pillars, setPillars, () => setNewPillar('')))}
                  />
                  <Button variant="outline" size="sm" onClick={() => addChip(newPillar, pillars, setPillars, () => setNewPillar(''))}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {pillars.map((pil, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-aura-500/15 text-aura-300 border border-aura-500/30 font-medium text-xs"
                    >
                      {pil}
                      <button onClick={() => removeChip(i, pillars, setPillars)} className="hover:text-rose-400">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Objectives */}
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                  Objetivos Estratégicos de Redes
                </label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Ej: Aumentar consultas de compra por WhatsApp, Posicionamiento..."
                    value={newObjective}
                    onChange={(e) => setNewObjective(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addChip(newObjective, objectives, setObjectives, () => setNewObjective('')))}
                  />
                  <Button variant="outline" size="sm" onClick={() => addChip(newObjective, objectives, setObjectives, () => setNewObjective(''))}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-1.5">
                  {objectives.map((obj, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-dark-950 border border-dark-800 text-slate-300 text-xs">
                      <span>{obj}</span>
                      <button onClick={() => removeChip(i, objectives, setObjectives)} className="text-slate-500 hover:text-rose-400 p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rules, Limits & Legal Restrictions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Communication Rules */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    Reglas de Comunicación
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ej: No inventar precios..."
                      value={newRule}
                      onChange={(e) => setNewRule(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addChip(newRule, rules, setRules, () => setNewRule('')))}
                    />
                    <Button variant="outline" size="sm" onClick={() => addChip(newRule, rules, setRules, () => setNewRule(''))}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-1.5">
                    {rules.map((rule, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-dark-950 border border-dark-800 text-slate-300 text-xs">
                        <span>{rule}</span>
                        <button onClick={() => removeChip(i, rules, setRules)} className="text-slate-500 hover:text-rose-400 p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Strategic Limits */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-pink-400" />
                    Límites de Contenido
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ej: No hacer ventas agresivas..."
                      value={newLimit}
                      onChange={(e) => setNewLimit(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addChip(newLimit, limits, setLimits, () => setNewLimit('')))}
                    />
                    <Button variant="outline" size="sm" onClick={() => addChip(newLimit, limits, setLimits, () => setNewLimit(''))}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-1.5">
                    {limits.map((l, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-dark-950 border border-dark-800 text-slate-300 text-xs">
                        <span>{l}</span>
                        <button onClick={() => removeChip(i, limits, setLimits)} className="text-slate-500 hover:text-rose-400 p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Legal & Regulatory Restrictions */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    Restricciones Legales
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ej: Incluir disclaimer..."
                      value={newLegalRestriction}
                      onChange={(e) => setNewLegalRestriction(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addChip(newLegalRestriction, legalRestrictions, setLegalRestrictions, () => setNewLegalRestriction('')))}
                    />
                    <Button variant="outline" size="sm" onClick={() => addChip(newLegalRestriction, legalRestrictions, setLegalRestrictions, () => setNewLegalRestriction(''))}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-1.5">
                    {legalRestrictions.map((lr, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-dark-950 border border-dark-800 text-slate-300 text-xs">
                        <span>{lr}</span>
                        <button onClick={() => removeChip(i, legalRestrictions, setLegalRestrictions)} className="text-slate-500 hover:text-rose-400 p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-dark-800 bg-dark-900/80 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            isLoading={isSaving}
            leftIcon={<Sparkles className="w-4 h-4" />}
            className="shadow-aura-500/20"
          >
            {isEditing ? 'Guardar Brand Brain' : 'Crear Marca y Activar Brain'}
          </Button>
        </div>
      </div>
    </div>
  );
}
