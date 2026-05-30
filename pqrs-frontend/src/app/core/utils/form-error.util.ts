import { AbstractControl } from '@angular/forms';

export const ERROR_MESSAGES: Record<string, string> = {
  required: 'Este campo es obligatorio.',
  email: 'Ingresa un correo electrónico válido.',
  emailTaken: 'Este correo ya está registrado.',
  minlength: 'El valor es demasiado corto.',
  maxlength: 'El valor es demasiado largo.',
  min: 'El valor es demasiado bajo.',
  max: 'El valor es demasiado alto.',
  passwordsMatch: 'Las contraseñas no coinciden.',
  strongPassword: 'Debe tener mayúscula, minúscula, número y carácter especial (@$!%*?&._-).',
  onlyLetters: 'Solo se permiten letras, espacios, apóstrofes y guiones.',
  phoneFormat: 'Formato de teléfono no válido.',
  noWhitespace: 'Este campo no puede estar vacío.',
  pattern: 'El formato no es válido.',
};

export function getErrorMessage(
  control: AbstractControl | null,
  customMessages: Record<string, string> = {},
): string | null {
  if (!control || !control.errors || !control.touched) return null;
  const messages = { ...ERROR_MESSAGES, ...customMessages };
  const firstKey = Object.keys(control.errors)[0];

  if (firstKey === 'minlength') {
    const req = (control.errors['minlength'] as { requiredLength: number }).requiredLength;
    return `Mínimo ${req} caracteres.`;
  }
  if (firstKey === 'maxlength') {
    const max = (control.errors['maxlength'] as { requiredLength: number }).requiredLength;
    return `Máximo ${max} caracteres.`;
  }

  return messages[firstKey] ?? `Error: ${firstKey}`;
}
