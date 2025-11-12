'use client'

import { useEffect } from 'react'
import DashboardLayout from '@/components/DashboardLayout'

export default function DashboardError({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard error boundary captured:', error)
  }, [error])

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="max-w-md w-full space-y-4 text-center">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Ocurrió un error</h1>
            <p className="text-gray-600">
              Hubo un problema al cargar esta sección del dashboard. Intenta refrescar la página.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => reset()}
              className="px-6 py-2.5 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors font-medium"
            >
              Reintentar
            </button>
            <a
              href="/dashboard"
              className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              Volver al inicio
            </a>
          </div>
          
          <details className="text-left text-sm text-gray-500 bg-white border border-gray-200 rounded-lg p-4 mt-6">
            <summary className="cursor-pointer select-none font-medium mb-2">
              Detalles técnicos
            </summary>
            <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-gray-500 bg-gray-50 p-3 rounded">
              {error.message}
            </pre>
            {error.digest && (
              <p className="mt-2 text-xs text-gray-400">
                Código de referencia: {error.digest}
              </p>
            )}
          </details>
        </div>
      </div>
    </DashboardLayout>
  )
}

