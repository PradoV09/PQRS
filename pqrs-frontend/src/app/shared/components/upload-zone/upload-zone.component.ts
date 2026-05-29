import { Component, Input, Output, EventEmitter, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';

interface FilePreview {
  file: File;
  name: string;
  sizeFormatted: string;
  type: 'image' | 'video' | 'doc' | 'other';
  previewUrl?: string;
  error?: string;
}

@Component({
  selector: 'app-upload-zone',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upload-zone.component.html',
  styleUrl: './upload-zone.component.css',
})
export class UploadZoneComponent implements OnDestroy {
  @Input() maxFiles = 5;
  @Input() maxSizeMB = 10;
  @Input() accept = 'image/*,video/mp4,video/quicktime,.pdf,.doc,.docx';
  @Output() filesSelected = new EventEmitter<File[]>();

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  selectedFiles: FilePreview[] = [];
  dragOver = false;
  errors: string[] = [];

  private readonly ALLOWED_MIME_TYPES: Record<string, string[]> = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp'],
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'video/mp4': ['.mp4'],
    'video/quicktime': ['.mov'],
    'video/x-msvideo': ['.avi'],
  };

  private readonly IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  private readonly VIDEO_MIME_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = true;
  }

  onDragLeave(): void {
    this.dragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;
    if (event.dataTransfer?.files) {
      this.processFiles(Array.from(event.dataTransfer.files));
    }
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.processFiles(Array.from(input.files ?? []));
  }

  processFiles(incoming: File[]): void {
    this.errors = [];
    const maxSizeBytes = this.maxSizeMB * 1024 * 1024;

    for (const file of incoming) {
      const preview: FilePreview = {
        file,
        name: file.name,
        sizeFormatted: this.formatFileSize(file.size),
        type: this.getFileType(file),
      };

      // Validate size
      if (file.size > maxSizeBytes) {
        preview.error = `El archivo supera el límite de ${this.maxSizeMB} MB`;
        this.errors.push(`"${file.name}" supera el límite de ${this.maxSizeMB} MB`);
      }

      // Validate type
      const allowedExtensions = this.ALLOWED_MIME_TYPES[file.type];
      if (!allowedExtensions) {
        preview.error = 'Tipo de archivo no permitido';
        this.errors.push(`"${file.name}" tiene un tipo no permitido`);
      }

      // Generate preview for images
      if (this.IMAGE_MIME_TYPES.includes(file.type) && !preview.error) {
        preview.previewUrl = URL.createObjectURL(file);
      }

      this.selectedFiles.push(preview);
    }

    // Check total count
    if (this.selectedFiles.length > this.maxFiles) {
      this.errors.push(`Máximo ${this.maxFiles} archivos permitidos`);
      this.selectedFiles = this.selectedFiles.slice(0, this.maxFiles);
    }

    // Emit valid files
    this.filesSelected.emit(
      this.selectedFiles.filter((f) => !f.error).map((f) => f.file),
    );
  }

  removeFile(index: number): void {
    const file = this.selectedFiles[index];
    if (file.previewUrl) {
      URL.revokeObjectURL(file.previewUrl);
    }
    this.selectedFiles.splice(index, 1);
    this.filesSelected.emit(
      this.selectedFiles.filter((f) => !f.error).map((f) => f.file),
    );
  }

  ngOnDestroy(): void {
    this.selectedFiles.forEach((file) => {
      if (file.previewUrl) {
        URL.revokeObjectURL(file.previewUrl);
      }
    });
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  private getFileType(file: File): 'image' | 'video' | 'doc' | 'other' {
    if (this.IMAGE_MIME_TYPES.includes(file.type)) return 'image';
    if (this.VIDEO_MIME_TYPES.includes(file.type)) return 'video';
    if (file.type.includes('pdf') || file.type.includes('word') || file.type.includes('document')) return 'doc';
    return 'other';
  }
}
