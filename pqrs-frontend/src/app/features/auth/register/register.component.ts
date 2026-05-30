import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { CustomValidators } from '../../../core/validators/custom-validators';
import { EmailUniqueValidator } from '../../../core/validators/email-unique.validator';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FormFieldComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly emailUniqueValidator = inject(EmailUniqueValidator);

  loading = signal(false);
  submitted = signal(false);
  errorMessage = signal<string | null>(null);
  showPassword = signal(false);
  showConfirmPassword = signal(false);

  registerForm: FormGroup = this.fb.group(
    {
      nombre: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(100),
          CustomValidators.onlyLetters,
          CustomValidators.noWhitespace,
        ],
      ],
      email: [
        '',
        [Validators.required, Validators.email, Validators.maxLength(255)],
        [this.emailUniqueValidator.validate()],
      ],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(72),
          CustomValidators.strongPassword,
        ],
      ],
      confirmPassword: ['', Validators.required],
    },
    { validators: CustomValidators.passwordsMatch },
  );

  get submitDisabled(): boolean {
    return this.registerForm.invalid || this.registerForm.pending || this.loading();
  }

  get passwordStrength() {
    const password = (this.registerForm.get('password')?.value as string) || '';
    if (!password) return { label: 'Sin ingresar', class: '', percentage: 0 };
    if (password.length < 8)
      return { label: 'Muy corta (mín. 8 caracteres)', class: 'weak', percentage: 25 };

    let criteriaMet = 0;
    if (/[A-Z]/.test(password)) criteriaMet++;
    if (/[a-z]/.test(password)) criteriaMet++;
    if (/\d/.test(password)) criteriaMet++;
    if (/[@$!%*?&._-]/.test(password)) criteriaMet++;

    if (criteriaMet <= 2) return { label: 'Débil', class: 'weak', percentage: 40 };
    if (criteriaMet === 3) return { label: 'Media', class: 'medium', percentage: 70 };
    return { label: 'Fuerte y Segura', class: 'strong', percentage: 100 };
  }

  shouldShowError(fieldName: string): boolean {
    const control = this.registerForm.get(fieldName);
    if (!control) return false;
    return control.invalid && (control.touched || this.submitted());
  }

  shouldShowMismatchError(): boolean {
    const confirmControl = this.registerForm.get('confirmPassword');
    return (
      (confirmControl?.hasError('passwordsMatch') ?? false) &&
      (confirmControl?.touched || this.submitted()) === true
    );
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((v) => !v);
  }

  onSubmit(): void {
    this.submitted.set(true);
    this.errorMessage.set(null);

    if (this.registerForm.invalid || this.registerForm.pending) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const { nombre, email, password, confirmPassword } = this.registerForm.value as {
      nombre: string;
      email: string;
      password: string;
      confirmPassword: string;
    };

    this.authService.register({ nombre, email, password, confirmPassword }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        if (err.status === 409) {
          this.errorMessage.set('Este correo ya está registrado.');
          this.registerForm.get('email')?.setErrors({ emailTaken: true });
        } else {
          this.errorMessage.set(
            'Ha ocurrido un error de conexión. Por favor, inténtelo más tarde.',
          );
        }
      },
    });
  }
}
