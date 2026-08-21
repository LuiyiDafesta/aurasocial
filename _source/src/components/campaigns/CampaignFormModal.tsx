import { useState, useEffect } from 'react';
import { Campaign, CreateCampaignPayload, CampaignStatus, CampaignKPI } from '../../types/campaign';
import { createCampaign, updateCampaign, generateSlug } from '../../services/campaignService';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useToast } from '../../hooks/useToast';
import { 
  Target, 
  X, 
  Sparkles, 
  FileText, 
  Compass, 
  Calendar, 
  Plus, 
  Trash2, 
  CheckCircle2,
  TrendingUp
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface CampaignFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  brandId: string;
  brandName: string;
  campaignToEdit?: Campaign | null;
  onSaved: (campaign: Campaign) => void;
}

type TabKey = 'identity' | 'strategy' | 'context' | 'status';

export function CampaignFormModal({
  isOpen,
  onClose,
  workspaceId,
  brandId,
  brandName,
  campaignToEdit,
  onSaved,
}: CampaignFormModalProps) {
  const isEditing = !!campaignToEdit;
  const [activeTab, setActiveTab] = useState<TabKey>('identity');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Tab 1: Identidad
  const [name, setName] = useState<string>('');
  const [slug, setSlug] = useState<string>('');
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState<boolean>(false);
  const [description, setDescription] = useState<string>('');

  // Tab 2: Estrategia
  const [strategicObjective, setStrategicObjective] = useState<string>('');
  const [strategicTheme, setStrategicTheme] = useState<string>('');
  const [targetAudience, setTargetAudience] = useState<string>('');
  const [primaryChannel, setPrimaryChannel] = useState<string>('Omnicanal');

  // Tab 3: Contexto & Metas
  const [budgetContext, setBudgetContext] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [kpis, setKpis] = useState<CampaignKPI[]>([]);
  const [newKpiName, setNewKpiName] = useState<string>('');
  const [newKpiTarget, setNewKpiTarget] = useState<string>('');

  // Tab 4: Estado
  const [status, setStatus] = useState<CampaignStatus>('active');

  const { toast } = useToast();

  useEffect(() => {
    if (campaignToEdit) {
      setName(campaignToEdit.name || '');
      setSlug(campaignToEdit.slug || '');
      setIsSlugManuallyEdited(true);
      setDescription(campaignToEdit.description || '');

      setStrategicObjective(campaignToEdit.strategic_objective || '');
      setStrategicTheme(campaignToEdit.strategic_theme || '');
      setTargetAudience(campaignToEdit.target_audience || '');
      setPrimaryChannel(campaignToEdit.primary_channel || 'Omnicanal');

      setBudgetContext(campaignToEdit.budget_context || '');
      setStartDate(campaignToEdit.start_date || '');
      setEndDate(campaignToEdit.end_date || '');
      setKpis(Array.isArray(campaignToEdit.kpis) ? campaignToEdit.kpis : []);
      setStatus(campaignToEdit.status || 'active');
    } else {
      setName('');
      setSlug('');
      setIsSlugManuallyEdited(false);
      setDescription('');

      setStrategicObjective('');
      setStrategicTheme('');
      setTargetAudience('');
      setPrimaryChannel('Omnicanal');

      setBudgetContext('');
      setStartDate('');
      setEndDate('');
      setKpis([]);
      setStatus('active');
    }
  }, [campaignToEdit, isOpen]);

  if (!isOpen) return null;

  // Actualizar slug automáticamente al escribir el nombre si no fue editado manualmente
  const handleNameChange = (val: string) => {
    setName(val);
    if (!isSlugManuallyEdited) {
      setSlug(generateSlug(val));
    }
  };

  const handleSlugChange = (val: string) => {
    setIsSlugManuallyEdited(true);
    setSlug(generateSlug(val));
  };

  const addKpi = () => {
    if (!newKpiName.trim() || !newKpiTarget.trim()) return;
    setKpis([...kpis, { name: newKpiName.trim(), target: newKpiTarget.trim() }]);
    setNewKpiName('');
    setNewKpiTarget('');
  };

  const removeKpi = (idx: number) => {
    setKpis(kpis.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast('El nombre de la campaña es obligatorio', { type: 'error' });
      setActiveTab('identity');
      return;
    }

    if (!strategicObjective.trim()) {
      toast('El objetivo estratégico es obligatorio', { type: 'error' });
      setActiveTab('strategy');
      return;
    }

    const finalSlug = slug.trim() ? generateSlug(slug) : generateSlug(name);
    if (!finalSlug) {
      toast('El slug de la campaña no puede estar vacío', { type: 'error' });
      setActiveTab('identity');
      return;
    }

    if (startDate && endDate && endDate < startDate) {
      toast('La fecha de fin no puede ser anterior a la fecha de inicio', { type: 'error' });
      setActiveTab('context');
      return;
    }

    try {
      setIsSaving(true);

      const payload: CreateCampaignPayload = {
        brand_id: brandId,
        name: name.trim(),
        slug: finalSlug,
        description: description.trim() || undefined,
        strategic_objective: strategicObjective.trim(),
        strategic_theme: strategicTheme.trim() || undefined,
        target_audience: targetAudience.trim() || undefined,
        primary_channel: primaryChannel.trim() || undefined,
        budget_context: budgetContext.trim() || undefined,
        kpis,
        status,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      };

      let result: Campaign;
      if (isEditing && campaignToEdit) {
        result = await updateCampaign(campaignToEdit.id, payload);
        toast(`Campaña "${result.name}" actualizada con éxito`, { type: 'success' });
      } else {
        result = await createCampaign(workspaceId, payload);
        toast(`Campaña "${result.name}" creada con éxito`, { type: 'success' });
      }

      onSaved(result);
      onClose();
    } catch (err: any) {
      console.error('Error al guardar campaña:', err);
      toast(err.message || 'Error al guardar la campaña', { type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-dark-900 border border-dark-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-dark-800 bg-dark-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-aura-500/10 border border-aura-500/20 flex items-center justify-center text-aura-400">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                {isEditing ? 'Editar Campaña' : 'Nueva Campaña Estratégica'}
                <span className="text-xs font-normal text-slate-400 bg-dark-950 px-2.5 py-0.5 rounded-full border border-dark-800">
                  {brandName}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Contenedor de sesiones creativas, ideas y contenidos multicanal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-dark-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-dark-800 px-5 bg-dark-950/40">
          <button
            onClick={() => setActiveTab('identity')}
            className={cn(
              "flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-all",
              activeTab === 'identity'
                ? "text-aura-400 border-aura-400"
                : "text-slate-400 border-transparent hover:text-slate-200"
            )}
          >
            <FileText className="w-3.5 h-3.5" />
            1. Identidad
          </button>

          <button
            onClick={() => setActiveTab('strategy')}
            className={cn(
              "flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-all",
              activeTab === 'strategy'
                ? "text-aura-400 border-aura-400"
                : "text-slate-400 border-transparent hover:text-slate-200"
            )}
          >
            <Compass className="w-3.5 h-3.5" />
            2. Estrategia
          </button>

          <button
            onClick={() => setActiveTab('context')}
            className={cn(
              "flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-all",
              activeTab === 'context'
                ? "text-aura-400 border-aura-400"
                : "text-slate-400 border-transparent hover:text-slate-200"
            )}
          >
            <Calendar className="w-3.5 h-3.5" />
            3. Contexto & Metas
          </button>

          <button
            onClick={() => setActiveTab('status')}
            className={cn(
              "flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-all",
              activeTab === 'status'
                ? "text-aura-400 border-aura-400"
                : "text-slate-400 border-transparent hover:text-slate-200"
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            4. Estado
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* TAB 1: IDENTIDAD */}
          {activeTab === 'identity' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nombre de la Campaña <span className="text-rose-400">*</span>
                </label>
                <Input
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ej: Lanzamiento Temporada Verano 2027"
                  className="bg-dark-950/80 border-dark-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Slug Identificador <span className="text-rose-400">*</span>
                </label>
                <div className="flex items-center">
                  <span className="bg-dark-800 text-slate-400 px-3 py-2 text-xs rounded-l-xl border border-r-0 border-dark-700 font-mono">
                    /
                  </span>
                  <Input
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="lanzamiento-temporada-verano-2027"
                    className="rounded-l-none bg-dark-950/80 border-dark-700 font-mono text-xs"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Identificador único de la campaña para la marca. Se genera automáticamente.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Descripción / Briefing General
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe el contexto de la campaña, objetivos de negocio y antecedentes clave..."
                  rows={4}
                  className="w-full rounded-xl bg-dark-950/80 border border-dark-700 px-3 py-2.5 text-xs text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-aura-500 transition-colors"
                />
              </div>
            </div>
          )}

          {/* TAB 2: ESTRATEGIA */}
          {activeTab === 'strategy' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Objetivo Estratégico Principal <span className="text-rose-400">*</span>
                </label>
                <textarea
                  value={strategicObjective}
                  onChange={(e) => setStrategicObjective(e.target.value)}
                  placeholder="Ej: Captar 500 nuevos pasajeros de secundaria aumentando el reconocimiento de la propuesta de valor y las facilidades de financiación."
                  rows={3}
                  className="w-full rounded-xl bg-dark-950/80 border border-dark-700 px-3 py-2.5 text-xs text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-aura-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Tema / Concepto Creativo Eje
                  </label>
                  <Input
                    value={strategicTheme}
                    onChange={(e) => setStrategicTheme(e.target.value)}
                    placeholder="Ej: La previa de tu vida"
                    className="bg-dark-950/80 border-dark-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Canal / Plataforma Principal
                  </label>
                  <select
                    value={primaryChannel}
                    onChange={(e) => setPrimaryChannel(e.target.value)}
                    className="w-full h-10 rounded-xl bg-dark-950/80 border border-dark-700 px-3 text-xs text-slate-200 focus:outline-none focus:border-aura-500 transition-colors"
                  >
                    <option value="Omnicanal">Omnicanal / Todas las redes</option>
                    <option value="Instagram">Instagram (Reels & Carruseles)</option>
                    <option value="TikTok">TikTok (Videos Verticales)</option>
                    <option value="LinkedIn">LinkedIn (Thought Leadership & B2B)</option>
                    <option value="YouTube">YouTube (Shorts & Videos)</option>
                    <option value="Facebook">Facebook</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Audiencia / Avatar Específico de la Campaña
                </label>
                <Input
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="Ej: Estudiantes de 4to y 5to año de secundaria y padres que toman decisiones."
                  className="bg-dark-950/80 border-dark-700"
                />
              </div>
            </div>
          )}

          {/* TAB 3: CONTEXTO & METAS */}
          {activeTab === 'context' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Fecha de Inicio
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-dark-950/80 border-dark-700 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Fecha de Finalización
                  </label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-dark-950/80 border-dark-700 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Contexto Presupuestario / Inversión Estimada (Opcional)
                </label>
                <Input
                  value={budgetContext}
                  onChange={(e) => setBudgetContext(e.target.value)}
                  placeholder="Ej: Inversión orgánica + $1,500 USD en pauta publicitaria Meta/TikTok"
                  className="bg-dark-950/80 border-dark-700"
                />
              </div>

              {/* KPIs */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  KPIs e Indicadores Clave de Éxito
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <Input
                    value={newKpiName}
                    onChange={(e) => setNewKpiName(e.target.value)}
                    placeholder="Métrica (ej: Consultas calificadas)"
                    className="bg-dark-950/80 border-dark-700 text-xs"
                  />
                  <Input
                    value={newKpiTarget}
                    onChange={(e) => setNewKpiTarget(e.target.value)}
                    placeholder="Meta (ej: 250 leads)"
                    className="bg-dark-950/80 border-dark-700 text-xs"
                  />
                  <button
                    type="button"
                    onClick={addKpi}
                    className="h-10 px-3 rounded-xl bg-aura-500 hover:bg-aura-600 text-white flex items-center justify-center shrink-0 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {kpis.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    {kpis.map((kpi, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between px-3 py-2 rounded-xl bg-dark-950/60 border border-dark-800 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="font-semibold text-slate-200">{kpi.name}:</span>
                          <span className="text-slate-400">{kpi.target}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeKpi(idx)}
                          className="text-slate-400 hover:text-rose-400 transition-colors p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: ESTADO */}
          {activeTab === 'status' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Estado Actual de la Campaña
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    id: 'draft' as CampaignStatus,
                    label: 'Borrador (Draft)',
                    desc: 'En planificación estratégica. Define briefing y genera ideas preliminares.',
                    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                  },
                  {
                    id: 'active' as CampaignStatus,
                    label: 'Activa (Active)',
                    desc: 'En ejecución activa. Permite producir contenidos, programar y publicar.',
                    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                  },
                  {
                    id: 'paused' as CampaignStatus,
                    label: 'Pausada (Paused)',
                    desc: 'En pausa temporal. Mantiene contenidos y bloquea generaciones automáticas.',
                    badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
                  },
                  {
                    id: 'completed' as CampaignStatus,
                    label: 'Completada (Completed)',
                    desc: 'Campaña que alcanzó sus metas. Modo lectura y balance de métricas.',
                    badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
                  },
                  {
                    id: 'archived' as CampaignStatus,
                    label: 'Archivada (Archived)',
                    desc: 'Fuera de las vistas principales. Puede reactivarse en cualquier momento.',
                    badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
                  },
                ].map((s) => (
                  <div
                    key={s.id}
                    onClick={() => setStatus(s.id)}
                    className={cn(
                      "p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between text-left",
                      status === s.id
                        ? "bg-dark-850 border-aura-500 shadow-md shadow-aura-500/5"
                        : "bg-dark-950/60 border-dark-800 hover:border-dark-700"
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", s.badge)}>
                          {s.label}
                        </span>
                        {status === s.id && (
                          <CheckCircle2 className="w-4 h-4 text-aura-400" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {s.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-dark-800 bg-dark-900/90">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isSaving}
            className="text-xs text-slate-400 hover:text-white"
          >
            Cancelar
          </Button>

          <div className="flex items-center gap-2">
            {activeTab !== 'identity' && (
              <Button
                variant="outline"
                onClick={() => {
                  if (activeTab === 'status') setActiveTab('context');
                  else if (activeTab === 'context') setActiveTab('strategy');
                  else if (activeTab === 'strategy') setActiveTab('identity');
                }}
                disabled={isSaving}
                className="text-xs"
              >
                Anterior
              </Button>
            )}

            {activeTab !== 'status' ? (
              <Button
                onClick={() => {
                  if (activeTab === 'identity') {
                    if (!name.trim()) {
                      toast('El nombre de la campaña es obligatorio', { type: 'error' });
                      return;
                    }
                    setActiveTab('strategy');
                  } else if (activeTab === 'strategy') {
                    if (!strategicObjective.trim()) {
                      toast('El objetivo estratégico es obligatorio', { type: 'error' });
                      return;
                    }
                    setActiveTab('context');
                  } else if (activeTab === 'context') {
                    setActiveTab('status');
                  }
                }}
                className="text-xs bg-aura-500 hover:bg-aura-600 text-white"
              >
                Siguiente
              </Button>
            ) : (
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="text-xs bg-gradient-to-r from-aura-500 to-indigo-600 hover:from-aura-600 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-aura-500/20"
              >
                {isSaving ? 'Guardando...' : (isEditing ? 'Actualizar Campaña' : 'Crear Campaña')}
              </Button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
