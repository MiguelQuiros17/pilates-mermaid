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
  
  // Si la path empieza con /api y tenemos API_BASE_URL, construir URL completa
  // Construir la URL completa
  const baseUrl = API_BASE_URL.replace(/\/$/, '')
  const apiPath = path.startsWith('/') ? path : `/${path}`
  
  return `${baseUrl}${apiPath}`
}



