import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'fileTypeIcon',
  standalone: true,
})
export class FileTypeIconPipe implements PipeTransform {
  transform(mimetype: string): string {
    if (!mimetype) return 'file';

    // Images
    if (mimetype.startsWith('image/')) {
      return 'image';
    }

    // Videos
    if (mimetype.startsWith('video/')) {
      return 'video';
    }

    // PDF
    if (mimetype.includes('pdf')) {
      return 'pdf';
    }

    // Word documents
    if (mimetype.includes('word') || mimetype.includes('document')) {
      return 'word';
    }

    // Excel
    if (mimetype.includes('sheet') || mimetype.includes('excel')) {
      return 'excel';
    }

    // PowerPoint
    if (mimetype.includes('presentation') || mimetype.includes('powerpoint')) {
      return 'powerpoint';
    }

    // Archive
    if (mimetype.includes('zip') || mimetype.includes('rar') || mimetype.includes('tar')) {
      return 'archive';
    }

    // Audio
    if (mimetype.startsWith('audio/')) {
      return 'audio';
    }

    // Code
    if (mimetype.includes('javascript') || mimetype.includes('json') || mimetype.includes('xml')) {
      return 'code';
    }

    // Default
    return 'file';
  }
}
