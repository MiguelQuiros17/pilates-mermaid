'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Package,
  TrendingUp,
  DollarSign,
  Users,
  CalendarDays,
  MessageCircle,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import DashboardLayout from '@/components/DashboardLayout'
import WhatsAppButton from '@/components/WhatsAppButton'
import { useTranslation } from '@/hooks/useTranslation'

// Configuración de API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : '')

// Helper para construir URLs de API
const getApiUrl = (path: string) => {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  if (path.startsWith('/api')) {
    return path // Rutas relativas en producción
  }
  const baseUrl = API_URL || ''
  return baseUrl ? `${baseUrl}${path.startsWith('/') ? path : `/${path}`}` : path
}

interface User {
  id: string
  nombre: string
  correo: string
  role: 'cliente'
  clases_tomadas?: number
  clases_restantes?: number
  total_pagado?: number
  type_of_class?: string
  expiration_date?: string
}

interface ClassItem {
  id: string
  title: string
  description?: string
  date: string
  time: string
  duration: number
  max_capacity: number
  current_bookings: number
  status: 'scheduled' | 'completed' | 'cancelled'
  type: 'group' | 'private'
  coach_id?: string
  coach_name?: string
}

export default function ClientDashboardPage() {
  const { t, language } = useTranslation()
  const [user, setUser] = useState<User | null>(null)
  const [userClasses, setUserClasses] = useState<any[]>([])
  const [userBookings, setUserBookings] = useState<any[]>([])
  const [userStats, setUserStats] = useState<any>(null)
  const [packageHistory, setPackageHistory] = useState<any[]>([])
  const [activePackage, setActivePackage] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [classesLoading, setClassesLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [activeView, setActiveView] = useState<'calendar' | 'list'>('calendar')
  const [bookingClassId, setBookingClassId] = useState<string | null>(null)
  const [cancelingClassId, setCancelingClassId] = useState<string | null>(null)

  // Refs para mantener los timeouts de debounce
  const eventUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const storageUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      console.error('❌ [useEffect] No user data in localStorage, redirecting to login')
      window.location.href = '/login'
      return
    }

    let parsedUser
    try {
      parsedUser = JSON.parse(userData)
    } catch (error) {
      console.error('❌ [useEffect] Error parsing user data from localStorage:', error)
      window.location.href = '/login'
      return
    }

    if (parsedUser.role !== 'cliente') {
      console.log('⚠️  [useEffect] User role is not cliente, redirecting to dashboard')
      window.location.href = '/dashboard'
      return
    }

    // Debug: Log del usuario parseado
    console.log('🔍 [useEffect] Parsed user from localStorage:', parsedUser)
    console.log('🔍 [useEffect] User ID:', parsedUser.id)
    console.log('🔍 [useEffect] User ID type:', typeof parsedUser.id)
    console.log('🔍 [useEffect] User role:', parsedUser.role)
    console.log('🔍 [useEffect] User email:', parsedUser.correo)
    console.log('🔍 [useEffect] Full user object:', JSON.stringify(parsedUser, null, 2))
    
    // Verificar que el usuario tenga un ID válido
    if (!parsedUser.id) {
      console.error('❌ [useEffect] User ID is missing or invalid:', parsedUser.id)
      console.error('❌ [useEffect] User object:', parsedUser)
      alert('Error: ID de usuario no válido. Por favor, inicia sesión nuevamente.')
      window.location.href = '/login'
      return
    }
    
    setUser(parsedUser)
    console.log('🔍 [useEffect] Loading user data for ID:', parsedUser.id)
    loadUserData(parsedUser.id)
    
    // Listener para detectar cuando se actualiza el paquete del usuario
    const handleUserPackageUpdate = (event: CustomEvent) => {
      if (event.detail && event.detail.client) {
        // Cancelar timeout anterior si existe
        if (eventUpdateTimeoutRef.current) {
          clearTimeout(eventUpdateTimeoutRef.current)
        }
        
        // Actualizar estado del usuario con los datos actualizados inmediatamente
        setUser((prevUser) => {
          if (prevUser && prevUser.id === event.detail.client.id) {
            return {
              ...prevUser,
              type_of_class: event.detail.client.type_of_class,
              expiration_date: event.detail.client.expiration_date
            }
          }
          return prevUser
        })
        
        // Usar debounce para recargar datos del servidor (evitar múltiples llamadas)
        eventUpdateTimeoutRef.current = setTimeout(() => {
          loadUserData(parsedUser.id)
        }, 500) // Esperar 500ms antes de recargar
      }
    }
    
    // Listener para eventos personalizados
    window.addEventListener('userPackageUpdated', handleUserPackageUpdate as EventListener)
    window.addEventListener('clientPackageUpdated', handleUserPackageUpdate as EventListener)
    
    // Listener para cambios en localStorage (desde otras pestañas)
    // Usar debounce para evitar múltiples llamadas
    const handleStorageChange = (e: StorageEvent) => {
      // Cancelar timeout anterior si existe
      if (storageUpdateTimeoutRef.current) {
        clearTimeout(storageUpdateTimeoutRef.current)
      }
      
      // Usar debounce para evitar múltiples llamadas
      storageUpdateTimeoutRef.current = setTimeout(() => {
        if (e.key === 'userPackageUpdated' && e.newValue === 'true') {
          // Recargar datos del usuario desde el servidor
          loadUserData(parsedUser.id)
          // Limpiar la bandera
          localStorage.removeItem('userPackageUpdated')
        } else if (e.key && e.key.startsWith('clientPackageUpdated_') && e.newValue === 'true') {
          const clientId = e.key.replace('clientPackageUpdated_', '')
          if (clientId === parsedUser.id) {
            // Recargar datos del usuario desde el servidor
            loadUserData(parsedUser.id)
            // Limpiar la bandera
            localStorage.removeItem(e.key)
          }
        } else if (e.key === 'user' && e.newValue) {
          // Si el usuario en localStorage cambió, actualizar el estado
          try {
            const updatedUser = JSON.parse(e.newValue)
            if (updatedUser.id === parsedUser.id) {
              setUser(updatedUser)
              loadUserData(updatedUser.id)
            }
          } catch (error) {
            console.error('Error parsing updated user:', error)
          }
        }
      }, 300) // Esperar 300ms antes de ejecutar para agrupar múltiples cambios
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    // Verificar si hay una actualización pendiente al cargar (solo una vez)
    // Usar un pequeño delay para evitar múltiples llamadas
    const checkForUpdates = () => {
      const userPackageUpdated = localStorage.getItem('userPackageUpdated')
      const clientUpdateKey = `clientPackageUpdated_${parsedUser.id}`
      const clientPackageUpdated = localStorage.getItem(clientUpdateKey)
      
      if (userPackageUpdated === 'true' || clientPackageUpdated === 'true') {
        // Solo cargar una vez si hay actualizaciones pendientes
        loadUserData(parsedUser.id)
        if (userPackageUpdated === 'true') {
          localStorage.removeItem('userPackageUpdated')
        }
        if (clientPackageUpdated === 'true') {
          localStorage.removeItem(clientUpdateKey)
        }
      }
    }
    
    // Ejecutar después de un pequeño delay para evitar llamadas duplicadas
    setTimeout(checkForUpdates, 100)
    
    return () => {
      // Limpiar timeouts si existen
      if (eventUpdateTimeoutRef.current) {
        clearTimeout(eventUpdateTimeoutRef.current)
        eventUpdateTimeoutRef.current = null
      }
      if (storageUpdateTimeoutRef.current) {
        clearTimeout(storageUpdateTimeoutRef.current)
        storageUpdateTimeoutRef.current = null
      }
      
      window.removeEventListener('userPackageUpdated', handleUserPackageUpdate as EventListener)
      window.removeEventListener('clientPackageUpdated', handleUserPackageUpdate as EventListener)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  useEffect(() => {
    if (user) {
      loadClasses()
    }
  }, [user])

  // Log cuando activePackage cambia
  useEffect(() => {
    console.log('═══════════════════════════════════════')
    console.log('🔄 ESTADO DE activePackage CAMBIÓ:')
    console.log('═══════════════════════════════════════')
    if (activePackage) {
      console.log('✅ activePackage ESTÁ ESTABLECIDO:')
      console.log('  - Nombre:', activePackage.package_name)
      console.log('  - Status:', activePackage.status)
      console.log('  - End date:', activePackage.end_date)
      console.log('✅ EL PAQUETE SE MOSTRARÁ EN LA PÁGINA')
    } else {
      console.log('⚠️ activePackage ES NULL')
      console.log('⚠️ NO SE MOSTRARÁ NINGÚN PAQUETE')
    }
    console.log('═══════════════════════════════════════')
  }, [activePackage])

  const loadUserData = async (userId: string, forceRefresh: boolean = false) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        console.error('❌ No token found in localStorage')
        return
      }
      
      if (forceRefresh) {
        console.log('🔄 FORZANDO REFRESCO DE DATOS...')
        setActivePackage(null)
      }

      // Debug: Log del usuario y el ID que se está usando
      console.log('🔍 [loadUserData] Loading data for user:', userId)
      console.log('🔍 [loadUserData] Current user from state:', user)
      console.log('🔍 [loadUserData] User ID type:', typeof userId)
      console.log('🔍 [loadUserData] User ID value:', userId)

      // Cargar información actualizada del usuario desde el servidor
      const userResponse = await fetch(getApiUrl(`/api/users/${userId}`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      // Cargar clases del usuario
      const classesResponse = await fetch(getApiUrl(`/api/users/${userId}/classes`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      // Cargar reservas del usuario
      const bookingsResponse = await fetch(getApiUrl(`/api/users/${userId}/bookings`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      // Cargar historial de paquetes
      console.log('🔍 [loadUserData] Fetching package history for user:', userId)
      const packageHistoryUrl = getApiUrl(`/api/users/${userId}/package-history`)
      console.log('🔍 [loadUserData] URL:', packageHistoryUrl)
      const packageResponse = await fetch(packageHistoryUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      console.log('🔍 [loadUserData] Package response status:', packageResponse.status)
      console.log('🔍 [loadUserData] Package response ok:', packageResponse.ok)

      // Actualizar información del usuario si está disponible
      if (userResponse.ok) {
        const userData = await userResponse.json()
        if (userData.success && userData.user) {
          // Actualizar estado del usuario con datos del servidor
          setUser((prevUser) => {
            if (prevUser && prevUser.id === userData.user.id) {
              return {
                ...prevUser,
                type_of_class: userData.user.type_of_class,
                expiration_date: userData.user.expiration_date
              }
            }
            return prevUser
          })
          
          // Actualizar localStorage con datos actualizados
          const currentUser = localStorage.getItem('user')
          if (currentUser) {
            try {
              const parsedUser = JSON.parse(currentUser)
              if (parsedUser.id === userData.user.id) {
                const updatedUser = {
                  ...parsedUser,
                  type_of_class: userData.user.type_of_class,
                  expiration_date: userData.user.expiration_date
                }
                localStorage.setItem('user', JSON.stringify(updatedUser))
              }
            } catch (error) {
              console.error('Error updating user in localStorage:', error)
            }
          }
        }
      }

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
        
        console.log('═══════════════════════════════════════')
        console.log('📦 RESPUESTA DEL SERVIDOR RECIBIDA')
        console.log('═══════════════════════════════════════')
        console.log('Success:', packageData.success)
        console.log('Active Package:', packageData.activePackage)
        if (packageData.activePackage) {
          console.log('  Nombre:', packageData.activePackage.package_name)
          console.log('  Status:', packageData.activePackage.status)
          console.log('  ID:', packageData.activePackage.id)
        }
        console.log('═══════════════════════════════════════')
        
        // Establecer el historial de paquetes PRIMERO
        setPackageHistory(packageData.packageHistory || [])
        
        // Establecer el paquete activo EXACTAMENTE como lo hace el admin
        // El admin simplemente hace: setActivePackage(data.activePackage)
        console.log('🔧 Estableciendo activePackage...')
        setActivePackage(packageData.activePackage || null)
        console.log('✅ setActivePackage llamado con:', packageData.activePackage ? packageData.activePackage.package_name : 'null')
      } else {
        console.error('❌ ERROR EN LA RESPUESTA:', packageResponse.status)
        const errorText = await packageResponse.text().catch(() => '')
        console.error('❌ Error text:', errorText)
        setActivePackage(null)
      }

      setIsLoading(false)
    } catch (error) {
      console.error('Error loading user data:', error)
      setIsLoading(false)
    }
  }

  const loadClasses = async () => {
    try {
      setClassesLoading(true)
      const token = localStorage.getItem('token')
      if (!token) {
        setClasses([])
        return
      }

      const response = await fetch(getApiUrl('/api/classes'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setClasses((data.classes || []) as ClassItem[])
      } else {
        console.error('Error loading classes')
        setClasses([])
      }
    } catch (error) {
      console.error('Error loading classes:', error)
      setClasses([])
    } finally {
      setClassesLoading(false)
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return t('client.greeting.morning')
    if (hour < 18) return t('client.greeting.afternoon')
    return t('client.greeting.evening')
  }

  const getDaysUntilExpiration = () => {
    if (!activePackage || !activePackage.end_date) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const expirationDate = new Date(activePackage.end_date)
    expirationDate.setHours(0, 0, 0, 0)
    const diffTime = expirationDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: Array<Date | null> = []

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }

    return days
  }

  const getClassDateTime = (classItem: ClassItem) => {
    return new Date(`${classItem.date}T${classItem.time}`)
  }

  const isClassInPast = (classItem: ClassItem) => {
    return getClassDateTime(classItem).getTime() < Date.now()
  }

  const getClassesForDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateKey = `${year}-${month}-${day}`

    return classes
      .filter(cls => {
        if (!cls.date) return false
        const classDate = cls.date.split('T')[0]
        return classDate === dateKey
      })
      .sort((a, b) => getClassDateTime(a).getTime() - getClassDateTime(b).getTime())
  }

  const isUserBookedForClass = (classId: string) => {
    return userBookings.some(booking => booking.class_id === classId && booking.status === 'confirmed')
  }

  const getBookingForClass = (classId: string) => {
    return userBookings.find(booking => booking.class_id === classId && booking.status === 'confirmed')
  }

  const hasUnlimitedPackage = !!activePackage && activePackage.classes_included === 999
  const remainingClasses = userStats?.remaining ?? 0
  const canBookMoreClasses = hasUnlimitedPackage || remainingClasses > 0

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
  }

  const getUpcomingClasses = () => {
    return classes
      .filter(cls => cls.status === 'scheduled' && getClassDateTime(cls).getTime() >= Date.now())
      .sort((a, b) => getClassDateTime(a).getTime() - getClassDateTime(b).getTime())
  }

  const findClassById = (classId: string) => classes.find(cls => cls.id === classId)

  const isClassFull = (classItem: ClassItem) => classItem.current_bookings >= classItem.max_capacity

  const getAvailabilityColor = (classItem: ClassItem) => {
    const percentage = (classItem.current_bookings / classItem.max_capacity) * 100
    if (percentage >= 100) return 'bg-red-500'
    if (percentage >= 80) return 'bg-amber-500'
    if (percentage >= 60) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getAvailabilityLabel = (classItem: ClassItem) => {
    const remaining = classItem.max_capacity - classItem.current_bookings
    if (isClassFull(classItem)) return t('client.classFull')
    if (remaining === 1) return t('client.lastSpot')
    if (remaining <= 2) return language === 'en' 
      ? `Last ${remaining} spots!` 
      : `¡Últimos ${remaining} lugares!`
    return language === 'en'
      ? `${remaining} ${t('client.availableSpots')}`
      : `${remaining} ${t('client.availableSpots')}`
  }

  const renderActionButton = (classItem: ClassItem, size: 'xs' | 'sm' | 'md' = 'md') => {
    const userAlreadyBooked = isUserBookedForClass(classItem.id)
    const isPast = isClassInPast(classItem)
    const baseClasses = size === 'xs'
      ? 'px-2 py-1 text-[9px] sm:text-[10px] rounded-md font-medium transition-colors touch-manipulation min-h-[32px]'
      : size === 'sm'
      ? 'px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs rounded-lg font-medium transition-colors touch-manipulation min-h-[36px]'
      : 'px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg font-medium transition-colors touch-manipulation min-h-[44px]'

    if (userAlreadyBooked) {
      return (
        <div className="flex flex-col gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              cancelBooking(classItem.id)
            }}
            disabled={cancelingClassId === classItem.id}
            className={`${baseClasses} ${
              cancelingClassId === classItem.id
                ? 'bg-red-200 text-red-500 cursor-not-allowed'
                : 'bg-red-500 text-white active:bg-red-600'
            }`}
          >
            {cancelingClassId === classItem.id 
              ? (language === 'en' ? 'Canceling...' : 'Cancelando...')
              : size === 'xs' 
                ? t('client.cancel')
                : t('client.cancelReservation')}
          </button>
          {size !== 'xs' && (
            <p className="text-[10px] sm:text-[11px] text-gray-500">{t('client.freeSpot')}</p>
          )}
        </div>
      )
    }

    const isDisabled =
      bookingClassId === classItem.id ||
      !canBookMoreClasses ||
      isClassFull(classItem) ||
      isPast

    const reasons: string[] = []
    if (!canBookMoreClasses && !hasUnlimitedPackage) {
      reasons.push(language === 'en' ? 'No available classes in your package.' : 'No cuentas con clases disponibles en tu paquete.')
    }
    if (isClassFull(classItem)) {
      reasons.push(language === 'en' ? 'The class is already full.' : 'La clase ya está llena.')
    }
    if (isPast) {
      reasons.push(language === 'en' ? 'The class has already occurred.' : 'La clase ya ocurrió.')
    }

    return (
      <div className="flex flex-col gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation()
            bookClass(classItem.id)
          }}
               disabled={isDisabled}
               className={`${baseClasses} ${
                 isDisabled
                   ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                   : 'bg-gray-900 text-white active:bg-gray-800'
               }`}
             >
               {bookingClassId === classItem.id 
                 ? (language === 'en' ? 'Booking...' : 'Reservando...')
                 : t('client.book')}
             </button>
             {reasons.length > 0 && size !== 'xs' && (
               <p className="text-[10px] sm:text-[11px] text-gray-500">
                 {reasons[0]}
               </p>
             )}
      </div>
    )
  }
  const weekDays = language === 'en' 
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    : ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const monthFormatter = new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'es-ES', { month: 'long', year: 'numeric' })
  const formattedMonth = monthFormatter.format(currentDate)
  const daysInCurrentMonth = getDaysInMonth(currentDate)
  const upcomingClassesLimited = getUpcomingClasses().slice(0, 30)
  const classesForSelectedDate = selectedDate ? getClassesForDate(selectedDate) : []

  const bookClass = async (classId: string) => {
    if (!user) return
    const classItem = findClassById(classId)
    if (!classItem) {
      alert('No se encontró la clase seleccionada.')
      return
    }
    if (!canBookMoreClasses) {
      alert('No tienes clases disponibles en tu paquete actual. Contacta al estudio para renovar.')
      return
    }
    if (isUserBookedForClass(classId)) {
      alert('Ya tienes una reserva confirmada para esta clase.')
      return
    }
    if (isClassInPast(classItem)) {
      alert('No es posible reservar una clase que ya ocurrió.')
      return
    }
    if (isClassFull(classItem)) {
      alert('La clase ya está llena.')
      return
    }

    try {
      setBookingClassId(classId)
      const token = localStorage.getItem('token')
      if (!token) {
        alert('No se encontró tu sesión, vuelve a iniciar sesión.')
        return
      }

      const response = await fetch(getApiUrl('/api/bookings'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          classId
        })
      })

      if (response.ok) {
        await loadClasses()
        await loadUserData(user.id)
        setSelectedDate(null)
        alert('Clase reservada exitosamente.')
      } else {
        const data = await response.json().catch(() => null)
        alert(data?.message || 'No se pudo reservar la clase.')
      }
    } catch (error) {
      console.error('Error booking class:', error)
      alert('Ocurrió un error al reservar la clase.')
    } finally {
      setBookingClassId(null)
    }
  }

  const cancelBooking = async (classId: string) => {
    if (!user) return
    const booking = getBookingForClass(classId)

    if (!booking) {
      alert('No tienes una reserva activa para esta clase.')
      return
    }

    try {
      setCancelingClassId(classId)
      const token = localStorage.getItem('token')
      if (!token) {
        alert('No se encontró tu sesión, vuelve a iniciar sesión.')
        return
      }

      const response = await fetch(getApiUrl('/api/bookings/cancel'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          bookingId: booking.id
        })
      })

      if (response.ok) {
        await loadClasses()
        await loadUserData(user.id)
        alert('Reserva cancelada correctamente.')
      } else {
        const data = await response.json().catch(() => null)
        alert(data?.message || 'No se pudo cancelar la reserva.')
      }
    } catch (error) {
      console.error('Error cancelling booking:', error)
      alert('Ocurrió un error al cancelar la reserva.')
    } finally {
      setCancelingClassId(null)
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </DashboardLayout>
    )
  }

  // Log antes del renderizado - SIMPLIFICADO
  // Los logs detallados están en el renderizado condicional

  return (
    <DashboardLayout>
      <div className="space-y-3 sm:space-y-4 md:space-y-6 -mx-2 sm:mx-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 text-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2 truncate">
                {getGreeting()}, {user?.nombre}!
              </h1>
              <p className="text-sm sm:text-base text-purple-100">
                {t('client.welcome')}
              </p>
            </div>
            <button
              onClick={() => {
                console.log('🔄 Botón de refresco presionado')
                if (user) {
                  loadUserData(user.id, true)
                }
              }}
              className="w-full sm:w-auto px-4 py-2.5 bg-white/20 hover:bg-white/30 active:bg-white/40 rounded-lg text-white font-semibold transition-colors touch-manipulation min-h-[44px]"
              title={t('client.refresh')}
            >
              🔄 {t('client.refresh')}
            </button>
          </div>
        </div>

        {/* Paquete Activo */}
        {activePackage ? (
          <motion.div
            key="active-package"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-green-50 border border-green-200 rounded-xl p-4 sm:p-5 md:p-6"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-start sm:items-center space-x-3 flex-1 min-w-0">
                <Package className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-green-600 flex-shrink-0 mt-0.5 sm:mt-0" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg font-semibold text-green-900 truncate">
                    {activePackage.package_name}
                  </h3>
                  <p className="text-xs sm:text-sm text-green-700 mt-0.5">
                    {activePackage.classes_included} {t('client.classes')} - ${activePackage.amount_paid} {t('client.mxn')}
                  </p>
                </div>
              </div>
              <div className="text-left sm:text-right w-full sm:w-auto">
                <p className="text-xs sm:text-sm text-green-600">{t('client.expiresOn')}</p>
                <p className="text-base sm:text-lg font-semibold text-green-900">
                  {new Date(activePackage.end_date).toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES')}
                </p>
              </div>
            </div>
            
            {getDaysUntilExpiration() !== null && getDaysUntilExpiration()! <= 7 && (
              <div className="mt-3 sm:mt-4 bg-yellow-100 border border-yellow-300 rounded-lg p-2.5 sm:p-3">
                <div className="flex items-start sm:items-center space-x-2">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 flex-shrink-0 mt-0.5 sm:mt-0" />
                  <p className="text-xs sm:text-sm text-yellow-800 flex-1">
                    {t('client.expiresIn')} {getDaysUntilExpiration()} {t('client.days')}.{' '}
                    <WhatsAppButton
                      message={language === 'en' 
                        ? `Hello, I'm ${user?.nombre}. I want to renew my ${activePackage.package_name} package. Can you help me?`
                        : `Hola, soy ${user?.nombre}. Quiero renovar mi paquete ${activePackage.package_name}. ¿Podrían ayudarme?`}
                      className="inline-block mt-1 sm:mt-0 sm:ml-1 text-yellow-800 underline hover:text-yellow-900 touch-manipulation"
                    >
                      {t('client.contactRenew')}
                    </WhatsAppButton>
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 sm:p-5 md:p-6"
          >
            <div className="flex items-start space-x-3 mb-3 sm:mb-4">
              <AlertCircle className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-semibold text-yellow-900">{t('client.noActivePackage')}</h3>
                <p className="text-xs sm:text-sm text-yellow-700 mt-1">
                  {t('client.noActivePackageDesc')}
                </p>
              </div>
            </div>
            <WhatsAppButton
              message={language === 'en'
                ? `Hello, I'm ${user?.nombre}. I want to buy a class package. Can you help me choose the package that best suits me?`
                : `Hola, soy ${user?.nombre}. Quiero comprar un paquete de clases. ¿Podrían ayudarme a elegir el paquete que más me convenga?`}
              className="w-full sm:w-auto bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors touch-manipulation min-h-[44px] text-center"
            >
              {t('client.buyPackage')}
            </WhatsAppButton>
          </motion.div>
        )}

        {/* Estadísticas Principales */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 lg:p-6 shadow-sm border border-gray-200"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 md:space-x-3">
              <div className="p-2 sm:p-2.5 md:p-3 bg-blue-100 rounded-lg flex-shrink-0">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">{userStats?.remaining || 0}</p>
                <p className="text-xs sm:text-sm text-gray-600 truncate">{t('client.remainingClasses')}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 lg:p-6 shadow-sm border border-gray-200"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 md:space-x-3">
              <div className="p-2 sm:p-2.5 md:p-3 bg-green-100 rounded-lg flex-shrink-0">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-green-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">{user?.clases_tomadas || 0}</p>
                <p className="text-xs sm:text-sm text-gray-600 truncate">{t('client.classesAttended')}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 lg:p-6 shadow-sm border border-gray-200"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 md:space-x-3">
              <div className="p-2 sm:p-2.5 md:p-3 bg-purple-100 rounded-lg flex-shrink-0">
                <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-purple-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">{userBookings.length}</p>
                <p className="text-xs sm:text-sm text-gray-600 truncate">{t('client.activeBookings')}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 lg:p-6 shadow-sm border border-gray-200"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 md:space-x-3">
              <div className="p-2 sm:p-2.5 md:p-3 bg-yellow-100 rounded-lg flex-shrink-0">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-yellow-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 truncate">
                  {getDaysUntilExpiration() || '-'}
                </p>
                <p className="text-xs sm:text-sm text-gray-600 truncate">{t('client.daysRemaining')}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Estadísticas Adicionales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-5 md:p-6 shadow-sm border border-gray-200"
          >
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">{t('client.packageHistory')}</h3>
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-gray-600">{t('client.packagesBought')}</span>
                <span className="text-sm sm:text-base font-semibold text-gray-900">{packageHistory.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-gray-600">{t('client.lastPackage')}</span>
                <span className="text-xs sm:text-sm text-gray-900 truncate ml-2">
                  {packageHistory.length > 0 
                    ? new Date(packageHistory[0].start_date).toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES')
                    : t('common.na')
                  }
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-gray-600">{t('client.avgPerPackage')}</span>
                <span className="text-xs sm:text-sm text-gray-900 truncate ml-2">
                  {packageHistory.length > 0 
                    ? `$${Math.round((user?.total_pagado || 0) / packageHistory.length)} ${t('client.mxn')}`
                    : t('common.na')
                  }
                </span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-5 md:p-6 shadow-sm border border-gray-200"
          >
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">{t('client.totalInvestment')}</h3>
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-gray-600">{t('client.totalInvested')}</span>
                <span className="text-base sm:text-lg md:text-xl font-bold text-green-600 truncate ml-2">
                  ${user?.total_pagado || 0} {t('client.mxn')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-gray-600">{t('client.costPerClass')}</span>
                <span className="text-xs sm:text-sm text-gray-900 truncate ml-2">
                  {user?.clases_tomadas && user.clases_tomadas > 0 
                    ? `$${Math.round((user?.total_pagado || 0) / user.clases_tomadas)} ${t('client.mxn')}`
                    : t('common.na')
                  }
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-gray-600">{t('client.paymentMethod')}</span>
                <span className="text-xs sm:text-sm text-gray-900 truncate ml-2">
                  {activePackage?.payment_method || t('common.na')}
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Próximas Clases */}
        {userBookings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-5 md:p-6 shadow-sm border border-gray-200"
          >
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">{t('client.upcomingClasses')}</h3>
            <div className="space-y-2 sm:space-y-3">
              {userBookings
                .filter(booking => booking.status === 'confirmed')
                .slice(0, 5)
                .map((booking, index) => (
                <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 p-2.5 sm:p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-start sm:items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                    <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0 mt-1.5 sm:mt-0 ${
                      booking.type === 'private' ? 'bg-purple-500' : 'bg-blue-500'
                    }`}></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm sm:text-base font-medium text-gray-900 truncate">{booking.title}</p>
                      <p className="text-xs sm:text-sm text-gray-600">
                        {new Date(booking.date).toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES')} {language === 'en' ? 'at' : 'a las'} {booking.time}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 self-start sm:self-auto">
                    <span className={`text-xs sm:text-sm px-2 py-1 rounded-full whitespace-nowrap ${
                      booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {booking.status === 'confirmed' ? t('client.confirmed') :
                       booking.status === 'pending' ? t('client.pending') : t('client.cancelled')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            {userBookings.filter(booking => booking.status === 'confirmed').length > 5 && (
              <div className="text-center pt-3 sm:pt-4">
                <button
                  onClick={() => window.location.href = '/dashboard/classes'}
                  className="text-blue-600 hover:text-blue-800 active:text-blue-900 text-xs sm:text-sm font-medium touch-manipulation"
                >
                  {t('client.viewAllClasses')}
                </button>
              </div>
            )}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85 }}
          className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-5 md:p-6 shadow-sm border border-gray-200"
        >
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">{t('client.classesAndCalendar')}</h3>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  {t('client.classesDesc')}
                </p>
              </div>
              <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden self-start sm:self-auto">
                <button
                  className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors touch-manipulation min-h-[44px] ${activeView === 'calendar' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 active:bg-gray-50'}`}
                  onClick={() => setActiveView('calendar')}
                >
                  {t('client.calendar')}
                </button>
                <button
                  className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors touch-manipulation min-h-[44px] ${activeView === 'list' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 active:bg-gray-50'}`}
                  onClick={() => setActiveView('list')}
                >
                  {t('client.list')}
                </button>
              </div>
            </div>

          {classesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900" />
            </div>
          ) : classes.length === 0 ? (
            <div className="text-center py-10 text-gray-600">{t('client.noClasses')}</div>
          ) : activeView === 'calendar' ? (
            <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => navigateMonth('prev')}
                  className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 rounded-lg border border-gray-200 text-gray-600 active:bg-gray-50 transition-colors touch-manipulation min-h-[44px]"
                >
                  <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm hidden xs:inline">{t('client.monthPrev')}</span>
                </button>
                <span className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 capitalize text-center flex-1 px-2 truncate">
                  {formattedMonth}
                </span>
                <button
                  onClick={() => navigateMonth('next')}
                  className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 rounded-lg border border-gray-200 text-gray-600 active:bg-gray-50 transition-colors touch-manipulation min-h-[44px]"
                >
                  <span className="text-xs sm:text-sm hidden xs:inline">{t('client.monthNext')}</span>
                  <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 sm:gap-2 text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {weekDays.map(day => (
                  <div key={day} className="text-center truncate">{day}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {daysInCurrentMonth.map((day, index) => {
                  if (!day) {
                    return (
                      <div key={`empty-${index}`} className="h-[60px] sm:h-[80px] md:h-[100px] lg:h-[120px] xl:h-[140px] rounded-lg sm:rounded-xl border border-dashed border-gray-200 bg-gray-50" />
                    )
                  }

                  const dayClasses = getClassesForDate(day)
                  const isToday = day.toDateString() === new Date().toDateString()
                  const isSelected = selectedDate && day.toDateString() === selectedDate.toDateString()

                  return (
                    <div
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={`h-[60px] sm:h-[80px] md:h-[100px] lg:h-[120px] xl:h-[140px] rounded-lg sm:rounded-xl border transition-all cursor-pointer p-1 sm:p-1.5 md:p-2 lg:p-3 flex flex-col touch-manipulation ${isSelected ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white active:border-gray-400'}`}
                    >
                      <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                        <span className={`text-[10px] sm:text-xs md:text-sm font-semibold ${isSelected ? 'text-white' : 'text-gray-900'}`}>{day.getDate()}</span>
                        {isToday && <span className={`text-[8px] sm:text-[9px] md:text-[10px] font-medium ${isSelected ? 'text-white/80' : 'text-blue-600'}`}>{t('client.today')}</span>}
                      </div>

                      <div className="flex-1 space-y-1 overflow-auto scrollbar-hide">
                        {dayClasses.length === 0 ? (
                          <p className={`text-[9px] sm:text-[10px] md:text-xs ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>{t('client.noClassesForDay')}</p>
                        ) : (
                          dayClasses.slice(0, 2).map(classItem => (
                            <div
                              key={classItem.id}
                              className={`rounded p-1 sm:p-1.5 text-[9px] sm:text-[10px] md:text-xs ${isSelected ? 'bg-white/15 text-white' : 'bg-gray-100 text-gray-800'}`}
                            >
                              <div className="flex items-center justify-between font-semibold mb-0.5">
                                <span className="truncate">{classItem.time}</span>
                                <span className="ml-1 flex-shrink-0">{classItem.current_bookings}/{classItem.max_capacity}</span>
                              </div>
                              <div className={`text-[8px] sm:text-[9px] md:text-[10px] truncate ${isSelected ? 'text-white/80' : 'text-gray-600'}`}>
                                {getAvailabilityLabel(classItem)}
                              </div>
                              {dayClasses.length <= 2 && (
                                <div className="pt-0.5 sm:pt-1">
                                  {renderActionButton(classItem, 'xs')}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                        {dayClasses.length > 2 && (
                          <p className={`text-[8px] sm:text-[9px] md:text-[10px] ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>
                            +{dayClasses.length - 2} {language === 'en' ? 'more' : 'más'}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
              {upcomingClassesLimited.length === 0 ? (
                <p className="text-center text-sm sm:text-base text-gray-600 py-6 sm:py-8">{t('client.noUpcomingClasses')}</p>
              ) : (
                upcomingClassesLimited.map(classItem => {
                  const classDate = getClassDateTime(classItem)
                  const formattedDate = classDate.toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
                  const remaining = classItem.max_capacity - classItem.current_bookings
                  return (
                    <div
                      key={classItem.id}
                      className="border border-gray-200 rounded-lg sm:rounded-xl p-3 sm:p-4 flex flex-col gap-3 sm:gap-4"
                    >
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gray-900 text-white flex flex-col items-center justify-center text-[10px] sm:text-xs font-semibold uppercase flex-shrink-0">
                          <span>{classDate.toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES', { day: '2-digit' })}</span>
                          <span>{classItem.time}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm sm:text-base font-semibold text-gray-900 truncate">{classItem.title}</h4>
                          <p className="text-xs sm:text-sm text-gray-600 capitalize mt-0.5">{formattedDate}</p>
                          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{classItem.coach_name || (language === 'en' ? 'Assigned coach' : 'Coach asignado')}</p>
                          <div className="mt-2 inline-flex items-center space-x-2 text-xs">
                            <span className={`px-2 py-1 rounded-full text-white text-xs ${getAvailabilityColor(classItem)}`}>
                              {classItem.current_bookings}/{classItem.max_capacity}
                            </span>
                            <span className="text-gray-600">
                              {remaining === 1 
                                ? `1 ${t('client.availablePlaces')}` 
                                : `${remaining} ${language === 'en' ? 'spots available' : 'lugares disponibles'}`}
                            </span>
                          </div>
                        </div>
                      </div>
                      {renderActionButton(classItem)}
                    </div>
                  )
                })
              )}
            </div>
          )}
        </motion.div>

        {selectedDate && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4"
            onClick={() => setSelectedDate(null)}
          >
            <div
              className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start sm:items-center justify-between p-4 sm:p-5 md:p-6 border-b border-gray-100 gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                    {t('client.classesFor')} {selectedDate.toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">{t('client.selectClass')}</p>
                </div>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="p-2 rounded-lg active:bg-gray-100 transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex-shrink-0"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <div className="p-4 sm:p-5 md:p-6 space-y-3 sm:space-y-4">
                {classesForSelectedDate.length === 0 ? (
                  <p className="text-sm sm:text-base text-gray-600 text-center py-4">{t('client.noClassesForDate')}</p>
                ) : (
                  classesForSelectedDate.map(classItem => {
                    const classDate = getClassDateTime(classItem)
                    const remaining = classItem.max_capacity - classItem.current_bookings
                    const formattedDate = classDate.toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
                    return (
                      <div
                        key={classItem.id}
                        className="border border-gray-200 rounded-lg sm:rounded-xl p-3 sm:p-4 flex flex-col gap-3 sm:gap-4"
                      >
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm sm:text-base font-semibold text-gray-900 truncate">{classItem.title}</h4>
                          <p className="text-xs sm:text-sm text-gray-600 capitalize mt-0.5">{formattedDate} · {classItem.time}</p>
                          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{classItem.coach_name || (language === 'en' ? 'Assigned coach' : 'Coach asignado')}</p>
                          <div className="mt-2 inline-flex items-center space-x-2 text-xs flex-wrap gap-2">
                            <span className={`px-2 py-1 rounded-full text-white text-xs ${getAvailabilityColor(classItem)}`}>
                              {classItem.current_bookings}/{classItem.max_capacity}
                            </span>
                            <span className="text-gray-600">
                              {remaining === 1 
                                ? `1 ${t('client.availablePlaces')}` 
                                : `${remaining} ${language === 'en' ? 'spots available' : 'lugares disponibles'}`}
                            </span>
                          </div>
                        </div>
                        <div className="w-full sm:w-auto">
                          {renderActionButton(classItem, 'sm')}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Acciones Rápidas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-5 md:p-6 shadow-sm border border-gray-200"
        >
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Acciones Rápidas</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <button
              onClick={() => window.location.href = '/dashboard/classes'}
              className="flex items-center justify-center sm:justify-start space-x-2 sm:space-x-3 p-3 sm:p-4 bg-blue-50 rounded-lg active:bg-blue-100 transition-colors touch-manipulation min-h-[44px]"
            >
              <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 flex-shrink-0" />
              <span className="text-sm sm:text-base text-blue-900 font-medium">Ver Horarios</span>
            </button>
            
            <button
              onClick={() => window.location.href = '/dashboard/classes'}
              className="flex items-center justify-center sm:justify-start space-x-2 sm:space-x-3 p-3 sm:p-4 bg-green-50 rounded-lg active:bg-green-100 transition-colors touch-manipulation min-h-[44px]"
            >
              <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 flex-shrink-0" />
              <span className="text-sm sm:text-base text-green-900 font-medium">Reservar Clase</span>
            </button>
            
            <WhatsAppButton
              message={`Hola, soy ${user?.nombre}. Tengo una consulta sobre mi cuenta.`}
              className="flex items-center justify-center sm:justify-start space-x-2 sm:space-x-3 p-3 sm:p-4 bg-purple-50 rounded-lg active:bg-purple-100 transition-colors touch-manipulation min-h-[44px]"
            >
              <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 flex-shrink-0" />
              <span className="text-sm sm:text-base text-purple-900 font-medium">Contactar Soporte</span>
            </WhatsAppButton>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  )
}


