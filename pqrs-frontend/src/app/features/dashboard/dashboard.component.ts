import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService, User } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  template: `
    <div class="portal-layout">
      <!-- Barra lateral de navegación -->
      <app-sidebar></app-sidebar>

      <!-- Contenido principal -->
      <div class="portal-content">
        <main class="main-content">
          @if (loading()) {
            <div class="loading-state">
              <div class="spinner-large"></div>
              <p>Cargando información del perfil...</p>
            </div>
          } @else if (error()) {
            <div class="error-card">
              <h3>Error de carga</h3>
              <p>{{ error() }}</p>
              <button class="btn-retry" (click)="loadUserProfile()">Reintentar</button>
            </div>
          } @else if (user()) {
            <div class="profile-card animate-fade-in">
              <div class="profile-header">
                <div class="avatar-large">
                  {{ user()?.nombre?.charAt(0)?.toUpperCase() }}
                </div>
                <div class="profile-meta">
                  <h2>{{ user()?.nombre }}</h2>
                  <span class="badge" [class.badge-admin]="user()?.rol === 'admin'">
                    {{ user()?.rol | uppercase }}
                  </span>
                </div>
              </div>

              <div class="profile-body">
                <div class="info-row">
                  <span class="label">Correo Electrónico</span>
                  <span class="value">{{ user()?.email }}</span>
                </div>
                <div class="info-row">
                  <span class="label">ID de Usuario</span>
                  <span class="value mono">{{ user()?.id }}</span>
                </div>
                <div class="info-row">
                  <span class="label">Estado de la cuenta</span>
                  <span class="value status-active">
                    <span class="dot"></span> Activa
                  </span>
                </div>
                <div class="info-row">
                  <span class="label">Fecha de registro</span>
                  <span class="value">{{ user()?.createdAt | date: 'dd/MM/yyyy, h:mm a' }}</span>
                </div>
              </div>
            </div>
          }
        </main>
      </div>
    </div>
  `,
  styles: [`
    .main-content {
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 2rem;
    }
    .loading-state {
      text-align: center;
      color: #64748b;
    }
    .spinner-large {
      width: 3rem;
      height: 3rem;
      border: 3px solid #e2e8f0;
      border-top-color: #16a34a;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 1rem;
    }
    .profile-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
      border: 1px solid #e2e8f0;
      width: 100%;
      max-width: 500px;
      overflow: hidden;
    }
    .profile-header {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      padding: 2rem;
      display: flex;
      align-items: center;
      gap: 1.5rem;
      border-bottom: 1px solid #e2e8f0;
    }
    .avatar-large {
      width: 4.5rem;
      height: 4.5rem;
      background: #16a34a;
      color: white;
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 2rem;
      font-weight: 700;
      box-shadow: 0 4px 10px rgba(22, 163, 74, 0.25);
    }
    .profile-meta h2 {
      margin: 0;
      color: #0f172a;
      font-size: 1.5rem;
      font-weight: 700;
    }
    .badge {
      display: inline-block;
      margin-top: 0.5rem;
      padding: 0.25rem 0.75rem;
      background: #e2e8f0;
      color: #475569;
      font-size: 0.75rem;
      font-weight: 700;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .badge-admin {
      background: #dcfce7;
      color: #15803d;
    }
    .profile-body {
      padding: 2rem;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 0;
      border-bottom: 1px solid #f1f5f9;
    }
    .info-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .info-row:first-child {
      padding-top: 0;
    }
    .label {
      color: #64748b;
      font-size: 0.875rem;
      font-weight: 500;
    }
    .value {
      color: #0f172a;
      font-weight: 600;
      font-size: 0.95rem;
    }
    .mono {
      font-family: monospace;
      font-size: 0.85rem;
      color: #475569;
      background: #f1f5f9;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
    }
    .status-active {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      color: #16a34a;
    }
    .dot {
      width: 8px;
      height: 8px;
      background: #16a34a;
      border-radius: 50%;
      display: inline-block;
    }
    .error-card {
      text-align: center;
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.05);
      border: 1px solid #fee2e2;
      max-width: 400px;
    }
    .error-card h3 {
      color: #b91c1c;
      margin: 0 0 0.5rem;
    }
    .btn-retry {
      margin-top: 1rem;
      background: #16a34a;
      color: white;
      border: none;
      padding: 0.5rem 1.25rem;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
    }
    .btn-retry:hover {
      background: #15803d;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .animate-fade-in {
      animation: fadeIn 0.4s ease-out forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  user = signal<User | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit() {
    this.loadUserProfile();
  }

  loadUserProfile() {
    this.loading.set(true);
    this.error.set(null);

    this.http.get<User>(`${environment.apiUrl}/auth/me`).subscribe({
      next: (userData) => {
        this.user.set(userData);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set('No se pudo cargar la información del usuario.');
      }
    });
  }

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
