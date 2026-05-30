import { Component, Input } from '@angular/core';

const CONFIG: Record<string, { label: string; color: string }> = {
  pendiente:  { label: 'Pendiente',  color: 'warning' },
  en_proceso: { label: 'En proceso', color: 'info'    },
  resuelto:   { label: 'Resuelto',   color: 'success' },
  rechazado:  { label: 'Rechazado',  color: 'danger'  },
  cerrado:    { label: 'Cerrado',    color: 'neutral' },
  urgente:    { label: 'Urgente',    color: 'danger'  },
  alta:       { label: 'Alta',       color: 'danger'  },
  media:      { label: 'Media',      color: 'warning' },
  baja:       { label: 'Baja',       color: 'success' },
  peticion:   { label: 'Petición',   color: 'info'    },
  queja:      { label: 'Queja',      color: 'danger'  },
  reclamo:    { label: 'Reclamo',    color: 'warning' },
  sugerencia: { label: 'Sugerencia', color: 'success' },
};

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `
    <span
      class="badge badge--{{ cfg.color }} badge--{{ size }}"
      [attr.aria-label]="cfg.label"
    >
      <span class="badge-dot" aria-hidden="true"></span>
      {{ cfg.label }}
    </span>
  `,
  styleUrl: './status-badge.component.css',
})
export class StatusBadgeComponent {
  @Input() status!: string;
  @Input() size: 'sm' | 'md' = 'md';

  get cfg() {
    return CONFIG[this.status] ?? { label: this.status, color: 'neutral' };
  }
}
