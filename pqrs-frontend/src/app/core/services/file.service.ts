import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { lastValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FileService {
  private http = inject(HttpClient);

  async downloadAttachment(pqrsId: string, attachmentId: string, originalName: string): Promise<void> {
    const url = `${environment.apiUrl}/pqrs/${pqrsId}/attachments/${attachmentId}/download`;

    try {
      // Solicitamos el archivo como un Blob (Binary Large Object)
      const blob = await lastValueFrom(
        this.http.get(url, { responseType: 'blob' })
      );

      // Creamos un link temporal en memoria para disparar la descarga del navegador
      const urlBlob = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = urlBlob;
      link.download = originalName;
      link.click();

      // Liberamos recursos
      window.URL.revokeObjectURL(urlBlob);
    } catch (error) {
      console.error('Error al descargar el archivo:', error);
      throw error;
    }
  }
}
