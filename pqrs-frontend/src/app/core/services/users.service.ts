import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/users`;

  getAll(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl);
  }

  getById(id: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`);
  }

  toggleStatus(id: string): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/${id}/status`, {});
  }

  create(nombre: string, email: string, password: string, rol: string): Observable<User> {
    return this.http.post<User>(this.apiUrl, { nombre, email, password, rol });
  }

  update(id: string, data: { nombre?: string; rol?: string }): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
