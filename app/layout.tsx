import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Pilates Mermaid - Sistema de Gestión',
  description: 'Sistema de gestión interno del estudio Pilates Mermaid. Administra clientes, coaches, clases y reportes.',
  keywords: 'pilates, gestión, estudio, clases, coaches, clientes',
  authors: [{ name: 'PilatesMermaid Team' }],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className} style={{ margin: 0, padding: 0, minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  )
}
