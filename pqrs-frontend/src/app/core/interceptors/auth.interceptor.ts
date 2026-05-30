import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toastService = inject(ToastService);

  // Detecta si es una petición al API (absoluta o relativa)
  const isApiUrl = req.url.startsWith(environment.apiUrl) || req.url.startsWith('/api') || !req.url.startsWith('http');
  const token = authService.getAccessToken();

  const authReq = (token && isApiUrl)
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }

      // 401 en cualquier endpoint que no sea /auth/refresh → intentar renovar token
      if (error.status === 401 && !req.url.includes('/auth/refresh')) {
        return authService.refreshTokens().pipe(
          switchMap(({ accessToken }) => {
            authService.setAccessToken(accessToken);
            const retryReq = req.clone({
              setHeaders: { Authorization: `Bearer ${accessToken}` },
            });
            return next(retryReq);
          }),
          catchError((refreshError) => {
            authService.clearSession();
            router.navigate(['/login'], { queryParams: { expired: true } });
            return throwError(() => refreshError);
          }),
        );
      }

      // 403 — sin permisos
      if (error.status === 403) {
        toastService.warning('Acceso denegado', 'No tienes permisos para realizar esta acción.');
      }

      // Error en subida de archivos
      if (error.status === 400 && req.url.includes('/files')) {
        const msg = error.error?.message;
        toastService.error(Array.isArray(msg) ? msg[0] : (msg || 'Error al subir el archivo'));
      }

      if (error.status === 413) {
        toastService.error('El archivo supera el límite de tamaño permitido (10 MB)');
      }

      // 500+ — error de servidor
      if (error.status >= 500) {
        toastService.error(
          'Error en el servidor',
          'Ocurrió un problema inesperado. Nuestro equipo fue notificado. Intenta de nuevo en unos minutos.'
        );
      }

      return throwError(() => error);
    }),
  );
};
