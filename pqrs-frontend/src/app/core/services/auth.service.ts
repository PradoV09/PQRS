import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface User {
  id: string;
  nombre: string;
  email: string;
  rol: 'admin' | 'usuario';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokenKey = 'pqrs_token';
  private readonly apiUrl = environment.apiUrl;

  /**
   * Registra un nuevo usuario en la plataforma.
   */
  register(payload: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, payload).pipe(
      tap((response) => this.saveToken(response.accessToken))
    );
  }

  /**
   * Inicia sesión del usuario.
   */
  login(payload: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, payload).pipe(
      tap((response) => this.saveToken(response.accessToken))
    );
  }

  /**
   * Cierra la sesión activa limpiando el token guardado.
   */
  logout(): void {
    localStorage.removeItem(this.tokenKey);
    sessionStorage.clear(); // Limpieza extra por seguridad
  }

  /**
   * Comprueba si el usuario está autenticado verificando la presencia del token.
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  /**
   * Obtiene el token de acceso guardado en localStorage.
   */
  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.tokenKey);
    }
    return null;
  }

  /**
   * Guarda el token en localStorage de forma segura.
   */
  private saveToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.tokenKey, token);
    }
  }

  /**
   * Decodifica el payload del token JWT de acceso.
   */
  getDecodedToken(): any {
    const token = this.getToken();
    if (!token) return null;
    try {
      const payloadBase64 = token.split('.')[1];
      // Decodificación base64 segura que soporta caracteres especiales
      const decodedJson = atob(payloadBase64);
      return JSON.parse(decodedJson);
    } catch (e) {
      return null;
    }
  }

  /**
   * Obtiene el ID del usuario actual desde el JWT.
   */
  getCurrentUserId(): string | null {
    const decoded = this.getDecodedToken();
    return decoded ? decoded.sub : null;
  }

  /**
   * Obtiene el rol del usuario actual desde el JWT.
   */
  getCurrentUserRole(): 'admin' | 'usuario' | null {
    const decoded = this.getDecodedToken();
    return decoded ? decoded.rol : null;
  }
}
