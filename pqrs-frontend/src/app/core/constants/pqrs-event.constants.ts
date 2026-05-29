import { PqrsEventType } from '../models/pqrs.model';

export interface EventConfig {
  label: string;
  icon: string;
  bgColor: string;
  iconColor: string;
}

export const EVENT_CONFIG: Record<PqrsEventType, EventConfig> = {
  [PqrsEventType.PQRS_CREADA]: {
    label: 'PQRS creada',
    icon: 'file-plus',
    bgColor: '#E1F5EE',
    iconColor: '#085041',
  },
  [PqrsEventType.ESTADO_CAMBIADO]: {
    label: 'Estado cambiado',
    icon: 'refresh',
    bgColor: '#E6F1FB',
    iconColor: '#0C447C',
  },
  [PqrsEventType.PRIORIDAD_CAMBIADA]: {
    label: 'Prioridad cambiada',
    icon: 'arrow-up-circle',
    bgColor: '#FAEEDA',
    iconColor: '#633806',
  },
  [PqrsEventType.RESPUESTA_AGREGADA]: {
    label: 'Respuesta agregada',
    icon: 'message-circle',
    bgColor: '#EEEDFE',
    iconColor: '#3C3489',
  },
  [PqrsEventType.ARCHIVO_SUBIDO]: {
    label: 'Archivo subido',
    icon: 'upload',
    bgColor: '#FAECE7',
    iconColor: '#712B13',
  },
  [PqrsEventType.ARCHIVO_ELIMINADO]: {
    label: 'Archivo eliminado',
    icon: 'trash',
    bgColor: '#F1EFE8',
    iconColor: '#444441',
  },
  [PqrsEventType.PQRS_ELIMINADA]: {
    label: 'PQRS eliminada',
    icon: 'alert-circle',
    bgColor: '#FCEBEB',
    iconColor: '#501313',
  },
};
