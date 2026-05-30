import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../shared/components/button/button.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ButtonComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  loading      = signal(false);
  errorMessage = signal<string | null>(null);
  showPassword = signal(false);
  sessionExpired = signal(false);

  loginForm = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      if (params.get('expired') === 'true') {
        this.sessionExpired.set(true);
      }
    });
  }

  field(name: string): AbstractControl {
    return this.loginForm.get(name)!;
  }

  isInvalid(name: string): boolean {
    const c = this.field(name);
    return c.invalid && (c.dirty || c.touched);
  }

  isValid(name: string): boolean {
    const c = this.field(name);
    return c.valid && (c.dirty || c.touched);
  }

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  fieldError(name: string): string {
    const c = this.field(name);
    if (name === 'email') {
      if (c.hasError('required'))  return 'El correo es obligatorio.';
      if (c.hasError('email'))     return 'Ingresa un correo con formato válido.';
    }
    if (name === 'password') {
      if (c.hasError('required'))   return 'La contraseña es obligatoria.';
      if (c.hasError('minlength'))  return 'La contraseña debe tener al menos 8 caracteres.';
    }
    return '';
  }

  onSubmit(): void {
    this.loginForm.markAllAsTouched();
    if (this.loginForm.invalid) return;

    this.loading.set(true);
    this.errorMessage.set(null);
    this.sessionExpired.set(false);

    this.authService.login(this.loginForm.value).subscribe({
      next: (res) => {
        this.loading.set(false);
        const role = res.user.rol;
        this.router.navigate([role === 'admin' ? '/dashboard' : '/pqrs']);
      },
      error: (err) => {
        this.loading.set(false);
        this.loginForm.get('password')!.reset();

        if (err.status === 401) {
          this.errorMessage.set('Correo o contraseña incorrectos. Verifica tus datos e intenta de nuevo.');
        } else if (err.status === 423) {
          this.errorMessage.set('Tu cuenta está bloqueada temporalmente por múltiples intentos fallidos. Intenta de nuevo en 15 minutos.');
        } else if (err.status === 0 || err.status >= 500) {
          this.errorMessage.set('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
        } else {
          this.errorMessage.set(err.error?.message || 'Ocurrió un error inesperado. Inténtalo de nuevo.');
        }
      },
    });
  }
}
