import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      *ngFor="let i of linesArr"
      class="skeleton"
      [style.width]="width"
      [style.height]="height"
      [style.border-radius]="radius"
      [style.margin-bottom]="lines > 1 ? 'var(--space-2)' : '0'"
      aria-hidden="true"
      role="presentation"
    ></div>
  `,
  styleUrl: './skeleton.component.css',
})
export class SkeletonComponent {
  @Input() width  = '100%';
  @Input() height = '16px';
  @Input() radius = 'var(--radius-sm)';
  @Input() lines  = 1;

  get linesArr(): number[] {
    return Array.from({ length: this.lines }, (_, i) => i);
  }
}
