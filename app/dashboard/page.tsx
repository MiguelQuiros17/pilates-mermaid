'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  Cake,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowRight,
  Package,
  User,
  Sparkles,
  CalendarDays,
  AlertTriangle,
  ChevronRight,
  MapPin
} from 'lucide-react'
import DashboardLayout from '@/components/DashboardLayout'
import Link from 'next/link'

interface DashboardStats {
  totalClients: number
  totalCoaches: number
  totalClasses: number
  totalRevenue: number
  upcomingBirthdays: any[]
  recentActivity: any[]
  pendingPayments?: any[]
}

interface User {
  id: string
  nombre: string
  correo: string
  role: 'admin' | 'coach' | 'cliente'
}

export default function DashboardPage() {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [userClasses, setUserClasses] = useState<any[]>([])
  const [userBookings, setUserBookings] = useState<any[]>([])
  const [userStats, setUserStats] = useState<any>(null)
  const [packageHistory, setPackageHistory] = useState<any[]>([])
  const [activeGroupPackage, setActiveGroupPackage] = useState<any>(null)
  const [activePrivatePackage, setActivePrivatePackage] = useState<any>(null)
  const [classCounts, setClassCounts] = useState<{private: number, group: number}>({private: 0, group: 0})

  useEffect(() => {
    const userData = localStorage.getItem('user')

    if (!userData) {
      window.location.href = '/login'
      return
    }

    const parsedUser = JSON.parse(userData)
    setUser(parsedUser)
    
    if (parsedUser?.role === 'cliente') {
      loadClientData(parsedUser.id)
    }

    if (parsedUser?.role === 'admin') {
      loadDashboardStats()
    } else {
      setIsLoading(false)
    }
  }, [])

  const loadDashboardStats = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('token')
      if (!token) {
        setError('No se encontró el token de autenticación')
        setIsLoading(false)
        return
      }

      const response = await fetch('/api/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setStats(data.stats)
        } else {
          setError(data.message || 'Error al cargar las estadísticas')
        }
      } else {
        setError('Error al cargar las estadísticas del dashboard')
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error)
      setError('Error al conectar con el servidor')
    } finally {
      setIsLoading(false)
    }
  }

  const loadClientData = async (userId: string) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      // Load all client data in parallel
      const [classesRes, bookingsRes, packageRes, countsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/users/${userId}/classes`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/api/users/${userId}/bookings`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/api/users/${userId}/package-history`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/api/users/${userId}/class-counts`, {
          headers: { 'Authorization': `Bearer ${token}` }
      })
      ])

      if (classesRes.ok) {
        const data = await classesRes.json()
        setUserClasses(data.classes || [])
      }

      if (bookingsRes.ok) {
        const data = await bookingsRes.json()
        setUserBookings(data.bookings || [])
        setUserStats(data.availableClasses)
      }

      if (packageRes.ok) {
        const data = await packageRes.json()
        setPackageHistory(data.packageHistory || [])
        setActiveGroupPackage(data.activeGroupPackage)
        setActivePrivatePackage(data.activePrivatePackage)
      }

      if (countsRes.ok) {
        const data = await countsRes.json()
        setClassCounts({
          private: data.private_classes_remaining || 0,
          group: data.group_classes_remaining || 0
        })
      }
    } catch (error) {
      console.error('Error loading client data:', error)
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Buenos días'
    if (hour < 18) return 'Buenas tardes'
    return 'Buenas noches'
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador'
      case 'coach': return 'Coach'
      case 'cliente': return 'Cliente'
      default: return role
    }
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

  // Get next upcoming class for client
  const nextClass = useMemo(() => {
    if (!userBookings || userBookings.length === 0) return null
    
    const now = new Date()
    const upcoming = userBookings
      .filter(b => {
        if (b.status === 'cancelled') return false
        const bookingDate = new Date(b.occurrence_date || b.class_date || b.date)
        return bookingDate >= new Date(now.toDateString())
      })
      .sort((a, b) => {
        const dateA = new Date(a.occurrence_date || a.class_date || a.date)
        const dateB = new Date(b.occurrence_date || b.class_date || b.date)
        return dateA.getTime() - dateB.getTime()
      })
    
    return upcoming[0] || null
  }, [userBookings])

  // Calculate package status for notifications
  const packageStatus = useMemo(() => {
    const groupExpired = !activeGroupPackage && packageHistory.some(p => p.package_category === 'Grupal')
    const privateExpired = !activePrivatePackage && packageHistory.some(p => p.package_category === 'Privada')
    const noPackages = !activeGroupPackage && !activePrivatePackage && packageHistory.length === 0
    const lowGroupMonths = activeGroupPackage?.renewal_months === 1
    const lowPrivateMonths = activePrivatePackage?.renewal_months === 1
    const outOfGroupClasses = classCounts.group === 0 && activeGroupPackage
    const outOfPrivateClasses = classCounts.private === 0 && activePrivatePackage
    
    return {
      groupExpired,
      privateExpired,
      noPackages,
      lowGroupMonths,
      lowPrivateMonths,
      outOfGroupClasses,
      outOfPrivateClasses,
      hasWarning: groupExpired || privateExpired || noPackages || lowGroupMonths || lowPrivateMonths || outOfGroupClasses || outOfPrivateClasses
    }
  }, [activeGroupPackage, activePrivatePackage, packageHistory, classCounts])

  const getQuickActions = () => {
    if (!user) return []

    switch (user.role) {
      case 'admin':
        return [
          { name: 'Ver Clientes', href: '/dashboard/clients', icon: Users, color: 'bg-blue-500' },
          { name: 'Programar Clase', href: '/dashboard/classes', icon: Calendar, color: 'bg-green-500' },
          { name: 'Ver Reportes', href: '/dashboard/reports', icon: TrendingUp, color: 'bg-purple-500' },
          { name: 'Gestionar Paquetes', href: '/dashboard/packages', icon: DollarSign, color: 'bg-yellow-500' }
        ]
      case 'coach':
        return [
          { name: 'Mis Clases', href: '/dashboard/classes', icon: Calendar, color: 'bg-blue-500' },
          { name: 'Tomar Asistencia', href: '/dashboard/attendance', icon: CheckCircle, color: 'bg-green-500' },
          { name: 'Ver Pagos', href: '/dashboard/payments', icon: DollarSign, color: 'bg-yellow-500' }
        ]
      default:
        return []
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="spinner"></div>
        </div>
      </DashboardLayout>
    )
  }

  // Client Dashboard
  if (user?.role === 'cliente') {
    return (
      <DashboardLayout>
        <div className="space-y-6 max-w-5xl mx-auto">
          {/* Welcome Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-6"
          >
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {getGreeting()}, {user?.nombre?.split(' ')[0]} ✨
            </h1>
            <p className="text-gray-500">
              {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </motion.div>

          {/* Warning Banner */}
          {packageStatus.hasWarning && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  {packageStatus.noPackages && (
                    <p className="text-amber-800">
                      <span className="font-semibold">¡Bienvenido!</span> Aún no tienes un paquete de clases. 
                      <Link href="/dashboard/packages" className="ml-1 underline font-medium">Ver paquetes disponibles →</Link>
                    </p>
                  )}
                  {(packageStatus.groupExpired || packageStatus.privateExpired) && (
                    <p className="text-amber-800">
                      <span className="font-semibold">Paquete agotado.</span> Contacta a un instructor para renovar tu membresía.
                    </p>
                  )}
                  {(packageStatus.lowGroupMonths || packageStatus.lowPrivateMonths) && !packageStatus.groupExpired && !packageStatus.privateExpired && (
                    <p className="text-amber-800">
                      <span className="font-semibold">¡Último mes!</span> Tu membresía está por expirar. Considera renovar pronto.
                    </p>
                  )}
                  {(packageStatus.outOfGroupClasses || packageStatus.outOfPrivateClasses) && !packageStatus.groupExpired && !packageStatus.privateExpired && (
                    <p className="text-amber-800">
                      <span className="font-semibold">Sin clases restantes este mes.</span> Espera la renovación o contacta para actualizar tu paquete.
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Class Balance Cards */}
          <div className="grid grid-cols-2 gap-4">
            {/* Group Classes */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Link href="/dashboard/packages">
                <div className={`relative overflow-hidden rounded-2xl p-5 text-white cursor-pointer transition-transform hover:scale-[1.02] ${
                  !activeGroupPackage && packageHistory.some(p => p.package_category === 'Grupal')
                    ? 'bg-gradient-to-br from-gray-400 to-gray-500'
                    : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                }`}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <Users className="h-8 w-8 mb-3 opacity-80" />
                  <div className="text-4xl font-bold mb-1">{classCounts.group}</div>
                  <div className="text-sm opacity-90">Clases Grupales</div>
                  <div className="mt-2 text-xs opacity-75 flex items-center gap-1">
                    Ver detalles <ChevronRight className="h-3 w-3" />
                  </div>
                </div>
              </Link>
            </motion.div>

            {/* Private Classes */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Link href="/dashboard/packages">
                <div className={`relative overflow-hidden rounded-2xl p-5 text-white cursor-pointer transition-transform hover:scale-[1.02] ${
                  !activePrivatePackage && packageHistory.some(p => p.package_category === 'Privada')
                    ? 'bg-gradient-to-br from-gray-400 to-gray-500'
                    : 'bg-gradient-to-br from-purple-500 to-pink-600'
                }`}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <User className="h-8 w-8 mb-3 opacity-80" />
                  <div className="text-4xl font-bold mb-1">{classCounts.private}</div>
                  <div className="text-sm opacity-90">Clases Privadas</div>
                  <div className="mt-2 text-xs opacity-75 flex items-center gap-1">
                    Ver detalles <ChevronRight className="h-3 w-3" />
                  </div>
                </div>
              </Link>
            </motion.div>
          </div>

          {/* Next Class Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Link href="/dashboard/classes">
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Próxima Clase</h2>
                  <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                    Ver calendario <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
                
                {nextClass ? (
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center ${
                      nextClass.class_type === 'private' ? 'bg-purple-100' : 'bg-blue-100'
                    }`}>
                      <span className="text-2xl font-bold text-gray-900">
                        {new Date(nextClass.occurrence_date || nextClass.class_date || nextClass.date).getDate()}
                      </span>
                      <span className="text-xs text-gray-500 uppercase">
                        {new Date(nextClass.occurrence_date || nextClass.class_date || nextClass.date).toLocaleDateString('es-MX', { month: 'short' })}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {(() => {
                          const classDate = new Date(nextClass.occurrence_date || nextClass.class_date || nextClass.date)
                          classDate.setHours(0, 0, 0, 0)
                          const title = nextClass.class_title || nextClass.title || 'Clase'
                          return replaceTemplateVariables(title, classDate, nextClass)
                        })()}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {nextClass.class_time || nextClass.time}
                        </span>
                        {nextClass.coach_name && (
                          <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {nextClass.coach_name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      nextClass.class_type === 'private' 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {nextClass.class_type === 'private' ? 'Privada' : 'Grupal'}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <CalendarDays className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-2">No tienes clases programadas</p>
                    <span className="text-blue-600 text-sm font-medium">
                      Reserva tu primera clase →
                    </span>
                  </div>
                )}
              </div>
            </Link>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="grid grid-cols-2 gap-4"
          >
            <Link href="/dashboard/classes">
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-5 hover:shadow-md transition-all cursor-pointer group">
                <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Reservar Clase</h3>
                <p className="text-sm text-gray-500">Agenda tu próxima sesión</p>
              </div>
            </Link>

            <Link href="/dashboard/packages">
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-5 hover:shadow-md transition-all cursor-pointer group">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Mi Paquete</h3>
                <p className="text-sm text-gray-500">Ver detalles y renovar</p>
              </div>
            </Link>
          </motion.div>

          {/* Upcoming Bookings */}
          {userBookings.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Mis Reservaciones</h2>
                <Link href="/dashboard/classes" className="text-xs text-blue-600 font-medium flex items-center gap-1">
                  Ver todas <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              
              <div className="space-y-3">
                {userBookings
                  .filter(b => {
                    if (b.status === 'cancelled') return false
                    const date = new Date(b.occurrence_date || b.class_date || b.date)
                    return date >= new Date(new Date().toDateString())
                  })
                  .sort((a, b) => {
                    const dateA = new Date(a.occurrence_date || a.class_date || a.date)
                    const dateB = new Date(b.occurrence_date || b.class_date || b.date)
                    return dateA.getTime() - dateB.getTime()
                  })
                  .slice(0, 4)
                  .map((booking, index) => {
                    const bookingDate = new Date(booking.occurrence_date || booking.class_date || booking.date)
                    const isToday = bookingDate.toDateString() === new Date().toDateString()
                    const isTomorrow = bookingDate.toDateString() === new Date(Date.now() + 86400000).toDateString()
                    
                    return (
                      <div 
                        key={booking.id || index} 
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                      >
                        <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center text-xs ${
                          isToday ? 'bg-green-500 text-white' :
                          isTomorrow ? 'bg-blue-500 text-white' :
                          'bg-gray-200 text-gray-700'
                        }`}>
                          <span className="font-bold">{bookingDate.getDate()}</span>
                          <span className="text-[10px] uppercase">{bookingDate.toLocaleDateString('es-MX', { month: 'short' })}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {(() => {
                              const bookingDate = new Date(booking.occurrence_date || booking.class_date || booking.date)
                              bookingDate.setHours(0, 0, 0, 0)
                              const title = booking.class_title || booking.title || 'Clase'
                              return replaceTemplateVariables(title, bookingDate, booking)
                            })()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {booking.class_time || booking.time}
                            {isToday && <span className="ml-2 text-green-600 font-medium">• Hoy</span>}
                            {isTomorrow && <span className="ml-2 text-blue-600 font-medium">• Mañana</span>}
                          </p>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${
                          booking.class_type === 'private' ? 'bg-purple-500' : 'bg-blue-500'
                        }`} />
                      </div>
                    )
                  })}
              </div>

              {userBookings.filter(b => {
                if (b.status === 'cancelled') return false
                const date = new Date(b.occurrence_date || b.class_date || b.date)
                return date >= new Date(new Date().toDateString())
              }).length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No tienes reservaciones próximas
                </div>
              )}
            </motion.div>
          )}

          {/* WhatsApp Contact */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="text-center"
          >
            <button
              onClick={() => {
                const message = `Hola, soy ${user.nombre}. Tengo una pregunta sobre mis clases.`
                const url = `https://wa.me/5259581062606?text=${encodeURIComponent(message)}`
                window.open(url, '_blank')
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors font-medium shadow-lg shadow-green-500/25"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              ¿Tienes dudas? Escríbenos
            </button>
          </motion.div>
        </div>
      </DashboardLayout>
    )
  }

  // Admin/Coach Dashboard (keep existing)
  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-black to-gray-800 rounded-xl p-8 text-white"
        >
          <h1 className="text-3xl font-bold mb-2">
            {getGreeting()}, {user?.nombre} 👋
          </h1>
          <p className="text-gray-300 text-lg">
            Bienvenido al sistema de Pilates Mermaid
          </p>
          <div className="mt-4 flex items-center space-x-2">
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
              {getRoleDisplayName(user?.role || '')}
            </span>
            {user?.role === 'admin' && (
              <span className="px-3 py-1 bg-green-500/20 rounded-full text-sm flex items-center">
                <CheckCircle className="h-4 w-4 mr-1" />
                Administrador
              </span>
            )}
          </div>
        </motion.div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center space-x-2 text-red-600 bg-red-50 p-4 rounded-lg"
          >
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Stats Cards - Only for Admin */}
        {user?.role === 'admin' && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card-hover"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Clientes</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalClients}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card-hover"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Coaches</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalCoaches}</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card-hover"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Clases Programadas</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalClasses}</p>
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="card-hover"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Ingresos del Mes</p>
                  <p className="text-2xl font-bold text-gray-900">${stats.totalRevenue.toLocaleString()}</p>
                </div>
                <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Acciones Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {getQuickActions().map((action, index) => (
              <motion.a
                key={action.name}
                href={action.href}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className="card-hover text-center group"
              >
                <div className={`h-16 w-16 ${action.color} rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                  <action.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-medium text-gray-900 group-hover:text-black">
                  {action.name}
                </h3>
              </motion.a>
            ))}
          </div>
        </div>

        {/* Recent Activity - Only for Admin */}
        {user?.role === 'admin' && stats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Birthdays */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="card"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Cumpleaños Próximos</h3>
                <Cake className="h-5 w-5 text-gray-400" />
              </div>
              {stats.upcomingBirthdays && stats.upcomingBirthdays.length > 0 ? (
                <div className="space-y-3">
                  {stats.upcomingBirthdays.map((client, index) => (
                    <div key={client.id || index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="h-10 w-10 bg-pink-100 rounded-full flex items-center justify-center">
                        <Cake className="h-5 w-5 text-pink-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{client.nombre}</p>
                        <p className="text-sm text-gray-600">
                          {client.formattedDate || new Date(client.cumpleanos).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                          {client.daysUntil !== undefined && (
                            <span className="ml-2 text-xs text-gray-500">
                              {client.daysUntil === 0 ? '(Hoy)' : client.daysUntil === 1 ? '(Mañana)' : `(En ${client.daysUntil} días)`}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No hay cumpleaños próximos</p>
              )}
            </motion.div>

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="card"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Actividad Reciente</h3>
                <Clock className="h-5 w-5 text-gray-400" />
              </div>
              {stats.recentActivity && stats.recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentActivity.map((activity, index) => {
                    let IconComponent = Clock
                    let bgColor = 'bg-gray-50'
                    let iconColor = 'text-gray-600'
                    
                    if (activity.type === 'client_registered') {
                      IconComponent = CheckCircle
                      bgColor = 'bg-green-50'
                      iconColor = 'text-green-600'
                    } else if (activity.type === 'class_booked') {
                      IconComponent = Calendar
                      bgColor = 'bg-blue-50'
                      iconColor = 'text-blue-600'
                    } else if (activity.type === 'payment_received') {
                      IconComponent = DollarSign
                      bgColor = 'bg-yellow-50'
                      iconColor = 'text-yellow-600'
                    } else if (activity.type === 'payment_made') {
                      IconComponent = DollarSign
                      bgColor = 'bg-orange-50'
                      iconColor = 'text-orange-600'
                    }
                    
                    return (
                      <div key={activity.id || index} className={`flex items-center space-x-3 p-3 ${bgColor} rounded-lg`}>
                        <IconComponent className={`h-5 w-5 ${iconColor}`} />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                          <p className="text-xs text-gray-600">{activity.description}</p>
                          <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No hay actividad reciente</p>
              )}
            </motion.div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
