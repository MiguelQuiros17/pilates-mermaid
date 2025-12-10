/**
 * Utility function to construct API URLs correctly
 * Handles cases where API_BASE_URL might already include /api
 * Works in both development (Next.js rewrites) and production (Express serves both)
 */

export const getApiUrl = (path: string): string => {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''
  
  // Si la path ya es una URL completa, retornarla
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  
  // En desarrollo, siempre usar URL relativa para que Next.js rewrites funcionen
  // En producción, si API_BASE_URL está vacío, usar URL relativa (Express maneja /api/*)
  const isDevelopment = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  
  if (isDevelopment || !API_BASE_URL || API_BASE_URL.trim() === '') {
    // URL relativa - Next.js rewrite en dev, Express en prod
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
