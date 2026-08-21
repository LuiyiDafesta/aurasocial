import { useState, useEffect } from 'react';
import { Brand } from '../../types/database';
import { createBrand, updateBrand } from '../../services/brandService';
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
  Layers
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface BrandFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  brandToEdit?: Brand | null;
  onSaved: (brand: Brand) => void;
}

type TabType = 'identity' | 'strategy' | 'voice' | 'pillars' | 'ai';

const INDUSTRY_OPTIONS = [
  'General',
  'Gastronomía y Restaurantes',
  'Inmobiliaria y Real Estate',
  'Turismo y Viajes',
  'Software y SaaS / B2B',
  'E-commerce y Retail',
  'Salud y Medicina / Estética',
  'Educación y Cursos',
  'Marca Personal / Consultoría',
  'Fitness y Deportes',
  'Moda y Belleza',
  'Entretenimiento y Eventos',
  'Servicios Profesionales / Legal'
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

  // Form State
  const [name, setName] = useState<string>('');
  const [industry, setIndustry] = useState<string>('General');
  const [description, setDescription] = useState<string>('');
  const [audience, setAudience] = useState<string>('');
  const [tone, setTone] = useState<string>('');
  const [objectives, setObjectives] = useState<string[]>([]);
  const [newObjective, setNewObjective] = useState<string>('');
  const [rules, setRules] = useState<string[]>([]);
  const [newRule, setNewRule] = useState<string>('');
  const [pillars, setPillars] = useState<string[]>([]);
  const [newPillar, setNewPillar] = useState<string>('');

  const { toast } = useToast();

  useEffect(() => {
    if (brandToEdit) {
      setName(brandToEdit.name || '');
      setIndustry(brandToEdit.industry || 'General');
      setDescription(brandToEdit.description || '');
      setAudience(brandToEdit.audience || '');
      setTone(brandToEdit.tone || '');
      setObjectives(Array.isArray(brandToEdit.objectives) ? brandToEdit.objectives : []);
      setRules(Array.isArray(brandToEdit.rules) ? brandToEdit.rules : []);
      setPillars(Array.isArray(brandToEdit.content_pillars) ? brandToEdit.content_pillars : []);
    } else {
      setName('');
      setIndustry('General');
      setDescription('');
      setAudience('');
      setTone('');
      setObjectives(['Aumentar reconocimiento de marca', 'Generar comunidad e interacción']);
      setRules(['Priorizar contenido auténtico y verificable', 'No inventar testimonios ni datos falsos']);
      setPillars(['Educación y Valor', 'Experiencias Reales', 'Detrás de Escena', 'Comunidad']);
    }
  }, [brandToEdit, isOpen]);

  if (!isOpen) return null;

  const handleAddPillar = () => {
    if (!newPillar.trim()) return;
    if (!pillars.includes(newPillar.trim())) {
      setPillars([...pillars, newPillar.trim()]);
    }
    setNewPillar('');
  };

  const handleRemovePillar = (idx: number) => {
    setPillars(pillars.filter((_, i) => i !== idx));
  };

  const handleAddObjective = () => {
    if (!newObjective.trim()) return;
    if (!objectives.includes(newObjective.trim())) {
      setObjectives([...objectives, newObjective.trim()]);
    }
    setNewObjective('');
  };

  const handleRemoveObjective = (idx: number) => {
    setObjectives(objectives.filter((_, i) => i !== idx));
  };

  const handleAddRule = () => {
    if (!newRule.trim()) return;
    if (!rules.includes(newRule.trim())) {
      setRules([...rules, newRule.trim()]);
    }
    setNewRule('');
  };

  const handleRemoveRule = (idx: number) => {
    setRules(rules.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast('El nombre de la marca es requerido', { type: 'error' });
      setActiveTab('identity');
      return;
    }

    try {
      setIsSaving(true);
      const brandPayload: Partial<Brand> = {
        name: name.trim(),
        industry,
        description: description.trim() || null,
        audience: audience.trim() || null,
        tone: tone.trim() || null,
        objectives,
        rules,
        content_pillars: pillars,
      };

      let resultBrand: Brand;
      if (isEditing && brandToEdit) {
        resultBrand = await updateBrand(brandToEdit.id, brandPayload);
        toast(`Marca "${resultBrand.name}" actualizada con éxito`, { type: 'success' });
      } else {
        resultBrand = await createBrand(workspaceId, brandPayload);
        toast(`Marca "${resultBrand.name}" creada con éxito`, { type: 'success' });
      }

      onSaved(resultBrand);
      onClose();
    } catch (err: any) {
      console.error('Error al guardar marca:', err);
      toast(err.message || 'Error al guardar la marca', { type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-dark-900 border border-dark-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-dark-800 bg-dark-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-aura-500/20 to-pink-500/20 border border-aura-500/30 text-aura-300 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {isEditing ? `Editar Brand Brain: ${brandToEdit.name}` : 'Crear Nueva Marca'}
              </h3>
              <p className="text-xs text-slate-400">
                Configuración estratégica que guiará a la IA en todas las generaciones
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

        {/* Tab Selector */}
        <div className="flex items-center border-b border-dark-800 px-5 bg-dark-950/60 overflow-x-auto">
          <button
            onClick={() => setActiveTab('identity')}
            className={cn(
              'px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-colors',
              activeTab === 'identity'
                ? 'border-aura-500 text-aura-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            )}
          >
            1. Identidad & Rubro
          </button>

          <button
            onClick={() => setActiveTab('strategy')}
            className={cn(
              'px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-colors',
              activeTab === 'strategy'
                ? 'border-aura-500 text-aura-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            )}
          >
            2. Audiencia & Propuesta
          </button>

          <button
            onClick={() => setActiveTab('voice')}
            className={cn(
              'px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-colors',
              activeTab === 'voice'
                ? 'border-aura-500 text-aura-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            )}
          >
            3. Voz & Tono
          </button>

          <button
            onClick={() => setActiveTab('pillars')}
            className={cn(
              'px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-colors',
              activeTab === 'pillars'
                ? 'border-aura-500 text-aura-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            )}
          >
            4. Pilares & Reglas
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* TAB 1: IDENTIDAD & RUBRO */}
          {activeTab === 'identity' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Nombre de la Marca *
                </label>
                <Input
                  placeholder="Ej: Inmobiliaria Alturas, Café Blend, TravelRockChannel..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Rubro / Industria *
                </label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full bg-dark-950 border border-dark-800 text-white rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-aura-500 transition-colors"
                >
                  {INDUSTRY_OPTIONS.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Permite a la IA adaptar automáticamente vocabulario, formatos y dinámicas de contenido.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Descripción del Negocio
                </label>
                <textarea
                  rows={3}
                  placeholder="¿Qué hace la marca? ¿A qué se dedica? ¿Qué productos o servicios ofrece?"
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
                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                  Público Objetivo / Audiencia
                </label>
                <textarea
                  rows={3}
                  placeholder="¿Quién es tu cliente ideal? Edad, intereses, problemas que busca resolver, estilo de vida..."
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="w-full bg-dark-950 border border-dark-800 text-white rounded-xl p-3 text-xs focus:outline-none focus:border-aura-500 transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Objetivos Estratégicos de Redes
                </label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Ej: Aumentar consultas por WhatsApp, Posicionamiento de marca..."
                    value={newObjective}
                    onChange={(e) => setNewObjective(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddObjective())}
                  />
                  <Button variant="outline" size="sm" onClick={handleAddObjective}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-1.5">
                  {objectives.map((obj, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded-lg bg-dark-950 border border-dark-800 text-slate-300 text-xs"
                    >
                      <span>{obj}</span>
                      <button
                        onClick={() => handleRemoveObjective(i)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: VOZ & TONO */}
          {activeTab === 'voice' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-aura-400" />
                  Tono y Personalidad de la Comunicación
                </label>
                <textarea
                  rows={4}
                  placeholder="Ej: Joven, argentino, auténtico, divertido y cercano / Profesional, confiable, empático y sobrio..."
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full bg-dark-950 border border-dark-800 text-white rounded-xl p-3 text-xs focus:outline-none focus:border-aura-500 transition-colors resize-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Define cómo deben sonar los ganchos (hooks), guiones y llamados a la acción generados.
                </p>
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
                    placeholder="Ej: Tips de cocina, Testimonios, Consejos inmobiliarios, Humor..."
                    value={newPillar}
                    onChange={(e) => setNewPillar(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddPillar())}
                  />
                  <Button variant="outline" size="sm" onClick={handleAddPillar}>
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
                      <button
                        onClick={() => handleRemovePillar(i)}
                        className="hover:text-rose-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Rules & Limitations */}
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  Reglas de Comunicación (Qué NUNCA debe decir o inventar)
                </label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Ej: No inventar testimonios, No hacer venta directa agresiva..."
                    value={newRule}
                    onChange={(e) => setNewRule(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddRule())}
                  />
                  <Button variant="outline" size="sm" onClick={handleAddRule}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-1.5">
                  {rules.map((rule, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded-lg bg-dark-950 border border-dark-800 text-slate-300 text-xs"
                    >
                      <span>{rule}</span>
                      <button
                        onClick={() => handleRemoveRule(i)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
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
            {isEditing ? 'Guardar Cambios' : 'Crear Marca'}
          </Button>
        </div>
      </div>
    </div>
  );
}
