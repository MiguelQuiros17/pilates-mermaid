/** @type {import('next').NextConfig} */

// Define CSP once so it's easy to tweak later
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https://pilatesmermaid.com https://www.pilatesmermaid.com;
  font-src 'self' data:;
  connect-src 'self' https://pilates-mermaid-production.up.railway.app http://localhost:3001 'self';
  frame-ancestors 'none';
  base-uri 'self';
`.replace(/\s{2,}/g, ' ').trim()

const nextConfig = {
    // ❌ This is deprecated in Next 14 and was causing the "Invalid next.config.js options" warning
    // experimental: {
    //   appDir: true,
    // },

    // Optimización para producción
    output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,

    // Configuración de imágenes
    images: {
        domains:
            process.env.NODE_ENV === 'production'
                ? [
                    'pilatesmermaid.com',
                    'www.pilatesmermaid.com',
                    process.env.NEXT_PUBLIC_IMAGE_DOMAIN || 'pilatesmermaid.com',
                ]
                : ['localhost'],
        formats: ['image/avif', 'image/webp'],
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    },

    // Variables de entorno públicas
    env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '',
    },

    // Rewrites para API (solo en desarrollo)
    async rewrites() {
        if (process.env.NODE_ENV === 'development') {
            return [
                {
                    source: '/api/:path*',
                    destination: 'http://localhost:3001/api/:path*',
                },
            ]
        }

        // En producción, el servidor Express maneja /api/*
        return []
    },

    // Optimizaciones de compilación
    compiler: {
        removeConsole:
            process.env.NODE_ENV === 'production'
                ? {
                    exclude: ['error', 'warn'],
                }
                : false,
    },

    // Headers de seguridad (ahora incluye CSP que permite los scripts de Next)
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'Content-Security-Policy',
                        value: ContentSecurityPolicy,
                    },
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
