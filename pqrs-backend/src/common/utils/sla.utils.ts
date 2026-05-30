import { PqrsPriority } from '../enums/pqrs-priority.enum';
import { PqrsType } from '../enums/pqrs-type.enum';

export function calcularFechaLimite(fechaCreacion: Date, prioridad: PqrsPriority): Date {
  const fecha = new Date(fechaCreacion);
  let dias = 15;

  if (prioridad === PqrsPriority.URGENTE) dias = 3;
  if (prioridad === PqrsPriority.ALTA) dias = 7;
  if (prioridad === PqrsPriority.MEDIA) dias = 15;
  if (prioridad === PqrsPriority.BAJA) dias = 30;

  fecha.setDate(fecha.getDate() + dias);
  return fecha;
}

/**
 * Calcula la fecha límite legal basada en la Ley 1755 de 2015.
 * Implementa el cálculo en días calendario por simplicidad (mejorable a días hábiles).
 */
export function calcularFechaLimiteLegal(fechaCreacion: Date, tipo: PqrsType): Date {
  const fechaResult = new Date(fechaCreacion);
  let diasPorSumar = 15;

  switch (tipo) {
    case PqrsType.PETICION:
    case PqrsType.QUEJA:
    case PqrsType.RECLAMO:
      diasPorSumar = 15;
      break;
    case PqrsType.SUGERENCIA:
      diasPorSumar = 10;
      break;
    default:
      diasPorSumar = 15;
  }

  // Lógica de días hábiles (Lunes a Viernes)
  let diasContados = 0;
  while (diasContados < diasPorSumar) {
    fechaResult.setDate(fechaResult.getDate() + 1);
    const diaSemana = fechaResult.getDay();
    if (diaSemana !== 0 && diaSemana !== 6) { // 0 = Domingo, 6 = Sábado
      diasContados++;
    }
  }

  return fechaResult;
}