import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const toastService = inject(ToastService);
  const router = inject(Router);

  if (authService.isAuthenticated() && authService.getCurrentUserRole() === 'admin') {
    return true;
  }

  // Redirigir y notificar
  toastService.error('Acceso denegado. Se requiere rol de administrador.');
  router.navigate(['/pqrs']);
  return false;
};
