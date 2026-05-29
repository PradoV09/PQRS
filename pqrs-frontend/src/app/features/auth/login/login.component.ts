import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="login-container">
      <div class="login-card">
        <div class="logo-wrapper">
          <!-- SVG Logo Icon -->
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <h2>PQRS</h2>
        </div>
        <h3>Iniciar sesión</h3>
        <p class="subtitle">Ingresa tus credenciales para acceder</p>

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="email">Correo electrónico</label>
            <input id="email" type="email" formControlName="email" placeholder="ejemplo@correo.com" />
            @if (loginForm.get('email')?.touched && loginForm.get('email')?.invalid) {
              <span class="error-msg">Ingresa un correo válido.</span>
            }
          </div>

          <div class="form-group">
            <label for="password">Contraseña</label>
            <input id="password" type="password" formControlName="password" placeholder="••••••••" />
            @if (loginForm.get('password')?.touched && loginForm.get('password')?.invalid) {
              <span class="error-msg">La contraseña es obligatoria.</span>
            }
          </div>

          @if (errorMessage()) {
            <div class="alert alert-danger">{{ errorMessage() }}</div>
          }

          <button type="submit" [disabled]="loginForm.invalid || loading()" class="btn-primary">
            @if (loading()) {
              <span class="spinner"></span> Procesando...
            } @else {
              Iniciar sesión
            }
          </button>
        </form>

        <div class="card-footer">
          ¿No tienes cuenta? <a routerLink="/register">Regístrate aquí</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      padding: 1.5rem;
    }
    .login-card {
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(10px);
      border-radius: 16px;
      padding: 2.5rem;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.7);
    }
    .logo-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    .logo-wrapper h2 {
      margin: 0.5rem 0 0;
      color: #0f172a;
      font-size: 1.5rem;
      font-weight: 800;
      letter-spacing: 0.05em;
    }
    h3 {
      margin: 0;
      font-size: 1.75rem;
      font-weight: 700;
      color: #0f172a;
      text-align: center;
    }
    .subtitle {
      text-align: center;
      color: #64748b;
      margin-top: 0.5rem;
      margin-bottom: 2rem;
      font-size: 0.875rem;
    }
    .form-group {
      margin-bottom: 1.25rem;
      display: flex;
      flex-direction: column;
    }
    label {
      font-size: 0.875rem;
      font-weight: 600;
      color: #334155;
      margin-bottom: 0.5rem;
    }
    input {
      padding: 0.75rem 1rem;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 0.95rem;
      transition: all 0.2s ease;
      outline: none;
      background: #f8fafc;
    }
    input:focus {
      border-color: #16a34a;
      background: #fff;
      box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.1);
    }
    .error-msg {
      color: #dc2626;
      font-size: 0.75rem;
      margin-top: 0.35rem;
    }
    .alert-danger {
      background: #fef2f2;
      color: #991b1b;
      padding: 0.75rem;
      border-radius: 8px;
      font-size: 0.85rem;
      margin-bottom: 1.25rem;
      border: 1px solid #fca5a5;
    }
    .btn-primary {
      background: #16a34a;
      color: white;
      border: none;
      padding: 0.85rem;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      width: 100%;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 0.5rem;
    }
    .btn-primary:hover:not(:disabled) {
      background: #15803d;
      box-shadow: 0 4px 12px rgba(22, 163, 74, 0.2);
    }
    .btn-primary:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
    .card-footer {
      margin-top: 2rem;
      text-align: center;
      font-size: 0.875rem;
      color: #64748b;
    }
    .card-footer a {
      color: #16a34a;
      text-decoration: none;
      font-weight: 600;
    }
    .card-footer a:hover {
      text-decoration: underline;
    }
    .spinner {
      width: 1rem;
      height: 1rem;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  loading = signal(false);
  errorMessage = signal<string | null>(null);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  onSubmit() {
    if (this.loginForm.invalid) return;

    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(
          err.status === 401
            ? 'Credenciales inválidas.'
            : 'Error de conexión. Inténtalo de nuevo.'
        );
      }
    });
  }
}
