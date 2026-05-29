import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginatedPqrs, Pqrs, PqrsQueryParams, PqrsStatus, PqrsPriority, PqrsRespuesta, PqrsStats, PqrsEvento } from '../models/pqrs.model';

@Injectable({
  providedIn: 'root',
})
export class PqrsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/pqrs`;

  /**
   * Crea una nueva PQRS subiendo archivos mediante FormData.
   * Nota: No establecer manualmente el header 'Content-Type'.
   */
  create(formData: FormData): Observable<Pqrs> {
    return this.http.post<Pqrs>(this.apiUrl, formData);
  }

  /**
   * Obtiene la lista paginada y filtrada de PQRS.
   * Limpia los valores nulos/undefined antes de enviarlos.
   */
  getAll(filters?: PqrsQueryParams): Observable<PaginatedPqrs> {
    let params = new HttpParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<PaginatedPqrs>(this.apiUrl, { params });
  }

  /**
   * Obtiene los detalles de una PQRS por su ID.
   */
  getById(id: string): Observable<Pqrs> {
    return this.http.get<Pqrs>(`${this.apiUrl}/${id}`);
  }

  /**
   * Actualiza el estado de una PQRS (Acción administrativa).
   */
  updateStatus(id: string, estado: PqrsStatus): Observable<Pqrs> {
    return this.http.patch<Pqrs>(`${this.apiUrl}/${id}/status`, { estado });
  }

  /**
   * Actualiza la prioridad de una PQRS (Acción administrativa).
   */
  updatePriority(pqrsId: string, prioridad: PqrsPriority): Observable<Pqrs> {
    return this.http.patch<Pqrs>(`${this.apiUrl}/${pqrsId}/priority`, { prioridad });
  }

  /**
   * Elimina una PQRS del sistema.
   */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Retorna la URL de descarga segura de un adjunto.
   */
  getDownloadUrl(pqrsId: string, attId: string): string {
    return `${this.apiUrl}/${pqrsId}/attachments/${attId}/download`;
  }

  /**
   * Obtiene estadísticas de PQRS (Solo Admin).
   */
  getStats(): Observable<PqrsStats> {
    return this.http.get<PqrsStats>(`${this.apiUrl}/stats`);
  }

  /**
   * Agrega una respuesta al hilo de un PQRS.
   */
  createRespuesta(pqrsId: string, contenido: string): Observable<PqrsRespuesta> {
    return this.http.post<PqrsRespuesta>(`${this.apiUrl}/${pqrsId}/respuestas`, { contenido });
  }

  /**
   * Obtiene el historial de trazabilidad de una PQRS.
   */
  getHistorial(pqrsId: string): Observable<PqrsEvento[]> {
    return this.http.get<PqrsEvento[]>(`${this.apiUrl}/${pqrsId}/historial`);
  }
}
