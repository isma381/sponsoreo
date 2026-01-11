/**
 * Funciones de sanitización de inputs del usuario
 * Previene XSS y otros ataques de inyección
 */

/**
 * Sanitiza texto simple (sin HTML permitido)
 * Usado para: mensajes, usernames
 */
export function sanitizeText(text: string | null): string | null {
  if (!text) return null;
  
  // Escapar caracteres HTML peligrosos
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitiza texto que puede contener links (HTML básico permitido)
 * Usado para: descripciones, categorías, ubicaciones
 * Permite links pero elimina scripts y otros elementos peligrosos
 */
export function sanitizeTextWithLinks(text: string | null): string | null {
  if (!text) return null;
  
  // Primero escapar todo HTML
  let sanitized = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
  
  // Luego permitir solo URLs como texto plano (el frontend los convertirá a links)
  // No permitimos HTML en el backend, solo texto plano
  // El frontend ya tiene extractLinks() que convierte URLs a <a> tags de forma segura
  
  return sanitized;
}

/**
 * Sanitiza username (solo alfanuméricos, guiones y guiones bajos)
 * Ya tiene validación regex, pero esto es una capa adicional
 */
export function sanitizeUsername(username: string | null): string | null {
  if (!username) return null;
  
  // Ya validado con regex, solo trim y lowercase
  return username.trim().toLowerCase();
}

/**
 * Valida y sanitiza longitud máxima
 * @throws Error con mensaje descriptivo si excede el máximo
 */
export function validateLength(text: string | null, maxLength: number): string | null {
  if (!text) return null;
  if (text.length > maxLength) {
    throw new Error(`El texto excede el máximo de ${maxLength} caracteres`);
  }
  return text;
}
