import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.css',
})
export class TopbarComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly menuOpen = output<void>();

  readonly userNombre  = this.authService.currentUser;
  readonly pageTitle   = this.getTitle();

  openMenu(): void {
    this.menuOpen.emit();
  }

  private getTitle(): string {
    return '';
  }
}
