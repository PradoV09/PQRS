import {
  ALLOWED_MIMETYPES_FE,
  MAX_FILE_SIZE_BYTES,
  MAX_FILES_PER_PQRS,
} from '../constants/file-upload.constants';

export interface FileValidationResult {
  valido: boolean;
  errores: string[];
}

export function validarArchivos(
  files: File[],
  yaExistentes = 0,
): FileValidationResult {
  const errores: string[] = [];

  if (yaExistentes + files.length > MAX_FILES_PER_PQRS) {
    errores.push(
      `Solo se permiten ${MAX_FILES_PER_PQRS} adjuntos por PQRS. ` +
        `Ya tienes ${yaExistentes}.`,
    );
    return { valido: false, errores };
  }

  for (const file of files) {
    const mimeOk = (ALLOWED_MIMETYPES_FE as readonly string[]).includes(file.type);
    if (!mimeOk) {
      errores.push(
        `"${file.name}": tipo no permitido (${file.type || 'desconocido'}). ` +
          `Solo PDF, JPG, PNG, DOCX.`,
      );
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['pdf', 'jpg', 'jpeg', 'png', 'docx'].includes(ext)) {
      errores.push(`"${file.name}": extensión .${ext} no permitida.`);
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      errores.push(`"${file.name}": pesa ${mb} MB. El límite es 10 MB.`);
    }
  }

  return { valido: errores.length === 0, errores };
}
