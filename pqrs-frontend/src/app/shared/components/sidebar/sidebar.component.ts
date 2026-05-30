import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly userEmail   = computed(() => this.authService.currentUser()?.email ?? '');
  readonly userNombre  = computed(() => this.authService.currentUser()?.nombre ?? '');
  readonly userRole    = computed(() => this.authService.currentUser()?.rol ?? '');
  readonly userInitial = computed(() => {
    const n = this.userNombre() || this.userEmail();
    return n ? n.charAt(0).toUpperCase() : 'U';
  });

  isCollapsed = signal(false);
  isMobileOpen = signal(false);

  toggle(): void {
    this.isCollapsed.update(v => !v);
  }

  openMobile(): void  { this.isMobileOpen.set(true); }
  closeMobile(): void { this.isMobileOpen.set(false); }

  onLogout(): void {
    this.closeMobile();
    this.authService.logout().subscribe({
      complete: () => this.router.navigate(['/login']),
      error: () => {
        this.authService.clearSession();
        this.router.navigate(['/login']);
      },
    });
  }
}
