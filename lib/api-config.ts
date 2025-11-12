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
  
  // Si la path empieza con /api, retornar directamente (para producción cuando frontend y backend están juntos)
  if (path.startsWith('/api')) {
    return path
  }
  
  // Construir la URL completa
  const baseUrl = API_BASE_URL.replace(/\/$/, '')
  const apiPath = path.startsWith('/') ? path : `/${path}`
  
  return `${baseUrl}${apiPath}`
}



