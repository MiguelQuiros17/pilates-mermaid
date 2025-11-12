'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Clock, Users, Calendar, User, AlertCircle } from 'lucide-react'
import DashboardLayout from '@/components/DashboardLayout'

interface Class {
  id: string
  title: string
  date: string
  time: string
  coach_name: string
  type: string
  max_capacity: number
  current_bookings: number
}

interface Booking {
  id: string
  user_id: string
  class_id: string
  status: string
  user_name: string
  user_email: string
}

interface AttendanceRecord {
  id: string | number
  user_id?: string
  clientId?: string
  class_id?: string
  classId?: string
  user_name?: string
  clientName?: string
  status: 'attended' | 'no_show' | 'cancelled' | 'absent' | 'late_cancellation' | 'studio_cancelled'
  reason?: string
  cancellation_reason?: string
  notes?: string
}

export default function AttendancePage() {
  const [user, setUser] = useState<any>(null)
  const [classes, setClasses] = useState<Class[]>([])
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
    loadClasses()
  }, [])

  const loadClasses = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('token')
      
      // Filtrar solo clases del mes actual y futuras
      const today = new Date()
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      const firstDayStr = firstDayOfMonth.toISOString().split('T')[0]
      const lastDayStr = lastDayOfMonth.toISOString().split('T')[0]
      
      const response = await fetch(`http://localhost:3001/api/classes?filter=current_month`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        // Filtrar solo clases futuras o del día actual
        const now = new Date()
        const filteredClasses = (data.classes || []).filter((cls: Class) => {
          const classDate = new Date(`${cls.date}T${cls.time}`)
          return classDate >= now
        })
        setClasses(filteredClasses)
      }
    } catch (error) {
      console.error('Error loading classes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadClassBookings = async (classId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:3001/api/classes/${classId}/bookings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setBookings(data.bookings || [])
      }
    } catch (error) {
      console.error('Error loading bookings:', error)
    }
  }

  const loadAttendanceRecords = async (classId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:3001/api/attendance/class/${classId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setAttendanceRecords(data.attendance || [])
      }
    } catch (error) {
      console.error('Error loading attendance:', error)
    }
  }

  const handleClassSelect = (classItem: Class) => {
    setSelectedClass(classItem)
    loadClassBookings(classItem.id)
    loadAttendanceRecords(classItem.id)
  }

  const handleAttendanceChange = async (bookingId: string, status: 'attended' | 'no_show' | 'cancelled' | 'late_cancellation' | 'studio_cancelled', reason?: string, notes?: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:3001/api/attendance/record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          bookingId,
          status,
          reason,
          notes
        })
      })

      if (response.ok) {
        const data = await response.json()
        alert(data.message || 'Asistencia registrada exitosamente')
        // Recargar los registros de asistencia y las reservas
        if (selectedClass) {
          await loadAttendanceRecords(selectedClass.id)
          await loadClassBookings(selectedClass.id)
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Error al registrar la asistencia' }))
        alert(errorData.message || 'Error al registrar la asistencia')
      }
    } catch (error) {
      console.error('Error recording attendance:', error)
      alert('Error al registrar la asistencia. Por favor, intenta de nuevo.')
    }
  }

  const getAttendanceStatus = (clientId: string) => {
    const record = attendanceRecords.find(r => r.clientId === clientId || r.user_id === clientId)
    return record ? record.status : null
  }

  const getAttendanceReason = (clientId: string) => {
    const record = attendanceRecords.find(r => r.clientId === clientId || r.user_id === clientId)
    return record ? (record.reason || record.cancellation_reason) : null
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'attended': return 'text-green-600 bg-green-100'
      case 'no_show': return 'text-red-600 bg-red-100'
      case 'cancelled': 
      case 'late_cancellation': return 'text-yellow-600 bg-yellow-100'
      case 'absent': return 'text-gray-600 bg-gray-100'
      case 'studio_cancelled': return 'text-orange-600 bg-orange-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'attended': return 'Asistió'
      case 'no_show': return 'No asistió'
      case 'cancelled': 
      case 'late_cancellation': return 'Canceló'
      case 'absent': return 'Ausente'
      case 'studio_cancelled': return 'Cancelada por estudio'
      default: return 'Pendiente'
    }
  }

  if (!user || (user.role !== 'admin' && user.role !== 'coach')) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600">No tienes permisos para acceder a esta página</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando clases...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Toma de Asistencia</h1>
              <p className="text-gray-600 mt-1">
                Registra la asistencia de los estudiantes a las clases
              </p>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Calendar className="h-4 w-4" />
              <span>{new Date().toLocaleDateString('es-ES')}</span>
            </div>
          </div>
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
          {/* Left Column - Classes List */}
          <div className="bg-white rounded-lg shadow flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-900">Clases Disponibles</h2>
              <p className="text-sm text-gray-600 mt-1">Selecciona una clase para tomar asistencia</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {classes.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No hay clases disponibles</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {classes.map((classItem) => (
                    <motion.div
                      key={classItem.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                        selectedClass?.id === classItem.id
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                      }`}
                      onClick={() => handleClassSelect(classItem)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 text-sm">{classItem.title}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          classItem.type === 'group' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {classItem.type === 'group' ? 'Grupal' : 'Privada'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1.5 flex-shrink-0" />
                          <span className="truncate">{new Date(classItem.date).toLocaleDateString('es-ES')}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1.5 flex-shrink-0" />
                          <span>{classItem.time}</span>
                        </div>
                        <div className="flex items-center">
                          <User className="h-3 w-3 mr-1.5 flex-shrink-0" />
                          <span className="truncate">{classItem.coach_name}</span>
                        </div>
                        <div className="flex items-center">
                          <Users className="h-3 w-3 mr-1.5 flex-shrink-0" />
                          <span>{classItem.current_bookings}/{classItem.max_capacity}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Attendance Form */}
          <div className="bg-white rounded-lg shadow flex flex-col overflow-hidden">
            {selectedClass ? (
              <>
                <div className="p-6 border-b border-gray-200 flex-shrink-0">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Asistencia - {selectedClass.title}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {new Date(selectedClass.date).toLocaleDateString('es-ES', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })} a las {selectedClass.time}
                  </p>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6">
                  {bookings.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg font-medium">No hay estudiantes registrados</p>
                      <p className="text-gray-400 text-sm mt-2">Los estudiantes aparecerán aquí cuando se registren en esta clase</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {bookings.map((booking) => {
                        const attendanceStatus = getAttendanceStatus(booking.user_id)
                        const attendanceReason = getAttendanceReason(booking.user_id)
                        
                        return (
                          <motion.div
                            key={booking.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow bg-white"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 text-sm mb-1">{booking.user_name}</h3>
                                <p className="text-xs text-gray-600 truncate">{booking.user_email}</p>
                                {attendanceReason && (
                                  <p className="text-xs text-gray-500 mt-1.5 bg-gray-50 px-2 py-1 rounded">
                                    {attendanceReason}
                                  </p>
                                )}
                              </div>
                              
                              <div className="flex-shrink-0">
                                {attendanceStatus ? (
                                  <div className="flex flex-col items-end space-y-2">
                                    <span className={`px-3 py-1.5 text-xs font-medium rounded-full ${getStatusColor(attendanceStatus)}`}>
                                      {getStatusText(attendanceStatus)}
                                    </span>
                                    <button
                                      onClick={() => {
                                        const newStatus = prompt('Cambiar estado:\n1. attended\n2. no_show\n3. cancelled\n4. late_cancellation\n5. studio_cancelled') as 'attended' | 'no_show' | 'cancelled' | 'late_cancellation' | 'studio_cancelled' | null
                                        if (newStatus && ['attended', 'no_show', 'cancelled', 'late_cancellation', 'studio_cancelled'].includes(newStatus)) {
                                          const reason = prompt('Razón (opcional):') || undefined
                                          handleAttendanceChange(booking.id, newStatus, reason)
                                        }
                                      }}
                                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                                    >
                                      Cambiar
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-2">
                                    <button
                                      onClick={() => handleAttendanceChange(booking.id, 'attended')}
                                      className="flex items-center justify-center px-3 py-1.5 text-xs font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors whitespace-nowrap"
                                    >
                                      <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                                      Asistió
                                    </button>
                                    <button
                                      onClick={() => {
                                        const reason = prompt('Razón de la ausencia (opcional):') || undefined
                                        handleAttendanceChange(booking.id, 'no_show', reason)
                                      }}
                                      className="flex items-center justify-center px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors whitespace-nowrap"
                                    >
                                      <XCircle className="h-3.5 w-3.5 mr-1.5" />
                                      No asistió
                                    </button>
                                    <button
                                      onClick={() => {
                                        const reason = prompt('Razón de la cancelación (opcional):') || undefined
                                        handleAttendanceChange(booking.id, 'cancelled', reason)
                                      }}
                                      className="flex items-center justify-center px-3 py-1.5 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors whitespace-nowrap"
                                    >
                                      <Clock className="h-3.5 w-3.5 mr-1.5" />
                                      Canceló
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-12">
                <div className="text-center">
                  <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg font-medium">Selecciona una clase</p>
                  <p className="text-gray-400 text-sm mt-2">Elige una clase de la lista para comenzar a tomar asistencia</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}