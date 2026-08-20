import { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { PlatformBadge } from './PlatformBadge';
import { ContentItem } from '../../types/contentItem';
import { 
  getTodayArgentinaStr, 
  getCurrentTimeArgentinaStr, 
  toArgentinaUtcIso, 
  isPastInArgentina 
} from '../../lib/dateUtils';
import { Calendar, Clock, AlertCircle, Sparkles, UserCheck } from 'lucide-react';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (scheduledAtIso: string) => Promise<void>;
  item: ContentItem;
  isLoading?: boolean;
}

export function ScheduleModal({
  isOpen,
  onClose,
  onConfirm,
  item,
  isLoading = false,
}: ScheduleModalProps) {
  const [dateStr, setDateStr] = useState<string>('');
  const [timeStr, setTimeStr] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Inicializar con la fecha de hoy y hora por defecto en Argentina al abrir
  useEffect(() => {
    if (isOpen) {
      const today = getTodayArgentinaStr();
      const nowTime = getCurrentTimeArgentinaStr();
      setDateStr(today);
      setTimeStr(nowTime || '20:00');
      setValidationError(null);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (!dateStr || !timeStr) {
      setValidationError('Por favor seleccioná fecha y hora.');
      return;
    }

    if (isPastInArgentina(dateStr, timeStr)) {
      setValidationError('La fecha y hora no pueden estar en el pasado.');
      return;
    }

    try {
      setValidationError(null);
      const isoUtc = toArgentinaUtcIso(dateStr, timeStr);
      await onConfirm(isoUtc);
      onClose();
    } catch (err: any) {
      console.error('Error al procesar fecha de programación:', err);
      setValidationError(err.message || 'Error al convertir la fecha.');
    }
  };

  const accountName = item.social_accounts?.account_name || 'Cuenta vinculada';
  const minDate = getTodayArgentinaStr();

  // Formato visual para confirmación (DD/MM/YYYY)
  const formattedDatePreview = dateStr
    ? dateStr.split('-').reverse().join('/')
    : '--/--/----';

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="md" title="Programar Contenido" showCloseButton={!isLoading}>
      <div className="space-y-5">
        {/* Resumen del Contenido */}
        <div className="p-4 rounded-xl bg-dark-950 border border-dark-800 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <PlatformBadge platform={item.platform} size="sm" />
            <span className="text-[11px] font-medium text-slate-400">
              Tipo: <strong className="text-slate-300 uppercase">{item.content_type || 'Post'}</strong>
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">Título:</span>
            <h4 className="text-sm font-bold text-white tracking-tight line-clamp-2 mt-0.5">
              {item.title}
            </h4>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-dark-800/80 text-xs text-slate-300">
            <UserCheck className="w-3.5 h-3.5 text-aura-400 shrink-0" />
            <span className="truncate">Cuenta destino: <strong className="text-white">{accountName}</strong></span>
          </div>
        </div>

        {/* Date & Time Selectors */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Fecha de Publicación"
              type="date"
              min={minDate}
              value={dateStr}
              onChange={(e) => {
                setDateStr(e.target.value);
                setValidationError(null);
              }}
              leftIcon={<Calendar className="w-4 h-4 text-aura-400" />}
              disabled={isLoading}
              required
            />

            <Input
              label="Hora (Argentina UTC-3)"
              type="time"
              value={timeStr}
              onChange={(e) => {
                setTimeStr(e.target.value);
                setValidationError(null);
              }}
              leftIcon={<Clock className="w-4 h-4 text-amber-400" />}
              disabled={isLoading}
              required
            />
          </div>

          {/* Validation Error */}
          {validationError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Resumen Claro de Programación en Hora Argentina */}
          <div className="p-3.5 rounded-xl bg-aura-500/10 border border-aura-500/25 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-aura-300">
              <Sparkles className="w-3.5 h-3.5" />
              Resumen de Programación Oficial
            </div>
            <p className="text-xs text-slate-200 leading-relaxed">
              El contenido se programará para el{' '}
              <strong className="text-white underline decoration-aura-400 underline-offset-2">
                {formattedDatePreview} a las {timeStr || '--:--'} hs
              </strong>{' '}
              <span className="text-aura-300 font-mono text-[11px]">(America/Argentina/Buenos_Aires)</span>.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-3 pt-3 border-t border-dark-800">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>

          <Button
            variant="primary"
            className="flex-1 shadow-aura-500/20"
            onClick={handleConfirm}
            isLoading={isLoading}
          >
            Confirmar Programación
          </Button>
        </div>
      </div>
    </Modal>
  );
}
