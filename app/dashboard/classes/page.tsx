'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Calendar, Clock, Users, Plus, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import DashboardLayout from '@/components/DashboardLayout'
import { Class, User } from '@/types'

export default function ClassesPage() {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

  // State declarations
  const [user, setUser] = useState<User | null>(null)
  const [classes, setClasses] = useState<Class[]>([])
  const [clients, setClients] = useState<User[]>([])
  const [coaches, setCoaches] = useState<User[]>([])
  const [activeView, setActiveView] = useState<'calendar' | 'list'>('calendar')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showPrivateClassModal, setShowPrivateClassModal] = useState(false)
  const [privateClassClientId, setPrivateClassClientId] = useState<string>('')
  const [privateClassDate, setPrivateClassDate] = useState<string>('')
  const [privateClassTime, setPrivateClassTime] = useState<string>('')
  const [privateClassEndTime, setPrivateClassEndTime] = useState<string>('')
  const [isCreatingPrivateClass, setIsCreatingPrivateClass] = useState(false)
  const [userBookings, setUserBookings] = useState<any[]>([])

  const [showEditClassModal, setShowEditClassModal] = useState(false)
  const [editingClass, setEditingClass] = useState<Class | null>(null)
  const [editDate, setEditDate] = useState<string>('')
  const [editTime, setEditTime] = useState<string>('')
  const [editEndTime, setEditEndTime] = useState<string>('')
  const [editClientId, setEditClientId] = useState<string>('')
  const [editInstructors, setEditInstructors] = useState<string[]>([])
  const [editInstructorInput, setEditInstructorInput] = useState<string>('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'cancel' | 'delete'
    cls: Class
  } | null>(null)

  // Helper function to get days in month
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const daysArray = []
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      daysArray.push(null)
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      daysArray.push(new Date(year, month, day))
    }
    
    return daysArray
  }

  // Calculate days for calendar using useMemo
  const days = useMemo(() => getDaysInMonth(currentDate), [currentDate])

  // Load functions with useCallback
  const loadClasses = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      
      const response = await fetch('/api/classes', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        const now = new Date()
        now.setHours(0, 0, 0, 0)
        const todayStr = now.toISOString().split('T')[0]
        
        const filteredClasses = (data.classes || []).filter((cls: any) => {
          if (!cls.date) return false
          const classDateStr = cls.date.split('T')[0]
          return classDateStr >= todayStr
        })
        setClasses(filteredClasses)
      } else {
        console.error('Error loading classes:', response.statusText)
        setClasses([])
      }
    } catch (error) {
      console.error('Error loading classes:', error)
      setClasses([])
    }
  }, [])

  const loadClients = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`${API_BASE_URL}/api/users/clients`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        // Backend returns { success, clients: [...] }
        const list = data.clients || data.users || []
        setClients(list)
      } else {
        console.error('Error loading clients:', response.status, response.statusText)
        setClients([])
      }
    } catch (error) {
      console.error('Error loading clients:', error)
      setClients([])
    }
  }, [API_BASE_URL])

  const loadCoaches = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`${API_BASE_URL}/api/users/coaches`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        const list = data.coaches || []
        setCoaches(list)
      } else {
        console.error('Error loading coaches:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error loading coaches:', error)
    }
  }, [API_BASE_URL])

  const loadUserBookings = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      if (!user?.id) return
      const response = await fetch(`${API_BASE_URL}/api/users/${user.id}/bookings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setUserBookings(data.bookings || [])
      }
    } catch (error) {
      console.error('Error loading user bookings:', error)
    }
  }, [user?.id])

  // All useEffect hooks must be together
  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      try {
        setUser(JSON.parse(userData))
      } catch (error) {
        console.error('Error parsing user data:', error)
      }
    }
  }, [])

  useEffect(() => {
    if (user) {
      loadClasses()
      // Solo admin necesita la lista completa de clientes y coaches
      if (user.role === 'admin') {
        loadClients()
        loadCoaches()
      } else if (user.role === 'coach') {
        loadCoaches()
      }
    }
  }, [user, loadClasses, loadClients, loadCoaches])

  useEffect(() => {
    if (user?.role === 'cliente') {
      loadUserBookings()
    }
  }, [user, loadUserBookings])

  // Other functions
  const bookClass = async (classId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          class_id: classId,
          payment_method: 'package'
        })
      })

      const data = await response.json().catch(() => ({}))

      if (response.ok) {
        setNotification({
          type: 'success',
          message: '¡Clase reservada exitosamente!'
        })
        loadClasses()
        loadUserBookings()
      } else {
        setNotification({
          type: 'error',
          message: data.message || 'Error al reservar la clase.'
        })
      }
    } catch (error) {
      console.error('Error booking class:', error)
      setNotification({
        type: 'error',
        message: 'Error al reservar la clase.'
      })
    }
  }

  const cancelBooking = async (classId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          class_id: classId
        })
      })

      const data = await response.json().catch(() => ({}))

      if (response.ok) {
        setNotification({
          type: 'success',
          message: 'Reserva cancelada exitosamente.'
        })
        loadClasses()
        loadUserBookings()
      } else {
        setNotification({
          type: 'error',
          message: data.message || 'Error al cancelar la reserva.'
        })
      }
    } catch (error) {
      console.error('Error canceling booking:', error)
      setNotification({
        type: 'error',
        message: 'Error al cancelar la reserva.'
      })
    }
  }

  const isUserBooked = (classId: string) => {
    return userBookings.some(booking => booking.class_id === classId && booking.status === 'confirmed')
  }

  const autoFillEndTime = (startTime: string, currentEndTime: string, setEndTime: (value: string) => void) => {
    if (!startTime || currentEndTime) return
    const [hourStr, minuteStr] = startTime.split(':')
    const hour = parseInt(hourStr, 10)
    const minute = parseInt(minuteStr, 10) || 0
    if (isNaN(hour)) return
    const endHour = (hour + 1) % 24
    const endTime = `${String(endHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    setEndTime(endTime)
  }

  const handleCreatePrivateClass = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (!privateClassClientId || !privateClassDate || !privateClassTime) {
      setNotification({
        type: 'error',
        message: 'Por favor selecciona un cliente, fecha y hora para la clase privada.'
      })
      return
    }

    if (coaches.length === 0) {
      setNotification({
        type: 'error',
        message: 'No hay coaches disponibles para asignar a la sesión privada.'
      })
      return
    }

    try {
      setIsCreatingPrivateClass(true)
      const token = localStorage.getItem('token')
      if (!token) {
        alert('No hay token de autenticación')
        return
      }

      const client = clients.find(c => c.id === privateClassClientId)

      // Auto-add scheduling coach/admin to coaches list by name
      const schedulingCoachName = user.nombre
      let sessionCoaches = [schedulingCoachName]

      // Ensure at least one coach and no more than 10
      sessionCoaches = Array.from(new Set(sessionCoaches)).slice(0, 10)

      let finalEndTime = privateClassEndTime
      if (!finalEndTime && privateClassTime) {
        // Auto-calc end time if missing
        const [hourStr, minuteStr] = privateClassTime.split(':')
        const hour = parseInt(hourStr, 10)
        const minute = parseInt(minuteStr, 10) || 0
        if (!isNaN(hour)) {
          const endHour = (hour + 1) % 24
          finalEndTime = `${String(endHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
        }
      }

      const response = await fetch(`${API_BASE_URL}/api/classes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: 'Clase Privada',
          type: 'private',
          coach_id: user.id,
          coach_name: user.nombre,
          client_id: privateClassClientId,
          client_name: client?.nombre || '',
          date: privateClassDate,
          time: privateClassTime,
          end_time: finalEndTime || null,
          duration: 60,
          description: `Sesión privada dirigida por ${schedulingCoachName} para ${client?.nombre || 'cliente'}.`,
          status: 'scheduled'
        })
      })

      const data = await response.json().catch(() => ({}))

      if (response.ok && data.success) {
        setNotification({
          type: 'success',
          message: 'Sesión privada creada exitosamente.'
        })
        setShowPrivateClassModal(false)
        setPrivateClassClientId('')
        setPrivateClassDate('')
        setPrivateClassTime('')
        setPrivateClassEndTime('')
        loadClasses()
      } else {
        setNotification({
          type: 'error',
          message: data.message || 'Error al crear la clase privada.'
        })
      }
    } catch (error) {
      console.error('Error creating private class:', error)
      setNotification({
        type: 'error',
        message: 'Error de conexión al crear la clase privada.'
      })
    } finally {
      setIsCreatingPrivateClass(false)
    }
  }

  const openEditModal = (cls: Class) => {
    setEditingClass(cls)
    setEditDate(cls.date || '')
    setEditTime(cls.time || '')
    setEditEndTime(cls.end_time || '')

    // For private classes, try to infer client from existing bookings if available
    setEditClientId('') // Will be managed via separate API if needed

    let instructorsList: string[] = []
    if (Array.isArray(cls.instructors)) {
      instructorsList = cls.instructors as string[]
    } else if (typeof (cls as any).instructors === 'string') {
      try {
        const parsed = JSON.parse((cls as any).instructors)
        instructorsList = Array.isArray(parsed) ? parsed : []
      } catch {
        instructorsList = []
      }
    }
    setEditInstructors(instructorsList.slice(0, 10))
    setEditInstructorInput('')
    setShowEditClassModal(true)
  }

  const handleSaveEditClass = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingClass) return

    try {
      setIsSavingEdit(true)
      const token = localStorage.getItem('token')
      if (!token) {
        alert('No hay token de autenticación')
        return
      }

      let finalEndTime = editEndTime
      if (!finalEndTime && editTime) {
        const [hourStr, minuteStr] = editTime.split(':')
        const hour = parseInt(hourStr, 10)
        const minute = parseInt(minuteStr, 10) || 0
        if (!isNaN(hour)) {
          const endHour = (hour + 1) % 24
          finalEndTime = `${String(endHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
        }
      }

      const updates: any = {
        date: editDate,
        time: editTime,
        end_time: finalEndTime || null,
        instructors: editInstructors
      }

      const response = await fetch(`${API_BASE_URL}/api/classes/${editingClass.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.success) {
        setNotification({
          type: 'error',
          message: data.message || 'Error al actualizar la clase.'
        })
        return
      }

      // If client changed for private class, assign new client
      if (editingClass.type === 'private' && editClientId) {
        await fetch(`${API_BASE_URL}/api/classes/${editingClass.id}/assign-client`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ client_id: editClientId })
        }).catch(err => {
          console.error('Error assigning client to class:', err)
        })
      }

      setNotification({
        type: 'success',
        message: 'Clase actualizada exitosamente.'
      })
      setShowEditClassModal(false)
      setEditingClass(null)
      loadClasses()
    } catch (error) {
      console.error('Error saving class edit:', error)
      setNotification({
        type: 'error',
        message: 'Error de conexión al actualizar la clase.'
      })
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleCancelClass = async (cls: Class) => {
    setConfirmAction({ type: 'cancel', cls })
  }

  const performCancelClass = async (cls: Class) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        alert('No hay token de autenticación')
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/classes/${cls.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'cancelled' })
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.success) {
        setNotification({
          type: 'error',
          message: data.message || 'Error al cancelar la clase.'
        })
        return
      }

      setNotification({
        type: 'success',
        message: 'Clase cancelada exitosamente.'
      })
      loadClasses()
    } catch (error) {
      console.error('Error cancelling class:', error)
      setNotification({
        type: 'error',
        message: 'Error de conexión al cancelar la clase.'
      })
    }
  }

  const handleDeleteClass = (cls: Class) => {
    setConfirmAction({ type: 'delete', cls })
  }

  const performDeleteClass = async (cls: Class) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setNotification({
          type: 'error',
          message: 'No hay token de autenticación.'
        })
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/classes/${cls.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.success) {
        setNotification({
          type: 'error',
          message: data.message || 'Error al eliminar la clase.'
        })
        return
      }

      setNotification({
        type: 'success',
        message: 'Clase eliminada exitosamente.'
      })
      loadClasses()
    } catch (error) {
      console.error('Error deleting class:', error)
      setNotification({
        type: 'error',
        message: 'Error de conexión al eliminar la clase.'
      })
    }
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
  }

  const getClassesForDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    
    return classes.filter(cls => {
      if (!cls.date) return false
      const classDate = cls.date.split('T')[0]
      return classDate === dateStr
    }).sort((a, b) => {
      if (a.time && b.time) {
        return a.time.localeCompare(b.time)
      }
      return 0
    })
  }

  const getAvailabilityColor = (classItem: Class) => {
    const percentage = (classItem.current_bookings / classItem.max_capacity) * 100
    if (percentage >= 100) return 'bg-red-500'
    if (percentage >= 80) return 'bg-amber-500'
    if (percentage >= 60) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  // Early return for loading state
  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando...</p>
          </div>
        </div>

        {/* Modal de confirmación para cancelar / eliminar clase */}
        {confirmAction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9500]" onClick={() => setConfirmAction(null)}>
            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {confirmAction.type === 'cancel' ? 'Confirmar cancelación' : 'Confirmar eliminación'}
              </h3>
              <p className="text-sm text-gray-700 mb-4">
                {confirmAction.type === 'cancel'
                  ? '¿Estás seguro de que deseas cancelar esta clase? Los clientes verán esta sesión como cancelada en su calendario.'
                  : '¿Estás seguro de que deseas eliminar esta clase? Esta acción la removerá de todos los calendarios y registros visibles, lo que podría generar confusión en los clientes si la sesión ya estaba acordada. Se recomienda usar esta opción solo para corregir errores de programación evidentes.'}
              </p>
              <div className="mt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
                >
                  Volver
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const action = confirmAction
                    setConfirmAction(null)
                    if (!action) return
                    if (action.type === 'cancel') {
                      performCancelClass(action.cls)
                    } else {
                      performDeleteClass(action.cls)
                    }
                  }}
                  className={`px-4 py-2 text-sm rounded-lg ${
                    confirmAction.type === 'cancel'
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-red-700 text-white hover:bg-red-800'
                  }`}
                >
                  {confirmAction.type === 'cancel' ? 'Cancelar clase' : 'Eliminar clase'}
                </button>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header elegante */}
        <div className="relative overflow-hidden bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-3xl p-8 text-white">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                {user?.role === 'cliente' ? 'Agenda tu Clase' : 'Gestión de Clases'}
              </h1>
              <p className="text-gray-300 text-lg">
                {user?.role === 'cliente' 
                  ? 'Reserva tus clases y mantén el control de tu rutina' 
                  : 'Administra todas las clases y horarios del estudio'
                }
              </p>
            </div>
            
            <div className="mt-6 sm:mt-0 flex flex-wrap gap-3">
              {(user.role === 'admin' || user.role === 'coach') && (
                <button
                  onClick={() => setShowPrivateClassModal(true)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 flex items-center space-x-2 transition-all duration-200 hover:scale-105"
                >
                  <Plus className="h-5 w-5" />
                  <span>Nueva Clase</span>
                </button>
              )}
              
              <div className="flex bg-white/10 backdrop-blur-sm rounded-xl p-1">
                <button
                  onClick={() => setActiveView('calendar')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeView === 'calendar' 
                      ? 'bg-white text-gray-900 shadow-lg' 
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Calendar className="h-4 w-4 inline mr-2" />
                  Calendario
                </button>
                <button
                  onClick={() => setActiveView('list')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeView === 'list' 
                      ? 'bg-white text-gray-900 shadow-lg' 
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Users className="h-4 w-4 inline mr-2" />
                  Lista
                </button>
              </div>
            </div>
          </div>
          
          {/* Decoración sutil */}
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/5 rounded-full"></div>
          <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/5 rounded-full"></div>
        </div>


        {/* Notificaciones */}
        {notification && (
          <div
            className={`mt-4 p-3 rounded-lg text-sm ${
              notification.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {notification.message}
          </div>
        )}

        {/* Calendar View */}
        {activeView === 'calendar' && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Calendar Header */}
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                </h2>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => navigateMonth('prev')}
                    className="p-3 hover:bg-gray-200 rounded-xl transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setCurrentDate(new Date())}
                    className="px-4 py-2 text-sm bg-gray-900 text-white hover:bg-gray-800 rounded-xl transition-colors"
                  >
                    Hoy
                  </button>
                  <button
                    onClick={() => navigateMonth('next')}
                    className="p-3 hover:bg-gray-200 rounded-xl transition-colors"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="p-6">
              <div className="grid grid-cols-7 gap-2 mb-6">
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                  <div key={day} className="p-3 text-center text-sm font-semibold text-gray-600 bg-gray-50 rounded-lg">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-2">
                {days.map((day, index) => {
                  if (!day) {
                    return <div key={index} className="h-32"></div>
                  }
                  
                  const dayClasses = getClassesForDate(day)
                  const isToday = day.toDateString() === new Date().toDateString()
                  const isSelected = selectedDate && day.toDateString() === selectedDate.toDateString()
                  
                  return (
                    <div
                      key={day.getTime()}
                      className={`min-h-32 p-2 border-2 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md ${
                        isToday 
                          ? 'border-blue-500 bg-blue-50' 
                          : isSelected 
                            ? 'border-gray-400 bg-gray-50' 
                            : 'border-gray-200 hover:border-gray-300'
                      } ${dayClasses.length > 0 ? 'h-auto' : 'h-32'}`}
                      onClick={() => {
                        if (user.role === 'admin' || user.role === 'coach') {
                          setSelectedDate(day)
                        }
                      }}
                    >
                      <div className="text-sm font-semibold text-gray-900 mb-2">
                        {day.getDate()}
                      </div>
                      <div className="space-y-1">
                        {dayClasses.slice(0, user.role === 'cliente' ? 2 : 3).map(cls => {
                          const isCancelled = cls.status === 'cancelled'
                          return (
                          <div
                            key={cls.id}
                            className={`space-y-1 rounded-lg p-1 ${
                              isCancelled ? 'bg-red-50 border border-red-200' : ''
                            }`}
                          >
                            {user.role === 'cliente' ? (
                              <>
                                <div
                                  className={`text-xs px-2 py-1 rounded ${getAvailabilityColor(cls)} text-white truncate ${isCancelled ? 'line-through opacity-70' : ''}`}
                                >
                                  {cls.time}{cls.end_time ? ` - ${cls.end_time}` : ''}
                                </div>
                                <div className="flex justify-center">
                                  {isUserBooked(cls.id) ? (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        cancelBooking(cls.id)
                                      }}
                                      className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 transition-colors"
                                    >
                                      Cancelar
                                    </button>
                                  ) : (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        bookClass(cls.id)
                                      }}
                                      disabled={cls.current_bookings >= cls.max_capacity}
                                      className={`text-xs px-2 py-1 rounded transition-colors ${
                                        cls.current_bookings >= cls.max_capacity
                                          ? 'bg-gray-400 text-white cursor-not-allowed'
                                          : 'bg-green-500 text-white hover:bg-green-600'
                                      }`}
                                    >
                                      {cls.current_bookings >= cls.max_capacity ? 'Llena' : 'Reservar'}
                                    </button>
                                  )}
                                </div>
                              </>
                            ) : (
                              <div 
                                className={`text-xs px-2 py-1 rounded ${getAvailabilityColor(cls)} text-white truncate cursor-pointer hover:opacity-80 transition-opacity ${isCancelled ? 'line-through bg-red-400/80' : ''}`}
                                title={`${cls.time}${cls.end_time ? ` - ${cls.end_time}` : ''} - ${cls.current_bookings}/${cls.max_capacity} reservas - ${cls.coach_name}`}
                              >
                                {cls.time}{cls.end_time ? ` - ${cls.end_time}` : ''} ({cls.current_bookings}/{cls.max_capacity})
                              </div>
                            )}
                          </div>
                          )})}
                        {dayClasses.length > (user.role === 'cliente' ? 2 : 3) && (
                          <div className="text-xs text-gray-500 font-medium">
                            +{dayClasses.length - (user.role === 'cliente' ? 2 : 3)} más
                          </div>
                        )}
                        {dayClasses.length === 0 && (
                          <div className="text-xs text-gray-400 italic">
                            Sin clases
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Modal para ver clases del día seleccionado (solo para admin/coach) */}
        {selectedDate && activeView === 'calendar' && (user.role === 'admin' || user.role === 'coach') && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedDate(null)}>
            <div className="bg-white rounded-2xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  Clases del {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </h3>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-3">
                {getClassesForDate(selectedDate).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>No hay clases programadas para este día</p>
                  </div>
                ) : (
                  getClassesForDate(selectedDate).map((cls) => (
                    <div key={cls.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4 mb-2">
                            <h4 className="font-semibold text-gray-900">{cls.title}</h4>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              cls.type === 'group' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                              {cls.type === 'group' ? 'Grupal' : 'Privada'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {cls.time}
                            </span>
                            <span>Duración: {cls.duration} min</span>
                            <span>Coach: {cls.coach_name}</span>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              cls.status === 'scheduled' ? 'bg-green-100 text-green-800' :
                              cls.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {cls.status === 'scheduled' ? 'Programada' :
                               cls.status === 'completed' ? 'Completada' : 'Cancelada'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4 text-right space-y-2">
                          <div className="text-sm font-semibold text-gray-900 mb-1">
                            {cls.current_bookings}/{cls.max_capacity} reservas
                          </div>
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                (cls.current_bookings / cls.max_capacity) >= 1 ? 'bg-red-500' :
                                (cls.current_bookings / cls.max_capacity) >= 0.8 ? 'bg-amber-500' :
                                (cls.current_bookings / cls.max_capacity) >= 0.6 ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`}
                              style={{ width: `${Math.min((cls.current_bookings / cls.max_capacity) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                        {(user.role === 'admin' || user.role === 'coach') && (
                          <div className="mt-3 flex items-center justify-end space-x-3 text-sm">
                            <button
                              type="button"
                              onClick={() => openEditModal(cls)}
                              className="px-3 py-1 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCancelClass(cls)}
                              className="px-3 py-1 rounded-lg border border-red-300 text-red-600 hover:bg-red-50"
                            >
                              Cancelar clase
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteClass(cls)}
                              className="px-3 py-1 rounded-lg border border-red-500 text-red-700 hover:bg-red-50"
                            >
                              Eliminar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* List View */}
        {activeView === 'list' && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* List Header */}
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
              <h2 className="text-2xl font-bold text-gray-900">
                Lista de Clases
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {classes.length} {classes.length === 1 ? 'clase disponible' : 'clases disponibles'}
              </p>
            </div>

            {/* List Content */}
            <div className="p-6">
              {classes.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium">No hay clases disponibles</p>
                  <p className="text-sm text-gray-400 mt-2">Las clases aparecerán aquí cuando estén programadas</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {classes.map((cls, index) => {
                    const isCancelled = cls.status === 'cancelled'
                    return (
                    <motion.div 
                      key={cls.id} 
                      className={`group relative border-2 rounded-xl p-6 hover:shadow-lg transition-all duration-300 ${
                        isCancelled
                          ? 'bg-red-50 border-red-300 hover:border-red-400'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4 mb-3">
                            <h4 className={`text-lg font-semibold ${isCancelled ? 'text-red-800 line-through' : 'text-gray-900'}`}>
                              {cls.title || (cls.type === 'private'
                                ? `${(clients.find(c => c.id === (cls as any).client_id)?.nombre || 'Cliente')} - Sesión Privada`
                                : 'Clase')}
                            </h4>
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                              cls.type === 'group' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                              {cls.type === 'group' ? 'Grupal' : 'Privada'}
                            </span>
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                              cls.status === 'scheduled' ? 'bg-green-100 text-green-800' :
                              cls.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                              'bg-red-200 text-red-900 border border-red-400'
                            }`}>
                              {cls.status === 'scheduled' ? 'Programada' :
                               cls.status === 'completed' ? 'Completada' : 'Cancelada'}
                            </span>
                          </div>
                          
                          <div className="flex items-center flex-wrap gap-4 text-sm text-gray-600">
                            <span className={`flex items-center ${isCancelled ? 'line-through text-red-700' : ''}`}>
                              <Calendar className="h-4 w-4 mr-1.5 text-gray-500" />
                              {new Date(cls.date + 'T00:00:00').toLocaleDateString('es-ES', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}
                            </span>
                            <span className={`flex items-center ${isCancelled ? 'line-through text-red-700' : ''}`}>
                              <Clock className="h-4 w-4 mr-1.5 text-gray-500" />
                              {cls.time}{cls.end_time ? ` - ${cls.end_time}` : ''}
                            </span>
                            {isCancelled && (
                              <span className="text-xs text-red-700 font-medium">
                                Esta clase ha sido cancelada.
                              </span>
                            )}
                            <span>Duración: {cls.duration} min</span>
                            <span>Coach: {cls.coach_name || 'No asignado'}</span>
                          </div>
                        </div>
                        
                        <div className="ml-6 flex items-center space-x-6">
                          <div className="text-right">
                            <div className="text-sm font-semibold text-gray-900 mb-1">
                              {cls.current_bookings}/{cls.max_capacity} reservas
                            </div>
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  (cls.current_bookings / cls.max_capacity) >= 1 ? 'bg-red-500' :
                                  (cls.current_bookings / cls.max_capacity) >= 0.8 ? 'bg-amber-500' :
                                  (cls.current_bookings / cls.max_capacity) >= 0.6 ? 'bg-yellow-500' :
                                  'bg-green-500'
                                }`}
                                style={{ width: `${Math.min((cls.current_bookings / cls.max_capacity) * 100, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                          
                          {/* Acciones según el rol */}
                          {user.role === 'cliente' && (
                            <div>
                              {isUserBooked(cls.id) ? (
                                <button
                                  onClick={() => cancelBooking(cls.id)}
                                  className="bg-red-500 text-white px-6 py-2.5 rounded-xl hover:bg-red-600 transition-all duration-200 hover:scale-105 font-medium"
                                >
                                  Cancelar
                                </button>
                              ) : (
                                <button
                                  onClick={() => bookClass(cls.id)}
                                  disabled={cls.current_bookings >= cls.max_capacity}
                                  className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-200 hover:scale-105 ${
                                    cls.current_bookings >= cls.max_capacity
                                      ? 'bg-gray-400 text-white cursor-not-allowed'
                                      : 'bg-green-500 text-white hover:bg-green-600'
                                  }`}
                                >
                                  {cls.current_bookings >= cls.max_capacity ? 'Llena' : 'Reservar'}
                                </button>
                              )}
                            </div>
                          )}
                          
                          {(user.role === 'admin' || user.role === 'coach') && (
                            <div className="text-sm text-gray-500 space-y-1">
                              <div className="flex items-center space-x-2">
                                <div className={`w-3 h-3 rounded-full ${
                                  (cls.current_bookings / cls.max_capacity) >= 1 ? 'bg-red-500' :
                                  (cls.current_bookings / cls.max_capacity) >= 0.8 ? 'bg-amber-500' :
                                  (cls.current_bookings / cls.max_capacity) >= 0.6 ? 'bg-yellow-500' :
                                  'bg-green-500'
                                }`}></div>
                                <span>
                                  {Math.round((cls.current_bookings / cls.max_capacity) * 100)}% ocupación
                                </span>
                              </div>
                              {Array.isArray((cls as any).instructors) && (cls as any).instructors.length > 0 && (
                                <div className="flex flex-wrap gap-1 text-xs text-gray-500">
                                  <span className="font-medium mr-1">Instructores:</span>
                                  {(cls as any).instructors.map((inst: string, idx: number) => (
                                    <span key={idx} className="px-2 py-0.5 bg-gray-100 rounded-full">
                                      {inst}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal para crear clase privada */}
        {showPrivateClassModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9000]" onClick={() => setShowPrivateClassModal(false)}>
            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Crear Clase Privada</h3>
              
              <form onSubmit={handleCreatePrivateClass}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cliente
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={privateClassClientId}
                      onChange={(e) => setPrivateClassClientId(e.target.value)}
                    >
                      <option value="">Seleccionar cliente</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>
                          {client.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={privateClassDate}
                      onChange={(e) => setPrivateClassDate(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hora de inicio
                    </label>
                    <input
                      type="time"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={privateClassTime}
                      onChange={(e) => setPrivateClassTime(e.target.value)}
                      onBlur={() => autoFillEndTime(privateClassTime, privateClassEndTime, setPrivateClassEndTime)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hora de término
                    </label>
                    <input
                      type="time"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={privateClassEndTime}
                      onChange={(e) => setPrivateClassEndTime(e.target.value)}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Si dejas este campo vacío, se establecerá automáticamente 1 hora después de la hora de inicio.
                    </p>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowPrivateClassModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingPrivateClass}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isCreatingPrivateClass ? 'Creando...' : 'Crear Clase'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal para editar clase */}
        {showEditClassModal && editingClass && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9000]" onClick={() => setShowEditClassModal(false)}>
            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Editar Clase</h3>
              
              <form onSubmit={handleSaveEditClass}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hora de inicio
                    </label>
                    <input
                      type="time"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={editTime}
                      onChange={(e) => setEditTime(e.target.value)}
                      onBlur={() => autoFillEndTime(editTime, editEndTime, setEditEndTime)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hora de término
                    </label>
                    <input
                      type="time"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={editEndTime}
                      onChange={(e) => setEditEndTime(e.target.value)}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Si dejas este campo vacío, se establecerá automáticamente 1 hora después de la hora de inicio.
                    </p>
                  </div>

                  {editingClass.type === 'private' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cliente (para quién es la clase)
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={editClientId}
                        onChange={(e) => setEditClientId(e.target.value)}
                      >
                        <option value="">(No cambiar)</option>
                        {clients.map(client => (
                          <option key={client.id} value={client.id}>
                            {client.nombre}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        Si no seleccionas un cliente, se mantendrá el actual.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Instructores (máx. 10)
                    </label>
                    <div className="flex space-x-2 mb-2">
                      <input
                        type="text"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={editInstructorInput}
                        onChange={(e) => setEditInstructorInput(e.target.value)}
                        placeholder="Nombre del instructor"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const name = editInstructorInput.trim()
                          if (!name) return
                          if (editInstructors.length >= 10) {
                            alert('Máximo 10 instructores por sesión')
                            return
                          }
                          setEditInstructors([...editInstructors, name])
                          setEditInstructorInput('')
                        }}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      >
                        Añadir
                      </button>
                    </div>
                    {editInstructors.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {editInstructors.map((inst, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-700"
                          >
                            {inst}
                            <button
                              type="button"
                              onClick={() => {
                                setEditInstructors(editInstructors.filter((_, i) => i !== idx))
                              }}
                              className="ml-1 text-gray-500 hover:text-gray-700"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditClassModal(false)
                      setEditingClass(null)
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSavingEdit ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
