'use client'

import { useState, useEffect } from 'react'
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
  XCircle
} from 'lucide-react'
import DashboardLayout from '@/components/DashboardLayout'

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

  useEffect(() => {
    const userData = localStorage.getItem('user')

    if (!userData) {
      window.location.href = '/login'
      return
    }

    const parsedUser = JSON.parse(userData)
    setUser(parsedUser)
    
    // Cargar clases del usuario si es cliente
    if (parsedUser?.role === 'cliente') {
      loadUserClasses(parsedUser.id)
    }

    // Cargar estadísticas del dashboard si es admin
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

      const response = await fetch('${API_BASE_URL}/api/dashboard/stats', {
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

  const [userBookings, setUserBookings] = useState<any[]>([])
  const [userStats, setUserStats] = useState<any>(null)
  const [packageHistory, setPackageHistory] = useState<any[]>([])
  const [activePackage, setActivePackage] = useState<any>(null)

  const loadUserClasses = async (userId: string) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      // Cargar clases del usuario
      const classesResponse = await fetch(`${API_BASE_URL}/api/users/${userId}/classes`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      // Cargar reservas del usuario
      const bookingsResponse = await fetch(`${API_BASE_URL}/api/users/${userId}/bookings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      // Cargar historial de paquetes
      const packageResponse = await fetch(`${API_BASE_URL}/api/users/${userId}/package-history`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (classesResponse.ok) {
        const classesData = await classesResponse.json()
        setUserClasses(classesData.classes || [])
      }

      if (bookingsResponse.ok) {
        const bookingsData = await bookingsResponse.json()
        setUserBookings(bookingsData.bookings || [])
        setUserStats(bookingsData.availableClasses)
      }

      if (packageResponse.ok) {
        const packageData = await packageResponse.json()
        setPackageHistory(packageData.packageHistory || [])
        setActivePackage(packageData.activePackage)
      }
    } catch (error) {
      console.error('Error loading user data:', error)
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
      case 'cliente':
        return [
          { name: 'Mis Clases', href: '/dashboard/classes', icon: Calendar, color: 'bg-blue-500' },
          { name: 'Mi Paquete', href: '/dashboard/packages', icon: DollarSign, color: 'bg-green-500' },
          { name: 'Agendar Clase', href: '/dashboard/classes', icon: Calendar, color: 'bg-purple-500' }
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

        {/* Client-specific content */}
        {user?.role === 'cliente' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="card"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tu Resumen</h3>
            
            {/* Show message if no package */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <h4 className="text-sm font-medium text-yellow-900">Sin Paquete Activo</h4>
              </div>
              <p className="text-sm text-yellow-700 mb-3">
                Aún no tienes un paquete de clases activo. Contacta por WhatsApp para elegir y comprar tu paquete.
              </p>
              <button
                onClick={() => {
                  const message = `Hola, soy ${user.nombre}. Quiero comprar un paquete de clases. ¿Podrían ayudarme a elegir el paquete que más me convenga?`
                  const url = `https://wa.me/5259581062606?text=${encodeURIComponent(message)}`
                  window.open(url, '_blank')
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                Contactar por WhatsApp
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Calendar className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">0</p>
                <p className="text-sm text-gray-600">Clases Restantes</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">0</p>
                <p className="text-sm text-gray-600">Clases Asistidas</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <Clock className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">-</p>
                <p className="text-sm text-gray-600">Días Restantes</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Sección de clases del cliente */}
        {user?.role === 'cliente' && userClasses.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="card"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Mis Clases</h3>
            
            <div className="space-y-3">
              {userClasses.slice(0, 5).map((classItem, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      classItem.type === 'private' ? 'bg-purple-500' : 'bg-blue-500'
                    }`}></div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {classItem.title}
                        {classItem.type === 'private' && (
                          <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                            Privada
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(classItem.date).toLocaleDateString('es-ES')} a las {classItem.time}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm px-2 py-1 rounded-full ${
                      classItem.status === 'scheduled' ? 'bg-green-100 text-green-800' :
                      classItem.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {classItem.status === 'scheduled' ? 'Programada' :
                       classItem.status === 'completed' ? 'Completada' : 'Cancelada'}
                    </span>
                  </div>
                </div>
              ))}
              
              {userClasses.length > 5 && (
                <div className="text-center pt-2">
                  <button
                    onClick={() => window.location.href = '/dashboard/classes'}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Ver todas las clases ({userClasses.length})
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  )
}
