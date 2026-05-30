import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.currentUser();

  if (!user) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url },
    });
  }

  // Verificar rol si la ruta lo especifica en data.roles
  const rolesRequeridos = route.data?.['roles'] as string[] | undefined;
  if (rolesRequeridos && !rolesRequeridos.includes(user.rol)) {
    return router.createUrlTree(['/forbidden']);
  }

  return true;
};
