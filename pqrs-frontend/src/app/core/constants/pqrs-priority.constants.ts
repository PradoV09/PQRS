import { PqrsPriority } from '../models/pqrs.model';

export interface PriorityConfig {
  label: string;
  cssClass: string;
  icon: string;
  order: number;
  slaLabel: string;
}

export const PRIORITY_CONFIG: Record<PqrsPriority, PriorityConfig> = {
  [PqrsPriority.URGENTE]: {
    label: 'Urgente',
    cssClass: 'badge-urgente',
    icon: 'alert-triangle',
    order: 1,
    slaLabel: '24 horas',
  },
  [PqrsPriority.ALTA]: {
    label: 'Alta',
    cssClass: 'badge-alta',
    icon: 'arrow-up',
    order: 2,
    slaLabel: '3 días hábiles',
  },
  [PqrsPriority.MEDIA]: {
    label: 'Media',
    cssClass: 'badge-media',
    icon: 'minus',
    order: 3,
    slaLabel: '8 días hábiles',
  },
  [PqrsPriority.BAJA]: {
    label: 'Baja',
    cssClass: 'badge-baja',
    icon: 'arrow-down',
    order: 4,
    slaLabel: '15 días hábiles',
  },
};

export const PRIORITY_OPTIONS = Object.entries(PRIORITY_CONFIG)
  .sort((a, b) => a[1].order - b[1].order)
  .map(([value, cfg]) => ({ value: value as PqrsPriority, label: cfg.label }));
