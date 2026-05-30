export interface Pqrs {
  id: string;
  radicado: string; // Campo crítico para cumplimiento
  titulo: string;
  descripcion: string;
  tipo: 'peticion' | 'queja' | 'reclamo' | 'sugerencia';
  estado: string;
  prioridad: string;
  fechaLimite?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  user?: { id: string; nombre: string; email: string };
  attachments?: any[];
  respuestas?: any[];
  _count?: {
    attachments: number;
    respuestas: number;
  };
}

export interface PqrsStats {
  total: number;
  porEstado: Record<string, number>;
  porTipo: Record<string, number>;
  porPrioridad: Record<string, number>;
  porArea?: { area: string; cantidad: number }[];
  cumplimiento?: {
    vencidas: number;
    proximaVencer: number;
    eficiencia: number;
  };
}