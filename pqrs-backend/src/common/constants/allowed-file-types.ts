export const ALLOWED_MIMETYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

export type AllowedMimetype = (typeof ALLOWED_MIMETYPES)[number];

export const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.docx'];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB por archivo
export const MAX_FILES_PER_PQRS = 5;

export const MIMETYPE_LABELS: Record<string, string> = {
  'application/pdf': 'PDF',
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
};

// Magic numbers (primeros bytes) para validación binaria
export const MAGIC_NUMBERS: Record<string, number[][]> = {
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  'image/jpeg': [[0xff, 0xd8, 0xff]], // ÿØÿ
  'image/png': [[0x89, 0x50, 0x4e, 0x47]], // .PNG
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    [0x50, 0x4b, 0x03, 0x04], // PK ZIP
  ],
};
