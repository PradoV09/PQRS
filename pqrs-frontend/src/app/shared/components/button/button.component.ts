import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="type"
      class="btn btn--{{ variant }} btn--{{ size }}"
      [class.btn--full]="fullWidth"
      [class.btn--loading]="loading"
      [disabled]="disabled || loading"
      [attr.aria-busy]="loading || null"
    >
      <span *ngIf="loading" class="btn-spinner" aria-hidden="true"></span>
      <ng-content></ng-content>
    </button>
  `,
  styleUrl: './button.component.css',
})
export class ButtonComponent {
  @Input() variant:  'primary' | 'secondary' | 'ghost' | 'danger' = 'primary';
  @Input() size:     'sm' | 'md' | 'lg' = 'md';
  @Input() loading  = false;
  @Input() disabled = false;
  @Input() fullWidth = false;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
}
