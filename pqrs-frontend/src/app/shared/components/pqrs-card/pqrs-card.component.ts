import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Pqrs } from '../../../core/models/pqrs.model';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import { PqrsTypePipe } from '../../pipes/pqrs-type.pipe';

@Component({
  selector: 'app-pqrs-card',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadgeComponent, PqrsTypePipe],
  templateUrl: './pqrs-card.component.html',
  styleUrl: './pqrs-card.component.css',
})
export class PqrsCardComponent {
  @Input() pqrs!: Pqrs;
}
