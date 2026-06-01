import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class FilesService {
  constructor(private readonly http: HttpClient) { }

  getFileUrl(storedName: string, download = false): string {
    return `${environment.apiUrl}/files/${storedName}?download=${download}`;
  }

  async downloadFile(storedName: string, originalName: string, asDownload = true): Promise<void> {
    // El parámetro download=true indica al backend que debe enviar el header Content-Disposition: attachment
    const url = this.getFileUrl(storedName, asDownload);

    try {
      // Pedimos el archivo como 'blob' (binario). El interceptor añadirá el token JWT aquí.
      const blob = await firstValueFrom(
        this.http.get(url, { responseType: 'blob' })
      );

      // Creamos una URL temporal para el contenido binario
      const urlBlob = window.URL.createObjectURL(blob);

      if (asDownload) {
        // Forzar descarga al sistema de archivos
        const link = document.createElement('a');
        link.href = urlBlob;
        link.download = originalName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Abrir en una nueva pestaña del navegador
        window.open(urlBlob, '_blank');
      }

      // Liberamos la memoria del navegador
      window.URL.revokeObjectURL(urlBlob);
    } catch (error) {
      console.error('Error al procesar el archivo:', error);
      throw error; // Permitimos que el componente maneje el error
    }
  }

  getThumbUrl(thumbName: string): string {
    return `${environment.apiUrl}/files/thumb/${thumbName}`;
  }

  deleteAttachment(attachmentId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/files/${attachmentId}`);
  }

  uploadAdditional(pqrsId: string, files: File[]): Observable<any> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return this.http.post(`${environment.apiUrl}/pqrs/${pqrsId}/attachments`, formData);
  }
}
