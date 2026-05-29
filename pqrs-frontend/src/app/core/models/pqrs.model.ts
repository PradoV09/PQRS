export enum PqrsType {
  PETICION = 'peticion',
  QUEJA = 'queja',
  RECLAMO = 'reclamo',
  SUGERENCIA = 'sugerencia',
}

export enum PqrsStatus {
  PENDIENTE = 'pendiente',
  EN_PROCESO = 'en_proceso',
  RESUELTO = 'resuelto',
  CERRADO = 'cerrado',
}

export enum PqrsPriority {
  BAJA = 'baja',
  MEDIA = 'media',
  ALTA = 'alta',
  URGENTE = 'urgente',
}

export interface PqrsAttachment {
  id: string;
  filename: string;
  storedName: string;
  mimetype: string;
  size: number;
  thumbPath?: string;
}

export interface PqrsRespuesta {
  id: string;
  contenido: string;
  esAdmin: boolean;
  createdAt: string;
  autor: { id: string; nombre: string; rol: string } | null;
}

export interface Pqrs {
  id: string;
  titulo: string;
  descripcion: string;
  tipo: PqrsType;
  estado: PqrsStatus;
  prioridad: PqrsPriority;
  fechaLimite: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  attachments: PqrsAttachment[];
  respuestas?: PqrsRespuesta[];
  _count?: { attachments: number; respuestas: number };
  user?: {
    id: string;
    nombre: string;
    email?: string;
    rol?: string;
  } | null;
}

export interface PaginatedPqrs {
  data: Pqrs[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PqrsQueryParams {
  tipo?: PqrsType | '';
  estado?: PqrsStatus | '';
  prioridad?: PqrsPriority | '';
  page?: number;
  limit?: number;
  search?: string;
  userId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'estado';
  sortOrder?: 'ASC' | 'DESC';
}

export interface PqrsStats {
  total: number;
  porEstado: Record<PqrsStatus, number>;
  porTipo: Record<PqrsType, number>;
  porPrioridad: Record<PqrsPriority, number>;
  urgentesAbiertas: number;
  ultimosSieteDias: number;
  tiempoPromedioResolucion: number;
}

export enum PqrsEventType {
  PQRS_CREADA = 'pqrs_creada',
  ESTADO_CAMBIADO = 'estado_cambiado',
  PRIORIDAD_CAMBIADA = 'prioridad_cambiada',
  RESPUESTA_AGREGADA = 'respuesta_agregada',
  ARCHIVO_SUBIDO = 'archivo_subido',
  ARCHIVO_ELIMINADO = 'archivo_eliminado',
  PQRS_ELIMINADA = 'pqrs_eliminada',
}

export interface PqrsEvento {
  id: string;
  tipoEvento: PqrsEventType;
  detalle: Record<string, unknown> | null;
  descripcion: string;
  createdAt: string;
  actorNombre: string | null;
}
