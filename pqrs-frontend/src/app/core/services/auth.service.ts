import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface User {
  id: string;
  nombre: string;
  email: string;
  rol: 'admin' | 'supervisor' | 'usuario';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  // Access token almacenado SOLO en memoria — nunca en localStorage
  private accessToken: string | null = null;

  // Estado reactivo del usuario actual
  readonly currentUser = signal<User | null>(null);

  setAccessToken(token: string): void { this.accessToken = token; }
  getAccessToken(): string | null     { return this.accessToken; }
  clearAccessToken(): void            { this.accessToken = null; }

  isAuthenticated(): boolean {
    return !!this.accessToken && !!this.currentUser();
  }

  getCurrentUserRole(): 'admin' | 'supervisor' | 'usuario' | null {
    return this.currentUser()?.rol ?? null;
  }

  getCurrentUserId(): string | null {
    return this.currentUser()?.id ?? null;
  }

  checkEmailAvailable(email: string): Observable<boolean> {
    return this.http
      .get<{ disponible: boolean }>(`${this.apiUrl}/auth/check-email?email=${encodeURIComponent(email)}`)
      .pipe(map(r => r.disponible));
  }

  register(payload: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, payload).pipe(
      tap(response => {
        this.setAccessToken(response.accessToken);
        this.currentUser.set(response.user);
      }),
    );
  }

  login(payload: any): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/auth/login`, payload, { withCredentials: true })
      .pipe(
        tap(response => {
          this.setAccessToken(response.accessToken);
          this.currentUser.set(response.user);
        }),
      );
  }

  refreshTokens(): Observable<{ accessToken: string }> {
    return this.http.post<{ accessToken: string }>(
      `${this.apiUrl}/auth/refresh`,
      {},
      { withCredentials: true },
    );
  }

  loadCurrentUser(): Observable<User> {
    return this.http
      .get<User>(`${this.apiUrl}/auth/me`)
      .pipe(tap(user => this.currentUser.set(user)));
  }

  async tryRestoreSession(): Promise<void> {
    try {
      const { accessToken } = await firstValueFrom(this.refreshTokens());
      this.setAccessToken(accessToken);
      await firstValueFrom(this.loadCurrentUser());
    } catch {
      this.clearSession();
    }
  }

  logout(): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(`${this.apiUrl}/auth/logout`, {}, { withCredentials: true })
      .pipe(tap(() => this.clearSession()));
  }

  clearSession(): void {
    this.clearAccessToken();
    this.currentUser.set(null);
  }
}
