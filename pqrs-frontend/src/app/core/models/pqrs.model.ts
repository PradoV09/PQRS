export enum PqrsStatus {
  PENDIENTE = 'pendiente',
  EN_PROCESO = 'en_proceso',
  RESUELTO = 'resuelto',
  CERRADO = 'cerrado'
}

export enum PqrsType {
  PETICION = 'peticion',
  QUEJA = 'queja',
  RECLAMO = 'reclamo',
  SUGERENCIA = 'sugerencia'
}

export enum PqrsPriority {
  BAJA = 'baja',
  MEDIA = 'media',
  ALTA = 'alta',
  URGENTE = 'urgente'
}

export enum PqrsEventType {
  PQRS_CREADA = 'pqrs_creada',
  ESTADO_CAMBIADO = 'estado_cambiado',
  PRIORIDAD_CAMBIADA = 'prioridad_cambiada',
  RESPUESTA_AGREGADA = 'respuesta_agregada',
  ARCHIVO_SUBIDO = 'archivo_subido',
  ARCHIVO_ELIMINADO = 'archivo_eliminado',
  PQRS_ELIMINADA = 'pqrs_eliminada',
  ASIGNACION_CAMBIADA = 'asignacion_cambiada'
}

export interface PqrsAttachment {
  id: string;
  filename: string;
  storedName: string;
  mimetype: string;
  size: number;
  path: string;
  thumbPath?: string;
  createdAt: Date;
}

export interface Pqrs {
  id: string;
  userId: string; // Necesario para validar propiedad
  radicado: string; // Campo crítico para cumplimiento
  titulo: string;
  descripcion: string;
  tipo: PqrsType;
  estado: PqrsStatus;
  prioridad: PqrsPriority;
  fechaLimite?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  user?: { id: string; nombre: string; email: string };
  attachments?: PqrsAttachment[];
  respuestas?: PqrsRespuesta[];
  _count?: {
    attachments: number;
    respuestas: number;
  };
}

export interface PqrsRespuesta {
  id: string;
  contenido: string;
  esAdmin: boolean;
  createdAt: Date;
  autor?: { id: string; nombre: string; rol: string };
}

export interface PqrsEvento {
  id: string;
  tipoEvento: PqrsEventType;
  descripcion: string;
  detalle: any;
  createdAt: Date;
  actorNombre?: string | null;
}

export interface PqrsStats {
  total: number;
  porEstado: Record<string, number>;
  porTipo: Record<string, number>;
  porPrioridad: Record<string, number>;
  porArea?: { area: string; cantidad: number }[];
  urgentesAbiertas?: number;
  ultimosSieteDias?: number;
  tiempoPromedioResolucion?: number;
  cumplimiento?: {
    vencidas: number;
    proximaVencer: number;
    eficiencia: number;
  };
}

export interface PaginatedPqrs {
  data: Pqrs[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PqrsQueryParams {
  page?: number;
  limit?: number;
  estado?: string;
  tipo?: string;
  prioridad?: string;
  search?: string;
  radicado?: string;
}