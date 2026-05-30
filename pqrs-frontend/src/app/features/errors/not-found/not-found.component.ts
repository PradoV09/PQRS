import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonComponent } from '../../../shared/components/button/button.component';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.css',
})
export class NotFoundComponent {
  private readonly router = inject(Router);

  goHome():  void { this.router.navigate(['/dashboard']); }
  goBack():  void { if (typeof window !== 'undefined') window.history.back(); }
  goPqrs():  void { this.router.navigate(['/pqrs']); }
}
