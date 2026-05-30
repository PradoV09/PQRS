import { Injectable } from '@angular/core';
import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { Observable, of, timer } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class EmailUniqueValidator {
  private readonly apiUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  validate(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      const email = (control.value as string)?.trim();
      if (!email) return of(null);
      return timer(400).pipe(
        switchMap(() =>
          this.http.get<{ disponible: boolean }>(
            `${this.apiUrl}/auth/check-email?email=${encodeURIComponent(email)}`,
          ),
        ),
        map((r) => (r.disponible ? null : { emailTaken: true })),
        catchError(() => of(null)),
      );
    };
  }
}
