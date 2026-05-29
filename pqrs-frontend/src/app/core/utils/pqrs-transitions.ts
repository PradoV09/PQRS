import { PqrsStatus } from '../models/pqrs.model';

/**
 * Mapa de transiciones válidas.
 * Clave: estado actual. Valor: array de estados destino permitidos.
 * Un array vacío significa estado final (sin transiciones).
 */
export const VALID_TRANSITIONS: Record<PqrsStatus, PqrsStatus[]> = {
  [PqrsStatus.PENDIENTE]: [PqrsStatus.EN_PROCESO, PqrsStatus.CERRADO],
  [PqrsStatus.EN_PROCESO]: [PqrsStatus.RESUELTO, PqrsStatus.CERRADO],
  [PqrsStatus.RESUELTO]: [PqrsStatus.CERRADO],
  [PqrsStatus.CERRADO]: [],
};

/**
 * Retorna los estados a los que se puede ir desde estadoActual.
 * Usar en el frontend para construir el select de opciones.
 */
export function getValidTransitions(estadoActual: PqrsStatus): PqrsStatus[] {
  return VALID_TRANSITIONS[estadoActual] ?? [];
}

/**
 * Valida si una transición concreta es válida.
 * Usar en el backend antes de aplicar el cambio.
 */
export function isValidTransition(
  estadoActual: PqrsStatus,
  estadoNuevo: PqrsStatus,
): boolean {
  return VALID_TRANSITIONS[estadoActual]?.includes(estadoNuevo) ?? false;
}

/**
 * Retorna true si el estado es final (no admite transiciones).
 */
export function isFinalState(estado: PqrsStatus): boolean {
  return VALID_TRANSITIONS[estado]?.length === 0;
}

/**
 * Etiquetas legibles para el usuario (español).
 */
export const STATUS_LABELS: Record<PqrsStatus, string> = {
  [PqrsStatus.PENDIENTE]: 'Pendiente',
  [PqrsStatus.EN_PROCESO]: 'En proceso',
  [PqrsStatus.RESUELTO]: 'Resuelto',
  [PqrsStatus.CERRADO]: 'Cerrado',
};
