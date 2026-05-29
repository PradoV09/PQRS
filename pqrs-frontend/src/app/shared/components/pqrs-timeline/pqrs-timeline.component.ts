import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PqrsEvento, PqrsEventType, PqrsPriority } from '../../../core/models/pqrs.model';
import { EVENT_CONFIG } from '../../../core/constants/pqrs-event.constants';
import { PRIORITY_CONFIG } from '../../../core/constants/pqrs-priority.constants';
import { PqrsStatusPipe } from '../../pipes/pqrs-status.pipe';
import { FileSizePipe } from '../../pipes/file-size.pipe';

@Component({
  selector: 'app-pqrs-timeline',
  standalone: true,
  imports: [CommonModule, PqrsStatusPipe, FileSizePipe],
  templateUrl: './pqrs-timeline.component.html',
  styleUrl: './pqrs-timeline.component.css',
})
export class PqrsTimelineComponent {
  @Input() eventos: PqrsEvento[] = [];
  @Input() isAdmin = false;

  protected readonly PqrsEventType = PqrsEventType;
  protected readonly PqrsPriority = PqrsPriority;

  get eventosFiltrados(): PqrsEvento[] {
    if (this.isAdmin) return this.eventos;
    return this.eventos.filter(
      (e) =>
        e.tipoEvento !== PqrsEventType.ARCHIVO_ELIMINADO &&
        e.tipoEvento !== PqrsEventType.PQRS_ELIMINADA,
    );
  }

  getConfig(tipoEvento: PqrsEventType) {
    return EVENT_CONFIG[tipoEvento];
  }

  esCambioDeEstado(e: PqrsEvento): boolean {
    return e.tipoEvento === PqrsEventType.ESTADO_CAMBIADO;
  }

  esCambioDePrioridad(e: PqrsEvento): boolean {
    return e.tipoEvento === PqrsEventType.PRIORIDAD_CAMBIADA;
  }

  esAutomatico(e: PqrsEvento): boolean {
    return e.detalle?.['esAutomatico'] === true;
  }

  priorityLabel(value: string): string {
    return PRIORITY_CONFIG[value as PqrsPriority]?.label ?? value;
  }
}
