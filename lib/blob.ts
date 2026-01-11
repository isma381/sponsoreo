import { put } from '@vercel/blob';
import { randomUUID } from 'crypto';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_FILE_SIZE_PROFILE = 15 * 1024 * 1024; // 15MB para perfil
export const MAX_FILE_SIZE_TRANSFER = 100 * 1024 * 1024; // 100MB para transferencias

export function validateImageFile(
  file: File, 
  maxSize: number = MAX_FILE_SIZE_TRANSFER
): { valid: boolean; error?: string } {
  // Validar tipo MIME explícito (no usar startsWith)
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { 
      valid: false, 
      error: `Tipo de archivo no permitido. Solo se permiten: ${ALLOWED_MIME_TYPES.join(', ')}` 
    };
  }

  // Validar tamaño
  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: `El archivo excede el tamaño máximo de ${maxSize / (1024 * 1024)}MB` 
    };
  }

  return { valid: true };
}

export async function uploadImage(
  file: File, 
  maxSize: number = MAX_FILE_SIZE_TRANSFER
): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN no está configurado');
  }

  // Validar archivo antes de subir
  const validation = validateImageFile(file, maxSize);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Generar nombre con UUID y extensión basada en MIME
  const extension = file.type === 'image/jpeg' ? 'jpg' : 
                    file.type === 'image/png' ? 'png' : 
                    'webp';
  const fileName = `${randomUUID()}.${extension}`;

  const blob = await put(fileName, file, {
    access: 'public',
    token: process.env.BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: true, // Mantener por seguridad adicional
  });

  return blob.url;
}

