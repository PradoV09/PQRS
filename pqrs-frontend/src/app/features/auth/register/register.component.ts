import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';

/**
 * Validador personalizado cruzado para verificar que las contraseñas coincidan.
 */
export const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');

  if (!password || !confirmPassword) {
    return null;
  }

  return password.value === confirmPassword.value ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // Estados del formulario y UI
  loading = signal(false);
  submitted = signal(false);
  errorMessage = signal<string | null>(null);
  showPassword = signal(false);
  showConfirmPassword = signal(false);

  // Formulario reactivo
  registerForm: FormGroup = this.fb.group({
    nombre: ['', [
      Validators.required, 
      Validators.minLength(2), 
      Validators.maxLength(100)
    ]],
    email: ['', [
      Validators.required, 
      Validators.email
    ]],
    password: ['', [
      Validators.required,
      Validators.minLength(8),
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&()#_+\-=\[\]{}|;:',.<>?/\\~^]).{8,}$/)
    ]],
    confirmPassword: ['', [
      Validators.required
    ]]
  }, { validators: passwordMatchValidator });

  /**
   * Obtiene la fortaleza de la contraseña en tiempo real
   */
  get passwordStrength() {
    const password = this.registerForm.get('password')?.value || '';
    if (!password) {
      return { label: 'Sin ingresar', class: '', percentage: 0 };
    }
    if (password.length < 8) {
      return { label: 'Muy corta (min. 8 caracteres)', class: 'weak', percentage: 25 };
    }

    let criteriaMet = 0;
    if (/[A-Z]/.test(password)) criteriaMet++;
    if (/[a-z]/.test(password)) criteriaMet++;
    if (/\d/.test(password)) criteriaMet++;
    if (/[@$!%*?&()#_+\-=\[\]{}|;:',.<>?/\\~^]/.test(password)) criteriaMet++;

    if (criteriaMet <= 2) {
      return { label: 'Débil', class: 'weak', percentage: 40 };
    } else if (criteriaMet === 3) {
      return { label: 'Media', class: 'medium', percentage: 70 };
    } else {
      return { label: 'Fuerte y Segura', class: 'strong', percentage: 100 };
    }
  }

  /**
   * Indica si un campo debe mostrar error visual según la regla (touched || submitted)
   */
  shouldShowError(fieldName: string): boolean {
    const control = this.registerForm.get(fieldName);
    if (!control) return false;
    return control.invalid && (control.touched || this.submitted());
  }

  /**
   * Indica si se debe mostrar el error de discordancia de contraseñas
   */
  shouldShowMismatchError(): boolean {
    const confirmControl = this.registerForm.get('confirmPassword');
    const isTouchedOrSubmitted = (confirmControl?.touched || this.submitted());
    return this.registerForm.hasError('passwordMismatch') && isTouchedOrSubmitted;
  }

  /**
   * Alterna la visibilidad de la contraseña
   */
  togglePasswordVisibility(): void {
    this.showPassword.update(val => !val);
  }

  /**
   * Alterna la visibilidad de la confirmación de contraseña
   */
  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update(val => !val);
  }

  /**
   * Procesa el envío del formulario
   */
  onSubmit(): void {
    this.submitted.set(true);
    this.errorMessage.set(null);

    if (this.registerForm.invalid) {
      // Marcar todos los campos como tocados para feedback visual inmediato
      this.registerForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const { nombre, email, password, confirmPassword } = this.registerForm.value;

    this.authService.register({ nombre, email, password, confirmPassword }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        if (err.status === 409) {
          this.errorMessage.set('Este correo ya está registrado.');
        } else {
          this.errorMessage.set('Ha ocurrido un error de conexión. Por favor, inténtelo más tarde.');
        }
      }
    });
  }
}
