export class DashboardStatsDto {
  totalPqrs: number;
  totalPendientes: number;
  totalEnProceso: number;
  totalResueltas: number;
  totalRechazadas: number;
  totalCerradas: number;

  porTipo: { tipo: string; cantidad: number }[];
  porPrioridad: { prioridad: string; cantidad: number }[];

  tiempoPromedioResolucion: number | null;
  tiempoPromedioRespuesta: number | null;

  creadasPorDia: { fecha: string; cantidad: number }[];
  resueltasPorDia: { fecha: string; cantidad: number }[];

  tasaResolucion: number;
  creadasUltimos7Dias: number;
  pqrsEnRiesgo: number;
}