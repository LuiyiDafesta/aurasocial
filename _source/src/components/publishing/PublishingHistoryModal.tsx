import { useState, useEffect, useCallback, useMemo } from 'react';
import { PublishingOutboxEntry } from '../../types/publishing';
import { getOutboxForAdaptation, retryOutboxEntry, cancelOutboxEntry } from '../../services/publishingOutboxService';
import { Button } from '../common/Button';
import { useToast } from '../../hooks/useToast';
import { 
  X, 
  Send, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  RotateCw, 
  Ban,
  Calendar,
  Filter,
  ClipboardList,
  Bot,
  FileText,
  Rocket
} from 'lucide-react';

interface PublishingHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  adaptationId: string;
}

export function PublishingHistoryModal({
  isOpen,
  onClose,
  adaptationId,
}: PublishingHistoryModalProps) {
  const { toast } = useToast();
  const [history, setHistory] = useState<PublishingOutboxEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Filtros
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const loadHistory = useCallback(async () => {
    if (!adaptationId) return;
    try {
      setIsLoading(true);
      const entries = await getOutboxForAdaptation(adaptationId);
      setHistory(entries);
    } catch (err) {
      console.error('Error al cargar historial de outbox:', err);
    } finally {
      setIsLoading(false);
    }
  }, [adaptationId]);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, loadHistory]);

  const filteredHistory = useMemo(() => {
    return history.filter((entry) => {
      if (selectedPlatform !== 'all' && entry.platform !== selectedPlatform) return false;
      if (selectedMethod !== 'all') {
        const isManual = (entry.publication_method || 'automatic') === 'manual';
        const isMock = !isManual && (entry.external_post_id?.startsWith('mock_') ?? true);
        const isReal = !isManual && !isMock;
        if (selectedMethod === 'manual' && !isManual) return false;
        if (selectedMethod === 'mock' && !isMock) return false;
        if (selectedMethod === 'real' && !isReal) return false;
      }
      if (selectedStatus === 'published' && entry.status !== 'published') return false;
      if (selectedStatus === 'manual_prepared' && entry.status !== 'manual_prepared') return false;
      if (selectedStatus === 'processing' && entry.status !== 'processing') return false;
      if (selectedStatus === 'retrying' && entry.status !== 'retrying') return false;
      if (selectedStatus === 'scheduled' && !(entry.status === 'ready' && entry.scheduled_at)) return false;
      if (selectedStatus === 'failed' && entry.status !== 'failed') return false;
      if (selectedStatus === 'cancelled' && entry.status !== 'cancelled') return false;
      return true;
    });
  }, [history, selectedPlatform, selectedMethod, selectedStatus]);

  if (!isOpen) return null;

  const handleRetry = async (outboxId: string) => {
    try {
      setActionLoadingId(outboxId);
      await retryOutboxEntry(outboxId);
      toast('Reintento de publicación ejecutado', { type: 'success' });
      await loadHistory();
    } catch (err: any) {
      toast(`Error al reintentar: ${err.message}`, { type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancel = async (outboxId: string) => {
    try {
      setActionLoadingId(outboxId);
      await cancelOutboxEntry(outboxId);
      toast('Publicación cancelada correctamente', { type: 'success' });
      await loadHistory();
    } catch (err: any) {
      toast(`Error al cancelar: ${err.message}`, { type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-dark-950 border border-dark-700 rounded-3xl w-full max-w-4xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-dark-800 flex items-center justify-between bg-dark-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Historial de Publicaciones (Outbox)
                </h3>
              </div>
              <p className="text-[11px] text-slate-400">
                Registro cronológico inmutable de publicaciones manuales, simuladas y reales
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="px-6 py-3 border-b border-dark-800 bg-dark-900/30 flex items-center justify-between flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            
            {/* Filtro Plataforma */}
            <div className="flex items-center gap-1">
              <span className="text-slate-400 text-[11px]">Canal:</span>
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="bg-dark-950 border border-dark-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
              >
                <option value="all">Todos ({history.length})</option>
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="facebook">Facebook</option>
                <option value="youtube">YouTube</option>
                <option value="linkedin">LinkedIn</option>
              </select>
            </div>

            {/* Filtro Método */}
            <div className="flex items-center gap-1">
              <span className="text-slate-400 text-[11px]">Método:</span>
              <select
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="bg-dark-950 border border-dark-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
              >
                <option value="all">Todos los métodos</option>
                <option value="manual">📋 Manual</option>
                <option value="mock">🤖 Mock Simulado</option>
                <option value="real">🚀 Real Meta</option>
              </select>
            </div>

            {/* Filtro Estado */}
            <div className="flex items-center gap-1">
              <span className="text-slate-400 text-[11px]">Estado:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-dark-950 border border-dark-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
              >
                <option value="all">Todos los estados</option>
                <option value="published">✅ Publicado</option>
                <option value="processing">⏳ Procesando</option>
                <option value="retrying">🔄 Reintentando</option>
                <option value="manual_prepared">📋 Preparado</option>
                <option value="scheduled">🟣 Programado</option>
                <option value="failed">🔴 Fallido</option>
                <option value="cancelled">⚪ Cancelado</option>
              </select>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
          {isLoading ? (
            <div className="text-center py-12 text-xs text-slate-400 animate-pulse">
              Cargando historial de publicaciones...
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Clock className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">No se encontraron registros de publicación con los filtros seleccionados.</p>
            </div>
          ) : (
            filteredHistory.map((entry) => {
              const isManual = (entry.publication_method || 'automatic') === 'manual';
              const isMock = !isManual && (entry.external_post_id?.startsWith('mock_') || (!entry.external_post_id && entry.status !== 'published'));
              const isReal = !isManual && !isMock;
              const isPublished = entry.status === 'published';
              const isProcessing = entry.status === 'processing';
              const isRetrying = entry.status === 'retrying';
              const isManualPrepared = entry.status === 'manual_prepared';
              const isFailed = entry.status === 'failed';
              const isScheduled = entry.status === 'ready' && entry.scheduled_at;
              const isCancelled = entry.status === 'cancelled';

              return (
                <div
                  key={entry.id}
                  className="p-4 rounded-2xl bg-dark-900 border border-dark-800 hover:border-dark-700 transition-all flex flex-col space-y-3 shadow-md"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white uppercase font-mono px-2 py-0.5 rounded bg-dark-950 border border-dark-700">
                        {entry.platform}
                      </span>

                      {/* Method Badge */}
                      {isManual ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1 font-mono">
                          <ClipboardList className="w-3 h-3 text-purple-400" />
                          📋 MANUAL
                        </span>
                      ) : isReal ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center gap-1 font-mono">
                          <Rocket className="w-3 h-3 text-rose-400" />
                          🚀 REAL
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1 font-mono">
                          <Bot className="w-3 h-3 text-blue-400" />
                          🤖 MOCK
                        </span>
                      )}

                      <span className="text-slate-500">•</span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(entry.created_at).toLocaleString()}
                      </span>
                    </div>

                    {/* Status Pill */}
                    {isPublished ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-mono">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        PUBLICADO
                      </span>
                    ) : isProcessing ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1 font-mono animate-pulse">
                        <Clock className="w-3 h-3 text-blue-400" />
                        PROCESANDO...
                      </span>
                    ) : isRetrying ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 font-mono">
                        <RotateCw className="w-3 h-3 text-amber-400" />
                        REINTENTANDO
                      </span>
                    ) : isManualPrepared ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1 font-mono">
                        <ClipboardList className="w-3 h-3 text-purple-400" />
                        PREPARADO
                      </span>
                    ) : isFailed ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 font-mono">
                        <AlertCircle className="w-3 h-3 text-rose-400" />
                        FALLIDO
                      </span>
                    ) : isScheduled ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3 text-purple-400" />
                        PROGRAMADO ({new Date(entry.scheduled_at!).toLocaleDateString()})
                      </span>
                    ) : isCancelled ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1 font-mono">
                        <Ban className="w-3 h-3 text-slate-500" />
                        CANCELADO
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-amber-400" />
                        {entry.status.toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Details Card */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-dark-950/60 p-3 rounded-xl border border-dark-800/80">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                        {isManual ? 'Identificador de Paquete:' : 'ID de Publicación Externa:'}
                      </span>
                      <p className="font-mono text-slate-200 truncate">
                        {entry.external_post_id || `outbox_${entry.id.slice(0, 8)}`}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                        {isManual ? 'Enlace Real Registrado:' : 'Enlace del Post:'}
                      </span>
                      {entry.external_post_url ? (
                        <a
                          href={entry.external_post_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-400 hover:text-purple-300 font-mono flex items-center gap-1 text-[11px] truncate"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span className="truncate">{entry.external_post_url}</span>
                        </a>
                      ) : (
                        <p className="text-slate-500 font-mono text-[11px]">
                          {isManual ? 'Sin enlace externo ingresado' : 'No publicado'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Notes if manual */}
                  {entry.notes && (
                    <div className="p-3 rounded-xl bg-dark-950/40 border border-dark-800 text-xs text-slate-300 flex items-start gap-2">
                      <FileText className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                      <p className="leading-relaxed"><strong className="text-slate-400">Notas:</strong> {entry.notes}</p>
                    </div>
                  )}

                  {/* Error display if failed or retrying */}
                  {entry.error_message && (
                    <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-800/30 text-rose-300 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold font-mono">[{entry.error_code || 'ERROR'}]: </span>
                        <span>{entry.error_message}</span>
                      </div>
                    </div>
                  )}

                  {/* Actions (Retry / Cancel) */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-500 text-[11px]">
                      Intentos realizados: <strong>{entry.attempt_count}</strong>
                    </span>

                    <div className="flex items-center gap-2">
                      {(isFailed || isRetrying) && (
                        <Button
                          variant="outline"
                          size="sm"
                          isLoading={actionLoadingId === entry.id}
                          onClick={() => handleRetry(entry.id)}
                          leftIcon={<RotateCw className="w-3 h-3 text-purple-400" />}
                          className="text-xs border-dark-700 hover:border-purple-500/50"
                        >
                          Reintentar Publicación
                        </Button>
                      )}

                      {(entry.status === 'ready' || entry.status === 'queued' || entry.status === 'manual_prepared' || entry.status === 'retrying') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          isLoading={actionLoadingId === entry.id}
                          onClick={() => handleCancel(entry.id)}
                          leftIcon={<Ban className="w-3 h-3 text-rose-400" />}
                          className="text-xs text-rose-400 hover:bg-rose-500/10"
                        >
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
