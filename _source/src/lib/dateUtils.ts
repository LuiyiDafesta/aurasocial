import { format } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { es } from 'date-fns/locale';

export const ARGENTINA_TIMEZONE = import.meta.env.VITE_APP_TIMEZONE || 'America/Argentina/Buenos_Aires';

/**
 * Formatea una fecha UTC proveniente de PostgreSQL timestamptz
 * en la zona horaria oficial de Argentina (America/Argentina/Buenos_Aires).
 * 
 * Ejemplo: "2026-08-25T23:00:00Z" -> "25/08/2026 20:00 hs"
 */
export function formatInArgentina(
  dateInput: string | Date | null | undefined,
  pattern: string = "dd/MM/yyyy HH:mm 'hs'"
): string {
  if (!dateInput) return '-';

  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return '-';

    const zonedDate = toZonedTime(date, ARGENTINA_TIMEZONE);
    return format(zonedDate, pattern, { locale: es });
  } catch (error) {
    console.error('Error al formatear fecha en hora Argentina:', error);
    return '-';
  }
}

/**
 * Convierte una fecha (YYYY-MM-DD) y hora (HH:mm) seleccionadas por el usuario
 * en hora de Argentina hacia un string ISO-8601 UTC estandarizado para PostgreSQL.
 * 
 * Ejemplo: dateStr = "2026-08-25", timeStr = "20:00"
 * Retorna: "2026-08-25T23:00:00.000Z"
 */
export function toArgentinaUtcIso(dateStr: string, timeStr: string): string {
  if (!dateStr || !timeStr) {
    throw new Error('Fecha y hora requeridas');
  }

  // Construir string local: "2026-08-25T20:00:00"
  const localDateTimeStr = `${dateStr}T${timeStr}:00`;
  
  // Interpretar este tiempo en la zona horaria de Argentina y convertir a UTC Date
  const utcDate = fromZonedTime(localDateTimeStr, ARGENTINA_TIMEZONE);

  if (isNaN(utcDate.getTime())) {
    throw new Error('Fecha u hora inválida');
  }

  return utcDate.toISOString();
}

/**
 * Retorna la fecha actual en Argentina en formato YYYY-MM-DD (para usar como min en inputs date)
 */
export function getTodayArgentinaStr(): string {
  const nowUtc = new Date();
  const nowArgentina = toZonedTime(nowUtc, ARGENTINA_TIMEZONE);
  return format(nowArgentina, 'yyyy-MM-dd');
}

/**
 * Retorna la hora actual en Argentina redondeada en formato HH:mm
 */
export function getCurrentTimeArgentinaStr(): string {
  const nowUtc = new Date();
  const nowArgentina = toZonedTime(nowUtc, ARGENTINA_TIMEZONE);
  return format(nowArgentina, 'HH:mm');
}

/**
 * Valida si una fecha y hora seleccionada en Argentina ya pasó respecto al momento actual
 */
export function isPastInArgentina(dateStr: string, timeStr: string): boolean {
  try {
    const selectedUtc = fromZonedTime(`${dateStr}T${timeStr}:00`, ARGENTINA_TIMEZONE);
    const nowUtc = new Date();
    return selectedUtc.getTime() < nowUtc.getTime();
  } catch {
    return false;
  }
}
