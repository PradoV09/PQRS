import { Injectable, PipeTransform, UnsupportedMediaTypeException } from '@nestjs/common';
import * as fs from 'fs';
import { MAGIC_NUMBERS } from '../../common/constants/allowed-file-types';

@Injectable()
export class FileTypeValidationPipe implements PipeTransform {
  transform(
    files: Express.Multer.File | Express.Multer.File[] | undefined,
  ): Express.Multer.File[] {
    if (!files) return [];

    const fileArray = Array.isArray(files) ? files : [files];
    if (fileArray.length === 0) return [];

    for (const file of fileArray) {
      const firmas = MAGIC_NUMBERS[file.mimetype];

      if (!firmas) {
        this.cleanupAndThrow(fileArray, file.originalname, file.mimetype);
      }

      // CAPA 3 — Leer los primeros 4 bytes del archivo guardado en disco
      let buffer: Buffer;
      try {
        const fd = fs.openSync(file.path, 'r');
        buffer = Buffer.alloc(4);
        fs.readSync(fd, buffer, 0, 4, 0);
        fs.closeSync(fd);
      } catch {
        this.cleanupAndThrow(fileArray, file.originalname, file.mimetype);
        return []; // unreachable, satisfies TS
      }

      const esValido = firmas!.some((firma) =>
        firma.every((byte, i) => buffer[i] === byte),
      );

      if (!esValido) {
        // Limpiar todos los archivos ya guardados
        for (const f of fileArray) {
          try { fs.unlinkSync(f.path); } catch {}
        }
        throw new UnsupportedMediaTypeException(
          `El archivo "${file.originalname}" no corresponde al tipo declarado ` +
            `(${file.mimetype}). Posible archivo falsificado.`,
        );
      }
    }

    return fileArray;
  }

  private cleanupAndThrow(
    files: Express.Multer.File[],
    name: string,
    mimetype: string,
  ): never {
    for (const f of files) {
      try { fs.unlinkSync(f.path); } catch {}
    }
    throw new UnsupportedMediaTypeException(
      `Tipo de archivo no permitido: "${mimetype}" (archivo: "${name}").`,
    );
  }
}
