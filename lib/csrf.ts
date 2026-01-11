import { cookies } from 'next/headers';
import { randomBytes, createHmac } from 'crypto';

const CSRF_SECRET = process.env.CSRF_SECRET || process.env.JWT_SECRET || 'cambiar-en-produccion';
const CSRF_COOKIE_NAME = 'csrf-token';

/**
 * Genera un token CSRF aleatorio
 */
export function generateCSRFToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Crea un hash HMAC del token para validación
 */
function createCSRFHash(token: string): string {
  return createHmac('sha256', CSRF_SECRET).update(token).digest('hex');
}

/**
 * Genera y guarda un token CSRF en cookie httpOnly
 * Retorna el token para enviarlo al cliente
 */
export async function setCSRFToken(): Promise<string> {
  const token = generateCSRFToken();
  const hash = createCSRFHash(token);
  
  const cookieStore = await cookies();
  cookieStore.set(CSRF_COOKIE_NAME, hash, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24 horas
    path: '/',
  });
  
  return token;
}

/**
 * Valida un token CSRF recibido en el header contra el hash en la cookie
 * En desarrollo, permite requests sin token (para facilitar desarrollo)
 * En producción, requiere token válido
 */
export async function validateCSRFToken(token: string | null | undefined): Promise<boolean> {
  // En desarrollo, permitir requests sin CSRF para facilitar desarrollo
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }
  
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  const cookieStore = await cookies();
  const cookieHash = cookieStore.get(CSRF_COOKIE_NAME)?.value;
  
  if (!cookieHash) {
    return false;
  }
  
  const expectedHash = createCSRFHash(token);
  return cookieHash === expectedHash;
}

/**
 * Obtiene el token CSRF actual (si existe)
 */
export async function getCSRFToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookieHash = cookieStore.get(CSRF_COOKIE_NAME)?.value;
  
  if (!cookieHash) {
    return null;
  }
  
  // No podemos obtener el token original desde el hash, solo validarlo
  // El cliente debe enviar el token en el header
  return null;
}
