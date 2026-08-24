/**
 * Configuración central y Kill Switch de publicación en redes sociales para AuraSocial.
 * 
 * Regla de Oro:
 * Durante desarrollo y testing, REAL_PUBLISHING_ENABLED permanece estrictamente en 'false'.
 * La publicación real a Meta Graph API está bloqueada a nivel servidor y UI a menos que
 * se active explícitamente mediante el procedimiento de Piloto Controlado.
 */

// Estado del Kill Switch (por defecto DESACTIVADO para proteger contra salidas accidentales)
export const REAL_PUBLISHING_ENABLED = false;
let realPublishingEnabled = REAL_PUBLISHING_ENABLED;

/**
 * Consulta si la publicación REAL está habilitada en el entorno.
 */
export function isRealPublishingEnabled(): boolean {
  // En producción se puede leer de import.meta.env.VITE_REAL_PUBLISHING_ENABLED === 'true'
  // o configurarse en tiempo de ejecución para el Piloto Autorizado.
  return realPublishingEnabled;
}

/**
 * Permite alternar el Kill Switch en tiempo de ejecución (solo mediante autorización explícita).
 */
export function setRealPublishingEnabled(enabled: boolean): void {
  realPublishingEnabled = enabled;
  console.log(`[KILL_SWITCH] Estado de publicación REAL actualizado a: ${enabled ? 'HABILITADO (LIVE)' : 'BLOQUEADO (PROTEGIDO)'}`);
}

/**
 * Versión de Meta Graph API actualmente soportada y validada.
 */
export const META_GRAPH_API_VERSION = 'v19.0';
