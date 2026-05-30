import { AbstractControl, ValidationErrors } from '@angular/forms';

export class CustomValidators {
  static passwordsMatch(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value as string;
    const confirmPassword = group.get('confirmPassword')?.value as string;
    if (password && confirmPassword && password !== confirmPassword) {
      group.get('confirmPassword')?.setErrors({ passwordsMatch: true });
      return { passwordsMatch: true };
    }
    return null;
  }

  static strongPassword(control: AbstractControl): ValidationErrors | null {
    const value = control.value as string;
    if (!value) return null;
    const pattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._-])/;
    return pattern.test(value) ? null : { strongPassword: true };
  }

  static onlyLetters(control: AbstractControl): ValidationErrors | null {
    const value = control.value as string;
    if (!value) return null;
    return /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]+$/.test(value)
      ? null
      : { onlyLetters: true };
  }

  static phoneFormat(control: AbstractControl): ValidationErrors | null {
    const value = control.value as string;
    if (!value) return null;
    return /^[+\d\s()-]{7,20}$/.test(value) ? null : { phoneFormat: true };
  }

  static noWhitespace(control: AbstractControl): ValidationErrors | null {
    const value = (control.value as string) ?? '';
    return value.trim().length > 0 ? null : { noWhitespace: true };
  }
}
