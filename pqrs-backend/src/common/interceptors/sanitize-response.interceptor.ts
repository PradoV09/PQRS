import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class SanitizeResponseInterceptor<T> implements NestInterceptor<T, unknown> {

  private readonly FIELDS_TO_REMOVE = [
    'passwordHash',
    'refreshTokenHash',
    'failedLoginAttempts',
    'lockedUntil',
  ];

  intercept(_: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map(data => this.sanitize(data)),
    );
  }

  private sanitize(data: unknown): unknown {
    if (Array.isArray(data)) return data.map(i => this.sanitize(i));
    if (data instanceof Date) return data;
    if (data && typeof data === 'object') {
      const cleaned = { ...(data as Record<string, unknown>) };
      this.FIELDS_TO_REMOVE.forEach(f => delete cleaned[f]);
      Object.keys(cleaned).forEach(k => {
        cleaned[k] = this.sanitize(cleaned[k]);
      });
      return cleaned;
    }
    return data;
  }
}
