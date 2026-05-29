import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PqrsPriority } from '../../../core/models/pqrs.model';
import { PRIORITY_CONFIG } from '../../../core/constants/pqrs-priority.constants';

@Component({
  selector: 'app-priority-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './priority-badge.component.html',
})
export class PriorityBadgeComponent {
  @Input() prioridad!: PqrsPriority;

  get config() {
    return PRIORITY_CONFIG[this.prioridad];
  }
}
