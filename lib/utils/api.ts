/**
 * Utility function to construct API URLs correctly
 * Handles cases where API_BASE_URL might already include /api
 */

export const getApiUrl = (path: string): string => {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''
  
  // Si la path ya es una URL completa, retornarla
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  
  // Si API_BASE_URL está vacío, usar URL relativa (mismo origen)
  if (!API_BASE_URL || API_BASE_URL.trim() === '') {
    return path.startsWith('/') ? path : `/${path}`
  }
  
  // Normalizar la path
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  let baseUrl = API_BASE_URL.replace(/\/$/, '')
  
  // Si el baseUrl ya termina con /api y la path empieza con /api, remover /api de la path
  if (baseUrl.endsWith('/api') && normalizedPath.startsWith('/api')) {
    return `${baseUrl}${normalizedPath.substring(4)}`
  }
  
  return `${baseUrl}${normalizedPath}`
}

