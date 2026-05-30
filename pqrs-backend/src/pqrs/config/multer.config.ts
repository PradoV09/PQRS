import { diskStorage } from 'multer';
import { extname, basename } from 'path';
import { UnsupportedMediaTypeException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import { UPLOAD_DEST } from '../../common/constants/upload.constants';
import {
  ALLOWED_MIMETYPES,
  AllowedMimetype,
  MAX_FILE_SIZE_BYTES,
  MAX_FILES_PER_PQRS,
} from '../../common/constants/allowed-file-types';

export const multerOptions = () => ({
  storage: diskStorage({
    destination: (req: any, file: any, cb: any) => {
      const dir = UPLOAD_DEST;
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    },
    filename: (req: any, file: any, cb: any) => {
      const ext = extname(file.originalname).toLowerCase();
      const storedName = `${uuidv4()}${ext}`;
      cb(null, storedName);
    },
  }),

  // CAPA 1 — Filtro de mimetype declarado por el cliente
  fileFilter: (req: any, file: any, cb: any) => {
    if (ALLOWED_MIMETYPES.includes(file.mimetype as AllowedMimetype)) {
      file.originalname = basename(file.originalname);
      cb(null, true);
    } else {
      cb(
        new UnsupportedMediaTypeException(
          `Tipo no permitido: "${file.mimetype}". Solo se aceptan: PDF, JPG, PNG, DOCX.`,
        ),
        false,
      );
    }
  },

  // CAPA 2 — Límites de tamaño y cantidad
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: MAX_FILES_PER_PQRS,
  },
});
