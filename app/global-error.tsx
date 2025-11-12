'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error boundary captured:', error)
  }, [error])

  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full space-y-4 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Tuvimos un problema</h1>
          <p className="text-gray-600">
            Se produjo un error inesperado al cargar la plataforma. Puedes intentar recargar o volver al inicio.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => reset()}
              className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors"
            >
              Reintentar
            </button>
            <a
              href="/"
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Volver al inicio
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
      </body>
    </html>
  )
}
