'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Calendar, Clock, Users, Plus, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import DashboardLayout from '@/components/DashboardLayout'
import { Class, User } from '@/types'
import { useTranslation } from '@/hooks/useTranslation'

export default function ClassesPage(): JSX.Element {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''
  const { language } = useTranslation()

  // Function to decode HTML entities
  const decodeHtmlEntities = (text: string): string => {
    if (!text || typeof text !== 'string') return text
    if (typeof document === 'undefined') {
      // Server-side fallback
      return text
        .replace(/&#x27;/g, "'")
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
    }
    const textarea = document.createElement('textarea')
    textarea.innerHTML = text
    return textarea.value
  }

  // State declarations
  const [user, setUser] = useState<User | null>(null)
  const [classes, setClasses] = useState<Class[]>([])
  const [clients, setClients] = useState<User[]>([])
  const [coaches, setCoaches] = useState<User[]>([])
  const [activeView, setActiveView] = useState<'calendar' | 'list'>('calendar')
  const [calendarMode, setCalendarMode] = useState<'month' | 'week'>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showPrivateClassModal, setShowPrivateClassModal] = useState(false)
  const [classType, setClassType] = useState<'group' | 'private'>('private')
  const [privateClassClientId, setPrivateClassClientId] = useState<string>('')
  const [groupClassClientIds, setGroupClassClientIds] = useState<string[]>([])
  const [groupClassClientSearch, setGroupClassClientSearch] = useState<string>('')
  const [privateClassDate, setPrivateClassDate] = useState<string>('')
  const [privateClassTime, setPrivateClassTime] = useState<string>('')
  const [privateClassEndTime, setPrivateClassEndTime] = useState<string>('')
  const [privateClassCoachId, setPrivateClassCoachId] = useState<string>('')
  const [privateClassTitle, setPrivateClassTitle] = useState<string>('')
  const [privateClassDescription, setPrivateClassDescription] = useState<string>('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string>('')
  const [recurrenceDaysOfWeek, setRecurrenceDaysOfWeek] = useState<number[]>([]) // 0=Sunday, 1=Monday, ..., 6=Saturday
  const [groupMaxCapacity, setGroupMaxCapacity] = useState<number>(10)
  const [isPublic, setIsPublic] = useState(true)
  const [walkInsWelcome, setWalkInsWelcome] = useState(true)
  const [isCreatingPrivateClass, setIsCreatingPrivateClass] = useState(false)
  const [privateClassModalError, setPrivateClassModalError] = useState<string | null>(null)
  const [showInsufficientClassesWarning, setShowInsufficientClassesWarning] = useState(false)
  const [insufficientClassesData, setInsufficientClassesData] = useState<{clientId: string, clientName: string, required: number, available: number, type: 'private' | 'group'} | null>(null)
  const [userBookings, setUserBookings] = useState<any[]>([])
  const [userClassHistory, setUserClassHistory] = useState<any[]>([])
  const [canceledOccurrences, setCanceledOccurrences] = useState<Set<string>>(new Set()) // Store "classId:date" keys
  const [recurringBookingCounts, setRecurringBookingCounts] = useState<{ [classId: string]: { [occurrenceDate: string]: number } }>({})
  const [classCounts, setClassCounts] = useState<{private: number, group: number}>({private: 0, group: 0})

  const [showEditClassModal, setShowEditClassModal] = useState(false)
  const [editingClass, setEditingClass] = useState<Class | null>(null)
  const [originalClientId, setOriginalClientId] = useState<string>('') // Store original client ID for comparison
  const [editOccurrenceDate, setEditOccurrenceDate] = useState<string>('') // For recurring class occurrences
  const [editDate, setEditDate] = useState<string>('')
  const [editTime, setEditTime] = useState<string>('')
  const [editEndTime, setEditEndTime] = useState<string>('')
  const [editClientId, setEditClientId] = useState<string>('')
  const [editCoachId, setEditCoachId] = useState<string>('')
  const [editTitle, setEditTitle] = useState<string>('')
  const [editDescription, setEditDescription] = useState<string>('')
  const [editInstructors, setEditInstructors] = useState<string[]>([])
  const [editInstructorInput, setEditInstructorInput] = useState<string>('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [editClassModalError, setEditClassModalError] = useState<string | null>(null)
  
  // Separate state for private class editing
  const [isSavingPrivateEdit, setIsSavingPrivateEdit] = useState(false)
  const [privateEditModalError, setPrivateEditModalError] = useState<string | null>(null)
  
  // Separate state for group class editing
  const [isSavingGroupEdit, setIsSavingGroupEdit] = useState(false)
  const [groupEditModalError, setGroupEditModalError] = useState<string | null>(null)

  const [viewingClass, setViewingClass] = useState<Class | null>(null)
  const [showViewClassModal, setShowViewClassModal] = useState(false)

  // Attendance tracking state
  const [showAttendanceModal, setShowAttendanceModal] = useState(false)
  const [attendanceClass, setAttendanceClass] = useState<Class | null>(null)
  const [attendanceSheet, setAttendanceSheet] = useState<any[]>([])
  const [attendanceChanges, setAttendanceChanges] = useState<{[userId: string]: string}>({})
  const [isSavingAttendance, setIsSavingAttendance] = useState(false)
  const [myAttendance, setMyAttendance] = useState<{[key: string]: string}>({}) // key: "classId:occurrenceDate"
  const [showAttendanceRecord, setShowAttendanceRecord] = useState(false)
  const [attendanceRecordUser, setAttendanceRecordUser] = useState<any>(null)
  const [attendanceRecordData, setAttendanceRecordData] = useState<any>(null)

  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'cancel' | 'delete'
    cls: Class
  } | null>(null)
  const [reinstateConfirm, setReinstateConfirm] = useState<{
    cls: Class
    usersWithInsufficientClasses: Array<{
      userId: string
      userName: string
      userEmail: string
      available: number
      required: number
      type: string
    }>
    confirmedUsers: string[]
    currentUserIndex: number
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

  // Helper function to get days in week
  const getDaysInWeek = (date: Date) => {
    const dayOfWeek = date.getDay() // 0 = Sunday
    const startOfWeek = new Date(date)
    startOfWeek.setDate(date.getDate() - dayOfWeek)
    
    const daysArray = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      daysArray.push(day)
    }
    return daysArray
  }

  // Navigate week
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() + (direction === 'prev' ? -7 : 7))
    setCurrentDate(newDate)
  }

  // Get week range for display
  const getWeekRange = (date: Date) => {
    const weekDays = getDaysInWeek(date)
    const start = weekDays[0]
    const end = weekDays[6]
    
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()} - ${end.getDate()} ${start.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`
    } else if (start.getFullYear() === end.getFullYear()) {
      return `${start.getDate()} ${start.toLocaleDateString('es-ES', { month: 'short' })} - ${end.getDate()} ${end.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}`
    } else {
      return `${start.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })} - ${end.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`
    }
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
        
        let filteredClasses = (data.classes || []).filter((cls: any) => {
          if (!cls.date) return false
          const classDateStr = cls.date.split('T')[0]
          return classDateStr >= todayStr
        })

        // Decode HTML entities in titles and descriptions
        filteredClasses = filteredClasses.map((cls: any) => ({
          ...cls,
          title: cls.title ? decodeHtmlEntities(cls.title) : cls.title,
          description: cls.description ? decodeHtmlEntities(cls.description) : cls.description
        }))

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
        // Handle different response formats
        const list = data.coaches || data.users || (Array.isArray(data) ? data : [])
        setCoaches(list)
        console.log('Loaded coaches:', list.length)
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
  }, [API_BASE_URL, user?.id])

  const loadClassCounts = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      if (!user?.id || user?.role !== 'cliente') return
      const response = await fetch(`${API_BASE_URL}/api/users/${user.id}/class-counts`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setClassCounts({
          private: data.private_classes_remaining || 0,
          group: data.group_classes_remaining || 0
        })
      }
    } catch (error) {
      console.error('Error loading class counts:', error)
    }
  }, [API_BASE_URL, user?.id, user?.role])

  const loadUserClassHistory = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      if (!user?.id || user.role !== 'cliente') return
      const response = await fetch(`${API_BASE_URL}/api/users/${user.id}/classes`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        // Store class IDs from class history (both private and group classes the user is assigned to)
        const classIds = (data.classes || []).map((cls: any) => cls.id)
        setUserClassHistory(classIds)
      }
    } catch (error) {
      console.error('Error loading user class history:', error)
    }
  }, [API_BASE_URL, user?.id, user?.role])

  // Load my attendance for client calendar color coding
  const loadMyAttendance = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token || user?.role !== 'cliente') return
      
      const response = await fetch(`${API_BASE_URL}/api/my-attendance`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        const attendanceMap: {[key: string]: string} = {}
        for (const att of (data.attendance || [])) {
          const key = `${att.class_id}:${att.occurrence_date || ''}`
          attendanceMap[key] = att.attendance_status
        }
        setMyAttendance(attendanceMap)
      }
    } catch (error) {
      console.error('Error loading my attendance:', error)
    }
  }, [API_BASE_URL, user?.role])

  // Load attendance sheet for a class
  const loadAttendanceSheet = useCallback(async (cls: Class, occurrenceDate?: string) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      
      const url = occurrenceDate 
        ? `${API_BASE_URL}/api/classes/${cls.id}/attendance?occurrence_date=${occurrenceDate}`
        : `${API_BASE_URL}/api/classes/${cls.id}/attendance`
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setAttendanceSheet(data.attendanceSheet || [])
        
        // Initialize changes with existing attendance (default to 'absent' if not set)
        const initialChanges: {[userId: string]: string} = {}
        for (const att of (data.attendanceSheet || [])) {
          initialChanges[att.user_id] = att.attendance_status || 'absent'
        }
        setAttendanceChanges(initialChanges)
      }
    } catch (error) {
      console.error('Error loading attendance sheet:', error)
    }
  }, [API_BASE_URL])

  // Load booking counts for recurring classes
  const loadRecurringBookingCounts = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      
      // Get all recurring classes
      const recurringClasses = classes.filter(cls => 
        cls.type === 'group' && (Number((cls as any).is_recurring || 0) === 1)
      )
      
      // Fetch booking counts for each recurring class
      const counts: { [classId: string]: { [occurrenceDate: string]: number } } = {}
      await Promise.all(recurringClasses.map(async (cls) => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/recurring-classes/${cls.id}/booking-counts`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          if (response.ok) {
            const data = await response.json()
            counts[cls.id] = data.booking_counts || {}
          }
        } catch (error) {
          console.error(`Error loading booking counts for class ${cls.id}:`, error)
        }
      }))
      
      setRecurringBookingCounts(counts)
    } catch (error) {
      console.error('Error loading recurring booking counts:', error)
    }
  }, [API_BASE_URL, classes])

  // Save attendance changes
  const saveAttendance = useCallback(async () => {
    if (!attendanceClass) return
    
    setIsSavingAttendance(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      
      const occurrenceDate = (attendanceClass as any).occurrence_date || null
      const attendances = Object.entries(attendanceChanges).map(([userId, status]) => ({
        user_id: userId,
        status
      }))
      
      const response = await fetch(`${API_BASE_URL}/api/classes/${attendanceClass.id}/attendance/bulk`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          occurrence_date: occurrenceDate,
          attendances
        })
      })
      
      if (response.ok) {
        setNotification({ type: 'success', message: 'Asistencia guardada exitosamente' })
        setShowAttendanceModal(false)
        setAttendanceClass(null)
      } else {
        const data = await response.json()
        setNotification({ type: 'error', message: data.message || 'Error al guardar asistencia' })
      }
    } catch (error) {
      console.error('Error saving attendance:', error)
      setNotification({ type: 'error', message: 'Error al guardar asistencia' })
    } finally {
      setIsSavingAttendance(false)
    }
  }, [API_BASE_URL, attendanceClass, attendanceChanges])
  // Remove user from attendance (with automatic refund if credit was deducted)
  const handleRemoveFromAttendance = useCallback(async (userId: string, userName: string) => {
    if (!attendanceClass) return
    
    if (!confirm(`¿Remover a ${userName} de esta clase? Si se les dedujo un crédito, será reembolsado automáticamente.`)) {
      return
    }
    
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      
      const occurrenceDate = (attendanceClass as any).occurrence_date || null
      
      const response = await fetch(`${API_BASE_URL}/api/classes/${attendanceClass.id}/attendance/remove`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          occurrence_date: occurrenceDate,
          user_id: userId
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setNotification({ 
          type: 'success', 
          message: data.refunded 
            ? `${userName} removido y clase reembolsada` 
            : `${userName} removido (sin crédito para reembolsar)`
        })
        // Reload attendance sheet
        loadAttendanceSheet(attendanceClass, occurrenceDate)
        // Reload booking counts
        await loadRecurringBookingCounts()
        await loadClasses()
      } else {
        setNotification({ type: 'error', message: data.message || 'Error al remover usuario' })
      }
    } catch (error) {
      console.error('Error removing from attendance:', error)
      setNotification({ type: 'error', message: 'Error al remover usuario' })
    }
  }, [API_BASE_URL, attendanceClass, loadAttendanceSheet, loadRecurringBookingCounts])

  // Load user attendance record (admin only)
  const loadUserAttendanceRecord = useCallback(async (userId: string) => {
    try {
      const token = localStorage.getItem('token')
      if (!token || user?.role !== 'admin') return
      
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/attendance-record`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setAttendanceRecordUser(data.user)
        setAttendanceRecordData(data)
        setShowAttendanceRecord(true)
      }
    } catch (error) {
      console.error('Error loading attendance record:', error)
    }
  }, [API_BASE_URL, user?.role])

  // Open attendance sheet modal
  const openAttendanceSheet = (cls: Class) => {
    setAttendanceClass(cls)
    loadAttendanceSheet(cls, (cls as any).occurrence_date)
    setShowAttendanceModal(true)
  }

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

  // Load canceled occurrences for recurring classes
  const loadCanceledOccurrences = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      
      const response = await fetch(`${API_BASE_URL}/api/recurring-classes/canceled-occurrences`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        const canceledSet = new Set<string>()
        if (data.canceled_occurrences) {
          data.canceled_occurrences.forEach((item: { class_id: string, occurrence_date: string }) => {
            canceledSet.add(`${item.class_id}:${item.occurrence_date}`)
          })
        }
        setCanceledOccurrences(canceledSet)
      }
    } catch (error) {
      console.error('Error loading canceled occurrences:', error)
    }
  }, [API_BASE_URL])

  useEffect(() => {
    if (user) {
      loadClasses()
      loadCanceledOccurrences()
      // Solo admin necesita la lista completa de clientes y coaches
      if (user.role === 'admin') {
        loadClients()
        loadCoaches()
      } else if (user.role === 'coach') {
        loadCoaches()
      }
      // Load user bookings and class history for clients (needed for client filtering)
      if (user.role === 'cliente') {
        loadUserBookings()
        loadUserClassHistory()
        loadClassCounts()
      }
    }
  }, [user, loadClasses, loadCanceledOccurrences, loadClients, loadCoaches, loadUserBookings, loadUserClassHistory, loadClassCounts])

  // Load booking counts when classes change
  useEffect(() => {
    if (classes.length > 0) {
      loadRecurringBookingCounts()
    }
  }, [classes, loadRecurringBookingCounts])

  useEffect(() => {
    if (user?.role === 'cliente') {
      loadUserBookings()
      loadUserClassHistory()
      loadMyAttendance()
    }
  }, [user, loadUserBookings, loadUserClassHistory, loadMyAttendance])

  // Auto-select first coach when modal opens and coaches are loaded
  useEffect(() => {
    if (showPrivateClassModal && coaches.length > 0 && !privateClassCoachId) {
      // If user is a coach, use them, otherwise use first available coach
      const userCoach = coaches.find(c => c.id === user?.id)
      if (userCoach) {
        setPrivateClassCoachId(userCoach.id)
      } else if (coaches.length > 0) {
        setPrivateClassCoachId(coaches[0].id)
      }
    }
  }, [showPrivateClassModal, coaches, privateClassCoachId, user?.id])

  // Reset modal error when modal closes and auto-fill title/description
  useEffect(() => {
    if (!showPrivateClassModal) {
      setPrivateClassModalError(null)
      setPrivateClassClientId('')
      setPrivateClassDate('')
      setPrivateClassTime('')
      setPrivateClassEndTime('')
      setPrivateClassCoachId('')
      setPrivateClassTitle('')
      setPrivateClassDescription('')
      setIsRecurring(false)
      setRecurrenceEndDate('')
      setRecurrenceDaysOfWeek([])
    } else {
      // Auto-fill title and description when modal opens and client/coach are selected
      if (privateClassClientId && privateClassCoachId) {
        const client = clients.find(c => c.id === privateClassClientId)
        const coach = coaches.find(c => c.id === privateClassCoachId)
        if (client && coach && !privateClassTitle) {
          setPrivateClassTitle(`${coach.nombre}'s Session with ${client.nombre}`)
          setPrivateClassDescription(`${coach.nombre}'s one-on-one class with ${client.nombre}`)
        }
      }
    }
  }, [showPrivateClassModal, privateClassClientId, privateClassCoachId, clients, coaches])

  // Auto-fill title/description when client or coach changes
  useEffect(() => {
    if (showPrivateClassModal && privateClassClientId && privateClassCoachId) {
      const client = clients.find(c => c.id === privateClassClientId)
      const coach = coaches.find(c => c.id === privateClassCoachId)
      if (client && coach) {
        if (language === 'es') {
          setPrivateClassTitle(`Sesión de ${coach.nombre} con ${client.nombre}`)
          setPrivateClassDescription(`Clase privada de ${coach.nombre} con ${client.nombre}`)
        } else {
          setPrivateClassTitle(`${coach.nombre}'s Session with ${client.nombre}`)
          setPrivateClassDescription(`${coach.nombre}'s one-on-one class with ${client.nombre}`)
        }
      }
    }
  }, [privateClassClientId, privateClassCoachId, showPrivateClassModal, language, clients, coaches])

  // Reset edit modal error when modal closes
  useEffect(() => {
    if (!showEditClassModal) {
      setEditClassModalError(null)
    }
  }, [showEditClassModal])

  // Other functions
  const bookClass = async (classId: string, occurrenceDate?: string) => {
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
          occurrence_date: occurrenceDate,
          payment_method: 'package'
        })
      })

      const data = await response.json().catch(() => ({}))

      if (response.ok) {
        setNotification({
          type: 'success',
          message: '¡Clase reservada exitosamente!'
        })
        // Reload data to reflect the new booking - await to ensure state updates
        await loadUserBookings()
        await loadClasses()
        await loadClassCounts()
        // Reload booking counts for recurring classes
        setTimeout(() => {
          loadRecurringBookingCounts()
        }, 300)
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

  const cancelBooking = async (classId: string, occurrenceDate?: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          class_id: classId,
          occurrence_date: occurrenceDate
        })
      })

      const data = await response.json().catch(() => ({}))

      if (response.ok) {
        // Close the modal first
        setViewingClass(null)
        
        setNotification({
          type: data.refunded ? 'success' : 'warning',
          message: data.message || 'Reserva cancelada exitosamente.'
        })
        
        // Await all reload functions to ensure UI updates
        await Promise.all([
          loadClasses(),
          loadUserBookings(),
          loadClassCounts()
        ])
        
        // Reload booking counts for recurring classes
        await loadRecurringBookingCounts()
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

  const isUserBooked = (classId: string, occurrenceDate?: string) => {
    // Normalize occurrenceDate format (remove time if present, ensure YYYY-MM-DD)
    let normalizedOccurrenceDate: string | undefined = undefined
    if (occurrenceDate) {
      // Extract just the date part (YYYY-MM-DD) if it includes time
      normalizedOccurrenceDate = occurrenceDate.split('T')[0]
    }
    
    // Check if user has a confirmed booking
    const hasBooking = userBookings.some(booking => {
      if (booking.class_id !== classId || booking.status !== 'confirmed') return false
      
      // Normalize booking occurrence_date format
      const bookingOccurrenceDate = booking.occurrence_date ? booking.occurrence_date.split('T')[0] : null
      
      // For recurring classes, check occurrence_date match
      if (normalizedOccurrenceDate) {
        return bookingOccurrenceDate === normalizedOccurrenceDate
      }
      // For non-recurring classes, check if no occurrence_date (or null/empty)
      return !bookingOccurrenceDate || bookingOccurrenceDate === ''
    })
    // Also check if the class is in the user's class history (for private classes assigned directly)
    const isInHistory = userClassHistory.includes(classId)
    return hasBooking || isInHistory
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

  const calculateDuration = (startTime: string, endTime: string): number => {
    if (!startTime || !endTime) return 60 // Default to 60 if times are missing
    
    const [startHour, startMinute] = startTime.split(':').map(Number)
    const [endHour, endMinute] = endTime.split(':').map(Number)
    
    if (isNaN(startHour) || isNaN(endHour)) return 60
    
    let startMinutes = startHour * 60 + (startMinute || 0)
    let endMinutes = endHour * 60 + (endMinute || 0)
    
    // Handle case where end time is next day
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60
    }
    
    const durationMinutes = endMinutes - startMinutes
    return Math.max(1, durationMinutes) // At least 1 minute
  }

  // Helper to get class creation data
  const getClassCreationData = async () => {
    const selectedCoach = coaches.find(c => c.id === privateClassCoachId)
    const client = classType === 'private' ? clients.find(c => c.id === privateClassClientId) : null

    let finalEndTime = privateClassEndTime
    if (!finalEndTime && privateClassTime) {
      const [hourStr, minuteStr] = privateClassTime.split(':')
      const hour = parseInt(hourStr, 10)
      const minute = parseInt(minuteStr, 10) || 0
      if (!isNaN(hour)) {
        const endHour = (hour + 1) % 24
        finalEndTime = `${String(endHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
      }
    }

    const duration = calculateDuration(privateClassTime, finalEndTime || '')

    return {
      title: privateClassTitle || (classType === 'private' 
        ? `${selectedCoach?.nombre || 'Coach'}'s Session with ${client?.nombre || 'Cliente'}`
        : 'Clase Grupal'),
      type: classType,
      coach_id: privateClassCoachId,
      coach_name: selectedCoach?.nombre || '',
      client_id: classType === 'private' ? privateClassClientId : null,
      client_name: classType === 'private' ? (client?.nombre || '') : null,
      assigned_client_ids: (classType === 'group' && !isRecurring) ? JSON.stringify(groupClassClientIds) : null,
      date: privateClassDate,
      time: privateClassTime,
      end_time: finalEndTime || null,
      duration: duration,
      description: privateClassDescription || (classType === 'private'
        ? `${selectedCoach?.nombre || 'Coach'}'s one-on-one class with ${client?.nombre || 'cliente'}`
        : 'Clase grupal'),
      status: 'scheduled',
      is_recurring: classType === 'group' ? isRecurring : false,
      recurrence_end_date: classType === 'group' && isRecurring ? (recurrenceEndDate || null) : null,
      recurrence_days_of_week: (classType === 'group' && isRecurring) ? JSON.stringify(recurrenceDaysOfWeek) : null,
      is_public: classType === 'group' ? isPublic : true,
      walk_ins_welcome: classType === 'group' ? walkInsWelcome : false,
      max_capacity: classType === 'group' ? groupMaxCapacity : 1
    }
  }

  const handleCreatePrivateClass = async (e: React.FormEvent, overrideInsufficient?: boolean, overrideType?: 'free' | 'negative') => {
    e.preventDefault()
    setPrivateClassModalError(null)
    if (!user) return

    // Validation based on class type
    if (classType === 'private' && !privateClassClientId) {
      setPrivateClassModalError('Por favor selecciona un cliente para la clase privada.')
      return
    }

    if (!privateClassDate || !privateClassTime) {
      setPrivateClassModalError('Por favor selecciona una fecha y hora para la clase.')
      return
    }

    // Validation for recurring group classes
    if (classType === 'group' && isRecurring) {
      if (recurrenceDaysOfWeek.length === 0) {
        setPrivateClassModalError('Por favor selecciona al menos un día de la semana para la clase recurrente.')
        return
      }
    }

    // Check if we have coaches available - reload if needed
    let availableCoaches = coaches
    if (availableCoaches.length === 0) {
      // Try to reload coaches first
      try {
        const token = localStorage.getItem('token')
        if (token) {
          const response = await fetch(`${API_BASE_URL}/api/users/coaches`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          if (response.ok) {
            const data = await response.json()
            // Handle different response formats
            availableCoaches = data.coaches || data.users || (Array.isArray(data) ? data : [])
            if (availableCoaches.length > 0) {
              setCoaches(availableCoaches)
            }
          } else {
            console.error('Error loading coaches:', response.status, response.statusText)
          }
        }
      } catch (error) {
        console.error('Error loading coaches:', error)
      }
      
      // Check again after reload attempt
      if (availableCoaches.length === 0) {
        setPrivateClassModalError('No hay coaches disponibles para asignar a la sesión privada. Por favor, asegúrate de que haya al menos un coach registrado en el sistema.')
        return
      }
    }

    // Ensure a coach is selected
    if (!privateClassCoachId) {
      // Auto-select first coach if none selected
      if (coaches.length > 0) {
        const userCoach = coaches.find(c => c.id === user.id)
        setPrivateClassCoachId(userCoach ? userCoach.id : coaches[0].id)
      } else {
        setPrivateClassModalError('No hay coaches disponibles para asignar a la sesión privada.')
        return
      }
    }

    const selectedCoach = coaches.find(c => c.id === privateClassCoachId)
    if (!selectedCoach) {
      setPrivateClassModalError('El coach seleccionado no es válido.')
      return
    }

    try {
      setIsCreatingPrivateClass(true)
      const token = localStorage.getItem('token')
      if (!token) {
        setPrivateClassModalError('No hay token de autenticación')
        return
      }

      // Check class counts for private classes or assigned group class clients (unless override)
      if (!overrideInsufficient) {
        if (classType === 'private' && privateClassClientId) {
          const client = clients.find(c => c.id === privateClassClientId)
          if (client) {
            const checkResponse = await fetch(`${API_BASE_URL}/api/users/${privateClassClientId}/class-counts`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            })
            if (checkResponse.ok) {
              const counts = await checkResponse.json()
              if (counts.private_classes_remaining < 1) {
                setInsufficientClassesData({
                  clientId: privateClassClientId,
                  clientName: client.nombre,
                  required: 1,
                  available: counts.private_classes_remaining || 0,
                  type: 'private'
                })
                setShowInsufficientClassesWarning(true)
                setIsCreatingPrivateClass(false)
                return
              }
            }
          }
        }

        // For group classes with assigned clients, check each one
        if (classType === 'group' && groupClassClientIds.length > 0) {
          for (const clientId of groupClassClientIds) {
            const client = clients.find(c => c.id === clientId)
            if (client) {
              const checkResponse = await fetch(`${API_BASE_URL}/api/users/${clientId}/class-counts`, {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              })
              if (checkResponse.ok) {
                const counts = await checkResponse.json()
                if (counts.group_classes_remaining < 1) {
                  setInsufficientClassesData({
                    clientId: clientId,
                    clientName: client.nombre,
                    required: 1,
                    available: counts.group_classes_remaining || 0,
                    type: 'group'
                  })
                  setShowInsufficientClassesWarning(true)
                  setIsCreatingPrivateClass(false)
                  return
                }
              }
            }
          }
        }
      }

      const classData = await getClassCreationData()
      const response = await fetch(`${API_BASE_URL}/api/classes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...classData,
          override_insufficient_classes: overrideInsufficient || false,
          override_type: overrideType || null
        })
      })

      const data = await response.json().catch(() => ({}))

      if (response.ok && data.success) {
        setNotification({
          type: 'success',
          message: classType === 'private' ? 'Sesión privada creada exitosamente.' : 'Clase grupal creada exitosamente.'
        })
        setShowPrivateClassModal(false)
        setPrivateClassClientId('')
        setGroupClassClientIds([])
        setGroupClassClientSearch('')
        setPrivateClassDate('')
        setPrivateClassTime('')
        setPrivateClassEndTime('')
        setPrivateClassCoachId('')
        setPrivateClassTitle('')
        setPrivateClassDescription('')
        setIsRecurring(false)
        setRecurrenceEndDate('')
        setRecurrenceDaysOfWeek([])
        setIsPublic(true)
        setWalkInsWelcome(true)
        setClassType('private')
        loadClasses()
      } else {
        setPrivateClassModalError(data.message || `Error al crear la ${classType === 'private' ? 'clase privada' : 'clase grupal'}.`)
      }
    } catch (error) {
      console.error('Error creating private class:', error)
      setPrivateClassModalError('Error de conexión al crear la clase privada.')
    } finally {
      setIsCreatingPrivateClass(false)
    }
  }

  const openEditModal = async (cls: Class, occurrenceDate?: string) => {
    // If this is a recurring occurrence (virtual instance), find the original class
    let classToEdit = cls
    const isRecurringOccurrence = (cls as any).is_recurring_occurrence
    
    if (isRecurringOccurrence) {
      // Find the original recurring class from the classes state
      const originalClass = classes.find(c => c.id === cls.id)
      if (originalClass) {
        classToEdit = originalClass
      }
    }
    
    // Store the occurrence date if editing a specific occurrence
    const occDate = occurrenceDate || (cls as any).occurrence_date || ''
    console.log('[openEditModal] Setting editOccurrenceDate to:', occDate, 'from:', { occurrenceDate, clsOccDate: (cls as any).occurrence_date })
    setEditOccurrenceDate(occDate)
    
    setEditingClass(classToEdit)
    setEditDate(classToEdit.date || '')
    setEditTime(classToEdit.time || '')
    setEditEndTime(classToEdit.end_time || '')
    setEditTitle(decodeHtmlEntities(classToEdit.title || ''))
    setEditDescription(decodeHtmlEntities(classToEdit.description || ''))

    // For group classes, initialize group-specific state
    if (classToEdit.type === 'group') {
      const classIsRecurring = Number((classToEdit as any).is_recurring || 0) === 1
      console.log('[openEditModal] Group class - isRecurring:', classIsRecurring, 'raw value:', (classToEdit as any).is_recurring, 'occDate:', occDate)
      
      // For recurring class occurrences, load bookings for that specific occurrence
      if (classIsRecurring && occDate) {
        try {
          const token = localStorage.getItem('token')
          const response = await fetch(`${API_BASE_URL}/api/classes/${classToEdit.id}/bookings?occurrence_date=${occDate}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          if (response.ok) {
            const data = await response.json()
            const bookedClientIds = (data.bookings || [])
              .filter((b: any) => b.status === 'confirmed' || b.status === 'attended')
              .map((b: any) => b.user_id)
            setGroupClassClientIds(bookedClientIds)
          } else {
            setGroupClassClientIds([])
          }
        } catch {
          setGroupClassClientIds([])
        }
      } else {
      // For non-recurring classes, use assigned_client_ids
      try {
        let assignedRaw = (classToEdit as any).assigned_client_ids || '[]'
        if (typeof assignedRaw === 'string') {
          assignedRaw = assignedRaw.replace(/&quot;/g, '"')
        }
        const assigned = assignedRaw ? JSON.parse(assignedRaw) : []
        if (Array.isArray(assigned)) {
          setGroupClassClientIds(assigned)
        } else {
          setGroupClassClientIds([])
        }
      } catch {
        setGroupClassClientIds([])
      }
      }
      
      // Properly handle SQLite boolean values (can be 0, 1, "0", "1", null, undefined)
      setIsPublic(Number((classToEdit as any).is_public || 0) === 1)
      setWalkInsWelcome(Number((classToEdit as any).walk_ins_welcome || 0) === 1)
      setIsRecurring(classIsRecurring)
      setRecurrenceEndDate((classToEdit as any).recurrence_end_date || '')
      setGroupMaxCapacity(Number((classToEdit as any).max_capacity) || 10)
      
      // Load recurrence days of week
      if ((classToEdit as any).recurrence_days_of_week) {
        try {
          const days = typeof (classToEdit as any).recurrence_days_of_week === 'string'
            ? JSON.parse((classToEdit as any).recurrence_days_of_week)
            : (classToEdit as any).recurrence_days_of_week
          if (Array.isArray(days)) {
            setRecurrenceDaysOfWeek(days)
          } else {
            setRecurrenceDaysOfWeek([])
          }
        } catch {
          setRecurrenceDaysOfWeek([])
        }
      } else {
        setRecurrenceDaysOfWeek([])
      }
    } else {
      // For private classes, fetch the client_id from class_history
      try {
        const token = localStorage.getItem('token')
        if (token) {
          const response = await fetch(`${API_BASE_URL}/api/classes/${classToEdit.id}/client`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          if (response.ok) {
            const data = await response.json()
            const clientId = data.client_id || ''
            setEditClientId(clientId)
            setOriginalClientId(clientId) // Store original for comparison
          }
        }
      } catch (error) {
        console.error('Error fetching client for private class:', error)
        setOriginalClientId('')
      }
      
      // Reset group-specific states when editing a private class
      setGroupClassClientIds([])
      setIsPublic(true)
      setWalkInsWelcome(true)
      setIsRecurring(false)
      setRecurrenceEndDate('')
      setRecurrenceDaysOfWeek([])
      setGroupMaxCapacity(10)
    }

    // Set the coach ID if available
    const currentCoach = coaches.find(c => c.id === (classToEdit as any).coach_id || c.nombre === classToEdit.coach_name)
    setEditCoachId(currentCoach?.id || '')

    setEditClassModalError(null)
    setPrivateEditModalError(null)
    setGroupEditModalError(null)
    setShowEditClassModal(true)
  }

  const openViewClassModal = (cls: Class) => {
      setViewingClass(cls as any)
      setShowViewClassModal(true)
  }

  // Separate handler for saving group classes
  const handleSaveGroupClass = async (e: React.FormEvent) => {
    e.preventDefault()
    setGroupEditModalError(null)
    if (!editingClass || editingClass.type !== 'group') return

    // Validation for recurring group classes (only when not editing a specific occurrence)
    if (isRecurring && !editOccurrenceDate && recurrenceDaysOfWeek.length === 0) {
      setGroupEditModalError('Por favor selecciona al menos un día de la semana para la clase recurrente.')
      return
    }

    try {
      setIsSavingGroupEdit(true)
      const token = localStorage.getItem('token')
      if (!token) {
        setGroupEditModalError('No hay token de autenticación')
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

      // Calculate duration from start and end time
      const duration = calculateDuration(editTime, finalEndTime || '')

      // If editing a recurring class occurrence, update clients for that specific date
      console.log('[handleSaveGroupClass] isRecurring:', isRecurring, 'editOccurrenceDate:', editOccurrenceDate)
      if (isRecurring && editOccurrenceDate) {
        console.log('[handleSaveGroupClass] Updating occurrence bookings for:', editOccurrenceDate, 'clients:', groupClassClientIds)
        // Update attendees for this specific occurrence
        const response = await fetch(`${API_BASE_URL}/api/classes/${editingClass.id}/occurrence-bookings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            occurrence_date: editOccurrenceDate,
            client_ids: groupClassClientIds
          })
        })

        const data = await response.json().catch(() => ({}))
        console.log('[handleSaveGroupClass] Response:', data)

        if (!response.ok || !data.success) {
          setGroupEditModalError(data.message || 'Error al actualizar los asistentes.')
          return
        }

        setNotification({
          type: 'success',
          message: `Asistentes actualizados para ${editOccurrenceDate}`
        })
        setShowEditClassModal(false)
        setEditingClass(null)
        setEditOccurrenceDate('')
        setOriginalClientId('')
        setEditClientId('')
        await loadRecurringBookingCounts()
        loadClasses()
        return
      }

      const updates: any = {
        date: editDate,
        time: editTime,
        end_time: finalEndTime || null,
        duration: duration,
        title: editTitle,
        description: editDescription,
        // Group-specific fields - explicitly convert booleans to 1/0 for SQLite
        assigned_client_ids: isRecurring ? null : JSON.stringify(groupClassClientIds || []),
        is_public: isPublic ? 1 : 0,
        walk_ins_welcome: walkInsWelcome ? 1 : 0,
        is_recurring: isRecurring ? 1 : 0,
        recurrence_end_date: (isRecurring && recurrenceEndDate) ? recurrenceEndDate : null,
        recurrence_days_of_week: isRecurring ? JSON.stringify(recurrenceDaysOfWeek) : null,
        max_capacity: Number(groupMaxCapacity) || 10
      }

      // Always update coach_id and coach_name if a coach is selected
      if (editCoachId) {
        const selectedCoach = coaches.find(c => c.id === editCoachId)
        if (selectedCoach) {
          updates.coach_id = editCoachId
          updates.coach_name = selectedCoach.nombre
        }
      }

      console.log('Saving group class updates:', updates)

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
        setGroupEditModalError(data.message || 'Error al actualizar la clase grupal.')
        return
      }

      setNotification({
        type: 'success',
        message: 'Clase grupal actualizada exitosamente.'
      })
      setShowEditClassModal(false)
      setEditingClass(null)
      setEditOccurrenceDate('')
      setOriginalClientId('')
      setEditClientId('')
      loadClasses()
    } catch (error) {
      console.error('Error saving group class edit:', error)
      setGroupEditModalError('Error de conexión al actualizar la clase grupal.')
    } finally {
      setIsSavingGroupEdit(false)
    }
  }

  // Separate handler for saving private classes
  const handleSavePrivateClass = async (e: React.FormEvent) => {
    e.preventDefault()
    setPrivateEditModalError(null)
    if (!editingClass || editingClass.type !== 'private') return

    try {
      setIsSavingPrivateEdit(true)
      const token = localStorage.getItem('token')
      if (!token) {
        setPrivateEditModalError('No hay token de autenticación')
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

      // Calculate duration from start and end time
      const duration = calculateDuration(editTime, finalEndTime || '')

      const updates: any = {
        date: editDate,
        time: editTime,
        end_time: finalEndTime || null,
        duration: duration,
        title: editTitle,
        description: editDescription
      }

      // Always update coach_id and coach_name if a coach is selected
      if (editCoachId) {
        const selectedCoach = coaches.find(c => c.id === editCoachId)
        if (selectedCoach) {
          updates.coach_id = editCoachId
          updates.coach_name = selectedCoach.nombre
        }
      }

      console.log('Saving private class updates:', updates)

      // Update the class basic info
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
        setPrivateEditModalError(data.message || 'Error al actualizar la clase privada.')
        return
      }

      // If client changed, update the client assignment
      if (editClientId && editClientId !== originalClientId) {
        const assignResponse = await fetch(`${API_BASE_URL}/api/classes/${editingClass.id}/assign-client`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ client_id: editClientId })
        })

        const assignData = await assignResponse.json().catch(() => ({}))
        if (!assignResponse.ok || !assignData.success) {
          console.warn('Warning: Could not update client assignment:', assignData.message)
          // Don't fail the whole operation, just warn
        }
      }

      setNotification({
        type: 'success',
        message: 'Clase privada actualizada exitosamente.'
      })
      setShowEditClassModal(false)
      setEditingClass(null)
      setOriginalClientId('')
      setEditClientId('')
      loadClasses()
    } catch (error) {
      console.error('Error saving private class edit:', error)
      setPrivateEditModalError('Error de conexión al actualizar la clase privada.')
    } finally {
      setIsSavingPrivateEdit(false)
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

      // Check if this is a recurring occurrence
      const isRecurringOccurrence = (cls as any).is_recurring_occurrence && (cls as any).occurrence_date
      
      if (isRecurringOccurrence) {
        // Cancel specific occurrence
        const occurrenceDate = (cls as any).occurrence_date
        const response = await fetch(`${API_BASE_URL}/api/recurring-classes/${cls.id}/cancel-occurrence`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ occurrence_date: occurrenceDate })
        })

        const data = await response.json().catch(() => ({}))

        if (!response.ok || !data.success) {
          setNotification({
            type: 'error',
            message: data.message || 'Error al cancelar la ocurrencia de la clase.'
          })
          return
        }

        // Update local canceled occurrences set
        const occurrenceKey = `${cls.id}:${occurrenceDate}`
        setCanceledOccurrences(prev => new Set(prev).add(occurrenceKey))

        setNotification({
          type: 'success',
          message: 'Ocurrencia de la clase cancelada exitosamente.'
        })
        loadClasses()
        loadCanceledOccurrences()
      } else {
        // Cancel entire class (non-recurring or entire recurring class)
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
      }
    } catch (error) {
      console.error('Error cancelling class:', error)
      setNotification({
        type: 'error',
        message: 'Error de conexión al cancelar la clase.'
      })
    }
  }

  const handleReinstateClass = async (cls: Class, skipUsers: string[] = []) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        alert('No hay token de autenticación')
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/classes/${cls.id}/reinstate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ skipUsers })
      })

      const data = await response.json()

      if (data.needsConfirmation) {
        // Show confirmation modal for users with insufficient classes
        setReinstateConfirm({
          cls,
          usersWithInsufficientClasses: data.usersWithInsufficientClasses,
          confirmedUsers: skipUsers,
          currentUserIndex: 0
        })
        return
      }

      if (!response.ok || !data.success) {
        setNotification({
          type: 'error',
          message: data.message || 'Error al reinstalar la clase.'
        })
        return
      }

      setReinstateConfirm(null)
      setShowViewClassModal(false)
      setNotification({
        type: 'success',
        message: data.message || 'Clase reinstalada exitosamente.'
      })
      loadClasses()
    } catch (error) {
      console.error('Error reinstating class:', error)
      setNotification({
        type: 'error',
        message: 'Error de conexión al reinstalar la clase.'
      })
    }
  }

  const handleReinstateUserDecision = (skip: boolean) => {
    if (!reinstateConfirm) return

    const currentUser = reinstateConfirm.usersWithInsufficientClasses[reinstateConfirm.currentUserIndex]
    const newConfirmedUsers = skip 
      ? [...reinstateConfirm.confirmedUsers, currentUser.userId]
      : reinstateConfirm.confirmedUsers

    const nextIndex = reinstateConfirm.currentUserIndex + 1

    if (nextIndex >= reinstateConfirm.usersWithInsufficientClasses.length) {
      // All users processed, proceed with reinstate
      handleReinstateClass(reinstateConfirm.cls, newConfirmedUsers)
    } else {
      // Move to next user
      setReinstateConfirm({
        ...reinstateConfirm,
        confirmedUsers: newConfirmedUsers,
        currentUserIndex: nextIndex
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

  // Helper function to convert 24-hour time to 12-hour AM/PM format
  const formatTime12Hour = (time24: string): string => {
    if (!time24) return ''
    const [hours, minutes] = time24.split(':')
    if (!hours) return time24
    
    const hour24 = parseInt(hours, 10)
    if (isNaN(hour24)) return time24
    
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
    const ampm = hour24 < 12 ? 'AM' : 'PM'
    const mins = minutes || '00'
    
    return `${hour12}:${mins} ${ampm}`
  }

  // Helper function to replace template variables in text
  const replaceTemplateVariables = (text: string, occurrenceDate: Date, cls: Class): string => {
    if (!text) return text
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayName = dayNames[occurrenceDate.getDay()]
    
    const month = String(occurrenceDate.getMonth() + 1).padStart(2, '0')
    const day = String(occurrenceDate.getDate()).padStart(2, '0')
    const year = String(occurrenceDate.getFullYear()).slice(-2)
    const fullDate = `${month}/${day}/${year}`
    const shortDate = `${month}/${day}`
    
    const startTime24 = cls.time || ''
    const endTime24 = cls.end_time || ''
    const startTime12 = formatTime12Hour(startTime24)
    const endTime12 = formatTime12Hour(endTime24)
    const duration = cls.duration || 0
    
    return text
      .replace(/{day}/g, dayName)
      .replace(/{start_time}/g, startTime12)
      .replace(/{end_time}/g, endTime12)
      .replace(/{duration}/g, String(duration))
      .replace(/{date}/g, fullDate)
      .replace(/{short_date}/g, shortDate)
  }

  const getClassesForDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    
    const filtered: Class[] = []

    classes.forEach((cls: any) => {
      if (!cls.date) return

      const baseDateStr = cls.date.split('T')[0]
      if (!baseDateStr) return

      const isRecurring =
        cls.type === 'group' &&
        (cls.is_recurring === 1 ||
         cls.is_recurring === '1' ||
         cls.is_recurring === true)

      if (!isRecurring) {
        // Non-recurring: only on its specific date
        if (baseDateStr === dateStr) {
          filtered.push(cls)
        }
        return
      }

      // Recurring class - check if it should appear on this day
      // Parse dates as local dates to avoid timezone issues
      const [targetYear, targetMonth, targetDay] = dateStr.split('-').map(Number)
      const target = new Date(targetYear, targetMonth - 1, targetDay)
      target.setHours(0, 0, 0, 0)
      
      const [baseYear, baseMonth, baseDay] = baseDateStr.split('-').map(Number)
      const baseDate = new Date(baseYear, baseMonth - 1, baseDay)
      baseDate.setHours(0, 0, 0, 0)

      // Must be on or after start date
      if (target < baseDate) return

      // If recurrence_end_date is set, enforce upper bound
      if ((cls as any).recurrence_end_date) {
        const endDateStr = (cls as any).recurrence_end_date.split('T')[0] // Handle datetime strings
        const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number)
        const end = new Date(endYear, endMonth - 1, endDay)
        end.setHours(0, 0, 0, 0)
        if (target > end) return
      }

      // Check if this day of week matches the recurrence pattern
      const dayOfWeek = target.getDay() // 0=Sunday, 1=Monday, ..., 6=Saturday
      let recurrenceDays: number[] = []
      
      if ((cls as any).recurrence_days_of_week) {
        try {
          recurrenceDays = typeof (cls as any).recurrence_days_of_week === 'string'
            ? JSON.parse((cls as any).recurrence_days_of_week)
            : (cls as any).recurrence_days_of_week
        } catch (e) {
          console.error('Error parsing recurrence_days_of_week:', e)
        }
      }

      // Check if this occurrence is canceled
      const occurrenceKey = `${cls.id}:${dateStr}`
      if (canceledOccurrences.has(occurrenceKey)) {
        return // Skip canceled occurrences
      }

      // If recurrence days are specified, only show on those days
      if (recurrenceDays.length > 0) {
        if (recurrenceDays.includes(dayOfWeek)) {
          // Calculate current_bookings for this specific occurrence from booking counts
          const bookingCounts = recurringBookingCounts[cls.id] || {}
          const occurrenceBookings = bookingCounts[dateStr] || 0
          
          // Create a virtual instance for this occurrence with template variables replaced
          const occurrenceClass = {
            ...cls,
            date: dateStr, // Use the actual occurrence date
            title: replaceTemplateVariables(cls.title || '', target, cls),
            description: replaceTemplateVariables(cls.description || '', target, cls),
            occurrence_date: dateStr, // Store the occurrence date for canceling
            is_recurring_occurrence: true, // Flag to identify this is a recurring occurrence
            current_bookings: occurrenceBookings // Override with occurrence-specific count
          }
          filtered.push(occurrenceClass)
        }
      } else {
        // Fallback: show weekly (same day of week as start date)
        const startDayOfWeek = baseDate.getDay()
        if (dayOfWeek === startDayOfWeek) {
          const diffDays = Math.floor((target.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24))
          if (diffDays % 7 === 0) {
            // Calculate current_bookings for this specific occurrence from booking counts
            const bookingCounts = recurringBookingCounts[cls.id] || {}
            const occurrenceBookings = bookingCounts[dateStr] || 0
            
            // Create a virtual instance for this occurrence with template variables replaced
            const occurrenceClass = {
              ...cls,
              date: dateStr, // Use the actual occurrence date
              title: replaceTemplateVariables(cls.title || '', target, cls),
              description: replaceTemplateVariables(cls.description || '', target, cls),
              occurrence_date: dateStr, // Store the occurrence date for canceling
              is_recurring_occurrence: true, // Flag to identify this is a recurring occurrence
              current_bookings: occurrenceBookings // Override with occurrence-specific count
            }
            filtered.push(occurrenceClass)
          }
        }
      }
    })

    // For clients, show:
    // 1. Public group classes (is_public === 1)
    // 2. Private classes they are booked in (checked via userBookings)
    // 3. Group classes they've already booked
    if (user?.role === 'cliente') {
      return filtered
        .filter(cls => {
          // Check if user is booked in this class
          const bookedInClass = isUserBooked(cls.id, (cls as any).occurrence_date)
          
          // For private classes: ONLY show if client is booked in it
          if (cls.type === 'private') {
            return bookedInClass
          }
          
          // For group classes: show if booked OR if public
          if (cls.type === 'group') {
            if (bookedInClass) return true
            const isPublic = (cls as any).is_public
            return isPublic === 1 || isPublic === '1' || isPublic === true || Number(isPublic) === 1
          }
          
          return false
        })
        .sort((a, b) => (a.time && b.time ? a.time.localeCompare(b.time) : 0))
    }
    // Admins and coaches see all classes

    return filtered.sort((a, b) => (a.time && b.time ? a.time.localeCompare(b.time) : 0))
  }

  const getAvailabilityColor = (classItem: Class) => {
    // Check if class is cancelled
    if (classItem.status === 'cancelled') {
      return 'bg-red-500'
    }
    
    // For clients, check attendance status first (overrides booking color)
    if (user?.role === 'cliente') {
      const occurrenceDate = (classItem as any).occurrence_date || classItem.date
      const attendanceKey = `${classItem.id}:${occurrenceDate}`
      const attendance = myAttendance[attendanceKey]
      
      if (attendance) {
        switch (attendance) {
          case 'present':
            return 'bg-emerald-500' // Attended - distinct green
          case 'absent':
            return 'bg-orange-500' // No-show - orange
          case 'late_cancel':
            return 'bg-amber-500' // Late cancellation - amber/yellow
          case 'excused':
            return 'bg-cyan-500' // Excused - cyan
        }
      }
    }
    
    // Check if user is booked in this class
    const userIsBooked = isUserBooked(classItem.id, (classItem as any).occurrence_date)
    if (userIsBooked) {
      return 'bg-green-500'
    }
    
    // Check if class is full
    const isFull = classItem.current_bookings >= classItem.max_capacity
    if (isFull) {
      return 'bg-gray-500'
    }
    
    // Class has room and user is not booked - blue for group, purple for private
    return classItem.type === 'private' ? 'bg-purple-500' : 'bg-blue-500'
  }

  // Render loading state
  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Main render
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
                <div className="flex items-center gap-4">
                  {/* Navigation Arrows + Date */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => calendarMode === 'month' ? navigateMonth('prev') : navigateWeek('prev')}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <h2 className="text-2xl font-bold text-gray-900 min-w-[280px] text-center">
                      {calendarMode === 'month' 
                        ? currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
                        : getWeekRange(currentDate)
                      }
                    </h2>
                    <button
                      onClick={() => calendarMode === 'month' ? navigateMonth('next') : navigateWeek('next')}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                  
                  {/* Today Button */}
                  <button
                    onClick={() => setCurrentDate(new Date())}
                    className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Hoy
                  </button>
                </div>
                
                {/* Month/Week Toggle */}
                <div className="flex bg-gray-200 rounded-lg p-1">
                  <button
                    onClick={() => setCalendarMode('month')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                      calendarMode === 'month' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Mes
                  </button>
                  <button
                    onClick={() => setCalendarMode('week')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                      calendarMode === 'week' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Semana
                  </button>
                </div>
              </div>
            </div>

            {/* Calendar Grid - Month View */}
            {calendarMode === 'month' && (
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
                          setSelectedDate(day)
                        }}
                      >
                        <div className="text-sm font-semibold text-gray-900 mb-2">
                          {day.getDate()}
                        </div>
                        <div className="space-y-1">
                          {dayClasses.slice(0, user.role === 'cliente' ? 2 : 3).map(cls => {
                            const isCancelled = cls.status === 'cancelled'
                            const isFull = cls.current_bookings >= cls.max_capacity
                            const userIsBooked = isUserBooked(cls.id, (cls as any).occurrence_date)
                            return (
                            <div
                              key={cls.id}
                              className={`space-y-1 rounded-lg p-1`}
                            >
                              {user.role === 'cliente' ? (
                                <>
                                  {!userIsBooked && isFull ? (
                                    <div className="text-xs px-2 py-1 rounded bg-gray-500 text-white truncate">
                                      {cls.time}{cls.end_time ? ` - ${cls.end_time}` : ''} <span className="italic">(full)</span>
                                    </div>
                                  ) : (
                                    <>
                                      <div
                                        className={`text-xs px-2 py-1 rounded ${getAvailabilityColor(cls)} text-white truncate cursor-pointer hover:opacity-80 transition-opacity`}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          openViewClassModal(cls)
                                        }}
                                        title="Click para ver detalles"
                                      >
                                        {isCancelled ? (
                                          <span className="line-through">{cls.time}{cls.end_time ? ` - ${cls.end_time}` : ''}</span>
                                        ) : (
                                          <span>{cls.time}{cls.end_time ? ` - ${cls.end_time}` : ''}</span>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </>
                              ) : (
                                <div 
                                  className={`text-xs px-2 py-1 rounded ${getAvailabilityColor(cls)} text-white truncate cursor-pointer hover:opacity-80 transition-opacity`}
                                  title={`${cls.time}${cls.end_time ? ` - ${cls.end_time}` : ''} - ${cls.current_bookings}/${cls.max_capacity} reservas - ${cls.coach_name}`}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openViewClassModal(cls)
                                  }}
                                >
                                  {isCancelled ? (
                                    <span className="line-through">{cls.time}{cls.end_time ? ` - ${cls.end_time}` : ''}</span>
                                  ) : (
                                    <span>{cls.time}{cls.end_time ? ` - ${cls.end_time}` : ''} ({cls.current_bookings}/{cls.max_capacity})</span>
                                  )}
                                </div>
                              )}
                            </div>
                            )})}
                          {dayClasses.length > (user.role === 'cliente' ? 2 : 3) && (
                            <div 
                              className="text-xs text-blue-600 font-medium cursor-pointer hover:text-blue-800 hover:underline"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedDate(day)
                              }}
                            >
                              +{dayClasses.length - (user.role === 'cliente' ? 2 : 3)} más →
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
            )}

            {/* Calendar Grid - Week View */}
            {calendarMode === 'week' && (
              <div className="p-6">
                <div className="grid grid-cols-7 gap-3">
                  {getDaysInWeek(currentDate).map((day) => {
                    const dayClasses = getClassesForDate(day)
                    const isToday = day.toDateString() === new Date().toDateString()
                    const isSelected = selectedDate && day.toDateString() === selectedDate.toDateString()
                    const dayName = day.toLocaleDateString('es-ES', { weekday: 'short' })
                    
                    return (
                      <div key={day.getTime()} className="flex flex-col">
                        {/* Day Header */}
                        <div 
                          className={`p-3 text-center rounded-t-xl border-2 border-b-0 ${
                            isToday 
                              ? 'bg-blue-500 text-white border-blue-500' 
                              : 'bg-gray-50 text-gray-600 border-gray-200'
                          }`}
                        >
                          <div className="text-xs font-medium uppercase">{dayName}</div>
                          <div className={`text-lg font-bold ${isToday ? 'text-white' : 'text-gray-900'}`}>{day.getDate()}</div>
                        </div>
                        
                        {/* Day Content */}
                        <div 
                          className={`flex-1 min-h-[400px] p-2 border-2 border-t-0 rounded-b-xl cursor-pointer transition-all hover:shadow-md ${
                            isToday 
                              ? 'border-blue-500 bg-blue-50/30' 
                              : isSelected
                                ? 'border-gray-400 bg-gray-50'
                                : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setSelectedDate(day)}
                        >
                          <div className="space-y-2">
                            {dayClasses.map(cls => {
                              const isCancelled = cls.status === 'cancelled'
                              const isFull = cls.current_bookings >= cls.max_capacity
                              const userIsBooked = isUserBooked(cls.id, (cls as any).occurrence_date)
                              
                              return (
                                <div 
                                  key={`${cls.id}-${(cls as any).occurrence_date || ''}`}
                                  className={`p-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                                    isCancelled 
                                      ? 'bg-red-100 border border-red-200' 
                                      : userIsBooked 
                                        ? 'bg-green-100 border border-green-300' 
                                        : isFull
                                          ? 'bg-gray-100 border border-gray-200'
                                          : 'bg-blue-100 border border-blue-200'
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openViewClassModal(cls)
                                  }}
                                >
                                  <div className={`text-xs font-semibold ${isCancelled ? 'line-through text-red-600' : 'text-gray-900'}`}>
                                    {cls.time}{cls.end_time ? ` - ${cls.end_time}` : ''}
                                  </div>
                                  <div className="text-xs text-gray-600 truncate mt-0.5">
                                    {cls.title || (cls.type === 'private' ? 'Clase Privada' : 'Clase Grupal')}
                                  </div>
                                  {user?.role !== 'cliente' && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      {cls.current_bookings}/{cls.max_capacity} reservas
                                    </div>
                                  )}
                                  {user?.role === 'cliente' && (
                                    <div className="mt-1">
                                      {isCancelled ? (
                                        <span className="text-xs px-1.5 py-0.5 bg-red-200 text-red-700 rounded">Cancelado</span>
                                      ) : userIsBooked ? (
                                        <span className="text-xs px-1.5 py-0.5 bg-green-200 text-green-700 rounded">Inscrito</span>
                                      ) : isFull ? (
                                        <span className="text-xs px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded">Lleno</span>
                                      ) : (
                                        <span className="text-xs px-1.5 py-0.5 bg-blue-200 text-blue-700 rounded">Disponible</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                            {dayClasses.length === 0 && (
                              <div className="text-xs text-gray-400 italic text-center py-4">
                                Sin clases
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal para ver clases del día seleccionado */}
        {selectedDate && activeView === 'calendar' && (
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
                  getClassesForDate(selectedDate).map((cls) => {
                    const userIsBooked = isUserBooked(cls.id, (cls as any).occurrence_date)
                    const isFull = cls.current_bookings >= cls.max_capacity
                    const isCancelled = cls.status === 'cancelled'
                    
                    return (
                      <div 
                        key={`${cls.id}-${(cls as any).occurrence_date || ''}`} 
                        className={`border rounded-lg p-4 transition-all cursor-pointer ${
                          isCancelled ? 'border-red-200 bg-red-50 hover:bg-red-100' :
                          userIsBooked ? 'border-green-300 bg-green-50 hover:bg-green-100' :
                          'border-gray-200 hover:shadow-md hover:bg-gray-50'
                        }`}
                        onClick={() => {
                          setSelectedDate(null)
                          openViewClassModal(cls)
                        }}
                      >
                        <div className="flex items-center justify-between flex-wrap gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center flex-wrap gap-2 mb-2">
                              <h4 className={`font-semibold text-gray-900 ${isCancelled ? 'line-through' : ''}`}>
                                {decodeHtmlEntities(cls.title || 'Clase')}
                              </h4>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                cls.type === 'group' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                              }`}>
                                {cls.type === 'group' ? 'Grupal' : 'Privada'}
                              </span>
                              {userIsBooked && !isCancelled && (
                                <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                                  ✓ Reservado
                                </span>
                              )}
                              {isCancelled && (
                                <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                                  Cancelada
                                </span>
                              )}
                            </div>
                            <div className="flex items-center flex-wrap gap-3 text-sm text-gray-600">
                              <span className="flex items-center">
                                <Clock className="h-4 w-4 mr-1" />
                                {cls.time}{cls.end_time ? ` - ${cls.end_time}` : ''}
                              </span>
                              <span>{cls.duration} min</span>
                              {cls.coach_name && <span>Coach: {cls.coach_name}</span>}
                            </div>
                          </div>
                          
                          {/* Booking info and actions */}
                          <div className="flex items-center gap-4">
                            {/* Capacity indicator (for admins/coaches or group classes) */}
                            {(user?.role !== 'cliente' || cls.type === 'group') && (
                              <div className="text-right">
                                <div className="text-sm font-semibold text-gray-900 mb-1">
                                  {cls.current_bookings}/{cls.max_capacity}
                                </div>
                                <div className="w-20 bg-gray-200 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${
                                      isFull ? 'bg-red-500' :
                                      (cls.current_bookings / cls.max_capacity) >= 0.8 ? 'bg-amber-500' :
                                      'bg-green-500'
                                    }`}
                                    style={{ width: `${Math.min((cls.current_bookings / cls.max_capacity) * 100, 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                            )}
                            
                            {/* Client actions */}
                            {user?.role === 'cliente' && !isCancelled && (
                              <div onClick={(e) => e.stopPropagation()}>
                                {userIsBooked ? (
                                  <button
                                    onClick={() => {
                                      setSelectedDate(null)
                                      openViewClassModal(cls)
                                    }}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                                  >
                                    Ver / Cancelar
                                  </button>
                                ) : isFull ? (
                                  <span className="px-4 py-2 bg-gray-300 text-gray-600 rounded-lg text-sm">
                                    Clase llena
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setSelectedDate(null)
                                      openViewClassModal(cls)
                                    }}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                  >
                                    Reservar
                                  </button>
                                )}
                              </div>
                            )}
                            
                            {/* Admin/Coach actions */}
                            {(user?.role === 'admin' || user?.role === 'coach') && (
                              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedDate(null)
                                    openEditModal(cls, (cls as any).occurrence_date)
                                  }}
                                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 text-sm"
                                >
                                  Editar
                                </button>
                                {!isCancelled && (
                                  <button
                                    type="button"
                                    onClick={() => handleCancelClass(cls)}
                                    className="px-3 py-1.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 text-sm"
                                  >
                                    Cancelar
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteClass(cls)}
                                  className="px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm"
                                >
                                  Eliminar
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
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
                {(() => {
                  // For clients, calculate based on filtered classes
                  if (user?.role === 'cliente') {
                    const filtered = classes.filter(cls => {
                      if (isUserBooked(cls.id, (cls as any).occurrence_date)) return true
                      if (cls.type === 'group') {
                        const isPublic = (cls as any).is_public
                        return isPublic === 1 || isPublic === '1' || isPublic === true || Number(isPublic) === 1
                      }
                      if (cls.type === 'private') return true
                      return false
                    })
                    const count = filtered.filter(cls => isUserBooked(cls.id, (cls as any).occurrence_date)).length
                    return `${count} ${count === 1 ? 'clase disponible' : 'clases disponibles'}`
                  }
                  return `${classes.length} ${classes.length === 1 ? 'clase disponible' : 'clases disponibles'}`
                })()}
              </p>
            </div>

            {/* List Content */}
            <div className="p-6">
              {(() => {
                // For clients, show:
                // 1. Public group classes (is_public === 1)
                // 2. Private classes (they can see all, booking will handle assignment)
                // 3. Classes they've already booked
                const allClasses = user?.role === 'cliente' 
                  ? classes.filter(cls => {
                      // Show if already booked
                      if (isUserBooked(cls.id, (cls as any).occurrence_date)) return true
                      
                      // Show public group classes
                      if (cls.type === 'group') {
                        const isPublic = (cls as any).is_public
                        return isPublic === 1 || isPublic === '1' || isPublic === true || Number(isPublic) === 1
                      }
                      
                      // Show private classes (booking logic will handle assignment)
                      if (cls.type === 'private') return true
                      
                      return false
                    })
                  : classes
                
                // Separate recurring and non-recurring classes
                const recurringClasses = allClasses.filter(cls => {
                  if (cls.type !== 'group') return false
                  const isRecurring = (cls as any).is_recurring
                  // Check for various formats: 1, '1', true, etc.
                  return isRecurring === 1 || isRecurring === '1' || isRecurring === true || Number(isRecurring) === 1
                })
                const regularClasses = allClasses.filter(cls => {
                  if (cls.type === 'group') {
                    const isRecurring = (cls as any).is_recurring
                    // Exclude if it's recurring
                    return !(isRecurring === 1 || isRecurring === '1' || isRecurring === true || Number(isRecurring) === 1)
                  }
                  return true
                })

                if (allClasses.length === 0) {
                  return (
                    <div className="text-center py-12 text-gray-500">
                      <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium">No hay clases disponibles</p>
                      <p className="text-sm text-gray-400 mt-2">Las clases aparecerán aquí cuando estén programadas</p>
                    </div>
                  )
                }

                // Helper to create recurring class entries for each day
                const createRecurringClassEntries = (cls: Class) => {
                  const recurrenceDays = (cls as any).recurrence_days_of_week
                    ? (typeof (cls as any).recurrence_days_of_week === 'string'
                        ? JSON.parse((cls as any).recurrence_days_of_week)
                        : (cls as any).recurrence_days_of_week)
                    : []
                  
                  if (recurrenceDays.length === 0) return []

                  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
                  const dayNamesShort = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
                  
                  return recurrenceDays.map((dayOfWeek: number) => {
                    // Create a date for this day of week (using next occurrence)
                    const today = new Date()
                    const daysUntilNext = (dayOfWeek - today.getDay() + 7) % 7 || 7
                    const nextDate = new Date(today)
                    nextDate.setDate(today.getDate() + daysUntilNext)
                    
                    // Replace template variables for this occurrence
                    const occurrenceTitle = replaceTemplateVariables(cls.title || '', nextDate, cls)
                    const occurrenceDescription = replaceTemplateVariables(cls.description || '', nextDate, cls)
                    
                    return {
                      ...cls,
                      title: occurrenceTitle,
                      description: occurrenceDescription,
                      dayOfWeek,
                      dayName: dayNames[dayOfWeek],
                      dayNameShort: dayNamesShort[dayOfWeek],
                      recurrence_end_date: (cls as any).recurrence_end_date,
                      is_recurring_entry: true
                    }
                  })
                }

                return (
                  <div className="space-y-6">
                    {/* Regular Classes Section */}
                    {regularClasses.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                          Clases Regulares
                        </h3>
                        <div className="space-y-4">
                          {regularClasses.map((cls, index) => {
                    const isCancelled = cls.status === 'cancelled'
                    return (
                    <motion.div 
                      key={cls.id} 
                      className={`group relative border-2 rounded-xl p-6 hover:shadow-lg transition-all duration-300 bg-white border-gray-200 hover:border-gray-300`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4 mb-3">
                            <h4 className={`text-lg font-semibold text-gray-900 ${user.role === 'cliente' ? 'cursor-pointer hover:text-blue-600' : ''}`}
                              onClick={() => {
                                if (user.role === 'cliente') {
                                  openViewClassModal(cls)
                                }
                              }}
                            >
                              {(() => {
                                // For regular classes, show title as-is (or with template variables if it's a recurring occurrence)
                                if ((cls as any).is_recurring_occurrence) {
                                  // This shouldn't happen in regular classes section, but handle it
                                  const classDate = new Date(cls.date + 'T00:00:00')
                                  return decodeHtmlEntities(replaceTemplateVariables(cls.title || '', classDate, cls))
                                }
                                return decodeHtmlEntities(cls.title || (cls.type === 'private'
                                  ? `${(clients.find(c => c.id === (cls as any).client_id)?.nombre || 'Cliente')} - Sesión Privada`
                                  : 'Clase'))
                              })()}
                              {isCancelled && <span className="italic text-gray-500 ml-2">(canceled)</span>}
                              {user.role === 'cliente' && !isUserBooked(cls.id, (cls as any).occurrence_date) && cls.current_bookings >= cls.max_capacity && !isCancelled && (
                                <span className="italic text-gray-500 ml-2">(full)</span>
                              )}
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
                            <span className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1.5 text-gray-500" />
                              {new Date(cls.date + 'T00:00:00').toLocaleDateString('es-ES', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}
                            </span>
                            <span className="flex items-center">
                              <Clock className="h-4 w-4 mr-1.5 text-gray-500" />
                              {formatTime12Hour(cls.time || '')}{cls.end_time ? ` - ${formatTime12Hour(cls.end_time)}` : ''}
                            </span>
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
                            <button
                              onClick={() => openViewClassModal(cls)}
                              className="px-6 py-2.5 rounded-xl font-medium transition-all duration-200 hover:scale-105 bg-blue-500 text-white hover:bg-blue-600"
                            >
                              Ver Detalles
                            </button>
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
                    )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Recurring Classes Section */}
                    {recurringClasses.length > 0 && (() => {
                      const recurringEntries = recurringClasses.flatMap((cls) => createRecurringClassEntries(cls))
                      if (recurringEntries.length === 0) return null
                      
                      return (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                            Clases Recurrentes
                          </h3>
                          <div className="space-y-4">
                            {recurringEntries.map((cls, index) => {
                              const isCancelled = cls.status === 'cancelled'
                              const recurrenceEndDate = (cls as any).recurrence_end_date
                              const dayName = (cls as any).dayName || 'Día'
                              const dayNameShort = (cls as any).dayNameShort || ''
                              
                              return (
                                <motion.div 
                                  key={`${cls.id}-${(cls as any).dayOfWeek}`}
                                  className={`group relative border-2 rounded-xl p-6 hover:shadow-lg transition-all duration-300 bg-white border-blue-200 hover:border-blue-300`}
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: index * 0.03 }}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center space-x-4 mb-3">
                                        <h4 className={`text-lg font-semibold text-gray-900 ${user.role === 'cliente' ? 'cursor-pointer hover:text-blue-600' : ''}`}
                                          onClick={() => {
                                            if (user.role === 'cliente') {
                                              openViewClassModal(cls)
                                            }
                                          }}
                                        >
                                          {decodeHtmlEntities(cls.title || 'Clase')}
                                          {isCancelled && <span className="italic text-gray-500 ml-2">(canceled)</span>}
                                          {user.role === 'cliente' && !isUserBooked(cls.id, (cls as any).occurrence_date) && cls.current_bookings >= cls.max_capacity && !isCancelled && (
                                            <span className="italic text-gray-500 ml-2">(full)</span>
                                          )}
                                        </h4>
                                        <span className={`px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800`}>
                                          Recurrente - {dayName}
                                        </span>
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
                                        <span className="flex items-center">
                                          <Calendar className="h-4 w-4 mr-1.5 text-gray-500" />
                                          Todos los {dayName.toLowerCase()}s
                                        </span>
                                        <span className="flex items-center">
                                          <Clock className="h-4 w-4 mr-1.5 text-gray-500" />
                                          {formatTime12Hour(cls.time || '')}{cls.end_time ? ` - ${formatTime12Hour(cls.end_time)}` : ''}
                                        </span>
                                        <span>Duración: {cls.duration} min</span>
                                        <span>Coach: {cls.coach_name || 'No asignado'}</span>
                                        {recurrenceEndDate && (
                                          <span className="text-amber-600 font-medium">
                                            Finaliza: {new Date(recurrenceEndDate + 'T00:00:00').toLocaleDateString('es-ES', { 
                                              year: 'numeric', 
                                              month: 'long', 
                                              day: 'numeric' 
                                            })}
                                          </span>
                                        )}
                                        {!recurrenceEndDate && (
                                          <span className="text-green-600 font-medium">
                                            Sin fecha de finalización
                                          </span>
                                        )}
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
                                          {isUserBooked(cls.id, (cls as any).occurrence_date) ? (
                                            <button
                                              onClick={() => cancelBooking(cls.id, (cls as any).occurrence_date)}
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
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </motion.div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* Modal de advertencia de clases insuficientes */}
        {showInsufficientClassesWarning && insufficientClassesData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]" onClick={() => setShowInsufficientClassesWarning(false)}>
            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-red-900 mb-4">Clases Insuficientes</h3>
              <p className="text-sm text-gray-700 mb-4">
                El cliente <strong>{insufficientClassesData.clientName}</strong> no tiene suficientes clases {insufficientClassesData.type === 'private' ? 'privadas' : 'grupales'} disponibles.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-amber-800">
                  <strong>Clases requeridas:</strong> {insufficientClassesData.required}<br/>
                  <strong>Clases disponibles:</strong> {insufficientClassesData.available}
                </p>
              </div>
              <div className="flex flex-col space-y-2">
                <button
                  onClick={(e) => {
                    handleCreatePrivateClass(e, true, 'free')
                    setShowInsufficientClassesWarning(false)
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Anular y agregar gratis
                </button>
                <button
                  onClick={(e) => {
                    handleCreatePrivateClass(e, true, 'negative')
                    setShowInsufficientClassesWarning(false)
                  }}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  Anular y establecer clases mensuales en negativo
                </button>
                <button
                  onClick={() => {
                    setShowInsufficientClassesWarning(false)
                    setInsufficientClassesData(null)
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal para crear clase privada */}
        {showPrivateClassModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9000]" onClick={() => setShowPrivateClassModal(false)}>
            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Crear Clase</h3>
              
              <form onSubmit={handleCreatePrivateClass}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de Clase
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={classType}
                      onChange={(e) => {
                        const newType = e.target.value as 'group' | 'private'
                        setClassType(newType)
                        if (newType === 'group') {
                          setPrivateClassClientId('')
                        } else {
                          setGroupClassClientIds([])
                        }
                      }}
                    >
                      <option value="private">Privada (Individual)</option>
                      <option value="group">Grupal</option>
                    </select>
                  </div>

                  {classType === 'private' ? (
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
                  ) : (
                    <>
                      {!isRecurring && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Agregar Clientes (Opcional)
                          </label>
                        <div className="relative">
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Buscar cliente..."
                            value={groupClassClientSearch}
                            onChange={(e) => setGroupClassClientSearch(e.target.value)}
                          />
                          {groupClassClientSearch && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                              {clients
                                .filter(c => 
                                  c.nombre.toLowerCase().includes(groupClassClientSearch.toLowerCase()) &&
                                  !groupClassClientIds.includes(c.id)
                                )
                                .map(client => (
                                  <div
                                    key={client.id}
                                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                    onClick={() => {
                                      setGroupClassClientIds([...groupClassClientIds, client.id])
                                      setGroupClassClientSearch('')
                                    }}
                                  >
                                    {client.nombre}
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                        {groupClassClientIds.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {groupClassClientIds.map(clientId => {
                              const client = clients.find(c => c.id === clientId)
                              return client ? (
                                <span
                                  key={clientId}
                                  className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                                >
                                  {client.nombre}
                                  <button
                                    type="button"
                                    onClick={() => setGroupClassClientIds(groupClassClientIds.filter(id => id !== clientId))}
                                    className="ml-2 text-blue-600 hover:text-blue-800"
                                  >
                                    ×
                                  </button>
                                </span>
                              ) : null
                            })}
                          </div>
                        )}
                        </div>
                      )}
                      {isRecurring && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-800">
                            <strong>Nota:</strong> Las clases recurrentes no permiten asignar clientes durante la creación. 
                            Los clientes pueden unirse a clases individuales después de que se creen.
                          </p>
                        </div>
                      )}
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={isPublic}
                            onChange={(e) => setIsPublic(e.target.checked)}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">Clase pública (visible y unirse)</span>
                        </label>
                      </div>
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={walkInsWelcome}
                            onChange={(e) => setWalkInsWelcome(e.target.checked)}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">Walk-ins bienvenidos</span>
                        </label>
                      </div>
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={isRecurring}
                            onChange={(e) => {
                              setIsRecurring(e.target.checked)
                              if (e.target.checked) {
                                // Set default start date to today
                                const today = new Date()
                                const todayStr = today.toISOString().split('T')[0]
                                setPrivateClassDate(todayStr)
                                // Clear client assignments for recurring classes
                                setGroupClassClientIds([])
                              }
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">Clase recurrente (semanal)</span>
                        </label>
                      </div>
                      {isRecurring && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Días de la semana
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {[
                                { day: 0, label: 'Dom' },
                                { day: 1, label: 'Lun' },
                                { day: 2, label: 'Mar' },
                                { day: 3, label: 'Mié' },
                                { day: 4, label: 'Jue' },
                                { day: 5, label: 'Vie' },
                                { day: 6, label: 'Sáb' }
                              ].map(({ day, label }) => (
                                <button
                                  key={day}
                                  type="button"
                                  onClick={() => {
                                    if (recurrenceDaysOfWeek.includes(day)) {
                                      setRecurrenceDaysOfWeek(recurrenceDaysOfWeek.filter(d => d !== day))
                                    } else {
                                      setRecurrenceDaysOfWeek([...recurrenceDaysOfWeek, day].sort())
                                    }
                                  }}
                                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                    recurrenceDaysOfWeek.includes(day)
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                  }`}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                            {recurrenceDaysOfWeek.length === 0 && (
                              <p className="mt-1 text-xs text-amber-600">
                                Por favor selecciona al menos un día de la semana.
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Fecha de inicio
                            </label>
                            <input
                              type="date"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={privateClassDate}
                              onChange={(e) => setPrivateClassDate(e.target.value)}
                            />
                            <p className="mt-1 text-xs text-gray-500">
                              Fecha de inicio del período recurrente (por defecto: hoy).
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Fecha de finalización (Opcional)
                            </label>
                            <input
                              type="date"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={recurrenceEndDate}
                              onChange={(e) => setRecurrenceEndDate(e.target.value)}
                            />
                            <p className="mt-1 text-xs text-gray-500">
                              Deja este campo vacío para que la clase se repita indefinidamente.
                            </p>
                          </div>
                        </>
                      )}
                      <div className="mt-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Máximo de asistentes
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={9999}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={groupMaxCapacity}
                          onChange={(e) => {
                            const value = parseInt(e.target.value, 10)
                            if (isNaN(value)) {
                              setGroupMaxCapacity(10)
                            } else {
                              setGroupMaxCapacity(Math.max(1, Math.min(value, 9999)))
                            }
                          }}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          La capacidad mínima es de 1 asistente.
                        </p>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Título de la Clase
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={privateClassTitle}
                      onChange={(e) => setPrivateClassTitle(e.target.value)}
                      placeholder="Ej: Coach's Session with Client"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descripción
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={privateClassDescription}
                      onChange={(e) => setPrivateClassDescription(e.target.value)}
                      placeholder="Ej: Coach's one-on-one class with Client"
                      rows={3}
                    />
                  </div>
                  
                  {!isRecurring && (
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
                  )}
                  
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
                    {privateClassTime && (
                      <p className="mt-1 text-xs text-gray-600 font-medium">
                        {formatTime12Hour(privateClassTime)}
                      </p>
                    )}
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
                    {privateClassEndTime && (
                      <p className="mt-1 text-xs text-gray-600 font-medium">
                        {formatTime12Hour(privateClassEndTime)}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      Si dejas este campo vacío, se establecerá automáticamente 1 hora después de la hora de inicio.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Coach
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={privateClassCoachId}
                      onChange={(e) => setPrivateClassCoachId(e.target.value)}
                    >
                      <option value="">Seleccionar coach</option>
                      {coaches.map(coach => (
                        <option key={coach.id} value={coach.id}>
                          {coach.nombre}
                        </option>
                      ))}
                    </select>
                    {coaches.length === 0 && (
                      <p className="mt-1 text-xs text-amber-600">
                        No hay coaches disponibles. Por favor, asegúrate de que haya al menos un coach registrado.
                      </p>
                    )}
                  </div>
                </div>

                {/* Error message inside modal */}
                {privateClassModalError && (
                  <div className="mt-4 p-3 rounded-lg text-sm bg-red-50 text-red-800 border border-red-200">
                    {privateClassModalError}
                  </div>
                )}
                
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
            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingClass.type === 'group' ? 'Editar Clase Grupal' : 'Editar Clase Privada'}
              </h3>
              
              <form onSubmit={editingClass.type === 'group' ? handleSaveGroupClass : handleSavePrivateClass}>
                {editingClass.type === 'group' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Título de la Clase
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Ej: Clase Grupal"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Descripción
                      </label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Describe la clase grupal"
                        rows={3}
                      />
                    </div>

                    {!isRecurring && (
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
                    )}
                    
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
                      {editTime && (
                        <p className="mt-1 text-xs text-gray-600 font-medium">
                          {formatTime12Hour(editTime)}
                        </p>
                      )}
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
                      {editEndTime && (
                        <p className="mt-1 text-xs text-gray-600 font-medium">
                          {formatTime12Hour(editEndTime)}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        Si dejas este campo vacío, se establecerá automáticamente 1 hora después de la hora de inicio.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Coach
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={editCoachId}
                        onChange={(e) => setEditCoachId(e.target.value)}
                      >
                        <option value="">Seleccionar coach</option>
                        {coaches.map(coach => (
                          <option key={coach.id} value={coach.id}>
                            {coach.nombre}
                          </option>
                        ))}
                      </select>
                      {coaches.length === 0 && (
                        <p className="mt-1 text-xs text-amber-600">
                          No hay coaches disponibles. Por favor, asegúrate de que haya al menos un coach registrado.
                        </p>
                      )}
                    </div>

                    {/* Client Management - show for non-recurring OR for recurring with occurrence date */}
                    {(!isRecurring || editOccurrenceDate) && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {isRecurring && editOccurrenceDate 
                            ? `Asistentes para esta fecha (${editOccurrenceDate})`
                            : 'Agregar / Editar Clientes (Opcional)'
                          }
                        </label>
                        {isRecurring && editOccurrenceDate && (
                          <p className="text-xs text-blue-600 mb-2">
                            Nota: Estás editando los asistentes solo para esta ocurrencia específica.
                          </p>
                        )}
                        <div className="relative">
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Buscar cliente..."
                            value={groupClassClientSearch}
                            onChange={(e) => setGroupClassClientSearch(e.target.value)}
                          />
                          {groupClassClientSearch && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                              {clients
                                .filter(c =>
                                  c.nombre.toLowerCase().includes(groupClassClientSearch.toLowerCase()) &&
                                  !groupClassClientIds.includes(c.id)
                                )
                                .map(client => (
                                  <div
                                    key={client.id}
                                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                    onClick={() => {
                                      setGroupClassClientIds([...groupClassClientIds, client.id])
                                      setGroupClassClientSearch('')
                                    }}
                                  >
                                    {client.nombre}
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                        {groupClassClientIds.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {groupClassClientIds.map(clientId => {
                              const client = clients.find(c => c.id === clientId)
                              return client ? (
                                <span
                                  key={clientId}
                                  className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                                >
                                  {client.nombre}
                                  <button
                                    type="button"
                                    onClick={() => setGroupClassClientIds(groupClassClientIds.filter(id => id !== clientId))}
                                    className="ml-2 text-blue-600 hover:text-blue-800"
                                  >
                                    ×
                                  </button>
                                </span>
                              ) : null
                            })}
                          </div>
                        )}
                      </div>
                    )}
                    {isRecurring && !editOccurrenceDate && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Nota:</strong> Para agregar clientes a esta clase recurrente, 
                          haz clic en una fecha específica en el calendario y edita desde allí.
                        </p>
                      </div>
                    )}

                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={isPublic}
                          onChange={(e) => setIsPublic(e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">Clase pública (visible y unirse)</span>
                      </label>
                    </div>
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={walkInsWelcome}
                          onChange={(e) => setWalkInsWelcome(e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">Walk-ins bienvenidos</span>
                      </label>
                    </div>
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={isRecurring}
                          onChange={(e) => {
                            setIsRecurring(e.target.checked)
                            if (e.target.checked) {
                              // Clear client assignments for recurring classes
                              setGroupClassClientIds([])
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">Clase recurrente (semanal)</span>
                      </label>
                    </div>
                    {isRecurring && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Días de la semana
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { day: 0, label: 'Dom' },
                              { day: 1, label: 'Lun' },
                              { day: 2, label: 'Mar' },
                              { day: 3, label: 'Mié' },
                              { day: 4, label: 'Jue' },
                              { day: 5, label: 'Vie' },
                              { day: 6, label: 'Sáb' }
                            ].map(({ day, label }) => (
                              <button
                                key={day}
                                type="button"
                                onClick={() => {
                                  if (recurrenceDaysOfWeek.includes(day)) {
                                    setRecurrenceDaysOfWeek(recurrenceDaysOfWeek.filter(d => d !== day))
                                  } else {
                                    setRecurrenceDaysOfWeek([...recurrenceDaysOfWeek, day].sort())
                                  }
                                }}
                                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                  recurrenceDaysOfWeek.includes(day)
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                          {recurrenceDaysOfWeek.length === 0 && (
                            <p className="mt-1 text-xs text-amber-600">
                              Por favor selecciona al menos un día de la semana.
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fecha de inicio
                          </label>
                          <input
                            type="date"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Fecha de inicio del período recurrente.
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fecha de finalización (Opcional)
                          </label>
                          <input
                            type="date"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={recurrenceEndDate}
                            onChange={(e) => setRecurrenceEndDate(e.target.value)}
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Deja este campo vacío para que la clase se repita indefinidamente.
                          </p>
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Máximo de asistentes
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={9999}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={groupMaxCapacity}
                        onChange={(e) => {
                          const value = parseInt(e.target.value, 10)
                          if (isNaN(value)) {
                            setGroupMaxCapacity(10)
                          } else {
                            setGroupMaxCapacity(Math.max(1, Math.min(value, 9999)))
                          }
                        }}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        La capacidad mínima es de 1 asistente.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Título de la Clase
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Ej: Coach's Session with Client"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Descripción
                      </label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Ej: Coach's one-on-one class with Client"
                        rows={3}
                      />
                    </div>

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

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Coach
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={editCoachId}
                        onChange={(e) => setEditCoachId(e.target.value)}
                      >
                        <option value="">Seleccionar coach</option>
                        {coaches.map(coach => (
                          <option key={coach.id} value={coach.id}>
                            {coach.nombre}
                          </option>
                        ))}
                      </select>
                      {coaches.length === 0 && (
                        <p className="mt-1 text-xs text-amber-600">
                          No hay coaches disponibles. Por favor, asegúrate de que haya al menos un coach registrado.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cliente
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={editClientId}
                        onChange={(e) => setEditClientId(e.target.value)}
                      >
                        <option value="">Seleccionar cliente</option>
                        {clients.map(client => (
                          <option key={client.id} value={client.id}>
                            {client.nombre}
                          </option>
                        ))}
                      </select>
                      {clients.length === 0 && (
                        <p className="mt-1 text-xs text-amber-600">
                          No hay clientes disponibles.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Error message inside modal */}
                {(editingClass.type === 'group' ? groupEditModalError : privateEditModalError) && (
                  <div className="mt-4 p-3 rounded-lg text-sm bg-red-50 text-red-800 border border-red-200">
                    {editingClass.type === 'group' ? groupEditModalError : privateEditModalError}
                  </div>
                )}
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditClassModal(false)
                      setEditingClass(null)
                      setOriginalClientId('')
                      setEditClientId('')
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={editingClass.type === 'group' ? isSavingGroupEdit : isSavingPrivateEdit}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {(editingClass.type === 'group' ? isSavingGroupEdit : isSavingPrivateEdit) ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal para ver detalles de clase */}
        {showViewClassModal && viewingClass && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9000]" onClick={() => setShowViewClassModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              {/* Header with gradient */}
              <div className={`p-5 ${
                viewingClass.status === 'cancelled' ? 'bg-gradient-to-r from-red-500 to-red-600' :
                isUserBooked(viewingClass.id, (viewingClass as any).occurrence_date) ? 'bg-gradient-to-r from-green-500 to-green-600' :
                viewingClass.current_bookings >= viewingClass.max_capacity ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                viewingClass.type === 'group' ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 
                'bg-gradient-to-r from-purple-500 to-purple-600'
              } text-white`}>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wider opacity-80">
                      {viewingClass.type === 'group' ? 'Clase Grupal' : 'Clase Privada'}
                    </span>
                    <h3 className={`text-xl font-bold mt-1 ${viewingClass.status === 'cancelled' ? 'line-through' : ''}`}>
                      {decodeHtmlEntities(viewingClass.title || (viewingClass.type === 'group' ? 'Clase Grupal' : 'Clase Privada'))}
                    </h3>
                    {viewingClass.status === 'cancelled' && (
                      <span className="inline-block mt-2 px-2 py-1 bg-white/20 rounded text-xs font-medium">
                        CANCELADA
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setShowViewClassModal(false)}
                    className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-5 overflow-y-auto max-h-[60vh]">
                {/* Date and Time Card */}
                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-white rounded-lg p-3 shadow-sm text-center min-w-[70px]">
                      <div className="text-xs font-medium text-gray-500 uppercase">
                        {(() => {
                          const classDate = (viewingClass as any).occurrence_date || viewingClass.date
                          return new Date(classDate + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short' })
                        })()}
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {(() => {
                          const classDate = (viewingClass as any).occurrence_date || viewingClass.date
                          return new Date(classDate + 'T00:00:00').getDate()
                        })()}
                      </div>
                      <div className="text-xs font-medium text-gray-500">
                        {(() => {
                          const classDate = (viewingClass as any).occurrence_date || viewingClass.date
                          return new Date(classDate + 'T00:00:00').toLocaleDateString('es-ES', { month: 'short' })
                        })()}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center text-gray-900 font-semibold text-lg">
                        <Clock className="h-4 w-4 mr-2 text-gray-400" />
                        {formatTime12Hour(viewingClass.time || '')}{viewingClass.end_time ? ` - ${formatTime12Hour(viewingClass.end_time)}` : ''}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {viewingClass.duration} minutos
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {viewingClass.description && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {decodeHtmlEntities(viewingClass.description)}
                    </p>
                  </div>
                )}

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs font-medium text-gray-500 uppercase mb-1">Coach</div>
                    <div className="text-sm font-semibold text-gray-900">{viewingClass.coach_name || 'No asignado'}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs font-medium text-gray-500 uppercase mb-1">Estado</div>
                    <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${
                      viewingClass.status === 'scheduled' ? 'bg-green-100 text-green-800' :
                      viewingClass.status === 'completed' ? 'bg-gray-200 text-gray-700' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {viewingClass.status === 'scheduled' ? 'Programada' :
                       viewingClass.status === 'completed' ? 'Completada' : 'Cancelada'}
                    </span>
                  </div>
                </div>

                {/* Capacity (for group classes or admins) */}
                {(viewingClass.type === 'group' || user?.role !== 'cliente') && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-700">Capacidad</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">
                        {viewingClass.current_bookings}/{viewingClass.max_capacity}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full transition-all ${
                          viewingClass.current_bookings >= viewingClass.max_capacity ? 'bg-red-500' :
                          (viewingClass.current_bookings / viewingClass.max_capacity) >= 0.8 ? 'bg-amber-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${Math.min((viewingClass.current_bookings / viewingClass.max_capacity) * 100, 100)}%` }}
                      ></div>
                    </div>
                    {viewingClass.current_bookings >= viewingClass.max_capacity && (
                      <p className="text-xs text-red-600 mt-2 font-medium">Clase llena</p>
                    )}
                  </div>
                )}

                {/* Recurring class notice */}
                {(viewingClass as any).is_recurring_occurrence && (
                  <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg mb-4">
                    <Calendar className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-700">
                      Esta clase se repite semanalmente
                    </p>
                  </div>
                )}
              </div>

              {/* Footer with Actions */}
              <div className="p-5 bg-gray-50 border-t border-gray-100">
                {/* Client actions */}
                {user?.role === 'cliente' && viewingClass.status === 'scheduled' && (
                  <>
                    {isUserBooked(viewingClass.id, (viewingClass as any).occurrence_date) ? (
                      <>
                        {(() => {
                          const classDate = (viewingClass as any).occurrence_date || viewingClass.date
                          const classDateTime = new Date(`${classDate}T${viewingClass.time}`)
                          const now = new Date()
                          const minutesUntilClass = (classDateTime.getTime() - now.getTime()) / (1000 * 60)
                          const within15Minutes = minutesUntilClass <= 15
                          
                          return (
                            <>
                              {within15Minutes && (
                                <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                  <p className="text-sm text-yellow-800">
                                    <strong>⚠️ Advertencia:</strong> Cancelar con menos de 15 min de anticipación no reembolsa automáticamente.
                                  </p>
                                </div>
                              )}
                              <div className="flex items-center gap-3 mb-3">
                                <span className="inline-flex items-center px-3 py-1.5 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                                  ✓ Estás inscrito
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  cancelBooking(viewingClass.id, (viewingClass as any).occurrence_date)
                                  setShowViewClassModal(false)
                                }}
                                className="w-full px-4 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-semibold"
                              >
                                Cancelar Reserva{within15Minutes ? ' (Sin reembolso)' : ''}
                              </button>
                            </>
                          )
                        })()}
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          bookClass(viewingClass.id, (viewingClass as any).occurrence_date)
                          setShowViewClassModal(false)
                        }}
                        disabled={viewingClass.current_bookings >= viewingClass.max_capacity}
                        className={`w-full px-4 py-2.5 rounded-xl font-semibold transition-colors ${
                          viewingClass.current_bookings >= viewingClass.max_capacity
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                      >
                        {viewingClass.current_bookings >= viewingClass.max_capacity ? 'Clase Llena' : (
                          <span className="flex items-center justify-center gap-2">
                            Reservar Clase
                            <span className="px-2 py-0.5 bg-white/20 rounded text-xs">
                              {viewingClass.type === 'group' ? classCounts.group : classCounts.private} restantes
                            </span>
                          </span>
                        )}
                      </button>
                    )}
                  </>
                )}

                {/* Admin/Coach actions */}
                {(user?.role === 'admin' || user?.role === 'coach') && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowViewClassModal(false)
                          openEditModal(viewingClass, (viewingClass as any).occurrence_date)
                        }}
                        className="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors font-medium"
                      >
                        Editar
                      </button>
                      {viewingClass.status === 'cancelled' ? (
                        <button
                          onClick={() => handleReinstateClass(viewingClass)}
                          className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium"
                        >
                          Reinstalar
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setShowViewClassModal(false)
                            handleCancelClass(viewingClass)
                          }}
                          className="flex-1 px-4 py-2.5 border-2 border-red-500 text-red-600 rounded-xl hover:bg-red-50 transition-colors font-medium"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                    {/* Attendance Button */}
                    {viewingClass.status !== 'cancelled' && (
                      <button
                        onClick={() => {
                          setShowViewClassModal(false)
                          openAttendanceSheet(viewingClass)
                        }}
                        className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium flex items-center justify-center gap-2"
                      >
                        <Users className="h-4 w-4" />
                        Tomar Asistencia
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowViewClassModal(false)
                        handleDeleteClass(viewingClass)
                      }}
                      className="w-full px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm"
                    >
                      Eliminar clase
                    </button>
                  </div>
                )}

                {/* Cancelled class notice for clients */}
                {user?.role === 'cliente' && viewingClass.status === 'cancelled' && (
                  <div className="text-center text-gray-500 text-sm">
                    Esta clase ha sido cancelada
                  </div>
                )}

                {/* Close button if no other actions shown */}
                {viewingClass.status !== 'scheduled' && user?.role !== 'admin' && user?.role !== 'coach' && (
                  <button
                    onClick={() => setShowViewClassModal(false)}
                    className="w-full px-4 py-2.5 text-gray-700 bg-gray-200 rounded-xl hover:bg-gray-300 transition-colors font-medium"
                  >
                    Cerrar
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

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

        {/* Modal de confirmación para reinstalar clase con usuarios sin clases suficientes */}
        {reinstateConfirm && reinstateConfirm.usersWithInsufficientClasses.length > 0 && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9600]" onClick={() => setReinstateConfirm(null)}>
            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              {(() => {
                const currentUser = reinstateConfirm.usersWithInsufficientClasses[reinstateConfirm.currentUserIndex]
                const totalUsers = reinstateConfirm.usersWithInsufficientClasses.length
                const currentIndex = reinstateConfirm.currentUserIndex + 1

                return (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        ⚠️ Clases insuficientes
                      </h3>
                      <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {currentIndex} de {totalUsers}
                      </span>
                    </div>
                    
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                      <p className="text-sm text-yellow-800 font-medium mb-2">
                        {currentUser.userName}
                      </p>
                      <p className="text-sm text-yellow-700">
                        Este cliente tiene <strong>{currentUser.available}</strong> clase(s) {currentUser.type === 'group' ? 'grupales' : 'privadas'} disponibles, 
                        pero necesita <strong>{currentUser.required}</strong> para reinstalar esta reservación.
                      </p>
                    </div>

                    <p className="text-sm text-gray-600 mb-4">
                      ¿Deseas continuar registrando a este cliente de todas formas (sin deducir clase), u omitirlo de la clase reinstalada?
                    </p>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setReinstateConfirm(null)}
                        className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                      >
                        Cancelar todo
                      </button>
                      <button
                        onClick={() => handleReinstateUserDecision(true)}
                        className="flex-1 px-4 py-2.5 text-amber-700 bg-amber-100 rounded-xl hover:bg-amber-200 transition-colors font-medium"
                      >
                        Omitir
                      </button>
                      <button
                        onClick={() => handleReinstateUserDecision(false)}
                        className="flex-1 px-4 py-2.5 text-white bg-green-600 rounded-xl hover:bg-green-700 transition-colors font-medium"
                      >
                        Incluir
                      </button>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        )}

        {/* Attendance Sheet Modal */}
        {showAttendanceModal && attendanceClass && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9700]" onClick={() => setShowAttendanceModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="p-5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold">Lista de Asistencia</h2>
                    <p className="text-white/80 text-sm mt-1">
                      {attendanceClass.title} - {(attendanceClass as any).occurrence_date || attendanceClass.date}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAttendanceModal(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              {/* Attendance List */}
              <div className="p-5 max-h-[60vh] overflow-y-auto">
                {attendanceSheet.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No hay personas registradas en esta clase
                  </div>
                ) : (
                  <div className="space-y-3">
                    {attendanceSheet.map((attendee: any) => (
                      <div key={attendee.user_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{attendee.user_name}</p>
                          <p className="text-sm text-gray-500">{attendee.user_email}</p>
                          {attendee.late_cancellation && (
                            <span className="text-xs text-amber-600 font-medium">⚠ Canceló tarde</span>
                          )}
                          {attendee.credit_deducted === 0 && (
                            <span className="text-xs text-purple-600 font-medium ml-2">💳 Sin crédito deducido</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={attendanceChanges[attendee.user_id] || attendee.attendance_status || 'absent'}
                            onChange={(e) => setAttendanceChanges({
                              ...attendanceChanges,
                              [attendee.user_id]: e.target.value
                            })}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            <option value="absent">✗ No asistió</option>
                            <option value="present">✓ Asistió</option>
                            <option value="late_cancel">⚠ Canceló tarde</option>
                            <option value="excused">• Excusado</option>
                          </select>
                          <button
                            onClick={() => handleRemoveFromAttendance(attendee.user_id, attendee.user_name)}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remover de la clase (reembolsar si aplica)"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          {user?.role === 'admin' && (
                            <button
                              onClick={() => loadUserAttendanceRecord(attendee.user_id)}
                              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Ver historial de asistencia"
                            >
                              <Calendar className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-3">
                <button
                  onClick={() => setShowAttendanceModal(false)}
                  className="flex-1 px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveAttendance}
                  disabled={isSavingAttendance || Object.keys(attendanceChanges).length === 0}
                  className="flex-1 px-4 py-2.5 text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingAttendance ? 'Guardando...' : 'Guardar Asistencia'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Attendance Record Modal (Admin Only) */}
        {showAttendanceRecord && attendanceRecordUser && attendanceRecordData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9800]" onClick={() => setShowAttendanceRecord(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="p-5 bg-gradient-to-r from-amber-500 to-orange-600 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold">Historial de Asistencia</h2>
                    <p className="text-white/80 text-sm mt-1">{attendanceRecordUser.nombre}</p>
                  </div>
                  <button
                    onClick={() => setShowAttendanceRecord(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              {/* Stats */}
              <div className="p-5 border-b border-gray-100">
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-emerald-50 rounded-xl">
                    <div className="text-2xl font-bold text-emerald-600">{attendanceRecordData.stats?.attended || 0}</div>
                    <div className="text-xs text-gray-500">Asistió</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-xl">
                    <div className="text-2xl font-bold text-orange-600">{attendanceRecordData.stats?.no_show || 0}</div>
                    <div className="text-xs text-gray-500">No asistió</div>
                  </div>
                  <div className="text-center p-3 bg-amber-50 rounded-xl">
                    <div className="text-2xl font-bold text-amber-600">{attendanceRecordData.stats?.late_cancellations || 0}</div>
                    <div className="text-xs text-gray-500">Canceló tarde</div>
                  </div>
                  <div className="text-center p-3 bg-cyan-50 rounded-xl">
                    <div className="text-2xl font-bold text-cyan-600">{attendanceRecordData.stats?.excused || 0}</div>
                    <div className="text-xs text-gray-500">Excusado</div>
                  </div>
                </div>
                {attendanceRecordData.stats?.total_classes > 0 && (
                  <div className="mt-4 text-center">
                    <div className="text-sm text-gray-600">
                      Tasa de asistencia: 
                      <span className="font-bold text-gray-900 ml-1">
                        {Math.round((attendanceRecordData.stats.attended / attendanceRecordData.stats.total_classes) * 100)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* History List */}
              <div className="p-5 max-h-[40vh] overflow-y-auto">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Historial Reciente</h3>
                {attendanceRecordData.history && attendanceRecordData.history.length > 0 ? (
                  <div className="space-y-2">
                    {attendanceRecordData.history.map((record: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{record.class_title}</p>
                          <p className="text-xs text-gray-500">{record.occurrence_date}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          record.attendance_status === 'present' ? 'bg-emerald-100 text-emerald-700' :
                          record.attendance_status === 'absent' ? 'bg-orange-100 text-orange-700' :
                          record.attendance_status === 'late_cancel' ? 'bg-amber-100 text-amber-700' :
                          'bg-cyan-100 text-cyan-700'
                        }`}>
                          {record.attendance_status === 'present' ? 'Asistió' :
                           record.attendance_status === 'absent' ? 'No asistió' :
                           record.attendance_status === 'late_cancel' ? 'Canceló tarde' :
                           'Excusado'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No hay historial de asistencia
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div className="p-5 border-t border-gray-100 bg-gray-50">
                <button
                  onClick={() => setShowAttendanceRecord(false)}
                  className="w-full px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

