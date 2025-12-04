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
  const [groupMaxCapacity, setGroupMaxCapacity] = useState<number>(10)
  const [isPublic, setIsPublic] = useState(true)
  const [walkInsWelcome, setWalkInsWelcome] = useState(true)
  const [isCreatingPrivateClass, setIsCreatingPrivateClass] = useState(false)
  const [privateClassModalError, setPrivateClassModalError] = useState<string | null>(null)
  const [showInsufficientClassesWarning, setShowInsufficientClassesWarning] = useState(false)
  const [insufficientClassesData, setInsufficientClassesData] = useState<{clientId: string, clientName: string, required: number, available: number, type: 'private' | 'group'} | null>(null)
  const [userBookings, setUserBookings] = useState<any[]>([])
  const [userClassHistory, setUserClassHistory] = useState<any[]>([])

  const [showEditClassModal, setShowEditClassModal] = useState(false)
  const [editingClass, setEditingClass] = useState<Class | null>(null)
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

  const [viewingClass, setViewingClass] = useState<Class | null>(null)
  const [showViewClassModal, setShowViewClassModal] = useState(false)

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
      // Load user bookings and class history for clients (needed for client filtering)
      if (user.role === 'cliente') {
        loadUserBookings()
        loadUserClassHistory()
      }
    }
  }, [user, loadClasses, loadClients, loadCoaches, loadUserBookings, loadUserClassHistory])

  useEffect(() => {
    if (user?.role === 'cliente') {
      loadUserBookings()
      loadUserClassHistory()
    }
  }, [user, loadUserBookings, loadUserClassHistory])

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
    // Check if user has a confirmed booking
    const hasBooking = userBookings.some(booking => booking.class_id === classId && booking.status === 'confirmed')
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
      assigned_client_ids: classType === 'group' ? JSON.stringify(groupClassClientIds) : null,
      date: privateClassDate,
      time: privateClassTime,
      end_time: finalEndTime || null,
      duration: duration,
      description: privateClassDescription || (classType === 'private'
        ? `${selectedCoach?.nombre || 'Coach'}'s one-on-one class with ${client?.nombre || 'cliente'}`
        : 'Clase grupal'),
      status: 'scheduled',
      is_recurring: classType === 'group' ? isRecurring : false,
      recurrence_end_date: classType === 'group' && isRecurring ? recurrenceEndDate : null,
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

  const openEditModal = (cls: Class) => {
    setEditingClass(cls)
    setEditDate(cls.date || '')
    setEditTime(cls.time || '')
    setEditEndTime(cls.end_time || '')
    setEditTitle(decodeHtmlEntities(cls.title || ''))
    setEditDescription(decodeHtmlEntities(cls.description || ''))

    // For group classes, initialize group-specific state
    if (cls.type === 'group') {
      try {
        const assigned = (cls as any).assigned_client_ids
          ? JSON.parse((cls as any).assigned_client_ids)
          : []
        if (Array.isArray(assigned)) {
          setGroupClassClientIds(assigned)
        } else {
          setGroupClassClientIds([])
        }
      } catch {
        setGroupClassClientIds([])
      }
      // Properly handle SQLite boolean values (can be 0, 1, "0", "1", null, undefined)
      setIsPublic(Number((cls as any).is_public || 0) === 1)
      setWalkInsWelcome(Number((cls as any).walk_ins_welcome || 0) === 1)
      setIsRecurring(Number((cls as any).is_recurring || 0) === 1)
      setRecurrenceEndDate((cls as any).recurrence_end_date || '')
      setGroupMaxCapacity(Number((cls as any).max_capacity) || 10)
    } else {
      // Reset group-specific states when editing a private class
      setGroupClassClientIds([])
      setIsPublic(true)
      setWalkInsWelcome(true)
      setIsRecurring(false)
      setRecurrenceEndDate('')
      setGroupMaxCapacity(10)
    }

    // Set the coach ID if available
    const currentCoach = coaches.find(c => c.id === (cls as any).coach_id || c.nombre === cls.coach_name)
    setEditCoachId(currentCoach?.id || '')

    setEditClassModalError(null)
    setShowEditClassModal(true)
  }

  const openViewClassModal = (cls: Class) => {
    setViewingClass(cls)
    setShowViewClassModal(true)
  }

  const handleSaveEditClass = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditClassModalError(null)
    if (!editingClass) return

    try {
      setIsSavingEdit(true)
      const token = localStorage.getItem('token')
      if (!token) {
        setEditClassModalError('No hay token de autenticación')
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

      // If editing a group class, allow updating group options
      if (editingClass.type === 'group') {
        // Always send all group-specific fields explicitly
        updates.assigned_client_ids = JSON.stringify(groupClassClientIds || [])
        updates.is_public = Boolean(isPublic)
        updates.walk_ins_welcome = Boolean(walkInsWelcome)
        updates.is_recurring = Boolean(isRecurring)
        // Always send recurrence_end_date - null if not recurring or no end date
        updates.recurrence_end_date = (updates.is_recurring && recurrenceEndDate) ? recurrenceEndDate : null
        updates.max_capacity = Number(groupMaxCapacity) || 10
        
        console.log('Saving group class updates:', {
          assigned_client_ids: updates.assigned_client_ids,
          is_public: updates.is_public,
          walk_ins_welcome: updates.walk_ins_welcome,
          is_recurring: updates.is_recurring,
          recurrence_end_date: updates.recurrence_end_date,
          max_capacity: updates.max_capacity
        })
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
        setEditClassModalError(data.message || 'Error al actualizar la clase.')
        return
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
      setEditClassModalError('Error de conexión al actualizar la clase.')
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

      // Recurring weekly group class
      const baseDate = new Date(baseDateStr)
      baseDate.setHours(0, 0, 0, 0)

      const target = new Date(dateStr)
      target.setHours(0, 0, 0, 0)

      if (target < baseDate) return

      // If recurrence_end_date is set, enforce upper bound
      if ((cls as any).recurrence_end_date) {
        const end = new Date((cls as any).recurrence_end_date)
        end.setHours(0, 0, 0, 0)
        if (target > end) return
      }

      const diffDays = Math.floor((target.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays % 7 === 0) {
        filtered.push(cls)
      }
    })

    // For clients, only show classes they're attending
    if (user?.role === 'cliente') {
      return filtered
        .filter(cls => isUserBooked(cls.id))
        .sort((a, b) => (a.time && b.time ? a.time.localeCompare(b.time) : 0))
    }
    // Admins and coaches see all classes

    return filtered.sort((a, b) => (a.time && b.time ? a.time.localeCompare(b.time) : 0))
  }

  const getAvailabilityColor = (classItem: Class) => {
    const percentage = (classItem.current_bookings / classItem.max_capacity) * 100
    if (percentage >= 100) return 'bg-red-500'
    if (percentage >= 80) return 'bg-amber-500'
    if (percentage >= 60) return 'bg-yellow-500'
    return 'bg-green-500'
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
                          const isFull = cls.current_bookings >= cls.max_capacity
                          const userIsBooked = isUserBooked(cls.id)
                          return (
                          <div
                            key={cls.id}
                            className={`space-y-1 rounded-lg p-1`}
                          >
                            {user.role === 'cliente' ? (
                              <>
                                {!userIsBooked && isFull ? (
                                  <div className="text-xs px-2 py-1 rounded bg-gray-300 text-gray-700 truncate">
                                    {cls.time}{cls.end_time ? ` - ${cls.end_time}` : ''} <span className="italic">(full)</span>
                                  </div>
                                ) : (
                                  <>
                                    <div
                                      className={`text-xs px-2 py-1 rounded ${getAvailabilityColor(cls)} text-white truncate ${userIsBooked ? 'cursor-pointer hover:opacity-80' : ''} transition-opacity`}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        if (userIsBooked) {
                                          openViewClassModal(cls)
                                        }
                                      }}
                                      title={userIsBooked ? 'Click para ver detalles' : ''}
                                    >
                                      {cls.time}{cls.end_time ? ` - ${cls.end_time}` : ''} {isCancelled && <span className="italic">(canceled)</span>}
                                    </div>
                                    <div className="flex justify-center">
                                      {userIsBooked ? (
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
                                          disabled={isFull}
                                          className={`text-xs px-2 py-1 rounded transition-colors ${
                                            isFull
                                              ? 'bg-gray-400 text-white cursor-not-allowed'
                                              : 'bg-green-500 text-white hover:bg-green-600'
                                          }`}
                                        >
                                          {isFull ? 'Llena' : 'Reservar'}
                                        </button>
                                      )}
                                    </div>
                                  </>
                                )}
                              </>
                            ) : (
                              <div 
                                className={`text-xs px-2 py-1 rounded ${getAvailabilityColor(cls)} text-white truncate cursor-pointer hover:opacity-80 transition-opacity`}
                                title={`${cls.time}${cls.end_time ? ` - ${cls.end_time}` : ''} - ${cls.current_bookings}/${cls.max_capacity} reservas - ${cls.coach_name}`}
                              >
                                {cls.time}{cls.end_time ? ` - ${cls.end_time}` : ''} ({cls.current_bookings}/{cls.max_capacity}) {isCancelled && <span className="italic">(canceled)</span>}
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
                            <h4 className="font-semibold text-gray-900">{decodeHtmlEntities(cls.title || 'Clase')}</h4>
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
                {user?.role === 'cliente' 
                  ? classes.filter(cls => isUserBooked(cls.id)).length 
                  : classes.length
                } {(user?.role === 'cliente' 
                  ? classes.filter(cls => isUserBooked(cls.id)).length === 1
                  : classes.length === 1
                ) ? 'clase disponible' : 'clases disponibles'}
              </p>
            </div>

            {/* List Content */}
            <div className="p-6">
              {(user?.role === 'cliente' 
                ? classes.filter(cls => isUserBooked(cls.id)).length === 0
                : classes.length === 0
              ) ? (
                <div className="text-center py-12 text-gray-500">
                  <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium">No hay clases disponibles</p>
                  <p className="text-sm text-gray-400 mt-2">Las clases aparecerán aquí cuando estén programadas</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(user?.role === 'cliente' 
                    ? classes.filter(cls => isUserBooked(cls.id))
                    : classes
                  ).map((cls, index) => {
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
                            <h4 className={`text-lg font-semibold text-gray-900 ${user.role === 'cliente' && isUserBooked(cls.id) ? 'cursor-pointer hover:text-blue-600' : ''}`}
                              onClick={() => {
                                if (user.role === 'cliente' && isUserBooked(cls.id)) {
                                  openViewClassModal(cls)
                                }
                              }}
                            >
                              {decodeHtmlEntities(cls.title || (cls.type === 'private'
                                ? `${(clients.find(c => c.id === (cls as any).client_id)?.nombre || 'Cliente')} - Sesión Privada`
                                : 'Clase'))}
                              {isCancelled && <span className="italic text-gray-500 ml-2">(canceled)</span>}
                              {user.role === 'cliente' && !isUserBooked(cls.id) && cls.current_bookings >= cls.max_capacity && !isCancelled && (
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
                              {cls.time}{cls.end_time ? ` - ${cls.end_time}` : ''}
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
                    )
                  })}
                </div>
              )}
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
                            onChange={(e) => setIsRecurring(e.target.checked)}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">Clase recurrente (semanal)</span>
                        </label>
                      </div>
                      {isRecurring && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fecha de finalización de recurrencia
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
              
              <form onSubmit={handleSaveEditClass}>
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

                    {/* Grupo específico */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Agregar / Editar Clientes (Opcional)
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
                          onChange={(e) => setIsRecurring(e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">Clase recurrente (semanal)</span>
                      </label>
                    </div>

                    {isRecurring && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Fecha de finalización de recurrencia
                        </label>
                        <input
                          type="date"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={recurrenceEndDate}
                          onChange={(e) => setRecurrenceEndDate(e.target.value)}
                        />
                      </div>
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
                  </div>
                )}

                {/* Error message inside modal */}
                {editClassModalError && (
                  <div className="mt-4 p-3 rounded-lg text-sm bg-red-50 text-red-800 border border-red-200">
                    {editClassModalError}
                  </div>
                )}
                
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

        {/* Modal para ver detalles de clase (para clientes) */}
        {showViewClassModal && viewingClass && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9000]" onClick={() => setShowViewClassModal(false)}>
            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Detalles de la Clase</h3>
                <button
                  onClick={() => setShowViewClassModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                  <p className="text-sm text-gray-900">{decodeHtmlEntities(viewingClass.title || 'Clase Privada')}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <p className="text-sm text-gray-900">{decodeHtmlEntities(viewingClass.description || 'Sin descripción')}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                  <p className="text-sm text-gray-900">
                    {new Date(viewingClass.date + 'T00:00:00').toLocaleDateString('es-ES', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Horario</label>
                  <p className="text-sm text-gray-900">
                    {viewingClass.time}{viewingClass.end_time ? ` - ${viewingClass.end_time}` : ''}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duración</label>
                  <p className="text-sm text-gray-900">{viewingClass.duration} minutos</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Coach</label>
                  <p className="text-sm text-gray-900">{viewingClass.coach_name || 'No asignado'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    viewingClass.status === 'scheduled' ? 'bg-green-100 text-green-800' :
                    viewingClass.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {viewingClass.status === 'scheduled' ? 'Programada' :
                     viewingClass.status === 'completed' ? 'Completada' : 'Cancelada'}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowViewClassModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cerrar
                </button>
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
      </div>
    </DashboardLayout>
  )
}
