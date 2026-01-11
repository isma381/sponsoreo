/**
 * Helper para manejar tokens CSRF en el cliente
 */

let csrfTokenCache: string | null = null;
let csrfTokenPromise: Promise<string> | null = null;

/**
 * Obtiene un token CSRF del servidor
 * Cachea el token para evitar múltiples requests
 */
export async function getCSRFToken(): Promise<string> {
  // Si ya tenemos el token en cache, retornarlo
  if (csrfTokenCache) {
    return csrfTokenCache;
  }

  // Si ya hay una request en curso, esperar a que termine
  if (csrfTokenPromise) {
    return csrfTokenPromise;
  }

  // Hacer request para obtener token
  csrfTokenPromise = fetch('/api/csrf-token')
    .then(async (res) => {
      if (!res.ok) {
        throw new Error('Error al obtener token CSRF');
      }
      const data = await res.json();
      csrfTokenCache = data.csrfToken;
      return data.csrfToken;
    })
    .finally(() => {
      csrfTokenPromise = null;
    });

  return csrfTokenPromise;
}

/**
 * Limpia el cache del token CSRF (útil después de logout)
 */
export function clearCSRFToken(): void {
  csrfTokenCache = null;
  csrfTokenPromise = null;
}

/**
 * Agrega el header CSRF a un objeto de headers existente
 */
export async function getCSRFHeaders(): Promise<Record<string, string>> {
  const token = await getCSRFToken();
  return {
    'X-CSRF-Token': token,
  };
}
