'use client'

import { useState, useEffect, useCallback } from 'react'
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

interface Notification {
  id: string
  user_id: string
  type: string
  subject: string
  sent_at: string
  status: string
  error_message?: string
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [hasViewedNotifications, setHasViewedNotifications] = useState(false)
  const [userBookings, setUserBookings] = useState<any[]>([])

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
        // Build full URL to avoid proxy issues in production
        const verifyUrl = API_BASE_URL
          ? `${API_BASE_URL.replace(/\/$/, '')}/api/auth/verify`
          : '/api/auth/verify'

        // Verify token is valid by making a request to the backend
        const response = await fetch(verifyUrl, {
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
  }, [router, API_BASE_URL])

  const loadNotifications = useCallback(async () => {
    if (!user?.id) return
    
    setNotificationsLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      // Load notifications and bookings in parallel
      const [notificationsRes, bookingsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/users/${user.id}/notifications`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch(`${API_BASE_URL}/api/users/${user.id}/bookings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      ])

      if (notificationsRes.ok) {
        const data = await notificationsRes.json()
        if (data.success) {
          setNotifications(data.notifications || [])
        }
      }

      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json()
        if (bookingsData.success) {
          setUserBookings(bookingsData.bookings || [])
        }
      }
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setNotificationsLoading(false)
    }
  }, [user?.id, API_BASE_URL])

  // Load notifications when user is available
  useEffect(() => {
    if (user?.id) {
      loadNotifications()
    }
  }, [user?.id, loadNotifications])

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (notificationsOpen && !target.closest('.notification-dropdown-container')) {
        setNotificationsOpen(false)
      }
    }

    if (notificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [notificationsOpen])

  const getNotificationTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'birthday': 'Cumpleaños',
      'expiration': 'Vencimiento de paquete',
      'class_confirmation': 'Confirmación de clase',
      'class_reminder': 'Recordatorio de clase',
      'payment_received': 'Pago recibido',
      'package_assigned': 'Paquete asignado'
    }
    return labels[type] || type
  }

  const formatTime12Hour = (time24: string) => {
    if (!time24) return ''
    const [hour, minute] = time24.split(':').map(Number)
    if (isNaN(hour)) return time24
    const period = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    return `${hour12}:${String(minute || 0).padStart(2, '0')} ${period}`
  }

  const replaceTemplateVariables = (text: string, occurrenceDate: Date, classData: any): string => {
    if (!text) return text
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayName = dayNames[occurrenceDate.getDay()]
    
    const month = String(occurrenceDate.getMonth() + 1).padStart(2, '0')
    const day = String(occurrenceDate.getDate()).padStart(2, '0')
    const year = String(occurrenceDate.getFullYear()).slice(-2)
    const fullDate = `${month}/${day}/${year}`
    const shortDate = `${month}/${day}`
    
    const startTime24 = classData.class_time || classData.time || ''
    const endTime24 = classData.end_time || ''
    const startTime12 = formatTime12Hour(startTime24)
    const endTime12 = formatTime12Hour(endTime24)
    const duration = classData.duration || 0
    
    return text
      .replace(/{day}/g, dayName)
      .replace(/{start_time}/g, startTime12)
      .replace(/{end_time}/g, endTime12)
      .replace(/{duration}/g, String(duration))
      .replace(/{date}/g, fullDate)
      .replace(/{short_date}/g, shortDate)
  }

  const processNotificationSubject = (notification: Notification): string => {
    // Only process class-related notifications
    if (notification.type !== 'class_confirmation' && notification.type !== 'class_reminder') {
      return notification.subject
    }

    // Extract class title from notification subject (format: "Confirmación de clase: {title}" or "Recordatorio de clase: {title}")
    const titleMatch = notification.subject.match(/Confirmación de clase: (.+)|Recordatorio de clase: (.+)/)
    if (!titleMatch) {
      return notification.subject
    }

    const classTitle = titleMatch[1] || titleMatch[2] || ''
    
    // If the title doesn't contain template variables, return as-is
    if (!classTitle.includes('{')) {
      return notification.subject
    }

    // Try to find a matching booking
    // First, try bookings created around the notification time
    const notificationDate = new Date(notification.sent_at)
    let matchingBooking = userBookings.find(booking => {
      const bookingDate = new Date(booking.created_at || booking.booking_date || 0)
      // Check if booking was created within 1 hour of notification
      return Math.abs(bookingDate.getTime() - notificationDate.getTime()) < 3600000
    })

    // If no match by time, try to find any upcoming booking (for reminders)
    if (!matchingBooking && notification.type === 'class_reminder') {
      const now = new Date()
      matchingBooking = userBookings.find(booking => {
        const bookingDate = new Date(booking.occurrence_date || booking.class_date || booking.date)
        return bookingDate >= now && booking.status === 'confirmed'
      })
    }

    // If still no match, use the most recent booking
    if (!matchingBooking && userBookings.length > 0) {
      matchingBooking = userBookings
        .filter(b => b.status === 'confirmed')
        .sort((a, b) => {
          const dateA = new Date(a.created_at || a.booking_date || 0)
          const dateB = new Date(b.created_at || b.booking_date || 0)
          return dateB.getTime() - dateA.getTime()
        })[0]
    }

    if (matchingBooking) {
      const bookingDate = new Date(matchingBooking.occurrence_date || matchingBooking.class_date || matchingBooking.date)
      bookingDate.setHours(0, 0, 0, 0)
      
      const classData = {
        class_time: matchingBooking.class_time || matchingBooking.time,
        end_time: matchingBooking.end_time,
        duration: matchingBooking.duration || 60
      }
      
      const processedTitle = replaceTemplateVariables(classTitle, bookingDate, classData)
      return notification.subject.replace(classTitle, processedTitle)
    }

    return notification.subject
  }

  const formatNotificationDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Hace un momento'
    if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
  }

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
    { name: 'Asignación de Roles', href: '/dashboard/role-assignments', icon: Settings, roles: ['admin'] },
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
              <div className="relative notification-dropdown-container">
                <button 
                  onClick={() => {
                    const opening = !notificationsOpen
                    setNotificationsOpen(opening)
                    if (opening) {
                      // Mark as viewed when opening
                      setHasViewedNotifications(true)
                      if (notifications.length === 0) {
                      loadNotifications()
                      }
                    }
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 active:text-gray-700 relative touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <Bell className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>

                {/* Notifications Dropdown */}
                <AnimatePresence>
                  {notificationsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-[10001] max-h-[500px] overflow-hidden flex flex-col"
                    >
                        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-gray-900">Notificaciones</h3>
                          <button
                            onClick={() => setNotificationsOpen(false)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                        
                        <div className="overflow-y-auto flex-1">
                          {notificationsLoading ? (
                            <div className="p-8 text-center">
                              <div className="spinner mx-auto"></div>
                              <p className="text-sm text-gray-500 mt-2">Cargando notificaciones...</p>
                            </div>
                          ) : notifications.length === 0 ? (
                            <div className="p-8 text-center">
                              <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                              <p className="text-sm text-gray-500">No hay notificaciones</p>
                            </div>
                          ) : (
                            <div className="divide-y divide-gray-100">
                              {notifications.map((notification) => (
                                <div
                                  key={notification.id}
                                  className="p-4 hover:bg-gray-50 transition-colors"
                                >
                                  <div className="flex items-start space-x-3">
                                    <div className={`flex-shrink-0 h-2 w-2 rounded-full mt-2 ${
                                      notification.status === 'sent' ? 'bg-green-500' : 'bg-red-500'
                                    }`}></div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900">
                                        {getNotificationTypeLabel(notification.type)}
                                      </p>
                                      <p className="text-sm text-gray-600 mt-1">
                                        {processNotificationSubject(notification)}
                                      </p>
                                      <p className="text-xs text-gray-400 mt-2">
                                        {formatNotificationDate(notification.sent_at)}
                                      </p>
                                      {notification.error_message && (
                                        <p className="text-xs text-red-600 mt-1">
                                          Error: {notification.error_message}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                  )}
                </AnimatePresence>
              </div>

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
