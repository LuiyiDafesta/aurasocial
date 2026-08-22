import { useState, useEffect, useCallback } from 'react';
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
  Calendar
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
      toast('Publicación cancelada', { type: 'success' });
      await loadHistory();
    } catch (err: any) {
      toast(`Error al cancelar: ${err.message}`, { type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-dark-950 border border-dark-700 rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-dark-800 flex items-center justify-between bg-dark-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Historial de Publicaciones (Outbox)
              </h3>
              <p className="text-[11px] text-slate-400">
                Registro inmutable de despachos y estados de publicación por red social
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
          {isLoading ? (
            <div className="text-center py-10 text-xs text-slate-400 animate-pulse">
              Cargando historial de publicaciones...
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <Clock className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">Aún no se han enviado publicaciones a Outbox para esta adaptación.</p>
            </div>
          ) : (
            history.map((entry) => {
              const isPublished = entry.status === 'published';
              const isFailed = entry.status === 'failed';
              const isScheduled = entry.status === 'ready' && entry.scheduled_at;

              return (
                <div
                  key={entry.id}
                  className="p-4 rounded-2xl bg-dark-900 border border-dark-800 flex flex-col space-y-3"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white uppercase font-mono">
                        {entry.platform}
                      </span>
                      <span>•</span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(entry.created_at).toLocaleString()}
                      </span>
                    </div>

                    {/* Status Pill */}
                    {isPublished ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-mono">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        MOCK_PUBLISHED
                      </span>
                    ) : isFailed ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 font-mono">
                        <AlertCircle className="w-3 h-3 text-rose-400" />
                        FAILED
                      </span>
                    ) : isScheduled ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3 text-amber-400" />
                        PROGRAMADO
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 font-mono">
                        {entry.status.toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Detail info */}
                  <div className="text-[11px] text-slate-300 bg-dark-950/80 p-3 rounded-xl border border-dark-800 space-y-1 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Outbox ID:</span>
                      <span className="text-slate-300">{entry.id}</span>
                    </div>
                    {entry.external_post_id && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">External Post ID:</span>
                        <span className="text-emerald-400">{entry.external_post_id}</span>
                      </div>
                    )}
                    {entry.external_post_url && (
                      <div className="flex justify-between items-center pt-0.5">
                        <span className="text-slate-500">URL Publicada:</span>
                        <a
                          href={entry.external_post_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sky-400 hover:text-sky-300 flex items-center gap-1 underline text-[10px]"
                        >
                          {entry.external_post_url}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                    {entry.error_message && (
                      <div className="pt-1 text-rose-400">
                        <strong>Error:</strong> {entry.error_message}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-dark-800/60">
                    {isFailed && (
                      <Button
                        variant="outline"
                        size="sm"
                        isLoading={actionLoadingId === entry.id}
                        onClick={() => handleRetry(entry.id)}
                        leftIcon={<RotateCw className="w-3 h-3" />}
                        className="text-xs border-dark-700 text-slate-200"
                      >
                        Reintentar
                      </Button>
                    )}

                    {['ready', 'queued'].includes(entry.status) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        isLoading={actionLoadingId === entry.id}
                        onClick={() => handleCancel(entry.id)}
                        leftIcon={<Ban className="w-3 h-3 text-rose-400" />}
                        className="text-xs text-rose-300"
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-dark-800 bg-dark-900/60 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>

      </div>
    </div>
  );
}
