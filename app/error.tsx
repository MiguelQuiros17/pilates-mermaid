'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Client error boundary captured:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-4 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Ocurrió un error</h1>
        <p className="text-gray-600">
          Hubo un problema al cargar esta sección. Intenta refrescar la página o vuelve al inicio.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors"
          >
            Reintentar
          </button>
          <a
            href="/dashboard"
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Ir al dashboard
          </a>
        </div>
        <details className="text-left text-sm text-gray-500 bg-white border border-gray-200 rounded-lg p-4">
          <summary className="cursor-pointer select-none">Detalles técnicos</summary>
          <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-gray-500">
            {error.message}
          </pre>
          {error.digest && (
            <p className="mt-2 text-xs text-gray-400">Código de referencia: {error.digest}</p>
          )}
        </details>
      </div>
    </div>
  )
}
