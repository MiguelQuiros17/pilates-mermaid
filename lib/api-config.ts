/**
 * Configuración de la API
 * Usa variables de entorno para determinar la URL base de la API
 */

export const API_BASE_URL = 
  process.env.NEXT_PUBLIC_API_URL || 
  (typeof window !== 'undefined' 
    ? window.location.origin 
    : process.env.NODE_ENV === 'production'
      ? 'https://api.pilatesmermaid.com'
      : 'http://localhost:3001')

export const getApiUrl = (path: string) => {
  // Si la path ya es una URL completa, retornarla
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  
  // Si API_BASE_URL está vacío, usar URL relativa (mismo origen)
  // Esto es importante cuando Express sirve tanto el frontend como el API en el mismo puerto
  if (!API_BASE_URL || API_BASE_URL.trim() === '') {
    // Asegurar que la path empiece con /
    return path.startsWith('/') ? path : `/${path}`
  }
  
  // Normalizar la path para que siempre empiece con /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  
  // Normalizar el base URL (remover trailing slash)
  let baseUrl = API_BASE_URL.replace(/\/$/, '')
  
  // Si el baseUrl ya termina con /api, no agregar /api de nuevo
  // Si la path empieza con /api y el baseUrl ya tiene /api, remover /api de la path
  if (baseUrl.endsWith('/api') && normalizedPath.startsWith('/api')) {
    // El baseUrl ya incluye /api, usar la path sin /api
    return `${baseUrl}${normalizedPath.substring(4)}` // Remove '/api' from path
  }
  
  // Si el baseUrl no termina con /api pero la path empieza con /api, construir normalmente
  // Si el baseUrl termina con /api pero la path no empieza con /api, agregar normalmente
  return `${baseUrl}${normalizedPath}`
}



