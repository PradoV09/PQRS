import { Component, OnInit, inject, signal, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidatorFn } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { TopbarComponent } from '../../shared/components/topbar/topbar.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { environment } from '../../../environments/environment';

function passwordMatchValidator(): ValidatorFn {
  return (group: AbstractControl) => {
    const nueva = group.get('nueva')?.value;
    const confirm = group.get('confirmar')?.value;
    return nueva && confirm && nueva !== confirm ? { mismatch: true } : null;
  };
}

function strengthScore(pwd: string): number {
  let score = 0;
  if (pwd.length >= 8)  score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return score;
}

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent, TopbarComponent, ButtonComponent],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.css',
})
export class PerfilComponent implements OnInit {
  private readonly fb          = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly http        = inject(HttpClient);

  @ViewChild(SidebarComponent) sidebar?: SidebarComponent;

  readonly user = computed(() => this.authService.currentUser());

  savingProfile  = signal(false);
  savingPassword = signal(false);
  showCurrentPwd = signal(false);
  showNewPwd     = signal(false);
  showConfirmPwd = signal(false);

  profileForm = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
  });

  passwordForm = this.fb.group(
    {
      actual:    ['', [Validators.required]],
      nueva:     ['', [Validators.required, Validators.minLength(8)]],
      confirmar: ['', [Validators.required]],
    },
    { validators: passwordMatchValidator() }
  );

  readonly pwdStrength = computed(() => {
    const val = this.passwordForm.get('nueva')?.value ?? '';
    return val ? strengthScore(val) : 0;
  });

  readonly pwdStrengthLabel = computed(() => {
    const s = this.pwdStrength();
    if (s <= 1) return 'Débil';
    if (s <= 3) return 'Media';
    return 'Fuerte';
  });

  readonly pwdStrengthClass = computed(() => {
    const s = this.pwdStrength();
    if (s <= 1) return 'weak';
    if (s <= 3) return 'medium';
    return 'strong';
  });

  readonly profileDirty = computed(() => this.profileForm.dirty);

  ngOnInit(): void {
    const u = this.user();
    if (u) {
      this.profileForm.patchValue({ nombre: u.nombre });
    }
  }

  openMobileSidebar(): void {
    this.sidebar?.openMobile();
  }

  discardProfileChanges(): void {
    const u = this.user();
    if (u) this.profileForm.patchValue({ nombre: u.nombre });
    this.profileForm.markAsPristine();
  }

  saveProfile(): void {
    if (this.profileForm.invalid || !this.profileDirty()) return;
    this.savingProfile.set(true);

    this.http.patch(`${environment.apiUrl}/auth/me`, this.profileForm.value).subscribe({
      next: (updated: any) => {
        this.savingProfile.set(false);
        this.authService.currentUser.set({ ...this.user()!, nombre: updated.nombre });
        this.profileForm.markAsPristine();
        this.toastService.success('Perfil actualizado', 'Tus datos han sido guardados correctamente.');
      },
      error: (err) => {
        this.savingProfile.set(false);
        this.toastService.error(err.error?.message ?? 'No se pudo guardar el perfil.');
      },
    });
  }

  savePassword(): void {
    this.passwordForm.markAllAsTouched();
    if (this.passwordForm.invalid) return;

    const { actual, nueva } = this.passwordForm.value;
    if (actual === nueva) {
      this.toastService.warning('La nueva contraseña debe ser diferente a la actual.');
      return;
    }

    this.savingPassword.set(true);
    this.http.patch(`${environment.apiUrl}/users/me/password`, { currentPassword: actual, newPassword: nueva }).subscribe({
      next: () => {
        this.savingPassword.set(false);
        this.passwordForm.reset();
        this.toastService.success('Contraseña actualizada', 'Tu contraseña ha sido cambiada correctamente.');
      },
      error: (err) => {
        this.savingPassword.set(false);
        this.toastService.error(err.error?.message ?? 'No se pudo cambiar la contraseña.');
      },
    });
  }

  private getCtrl(form: 'profile' | 'password', name: string): AbstractControl | null {
    return form === 'profile' ? this.profileForm.get(name) : this.passwordForm.get(name);
  }

  fieldError(form: 'profile' | 'password', name: string): string {
    const ctrl = this.getCtrl(form, name);
    if (!ctrl || !(ctrl.invalid && ctrl.touched)) return '';
    if (ctrl.hasError('required'))  return 'Este campo es obligatorio.';
    if (ctrl.hasError('minlength')) return `Mínimo ${ctrl.errors!['minlength'].requiredLength} caracteres.`;
    if (ctrl.hasError('maxlength')) return `Máximo ${ctrl.errors!['maxlength'].requiredLength} caracteres.`;
    return '';
  }

  isInvalid(form: 'profile' | 'password', name: string): boolean {
    const ctrl = this.getCtrl(form, name);
    return !!ctrl && ctrl.invalid && ctrl.touched;
  }
}
