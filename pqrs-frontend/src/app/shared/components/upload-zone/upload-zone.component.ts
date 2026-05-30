import { Component, Input, Output, EventEmitter, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ALLOWED_EXTENSIONS_ACCEPT,
  ALLOWED_MIMETYPES_FE,
  MAX_FILE_SIZE_BYTES,
  MAX_FILES_PER_PQRS,
} from '../../../core/constants/file-upload.constants';
import { validarArchivos } from '../../../core/utils/file-validator.util';

interface FilePreview {
  file: File;
  name: string;
  sizeFormatted: string;
  type: 'image' | 'doc' | 'other';
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
  @Input() maxFiles = MAX_FILES_PER_PQRS;
  @Input() maxSizeMB = MAX_FILE_SIZE_BYTES / (1024 * 1024);
  @Input() accept = ALLOWED_EXTENSIONS_ACCEPT;
  @Input() existingCount = 0;
  @Output() filesSelected = new EventEmitter<File[]>();

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  selectedFiles: FilePreview[] = [];
  dragOver = false;
  errors: string[] = [];

  private readonly IMAGE_MIME_TYPES = ['image/jpeg', 'image/png'];

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
    input.value = ''; // reset so same file can be re-selected after removal
  }

  processFiles(incoming: File[]): void {
    this.errors = [];

    const resultado = validarArchivos(incoming, this.existingCount + this.selectedFiles.filter(f => !f.error).length);
    if (!resultado.valido) {
      this.errors = resultado.errores;
      return;
    }

    for (const file of incoming) {
      const preview: FilePreview = {
        file,
        name: file.name,
        sizeFormatted: this.formatFileSize(file.size),
        type: this.getFileType(file),
      };

      if (this.IMAGE_MIME_TYPES.includes(file.type)) {
        preview.previewUrl = URL.createObjectURL(file);
      }

      this.selectedFiles.push(preview);
    }

    this.emitValidFiles();
  }

  removeFile(index: number): void {
    const file = this.selectedFiles[index];
    if (file.previewUrl) {
      URL.revokeObjectURL(file.previewUrl);
    }
    this.selectedFiles.splice(index, 1);
    this.errors = [];
    this.emitValidFiles();
  }

  ngOnDestroy(): void {
    this.selectedFiles.forEach((f) => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    });
  }

  private emitValidFiles(): void {
    this.filesSelected.emit(this.selectedFiles.filter((f) => !f.error).map((f) => f.file));
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  private getFileType(file: File): 'image' | 'doc' | 'other' {
    if (this.IMAGE_MIME_TYPES.includes(file.type)) return 'image';
    if (
      file.type === 'application/pdf' ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
      return 'doc';
    return 'other';
  }

  protected readonly MAX_FILES_PER_PQRS = MAX_FILES_PER_PQRS;
}
