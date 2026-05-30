import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService, User } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { DashboardStats } from '../../core/models/dashboard.model';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { TopbarComponent } from '../../shared/components/topbar/topbar.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, SidebarComponent, TopbarComponent, SkeletonComponent, StatusBadgeComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  private readonly authService   = inject(AuthService);
  private readonly dashService   = inject(DashboardService);
  private readonly router        = inject(Router);

  readonly user      = computed(() => this.authService.currentUser());
  readonly isAdmin   = computed(() => this.user()?.rol === 'admin');
  readonly isStaff   = computed(() => this.user()?.rol === 'admin' || this.user()?.rol === 'supervisor');

  statsLoading = signal(true);
  stats        = signal<DashboardStats | null>(null);
  lastUpdated  = signal<Date | null>(null);

  ngOnInit(): void {
    if (this.isStaff()) {
      this.loadStats();
    } else {
      this.statsLoading.set(false);
    }
  }

  loadStats(): void {
    this.statsLoading.set(true);
    this.dashService.getStats().subscribe({
      next: (data) => {
        this.stats.set(data);
        this.lastUpdated.set(new Date());
        this.statsLoading.set(false);
      },
      error: () => {
        this.statsLoading.set(false);
      },
    });
  }

  timeAgo(date: Date | null): string {
    if (!date) return '';
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60)  return 'Actualizado hace unos segundos';
    if (diff < 120) return 'Actualizado hace 1 minuto';
    return `Actualizado hace ${Math.floor(diff / 60)} minutos`;
  }

  goTo(path: string): void {
    this.router.navigate([path]);
  }
}
