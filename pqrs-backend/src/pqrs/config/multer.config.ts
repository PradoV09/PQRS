import { diskStorage } from 'multer';
import { extname, basename } from 'path';
import { BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import {
  UPLOAD_DEST,
  ALLOWED_MIME_TYPES,
  UPLOAD_MAX_SIZE_BYTES,
  UPLOAD_MAX_FILES,
} from '../../common/constants/upload.constants';

export const multerOptions = () => ({
  storage: diskStorage({
    destination: (req, file, cb) => {
      const dir = UPLOAD_DEST;
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = extname(file.originalname).toLowerCase();
      const storedName = `${uuidv4()}${ext}`;
      cb(null, storedName);
    },
  }),
  fileFilter: (req: any, file: any, cb: any) => {
    // 1. Verificar que el mimetype esté en la allowlist
    const allowedExtensions = ALLOWED_MIME_TYPES[file.mimetype];
    if (!allowedExtensions) {
      return cb(
        new BadRequestException(
          `Tipo de archivo no permitido: ${file.mimetype}`,
        ),
        false,
      );
    }

    // 2. Verificar que la extensión declarada coincida con el mimetype
    const fileExt = extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(fileExt)) {
      return cb(
        new BadRequestException(
          `Extensión '${fileExt}' no corresponde al tipo ${file.mimetype}`,
        ),
        false,
      );
    }

    // 3. Sanitizar: el originalname nunca debe contener rutas
    file.originalname = basename(file.originalname);
    cb(null, true);
  },
  limits: {
    fileSize: UPLOAD_MAX_SIZE_BYTES,
    files: UPLOAD_MAX_FILES,
  },
});
