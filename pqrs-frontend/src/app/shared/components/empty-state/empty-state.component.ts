import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  template: `
    <div class="empty-state" role="status">
      <div class="empty-icon" aria-hidden="true">
        <ng-content select="[emptyIcon]"></ng-content>
        <svg *ngIf="!hasCustomIcon" viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path>
        </svg>
      </div>
      <h3 class="empty-title">{{ title }}</h3>
      <p class="empty-message">{{ message }}</p>
      <app-button
        *ngIf="actionLabel"
        variant="primary"
        (click)="action.emit()"
      >{{ actionLabel }}</app-button>
    </div>
  `,
  styleUrl: './empty-state.component.css',
})
export class EmptyStateComponent {
  @Input() title        = 'Sin resultados';
  @Input() message      = 'No hay elementos para mostrar.';
  @Input() actionLabel?: string;
  @Input() hasCustomIcon = false;
  @Output() action = new EventEmitter<void>();
}
