import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toastService = inject(ToastService);
  const token = authService.getToken();
  const isApiUrl = req.url.startsWith(environment.apiUrl);

  let clone = req;

  // Inyectar token solo en peticiones dirigidas al API propio si existe
  if (token && isApiUrl) {
    clone = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(clone).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        // Handle 401 Unauthorized
        if (error.status === 401) {
          authService.logout();
          router.navigate(['/login']);
        }

        // Handle upload errors (400 Bad Request with specific messages)
        if (error.status === 400 && req.url.includes('/files')) {
          const errorMessage = error.error?.message || 'Error al subir el archivo';
          if (Array.isArray(errorMessage)) {
            toastService.error(errorMessage[0]);
          } else {
            toastService.error(errorMessage);
          }
        }

        // Handle file size limit errors
        if (error.status === 413) {
          toastService.error('El archivo supera el límite de tamaño permitido (10 MB)');
        }
      }
      return throwError(() => error);
    })
  );
};
