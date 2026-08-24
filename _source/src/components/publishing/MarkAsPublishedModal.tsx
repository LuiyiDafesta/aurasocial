import { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useToast } from '../../hooks/useToast';
import { markAsPublishedManual } from '../../services/publishingOutboxService';
import { 
  CheckCircle2, 
  Link2, 
  Calendar, 
  FileText, 
  Loader2 
} from 'lucide-react';
import { getTodayArgentinaStr, getCurrentTimeArgentinaStr, toArgentinaUtcIso } from '../../lib/dateUtils';

interface MarkAsPublishedModalProps {
  isOpen: boolean;
  onClose: () => void;
  outboxId?: string;
  adaptationId?: string;
  renderJobId?: string;
  platform?: any;
  contentTitle?: string;
  onSuccess?: () => void;
}

export function MarkAsPublishedModal({
  isOpen,
  onClose,
  outboxId,
  adaptationId,
  renderJobId,
  platform,
  contentTitle,
  onSuccess,
}: MarkAsPublishedModalProps) {
  const { toast } = useToast();
  const [externalUrl, setExternalUrl] = useState<string>('');
  const [publishDate, setPublishDate] = useState<string>(getTodayArgentinaStr());
  const [publishTime, setPublishTime] = useState<string>(getCurrentTimeArgentinaStr());
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);

      const publishedAtIso = toArgentinaUtcIso(publishDate, publishTime);

      await markAsPublishedManual({
        outboxId,
        adaptationId,
        renderJobId,
        platform,
        externalPostUrl: externalUrl.trim() || null,
        publishedAt: publishedAtIso,
        notes: notes.trim() || null,
      });

      toast('¡Publicación manual registrada exitosamente!', { type: 'success' });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error al marcar como publicado:', err);
      toast(`Error: ${err.message}`, { type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="¿Ya publicaste este contenido?"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* Banner informativo */}
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <p className="font-semibold text-emerald-300">
              Registrar Publicación Manual
            </p>
            <p className="text-slate-300 leading-relaxed">
              Completá los datos reales de publicación para archivar el paquete y mantener actualizado el historial de tu marca.
            </p>
          </div>
        </div>

        {contentTitle && (
          <div className="p-3 rounded-xl bg-dark-950 border border-dark-800 text-xs">
            <span className="text-slate-500 uppercase tracking-wider text-[10px] font-mono block mb-1">
              Contenido
            </span>
            <span className="font-medium text-white line-clamp-1">{contentTitle}</span>
          </div>
        )}

        {/* URL Externa (Opcional) */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-purple-400" />
            Enlace de la publicación (Opcional)
          </label>
          <Input
            type="url"
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            placeholder="https://www.instagram.com/reel/..."
            className="text-xs"
          />
          <p className="text-[11px] text-slate-500">
            Si no tenés la URL en este momento, podés continuar y dejarla vacía.
          </p>
        </div>

        {/* Fecha y Hora de Publicación */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              Fecha Real
            </label>
            <Input
              type="date"
              value={publishDate}
              onChange={(e) => setPublishDate(e.target.value)}
              className="text-xs"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              Hora Real
            </label>
            <Input
              type="time"
              value={publishTime}
              onChange={(e) => setPublishTime(e.target.value)}
              className="text-xs"
              required
            />
          </div>
        </div>

        {/* Notas adicionales */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            Notas / Observaciones (Opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej: Publicado por @comunity_manager en horario pico..."
            rows={2}
            className="w-full rounded-xl bg-dark-950 border border-dark-800 focus:border-purple-500 p-3 text-xs text-white placeholder-slate-600 outline-none resize-none"
          />
        </div>

        {/* Botones de acción */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-dark-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isLoading}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Confirmar como Publicado
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
