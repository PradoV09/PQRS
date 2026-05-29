import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class FilesService {
  constructor(private readonly http: HttpClient) {}

  getFileUrl(storedName: string, download = false): string {
    return `${environment.apiUrl}/files/${storedName}?download=${download}`;
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
