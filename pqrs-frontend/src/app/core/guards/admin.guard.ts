import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const toastService = inject(ToastService);
  const router = inject(Router);

  const user = authService.currentUser();

  if (user?.rol === 'admin' || user?.rol === 'supervisor') {
    return true;
  }

  toastService.error('Acceso denegado. Se requiere rol de administrador o supervisor.');
  return router.createUrlTree(['/forbidden']);
};
