import { PqrsPriority } from '../enums/pqrs-priority.enum';

/**
 * Suma días hábiles (lunes a viernes) a una fecha.
 * No considera feriados en v1.
 */
function addBusinessDays(start: Date, days: number): Date {
  const result = new Date(start);
  let added = 0;

  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      added++;
    }
  }

  return result;
}

/**
 * Calcula la fecha límite de respuesta según la prioridad y la fecha de creación.
 */
export function calcularFechaLimite(
  createdAt: Date,
  prioridad: PqrsPriority,
): Date {
  const base = new Date(createdAt);

  switch (prioridad) {
    case PqrsPriority.URGENTE: {
      const limite = new Date(base);
      limite.setHours(limite.getHours() + 24);
      return limite;
    }
    case PqrsPriority.ALTA:
      return addBusinessDays(base, 3);
    case PqrsPriority.MEDIA:
      return addBusinessDays(base, 8);
    case PqrsPriority.BAJA:
      return addBusinessDays(base, 15);
    default:
      return addBusinessDays(base, 8);
  }
}
