'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import {
  Menu,
  X,
  Home,
  Users,
  Calendar,
  BarChart3,
  Settings,
  LogOut,
  Bell,
  User,
  Package,
  CreditCard,
  MessageCircle,
  DollarSign
} from 'lucide-react'
import LanguageSelector from './LanguageSelector'

interface DashboardLayoutProps {
  children: React.ReactNode
}

interface User {
  id: string
  nombre: string
  correo: string
  role: 'admin' | 'coach' | 'cliente'
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const verifyAuth = async () => {
      const token = localStorage.getItem('token')
      const userData = localStorage.getItem('user')

      if (!token || !userData) {
        router.push('/login')
        return
      }

      try {
        // Verify token is valid by making a request to the backend
        const response = await fetch('/api/auth/verify', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success && data.user) {
            // Update user data from server (fresh data)
            setUser(data.user)
            localStorage.setItem('user', JSON.stringify(data.user))
          } else {
            // Invalid token, redirect to login
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            router.push('/login')
            return
          }
        } else {
          // Token invalid or expired, redirect to login
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          router.push('/login')
          return
        }
      } catch (error) {
        console.error('Error verifying authentication:', error)
        // On error, try to use cached user data but log the error
        try {
          const parsedUser = JSON.parse(userData)
          setUser(parsedUser)
        } catch (parseError) {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          router.push('/login')
          return
        }
      } finally {
        setIsLoading(false)
      }
    }

    verifyAuth()
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home, roles: ['admin', 'coach', 'cliente'] },
    { name: 'Dashboard Coach', href: '/dashboard/coach', icon: User, roles: ['coach'] },
    { name: 'Clientes', href: '/dashboard/clients', icon: Users, roles: ['admin'] },
    { name: 'Coaches', href: '/dashboard/coaches', icon: User, roles: ['admin'] },
    { name: 'Clases y Calendario', href: '/dashboard/classes', icon: Calendar, roles: ['admin', 'coach', 'cliente'] },
    { name: 'Paquetes', href: '/dashboard/packages', icon: Package, roles: ['admin', 'cliente'] },
    { name: 'Asistencia', href: '/dashboard/attendance', icon: BarChart3, roles: ['admin', 'coach'] },
    { name: 'Pagos', href: '/dashboard/payments', icon: CreditCard, roles: ['admin', 'coach'] },
    { name: 'Reportes', href: '/dashboard/reports', icon: BarChart3, roles: ['admin'] },
    { name: 'Configuración', href: '/dashboard/settings', icon: Settings, roles: ['admin', 'coach', 'cliente'] },
  ]

  const filteredNavigation = navigation.filter(item => 
    user ? item.roles.includes(user.role) : false
  )

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] lg:hidden"
          >
            <div className="absolute inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-[9999] w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out dashboard-sidebar ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{ pointerEvents: 'auto' }}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200" style={{ pointerEvents: 'auto' }}>
          <div className="flex items-center">
            <Image 
              src="/Logo.png" 
              alt="Pilates Mermaid Logo" 
              width={80} 
              height={80}
              className="object-contain"
            />
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setSidebarOpen(false)
            }}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600"
            type="button"
            style={{ pointerEvents: 'auto' }}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="mt-8 px-4 space-y-2" style={{ pointerEvents: 'auto' }}>
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`sidebar-item ${isActive ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  setSidebarOpen(false)
                }}
                style={{ pointerEvents: 'auto', position: 'relative', zIndex: 10002 }}
              >
                <Icon className="h-5 w-5 mr-3" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* User info and logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.nombre}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user.role}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4 mr-3" />
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="bg-white shadow-sm border-b border-gray-200 relative z-[10000] pointer-events-auto">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  console.log('Menu button clicked, sidebarOpen:', sidebarOpen)
                  setSidebarOpen(!sidebarOpen)
                }}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 relative z-[10001] pointer-events-auto cursor-pointer"
                type="button"
                aria-label="Toggle menu"
              >
                <Menu className="h-6 w-6" />
              </button>
              <h1 className="ml-2 text-xl font-semibold text-gray-900 lg:ml-0">
                {filteredNavigation.find(item => item.href === pathname)?.name || 'Dashboard'}
              </h1>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Language Selector */}
              <LanguageSelector />

              {/* WhatsApp Integration Button - Solo para clientes */}
              {user.role === 'cliente' && (
                <button
                  onClick={() => {
                    const message = `Hola, soy ${user.nombre}. Necesito ayuda con mi cuenta.`
                    const url = `https://wa.me/5259581062606?text=${encodeURIComponent(message)}`
                    window.open(url, '_blank')
                  }}
                  className="flex items-center space-x-2 px-2 sm:px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors touch-manipulation min-h-[44px]"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </button>
              )}

              {/* Notifications */}
              <button className="p-2 text-gray-400 hover:text-gray-600 active:text-gray-700 relative touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center">
                <Bell className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
              </button>

              {/* User menu */}
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
                <span className="hidden sm:block text-sm font-medium text-gray-900 truncate max-w-[100px] sm:max-w-none">
                  {user.nombre}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-2 sm:p-4 md:p-6 lg:p-8 -mx-2 sm:mx-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}
