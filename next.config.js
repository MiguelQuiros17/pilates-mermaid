/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  // Optimización para producción
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  // Configuración de imágenes
  images: {
    domains: process.env.NODE_ENV === 'production' 
      ? ['pilatesmermaid.com', 'www.pilatesmermaid.com', process.env.NEXT_PUBLIC_IMAGE_DOMAIN || 'pilatesmermaid.com']
      : ['localhost'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Variables de entorno públicas
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || process.env.NODE_ENV === 'production'
      ? 'https://api.pilatesmermaid.com'
      : 'http://localhost:3001',
  },
  // Rewrites para API
  async rewrites() {
    // En producción, si NEXT_PUBLIC_API_URL no está configurado, usar rutas relativas
    // Esto permite que el frontend y backend estén en el mismo servidor
    if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_API_URL) {
      // Si no hay NEXT_PUBLIC_API_URL, asumimos que el backend está en el mismo servidor
      // y Next.js servirá las rutas estáticas, mientras que el servidor Express manejará /api/*
      return []
    }
    
    // En desarrollo, usar proxy a localhost:3001
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:3001/api/:path*',
        },
      ]
    }
    
    return []
  },
  // Optimizaciones de compilación
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  // Headers de seguridad
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig

