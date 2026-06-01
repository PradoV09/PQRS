import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FilesService } from '../../../core/services/files.service';
import { ToastService } from '../../../core/services/toast.service';
import { PqrsAttachment } from '../../../core/models/pqrs.model';
import { AuthImagePipe } from '../../../shared/pipes/auth-image.pipe';

@Component({
  selector: 'app-attachment-gallery',
  standalone: true,
  imports: [CommonModule, AuthImagePipe],
  templateUrl: './attachment-gallery.component.html',
  styleUrl: './attachment-gallery.component.css',
})
export class AttachmentGalleryComponent {
  private readonly filesService = inject(FilesService);
  private readonly toastService = inject(ToastService);

  @Input() attachments: PqrsAttachment[] = [];
  @Input() canDelete = false;
  @Output() deleted = new EventEmitter<string>();

  private readonly IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  private readonly VIDEO_MIME_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];

  get images(): PqrsAttachment[] {
    return this.attachments.filter(a => this.IMAGE_MIME_TYPES.includes(a.mimetype));
  }

  get documents(): PqrsAttachment[] {
    return this.attachments.filter(a =>
      a.mimetype.includes('pdf') ||
      a.mimetype.includes('word') ||
      a.mimetype.includes('document')
    );
  }

  get videos(): PqrsAttachment[] {
    return this.attachments.filter(a => this.VIDEO_MIME_TYPES.includes(a.mimetype));
  }

  getThumbnailUrl(attachment: PqrsAttachment): string {
    if (attachment.thumbPath) {
      return this.filesService.getThumbUrl(attachment.thumbPath.split('/').pop() || '');
    }
    return this.filesService.getFileUrl(attachment.storedName);
  }

  openFile(attachment: PqrsAttachment): void {
    // Usamos HttpClient (con el interceptor JWT) para obtener el blob y abrir en nueva pestaña
    this.filesService.downloadFile(attachment.storedName, attachment.filename, false)
      .catch(() => this.toastService.error('No se pudo abrir el archivo.'));
  }

  downloadFile(attachment: PqrsAttachment): void {
    // Usamos HttpClient (con el interceptor JWT) para descargar el archivo con token
    this.filesService.downloadFile(attachment.storedName, attachment.filename, true)
      .catch(() => this.toastService.error('No se pudo descargar el archivo.'));
  }

  deleteAttachment(attachment: PqrsAttachment): void {
    if (!confirm(`¿Estás seguro de que deseas eliminar "${attachment.filename}"?`)) {
      return;
    }

    this.filesService.deleteAttachment(attachment.id).subscribe({
      next: () => {
        this.deleted.emit(attachment.id);
        this.toastService.success('Archivo eliminado correctamente');
      },
      error: (err) => {
        this.toastService.error(err.error?.message || 'Error al eliminar el archivo');
      },
    });
  }

  getFileTypeIcon(mimetype: string): string {
    if (mimetype.includes('pdf')) return 'pdf';
    if (mimetype.includes('word') || mimetype.includes('document')) return 'word';
    return 'file';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  truncateFilename(filename: string, maxLength = 40): string {
    if (filename.length <= maxLength) return filename;
    return filename.substring(0, maxLength - 3) + '...';
  }
}
