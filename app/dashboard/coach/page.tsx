'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Clock, Users, CheckCircle, XCircle, AlertCircle, TrendingUp, DollarSign } from 'lucide-react'
import DashboardLayout from '@/components/DashboardLayout'

interface CoachClass {
  id: string
  title: string
  date: string
  time: string
  type: string
  max_capacity: number
  current_bookings: number
  status: string
}

interface AttendanceRecord {
  id: string
  class_date: string
  class_time: string
  students_attended: number
  total_students: number
  status: string
}

interface CoachStats {
  totalClasses: number
  totalStudents: number
  attendanceRate: number
  monthlyEarnings: number
}

export default function CoachDashboard() {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''
  const [user, setUser] = useState<any>(null)
  const [classes, setClasses] = useState<CoachClass[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [stats, setStats] = useState<CoachStats>({
    totalClasses: 0,
    totalStudents: 0,
    attendanceRate: 0,
    monthlyEarnings: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
    loadCoachData()
  }, [])

  const loadCoachData = async () => {
    try {
      const token = localStorage.getItem('token')
      
      // Cargar clases del coach
      const classesResponse = await fetch('${API_BASE_URL}/api/classes', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (classesResponse.ok) {
        const classesData = await classesResponse.json()
        const coachClasses = classesData.classes.filter((cls: any) => 
          cls.coach_name === user?.nombre
        )
        setClasses(coachClasses)
      }

      // Cargar estadísticas de asistencia
      const attendanceResponse = await fetch('${API_BASE_URL}/api/attendance', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (attendanceResponse.ok) {
        const attendanceData = await attendanceResponse.json()
        const coachAttendance = attendanceData.attendance.filter((att: any) => 
          att.coach_name === user?.nombre
        )
        setAttendance(coachAttendance)
      }

      // Calcular estadísticas
      calculateStats()
      
    } catch (error) {
      console.error('Error loading coach data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateStats = () => {
    const today = new Date()
    const thisMonth = today.getMonth()
    const thisYear = today.getFullYear()

    // Clases del mes actual
    const monthlyClasses = classes.filter(cls => {
      const classDate = new Date(cls.date)
      return classDate.getMonth() === thisMonth && classDate.getFullYear() === thisYear
    })

    // Estadísticas de asistencia
    const totalStudents = attendance.reduce((sum, att) => sum + att.total_students, 0)
    const attendedStudents = attendance.reduce((sum, att) => sum + att.students_attended, 0)
    const attendanceRate = totalStudents > 0 ? Math.round((attendedStudents / totalStudents) * 100) : 0

    // Cálculo de ganancias mensuales (reglas: $250 primeras 3 personas, $40 adicionales)
    const monthlyEarnings = calculateMonthlyEarnings(stats.totalStudents)

    setStats({
      totalClasses: monthlyClasses.length,
      totalStudents: attendedStudents,
      attendanceRate,
      monthlyEarnings
    })
  }

  const calculateMonthlyEarnings = (studentCount: number) => {
    const firstThreeStudents = Math.min(studentCount, 3)
    const additionalStudents = Math.max(0, studentCount - 3)
    
    return (firstThreeStudents * 250) + (additionalStudents * 40)
  }

  const getUpcomingClasses = () => {
    const today = new Date()
    return classes
      .filter(cls => new Date(cls.date) >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5)
  }

  const getRecentAttendance = () => {
    return attendance
      .sort((a, b) => new Date(b.class_date).getTime() - new Date(a.class_date).getTime())
      .slice(0, 5)
  }

  if (!user || user.role !== 'coach') {
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
            <p className="text-gray-600">Cargando dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard Coach</h1>
              <p className="text-gray-600 mt-1">
                Bienvenida, {user.nombre}. Aquí tienes un resumen de tus clases y estadísticas.
              </p>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Calendar className="h-4 w-4" />
              <span>{new Date().toLocaleDateString('es-ES')}</span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div 
            className="bg-white rounded-lg shadow p-6"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Clases Este Mes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalClasses}</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            className="bg-white rounded-lg shadow p-6"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Estudiantes Atendidos</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            className="bg-white rounded-lg shadow p-6"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Tasa de Asistencia</p>
                <p className="text-2xl font-bold text-gray-900">{stats.attendanceRate}%</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            className="bg-white rounded-lg shadow p-6"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ganancias del Mes</p>
                <p className="text-2xl font-bold text-gray-900">${stats.monthlyEarnings}</p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Próximas Clases */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Próximas Clases</h2>
              <p className="text-sm text-gray-600 mt-1">Tus clases programadas</p>
            </div>
            
            <div className="p-6">
              {getUpcomingClasses().length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No tienes clases programadas</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {getUpcomingClasses().map((cls) => (
                    <motion.div
                      key={cls.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                      whileHover={{ scale: 1.01 }}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Calendar className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{cls.title}</h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>{new Date(cls.date).toLocaleDateString('es-ES')}</span>
                            <span>{cls.time}</span>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              cls.type === 'group' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                              {cls.type === 'group' ? 'Grupal' : 'Privada'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">
                          {cls.current_bookings}/{cls.max_capacity} estudiantes
                        </div>
                        <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${(cls.current_bookings / cls.max_capacity) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Asistencia Reciente */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Asistencia Reciente</h2>
              <p className="text-sm text-gray-600 mt-1">Últimas clases impartidas</p>
            </div>
            
            <div className="p-6">
              {getRecentAttendance().length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No hay registros de asistencia</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {getRecentAttendance().map((att) => (
                    <motion.div
                      key={att.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                      whileHover={{ scale: 1.01 }}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                          <CheckCircle className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">Clase Impartida</h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>{new Date(att.class_date).toLocaleDateString('es-ES')}</span>
                            <span>{att.class_time}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">
                          {att.students_attended}/{att.total_students} asistieron
                        </div>
                        <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${(att.students_attended / att.total_students) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Payment Info */}
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">💰 Información de Pagos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-semibold mb-2">Reglas de Pago:</h4>
              <ul className="space-y-1">
                <li>• Primeras 3 personas del mes: $250 MXN cada una</li>
                <li>• Personas adicionales: $40 MXN cada una</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Este Mes:</h4>
              <ul className="space-y-1">
                <li>• Estudiantes únicos: {stats.totalStudents}</li>
                <li>• Ganancias estimadas: ${stats.monthlyEarnings} MXN</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-100 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Nota:</strong> Los pagos se calculan por persona única que asiste a tus clases, no por clase impartida.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
