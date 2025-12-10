'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Users,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  MessageCircle,
  Calendar,
  Package,
  X
} from 'lucide-react'
import DashboardLayout from '@/components/DashboardLayout'
import { getApiUrl } from '@/lib/utils/api'

interface Client {
  id: string
  nombre: string
  correo: string
  numero_de_telefono: string
  instagram?: string
  role: string
  type_of_class: string
  expiration_date?: string | null
  cumpleanos?: string | null
  lesion_o_limitacion_fisica?: string | null
  genero?: string | null
  created_at: string
  updated_at?: string
  activeGroupPackage?: {
    id: string
    package_name: string
    end_date: string
    status: string
  } | null
  activePrivatePackage?: {
    id: string
    package_name: string
    end_date: string
    status: string
  } | null
}

// Package Assignment Component
function PackageAssignmentSection({ clientId, onPackageAdded }: { clientId: string, onPackageAdded: () => void }) {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''
  const [selectedGroupPackage, setSelectedGroupPackage] = useState('')
  const [selectedPrivatePackage, setSelectedPrivatePackage] = useState('')
  const [groupRenewalMonths, setGroupRenewalMonths] = useState(1)
  const [privateRenewalMonths, setPrivateRenewalMonths] = useState(1)
  const [isAssigning, setIsAssigning] = useState(false)

  const [assignableGroupPackages, setAssignableGroupPackages] = useState<{ id: string, name: string, classes_included: number }[]>([])
  const [assignablePrivatePackages, setAssignablePrivatePackages] = useState<{ id: string, name: string, classes_included: number }[]>([])

  const loadAssignablePackages = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      const response = await fetch(getApiUrl('/api/packages?scope=admin&includeInactive=0&includeScheduled=0'), {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        const list = Array.isArray(data.packages) ? data.packages : []
        const live = list.filter((p: any) => p.is_live && (p.category === 'Grupal' || p.category === 'Privada'))
        const sorted = [...live].sort((a: any, b: any) => a.price - b.price)
        setAssignableGroupPackages(sorted.filter((p: any) => p.category === 'Grupal'))
        setAssignablePrivatePackages(sorted.filter((p: any) => p.category === 'Privada'))
      }
    } catch (err) {
      console.error('Error loading packages for assignment:', err)
    }
  }

  // Load packages when component mounts
  useEffect(() => {
    loadAssignablePackages()
  }, [])

  const handleAssignPackage = async (packageId: string, category: 'Grupal' | 'Privada', renewalMonths: number) => {
    if (!clientId || !packageId) return
    if (renewalMonths === undefined || renewalMonths === null || renewalMonths < 1 || renewalMonths > 999) {
      alert('Los meses restantes deben estar entre 1 y 999')
      return
    }

    setIsAssigning(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        alert('No hay token de autenticación')
        return
      }

      const response = await fetch(getApiUrl('/api/packages/assign'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          clientId,
          packageId,
          autoRenew: true,
          renewalMonths: renewalMonths,
          overrideNegativeBalance: true
        })
      })

      if (response.ok) {
        alert('Paquete asignado exitosamente')
        onPackageAdded()
        if (category === 'Grupal') {
          setSelectedGroupPackage('')
          setGroupRenewalMonths(1)
        } else {
          setSelectedPrivatePackage('')
          setPrivateRenewalMonths(1)
        }
      } else {
        const data = await response.json()
        alert(data.message || 'Error al asignar paquete')
      }
    } catch (error) {
      console.error('Error assigning package:', error)
      alert('Error al asignar paquete')
    } finally {
      setIsAssigning(false)
    }
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/20">
          <Plus className="h-5 w-5 text-white" />
        </div>
        <h4 className="text-lg font-bold text-slate-800">Agregar Nuevo Paquete</h4>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Group Package Card */}
        <div className="bg-white rounded-xl p-5 border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-sm font-semibold text-blue-900 uppercase tracking-wide">Paquete Grupal</span>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Seleccionar paquete</label>
          <select
            value={selectedGroupPackage}
            onChange={(e) => setSelectedGroupPackage(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          >
                <option value="">Elegir paquete grupal...</option>
                {assignableGroupPackages.map(pkg => (
                  <option key={pkg.id} value={pkg.id}>{pkg.name} ({pkg.classes_included} clases)</option>
            ))}
          </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Meses de duración</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setGroupRenewalMonths(Math.max(1, groupRenewalMonths - 1))}
                  className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                >
                  <span className="text-lg font-bold">−</span>
                </button>
            <input
                  type="number"
                  min="1"
                  max="999"
                  value={groupRenewalMonths}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1
                    setGroupRenewalMonths(Math.max(1, Math.min(999, val)))
                  }}
                  className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
          <button
                  onClick={() => setGroupRenewalMonths(Math.min(999, groupRenewalMonths + 1))}
                  className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                >
                  <span className="text-lg font-bold">+</span>
                </button>
              </div>
            </div>

            <button
              onClick={() => handleAssignPackage(selectedGroupPackage, 'Grupal', groupRenewalMonths)}
            disabled={!selectedGroupPackage || isAssigning}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
          >
              {isAssigning ? 'Asignando...' : 'Asignar Paquete Grupal'}
          </button>
        </div>
      </div>

        {/* Private Package Card */}
        <div className="bg-white rounded-xl p-5 border border-purple-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span className="text-sm font-semibold text-purple-900 uppercase tracking-wide">Paquete Privado</span>
          </div>
          
          <div className="space-y-4">
      <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Seleccionar paquete</label>
          <select
            value={selectedPrivatePackage}
            onChange={(e) => setSelectedPrivatePackage(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          >
                <option value="">Elegir paquete privado...</option>
                {assignablePrivatePackages.map(pkg => (
                  <option key={pkg.id} value={pkg.id}>{pkg.name} ({pkg.classes_included} clases)</option>
            ))}
          </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Meses de duración</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPrivateRenewalMonths(Math.max(1, privateRenewalMonths - 1))}
                  className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                >
                  <span className="text-lg font-bold">−</span>
                </button>
            <input
                  type="number"
                  min="1"
                  max="999"
                  value={privateRenewalMonths}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1
                    setPrivateRenewalMonths(Math.max(1, Math.min(999, val)))
                  }}
                  className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
          <button
                  onClick={() => setPrivateRenewalMonths(Math.min(999, privateRenewalMonths + 1))}
                  className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                >
                  <span className="text-lg font-bold">+</span>
                </button>
              </div>
            </div>

            <button
              onClick={() => handleAssignPackage(selectedPrivatePackage, 'Privada', privateRenewalMonths)}
            disabled={!selectedPrivatePackage || isAssigning}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40"
          >
              {isAssigning ? 'Asignando...' : 'Asignar Paquete Privado'}
          </button>
          </div>
        </div>
      </div>
    </div>
  )
}
export default function ClientsPage() {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPackage, setSelectedPackage] = useState('')
  const [error, setError] = useState('')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showPackageModal, setShowPackageModal] = useState(false)
  const [packageHistory, setPackageHistory] = useState<any[]>([])
  const [activePackage, setActivePackage] = useState<any>(null)
  const [activeGroupPackage, setActiveGroupPackage] = useState<any>(null)
  const [activePrivatePackage, setActivePrivatePackage] = useState<any>(null)
  const [classCounts, setClassCounts] = useState<{private: number, group: number}>({private: 0, group: 0})
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null)
  const [editingPackageRenewalMonths, setEditingPackageRenewalMonths] = useState<number>(0)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null)
  const [availablePackages, setAvailablePackages] = useState<{id: string, name: string, category: string}[]>([])
  const [birthdayFilter, setBirthdayFilter] = useState<'' | 'today' | 'week' | 'month'>('')

  const loadAvailablePackages = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      const response = await fetch(getApiUrl('/api/packages?scope=admin'), {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        const list = Array.isArray(data.packages) ? data.packages : []
        setAvailablePackages(list.filter((p: any) => p.is_live).map((p: any) => ({
          id: p.id,
          name: p.name,
          category: p.category
        })))
      }
    } catch (err) {
      console.error('Error loading packages:', err)
    }
  }

  const fetchClients = async () => {
    try {
      setIsLoading(true)
      setError('')
      
      const token = localStorage.getItem('token')
      if (!token) {
        window.location.href = '/login'
        return
      }

      const response = await fetch(getApiUrl('/api/users/clients'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        // Use real data from the server
        if (data.success && data.clients) {
          setClients(data.clients)
        } else if (data.clients) {
          // Fallback: some endpoints might return clients directly
          setClients(data.clients)
        } else {
          // No clients found - show empty list
          setClients([])
        }
      } else {
        // If response is not ok, try to get error message
        const errorData = await response.json().catch(() => ({ message: 'Error al cargar los clientes' }))
        setError(errorData.message || 'Error al cargar los clientes')
        setClients([]) // Show empty list instead of fake data
        console.error('Error fetching clients:', errorData)
      }
      
      setIsLoading(false)
    } catch (error) {
      console.error('Error fetching clients:', error)
      setError('Error de conexión al cargar los clientes')
      setClients([]) // Show empty list instead of fake data
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Solo cargar una vez al montar el componente
    fetchClients()
    loadAvailablePackages()
  }, [])

  const filteredClients = clients.filter(client => {
    const matchesSearch =
      client.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.correo.toLowerCase().includes(searchTerm.toLowerCase())

    // Birthday filter
    let matchesBirthday = true
    if (birthdayFilter && client.cumpleanos) {
      const birthday = new Date(client.cumpleanos)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      birthday.setFullYear(today.getFullYear())
      if (birthday < today) birthday.setFullYear(today.getFullYear() + 1)
      
      if (birthdayFilter === 'today') {
        const todayStr = today.toDateString()
        birthday.setFullYear(today.getFullYear())
        matchesBirthday = birthday.toDateString() === todayStr
      } else if (birthdayFilter === 'week') {
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
        matchesBirthday = birthday >= today && birthday <= nextWeek
      } else if (birthdayFilter === 'month') {
        const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
        matchesBirthday = birthday >= today && birthday <= nextMonth
      }
    } else if (birthdayFilter) {
      matchesBirthday = false // No birthday set but filter is active
    }

    if (!matchesBirthday) return false

    // Package filter
    if (!selectedPackage) return matchesSearch

    // Filtros especiales por tipo de clase
    if (selectedPackage === 'all_private') {
      return matchesSearch && client.type_of_class?.toLowerCase().includes('privad')
    }
    if (selectedPackage === 'all_group') {
      return matchesSearch && client.type_of_class?.toLowerCase().includes('grupal')
    }

    // Filtros por paquete específico (usando el texto guardado en type_of_class)
    return matchesSearch && client.type_of_class === selectedPackage
  })

  const handleViewClient = (client: Client) => {
    setSelectedClient(client)
    setShowViewModal(true)
  }

  const handleEditClient = (client: Client) => {
    setSelectedClient(client)
    setShowEditModal(true)
  }

  const handleDeleteClientRequest = (client: Client) => {
    setClientToDelete(client)
    setShowDeleteModal(true)
  }

  const handleConfirmDeleteClient = async () => {
    if (!clientToDelete) return

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        alert('No hay token de autenticación')
        return
      }

      const response = await fetch(getApiUrl(`/api/users/${clientToDelete.id}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        setClients(prev => prev.filter(c => c.id !== clientToDelete.id))
        setShowDeleteModal(false)
        setClientToDelete(null)
        fetchClients()
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Error al eliminar el cliente' }))
        alert(errorData.message || 'Error al eliminar el cliente')
      }
    } catch (error) {
      console.error('Error deleting client:', error)
      alert('Error de conexión al eliminar el cliente')
    }
  }

  const handleManagePackages = async (client: Client) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      console.log('[Manage Packages] Loading for client:', client.id, client.nombre)

      // Set selected client first to ensure it's correct
      setSelectedClient(client)
      
      // Load package history and class counts in parallel
      const [packageResponse, countsResponse] = await Promise.all([
        fetch(getApiUrl(`/api/users/${client.id}/package-history`), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch(getApiUrl(`/api/users/${client.id}/class-counts`), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      ])

      if (packageResponse.ok) {
        const data = await packageResponse.json()
        setPackageHistory(data.packageHistory || [])
        setActivePackage(data.activePackage) // For backward compatibility
        setActiveGroupPackage(data.activeGroupPackage)
        setActivePrivatePackage(data.activePrivatePackage)
        console.log('[Manage Packages] Package history loaded for client:', client.id)
      } else {
        console.error('[Manage Packages] Failed to load package history for client:', client.id)
        alert('Error al cargar el historial de paquetes')
        return
      }

      if (countsResponse.ok) {
        const countsData = await countsResponse.json()
        const newCounts = {
          private: countsData.private_classes_remaining || 0,
          group: countsData.group_classes_remaining || 0
        }
        console.log('[Manage Packages] Class counts loaded for client:', client.id, 'Counts:', newCounts)
        setClassCounts(newCounts)
      } else {
        console.error('[Manage Packages] Failed to load class counts for client:', client.id)
        // Still show modal but with zero counts
        setClassCounts({ private: 0, group: 0 })
      }

      // Show modal after data is loaded
      setShowPackageModal(true)
    } catch (error) {
      console.error('[Manage Packages] Error loading package history:', error)
      alert('Error al cargar el historial de paquetes')
    }
  }

  const getPackageDisplayName = (packageType: string) => {
    switch (packageType) {
      case 'Cortesía': return 'Cortesía'
      case 'Muestra': return 'Muestra'
      case 'Individual': return 'Individual'
      case '4': return '4 clases'
      case '8': return '8 clases'
      case '12': return '12 clases'
      case 'Ilimitado': return 'Ilimitado'
      default: return packageType
    }
  }

  const getStatusColor = (expirationDate?: string) => {
    if (!expirationDate) return 'bg-gray-100 text-gray-800'
    
    const today = new Date()
    const expiration = new Date(expirationDate)
    const daysUntilExpiration = Math.ceil((expiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysUntilExpiration < 0) return 'bg-red-100 text-red-800'
    if (daysUntilExpiration <= 7) return 'bg-yellow-100 text-yellow-800'
    return 'bg-green-100 text-green-800'
  }

  const getStatusText = (expirationDate?: string) => {
    if (!expirationDate) return 'Sin fecha'
    
    const today = new Date()
    const expiration = new Date(expirationDate)
    const daysUntilExpiration = Math.ceil((expiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysUntilExpiration < 0) return 'Expirado'
    if (daysUntilExpiration <= 7) return `Expira en ${daysUntilExpiration} días`
    return 'Activo'
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              Gestión de Clientes
            </h1>
            <p className="text-slate-500 mt-1">
              Administra todos los clientes del estudio
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-lg shadow-blue-500/25">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{clients.length}</p>
                <p className="text-blue-100 text-sm mt-1">Total Clientes</p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl">
                <Users className="h-6 w-6" />
            </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white shadow-lg shadow-amber-500/25">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">
              {clients.filter(c => {
                if (!c.expiration_date) return false
                const expiration = new Date(c.expiration_date)
                const today = new Date()
                const daysUntilExpiration = Math.ceil((expiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                return daysUntilExpiration <= 7 && daysUntilExpiration >= 0
              }).length}
            </p>
                <p className="text-amber-100 text-sm mt-1">Por Expirar (7 días)</p>
          </div>
              <div className="p-3 bg-white/20 rounded-xl">
                <Calendar className="h-6 w-6" />
              </div>
            </div>
          </div>
          <div 
            className={`bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl p-5 text-white shadow-lg shadow-pink-500/25 cursor-pointer transition-all hover:scale-[1.02] ${birthdayFilter === 'month' ? 'ring-4 ring-pink-300' : ''}`}
            onClick={() => setBirthdayFilter(birthdayFilter === 'month' ? '' : 'month')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">
              {clients.filter(c => {
                if (!c.cumpleanos) return false
                const birthday = new Date(c.cumpleanos)
                const today = new Date()
                    const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
                birthday.setFullYear(today.getFullYear())
                    if (birthday < today) birthday.setFullYear(today.getFullYear() + 1)
                    return birthday >= today && birthday <= nextMonth
              }).length}
            </p>
                <p className="text-pink-100 text-sm mt-1">🎂 Cumpleaños (30 días)</p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl">
                <MessageCircle className="h-6 w-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters - Below stats, above list */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o email..."
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border-0 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {/* Package Filter */}
              <select
                className="px-4 py-3 bg-slate-50 border-0 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer text-sm"
                value={selectedPackage}
                onChange={(e) => setSelectedPackage(e.target.value)}
              >
                <option value="">Todos los paquetes</option>
                <option value="all_private">Paquetes privados</option>
                <option value="all_group">Paquetes grupales</option>
                {availablePackages.filter(p => p.category === 'Grupal').length > 0 && (
                  <option disabled>── Grupales ──</option>
                )}
                {availablePackages.filter(p => p.category === 'Grupal').map(pkg => (
                  <option key={pkg.id} value={pkg.name}>{pkg.name}</option>
                ))}
                {availablePackages.filter(p => p.category === 'Privada').length > 0 && (
                  <option disabled>── Privados ──</option>
                )}
                {availablePackages.filter(p => p.category === 'Privada').map(pkg => (
                  <option key={pkg.id} value={pkg.name}>{pkg.name}</option>
                ))}
              </select>
              
              {/* Birthday Filter */}
              <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
                <button
                  onClick={() => setBirthdayFilter(birthdayFilter === 'today' ? '' : 'today')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    birthdayFilter === 'today' 
                      ? 'bg-pink-500 text-white shadow-sm' 
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  🎂 Hoy
                </button>
                <button
                  onClick={() => setBirthdayFilter(birthdayFilter === 'week' ? '' : 'week')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    birthdayFilter === 'week' 
                      ? 'bg-pink-500 text-white shadow-sm' 
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  7 días
                </button>
                <button
                  onClick={() => setBirthdayFilter(birthdayFilter === 'month' ? '' : 'month')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    birthdayFilter === 'month' 
                      ? 'bg-pink-500 text-white shadow-sm' 
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  30 días
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Clients Table */}
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contacto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paquete
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cumpleaños
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredClients.map((client, index) => (
                  <motion.tr
                    key={client.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-gray-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {client.nombre}
                          </div>
                          <div className="text-sm text-gray-500">
                            {client.genero}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{client.correo}</div>
                      <div className="text-sm text-gray-500">{client.numero_de_telefono}</div>
                      {client.instagram && (
                        <div className="text-sm text-gray-500">@{client.instagram}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {client.activeGroupPackage ? (
                          <span className="status-badge bg-emerald-100 text-emerald-800 text-xs">
                            Grupal: {client.activeGroupPackage.package_name}
                          </span>
                        ) : null}
                        {client.activePrivatePackage ? (
                          <span className="status-badge bg-violet-100 text-violet-800 text-xs">
                            Privado: {client.activePrivatePackage.package_name}
                          </span>
                        ) : null}
                        {!client.activeGroupPackage && !client.activePrivatePackage && (
                          <span className="status-badge bg-gray-100 text-gray-600 text-xs">
                            Sin paquete
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        {client.activeGroupPackage && (
                          <span className={`status-badge text-xs ${getStatusColor(client.activeGroupPackage.end_date || undefined)}`}>
                            Grupal: {getStatusText(client.activeGroupPackage.end_date || undefined)}
                          </span>
                        )}
                        {client.activePrivatePackage && (
                          <span className={`status-badge text-xs ${getStatusColor(client.activePrivatePackage.end_date || undefined)}`}>
                            Privado: {getStatusText(client.activePrivatePackage.end_date || undefined)}
                          </span>
                        )}
                        {!client.activeGroupPackage && !client.activePrivatePackage && (
                          <span className="status-badge bg-gray-100 text-gray-600 text-xs">
                            -
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {client.cumpleanos ? new Date(client.cumpleanos).toLocaleDateString('es-ES') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button 
                        onClick={() => handleViewClient(client)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Ver detalles"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleEditClient(client)}
                        className="text-gray-600 hover:text-gray-900"
                        title="Editar cliente"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleManagePackages(client)}
                        className="text-purple-600 hover:text-purple-900"
                        title="Gestionar paquetes"
                      >
                        <Package className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClientRequest(client)}
                        className="text-red-600 hover:text-red-900"
                        title="Eliminar cliente"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredClients.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              {error ? (
                <div>
                  <p className="text-red-600 font-medium mb-2">{error}</p>
                  <button
                    onClick={fetchClients}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Reintentar
                  </button>
                </div>
              ) : (
                <p className="text-gray-500">
                  {clients.length === 0 
                    ? 'No hay clientes registrados' 
                    : 'No se encontraron clientes con los filtros aplicados'}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* View Client Modal */}
      {showViewModal && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Detalles del Cliente</h3>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Información Personal */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">Información Personal</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nombre Completo</label>
                    <p className="text-sm text-gray-900">{selectedClient.nombre}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="text-sm text-gray-900">{selectedClient.correo}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Número de Teléfono</label>
                    <p className="text-sm text-gray-900">{selectedClient.numero_de_telefono}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Instagram</label>
                    <p className="text-sm text-gray-900">{selectedClient.instagram || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cumpleaños</label>
                    <p className="text-sm text-gray-900">
                      {selectedClient.cumpleanos ? new Date(selectedClient.cumpleanos).toLocaleDateString('es-ES') : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Género</label>
                    <p className="text-sm text-gray-900">{selectedClient.genero || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Fecha de Registro</label>
                    <p className="text-sm text-gray-900">
                      {selectedClient.created_at ? new Date(selectedClient.created_at).toLocaleDateString('es-ES') : '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Información de Salud */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">Información de Salud</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Lesiones o Limitaciones Físicas</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                    {selectedClient.lesion_o_limitacion_fisica || 'Ninguna reportada'}
                  </p>
                </div>
              </div>

              {/* Información del Paquete */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">Paquete de Clases</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tipo de Paquete</label>
                    <p className="text-sm text-gray-900">{getPackageDisplayName(selectedClient.type_of_class)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Fecha de Expiración</label>
                    <p className="text-sm text-gray-900">
                      {selectedClient.expiration_date ? new Date(selectedClient.expiration_date).toLocaleDateString('es-ES') : 'Sin fecha de expiración'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  setShowViewModal(false)
                  handleEditClient(selectedClient)
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Editar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {showEditModal && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Editar Cliente</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault()
              if (!selectedClient) return
              
              const formData = new FormData(e.target as HTMLFormElement)
              
              // Convert FormData to proper Client type
              const updates: Partial<Client> = {
                nombre: String(formData.get('nombre') || ''),
                correo: String(formData.get('correo') || ''),
                numero_de_telefono: String(formData.get('numero_de_telefono') || ''),
                instagram: formData.get('instagram') ? String(formData.get('instagram')) : undefined,
                cumpleanos: formData.get('cumpleanos') ? String(formData.get('cumpleanos')) : null,
                lesion_o_limitacion_fisica: formData.get('lesion_o_limitacion_fisica') ? String(formData.get('lesion_o_limitacion_fisica')) : null,
                genero: formData.get('genero') ? String(formData.get('genero')) : null
              }

              try {
                const token = localStorage.getItem('token')
                if (!token) {
                  alert('No hay token de autenticación')
                  return
                }

                const response = await fetch(getApiUrl(`/api/users/${selectedClient.id}`), {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify(updates)
                })

                if (response.ok) {
                  const data = await response.json()
                  // Refresh clients list to get latest data from server
                  await fetchClients()
                  setShowEditModal(false)
                  setSelectedClient(null)
                  alert('Cliente actualizado exitosamente')
                } else {
                  const errorData = await response.json().catch(() => ({ message: 'Error al actualizar el cliente' }))
                  alert(errorData.message || 'Error al actualizar el cliente')
                }
              } catch (error) {
                console.error('Error updating client:', error)
                alert('Error de conexión al actualizar el cliente')
              }
            }}>
              <div className="space-y-6">
                {/* Información Personal */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Información Personal</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo *</label>
                      <input
                        type="text"
                        name="nombre"
                        defaultValue={selectedClient.nombre}
                        className="input-field"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                      <input
                        type="email"
                        name="correo"
                        defaultValue={selectedClient.correo}
                        className="input-field"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Número de Teléfono *</label>
                      <input
                        type="tel"
                        name="numero_de_telefono"
                        defaultValue={selectedClient.numero_de_telefono}
                        className="input-field"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
                      <input
                        type="text"
                        name="instagram"
                        defaultValue={selectedClient.instagram || ''}
                        className="input-field"
                        placeholder="@usuario"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cumpleaños</label>
                      <input
                        type="date"
                        name="cumpleanos"
                        defaultValue={selectedClient.cumpleanos || ''}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Género</label>
                      <select
                        name="genero"
                        defaultValue={selectedClient.genero || ''}
                        className="input-field"
                      >
                        <option value="">Seleccionar...</option>
                        <option value="Femenino">Femenino</option>
                        <option value="Masculino">Masculino</option>
                        <option value="Otro">Otro</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Información de Salud */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Información de Salud</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lesiones o Limitaciones Físicas</label>
                    <textarea
                      name="lesion_o_limitacion_fisica"
                      defaultValue={selectedClient.lesion_o_limitacion_fisica || ''}
                      className="input-field"
                      rows={3}
                      placeholder="Describe cualquier lesión o limitación física..."
                    />
                  </div>
                </div>

              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para gestionar paquetes */}
      {showPackageModal && selectedClient && (() => {
        // Capture client ID at render time to avoid closure issues
        const modalClientId = selectedClient.id
        const modalClientName = selectedClient.nombre
        console.log('[Package Modal] Rendering modal for client:', modalClientId, modalClientName)
        
        return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 flex-shrink-0">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-white">Gestión de Paquetes</h3>
                  <p className="text-slate-300 text-sm mt-1">{modalClientName}</p>
                </div>
              <button
                onClick={() => setShowPackageModal(false)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                  <X className="h-5 w-5 text-white" />
              </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Class Counts - Modern Cards */}
              <div className="bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 rounded-2xl p-5 border border-indigo-100">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl shadow-lg shadow-indigo-500/20">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-800">Clases Disponibles</h4>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {/* Private Classes */}
                  <div className="bg-white rounded-xl p-3 border border-purple-100 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-purple-700 uppercase">Privadas</span>
                      <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setClassCounts({...classCounts, private: Math.max(0, classCounts.private - 1)})}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-600 transition-colors text-lg font-bold"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={classCounts.private}
                        onChange={(e) => setClassCounts({...classCounts, private: parseInt(e.target.value) || 0})}
                        className="w-16 px-2 py-2 bg-purple-50 border-0 rounded-lg text-center text-lg font-bold text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <button
                        onClick={() => setClassCounts({...classCounts, private: classCounts.private + 1})}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-600 transition-colors text-lg font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  
                  {/* Group Classes */}
                  <div className="bg-white rounded-xl p-3 border border-blue-100 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-blue-700 uppercase">Grupales</span>
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setClassCounts({...classCounts, group: Math.max(0, classCounts.group - 1)})}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors text-lg font-bold"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={classCounts.group}
                        onChange={(e) => setClassCounts({...classCounts, group: parseInt(e.target.value) || 0})}
                        className="w-16 px-2 py-2 bg-blue-50 border-0 rounded-lg text-center text-lg font-bold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => setClassCounts({...classCounts, group: classCounts.group + 1})}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors text-lg font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={async () => {
                    const token = localStorage.getItem('token')
                    // Capture client ID at the time of click to avoid closure issues
                    const clientId = selectedClient?.id
                    if (!token || !clientId) {
                      alert('Error: No se pudo identificar al cliente')
                      return
                    }
                    try {
                      console.log('[Save Class Counts] Saving for client:', clientId, 'Counts:', classCounts)
                      const response = await fetch(getApiUrl(`/api/users/${clientId}/update-class-counts`), {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                          private_classes_remaining: classCounts.private,
                          group_classes_remaining: classCounts.group
                        })
                      })
                      if (response.ok) {
                        const data = await response.json()
                        console.log('[Save Class Counts] Success:', data)
                        alert('Clases actualizadas exitosamente')
                        // Reload the class counts to reflect the update
                        const countsResponse = await fetch(getApiUrl(`/api/users/${clientId}/class-counts`), {
                          headers: {
                            'Authorization': `Bearer ${token}`
                          }
                        })
                        if (countsResponse.ok) {
                          const countsData = await countsResponse.json()
                          setClassCounts({
                            private: countsData.private_classes_remaining || 0,
                            group: countsData.group_classes_remaining || 0
                          })
                        }
                      } else {
                        const errorData = await response.json().catch(() => ({ message: 'Error al actualizar clases' }))
                        console.error('[Save Class Counts] Error response:', errorData)
                        alert(errorData.message || 'Error al actualizar clases')
                      }
                    } catch (error) {
                      console.error('[Save Class Counts] Exception:', error)
                      alert('Error al actualizar clases')
                    }
                  }}
                  className="w-full mt-4 py-3 bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-blue-700 transition-all shadow-lg shadow-indigo-500/25"
                >
                  Guardar Cambios de Clases
                </button>
              </div>

              {/* Active Packages - Side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Active Group Package */}
              {activeGroupPackage && (
                  <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-5 border border-emerald-200">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-1.5 bg-emerald-500 rounded-lg">
                        <Package className="h-4 w-4 text-white" />
                  </div>
                      <span className="text-sm font-bold text-emerald-800 uppercase tracking-wide">Grupal Activo</span>
                    </div>
                    <div className="space-y-3">
                    <div>
                        <span className="text-xs text-emerald-600 font-medium">Paquete</span>
                        <p className="text-base font-semibold text-emerald-900">{activeGroupPackage.package_name}</p>
                    </div>
                      <div className="flex gap-4">
                    <div>
                          <span className="text-xs text-emerald-600 font-medium">Vence</span>
                          <p className="text-sm font-medium text-emerald-800">
                        {new Date(activeGroupPackage.end_date).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                    <div>
                          <span className="text-xs text-emerald-600 font-medium">Clases</span>
                          <p className="text-sm font-medium text-emerald-800">{activeGroupPackage.classes_included}</p>
                    </div>
                    </div>
                  </div>
                </div>
              )}

                {/* Active Private Package */}
              {activePrivatePackage && (
                  <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl p-5 border border-violet-200">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-1.5 bg-violet-500 rounded-lg">
                        <Package className="h-4 w-4 text-white" />
                  </div>
                      <span className="text-sm font-bold text-violet-800 uppercase tracking-wide">Privado Activo</span>
                    </div>
                    <div className="space-y-3">
                    <div>
                        <span className="text-xs text-violet-600 font-medium">Paquete</span>
                        <p className="text-base font-semibold text-violet-900">{activePrivatePackage.package_name}</p>
                    </div>
                      <div className="flex gap-4">
                    <div>
                          <span className="text-xs text-violet-600 font-medium">Vence</span>
                          <p className="text-sm font-medium text-violet-800">
                        {new Date(activePrivatePackage.end_date).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                    <div>
                          <span className="text-xs text-violet-600 font-medium">Clases</span>
                          <p className="text-sm font-medium text-violet-800">{activePrivatePackage.classes_included}</p>
                    </div>
                    </div>
                  </div>
                </div>
              )}

                {/* Empty state if no active packages */}
                {!activeGroupPackage && !activePrivatePackage && (
                  <div className="col-span-2 bg-slate-50 rounded-2xl p-8 text-center border border-slate-200">
                    <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">Sin paquetes activos</p>
                    <p className="text-slate-400 text-sm">Asigna un paquete nuevo abajo</p>
                  </div>
                )}
              </div>

              {/* Add New Package */}
              <PackageAssignmentSection 
                clientId={modalClientId}
                onPackageAdded={() => {
                  // Reload data for the current client
                  const currentClient = clients.find(c => c.id === modalClientId)
                  if (currentClient) {
                    handleManagePackages(currentClient)
                  }
                }}
              />


              {/* Historial de Paquetes */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl shadow-lg shadow-slate-500/20">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-800">Historial de Paquetes</h4>
                </div>
                {packageHistory.length > 0 ? (
                  <div className="space-y-3">
                    {packageHistory.map((pkg, index) => (
                      <div 
                        key={index} 
                        className={`bg-white rounded-xl p-4 border shadow-sm transition-all hover:shadow-md ${
                          pkg.status === 'active' ? 'border-emerald-200' :
                          pkg.status === 'expired' ? 'border-red-200' :
                          'border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between flex-wrap gap-4 mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              pkg.status === 'active' ? 'bg-emerald-500' :
                              pkg.status === 'expired' ? 'bg-red-500' :
                              'bg-slate-400'
                            }`}></div>
                            <div>
                              <p className="font-semibold text-slate-800">{pkg.package_name}</p>
                              <p className="text-xs text-slate-500">
                                {new Date(pkg.start_date).toLocaleDateString('es-ES')} → {new Date(pkg.end_date).toLocaleDateString('es-ES')}
                              </p>
                            </div>
                          </div>
                          <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                            pkg.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                            pkg.status === 'expired' ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {pkg.status === 'active' ? 'Activo' :
                             pkg.status === 'expired' ? 'Expirado' : 'Cancelado'}
                          </span>
                        </div>
                        <div className="pt-3 mt-3 border-t border-slate-100">
                          <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Meses:</span>
                              {editingPackageId === pkg.id ? (
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center bg-slate-100 rounded-lg overflow-hidden">
                                    <button
                                      onClick={() => setEditingPackageRenewalMonths(Math.max(1, editingPackageRenewalMonths - 1))}
                                      className="px-2 py-1.5 text-slate-600 hover:bg-slate-200 transition-colors"
                                    >
                                      −
                                    </button>
                        <input
                                      type="number"
                                      min="1"
                                      max="999"
                                      value={editingPackageRenewalMonths}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value) || 1
                                        setEditingPackageRenewalMonths(Math.max(1, Math.min(999, val)))
                                      }}
                                      className="w-14 px-1 py-1.5 bg-transparent text-center text-sm font-semibold focus:outline-none"
                                    />
                        <button
                                      onClick={() => setEditingPackageRenewalMonths(Math.min(999, editingPackageRenewalMonths + 1))}
                                      className="px-2 py-1.5 text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                                      +
                        </button>
                                  </div>
                                  {editingPackageRenewalMonths !== (pkg.renewal_months ?? 0) && (
                        <button
                          onClick={async () => {
                            try {
                                          const token = localStorage.getItem('token')
                                          const response = await fetch(getApiUrl(`/api/package-history/${pkg.id}/update-renewal`), {
                                            method: 'POST',
                                headers: {
                                              'Authorization': `Bearer ${token}`,
                                              'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                              renewal_months: editingPackageRenewalMonths
                                })
                              })
                              if (response.ok) {
                                            alert('Meses restantes actualizados exitosamente')
                                setEditingPackageId(null)
                                            setEditingPackageRenewalMonths(0)
                                            const currentClient = clients.find(c => c.id === modalClientId)
                                            if (currentClient) {
                                              handleManagePackages(currentClient)
                                            }
                              } else {
                                            const data = await response.json()
                                            alert(data.message || 'Error al actualizar meses restantes')
                              }
                            } catch (error) {
                                          console.error('Error updating renewal months:', error)
                                          alert('Error al actualizar meses restantes')
                            }
                          }}
                                      className="px-3 py-1.5 bg-blue-500 text-white text-xs font-semibold rounded-lg hover:bg-blue-600 transition-colors"
                        >
                                      ✓
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      setEditingPackageId(null)
                                      setEditingPackageRenewalMonths(0)
                                    }}
                                    className="px-3 py-1.5 bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-300 transition-colors"
                                  >
                                    ✕
                        </button>
                      </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="px-3 py-1 bg-slate-100 rounded-lg text-sm font-bold text-slate-700">
                                    {pkg.renewal_months ?? 0}
                                  </span>
                                  <button
                                    onClick={() => {
                                      setEditingPackageId(pkg.id)
                                      setEditingPackageRenewalMonths(pkg.renewal_months && pkg.renewal_months > 0 ? pkg.renewal_months : 1)
                                    }}
                                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                                  >
                                    Editar
                                  </button>
                    </div>
                              )}
                  </div>
                            <div className="flex gap-2">
                              {pkg.status === 'active' && (
                                <button
                                  onClick={async () => {
                                    if (confirm('¿Estás seguro de que quieres cancelar este paquete activo?')) {
                                      try {
                                        const token = localStorage.getItem('token')
                                        const response = await fetch(getApiUrl(`/api/package-history/${pkg.id}/cancel`), {
                                          method: 'POST',
                                          headers: {
                                            'Authorization': `Bearer ${token}`,
                                            'Content-Type': 'application/json'
                                          }
                                        })
                                        if (response.ok) {
                                          alert('Paquete cancelado exitosamente')
                                          handleManagePackages(selectedClient!)
                                        } else {
                                          const data = await response.json()
                                          alert(data.message || 'Error al cancelar el paquete')
                                        }
                                      } catch (error) {
                                        console.error('Error canceling package:', error)
                                        alert('Error al cancelar el paquete')
                                      }
                                    }
                                  }}
                                  className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-100 border border-red-200 transition-colors"
                                >
                                  Cancelar
                                </button>
                              )}
                              {pkg.status === 'expired' && (
                                <>
                                  <button
                                    onClick={async () => {
                                      if (confirm('¿Renovar este paquete por 1 mes más?')) {
                                        try {
                                          const token = localStorage.getItem('token')
                                          const response = await fetch(getApiUrl(`/api/package-history/${pkg.id}/renew`), {
                                            method: 'POST',
                                            headers: {
                                              'Authorization': `Bearer ${token}`,
                                              'Content-Type': 'application/json'
                                            },
                                            body: JSON.stringify({ months: 1 })
                                          })
                                          if (response.ok) {
                                            alert('Paquete renovado exitosamente')
                                            const currentClient = clients.find(c => c.id === modalClientId)
                                            if (currentClient) {
                                              handleManagePackages(currentClient)
                                            }
                                          } else {
                                            const data = await response.json()
                                            alert(data.message || 'Error al renovar el paquete')
                                          }
                                        } catch (error) {
                                          console.error('Error renewing package:', error)
                                          alert('Error al renovar el paquete')
                                        }
                                      }
                                    }}
                                    className="px-3 py-1.5 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-lg hover:bg-emerald-100 border border-emerald-200 transition-colors"
                                  >
                                    Renovar
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (confirm('¿Estás seguro de que quieres eliminar este paquete del historial?')) {
                                        try {
                                          const token = localStorage.getItem('token')
                                          const response = await fetch(getApiUrl(`/api/package-history/${pkg.id}`), {
                                            method: 'DELETE',
                                            headers: {
                                              'Authorization': `Bearer ${token}`
                                            }
                                          })
                                          if (response.ok) {
                                            alert('Paquete eliminado del historial exitosamente')
                                            const currentClient = clients.find(c => c.id === modalClientId)
                                            if (currentClient) {
                                              handleManagePackages(currentClient)
                                            }
                                          } else {
                                            const data = await response.json()
                                            alert(data.message || 'Error al eliminar el paquete')
                                          }
                                        } catch (error) {
                                          console.error('Error deleting package:', error)
                                          alert('Error al eliminar el paquete')
                                        }
                                      }
                                    }}
                                    className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-200 transition-colors"
                                  >
                                    Eliminar
                                  </button>
                                </>
                              )}
                          </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No hay historial de paquetes</p>
                )}
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowPackageModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
        )
      })()}

      {/* Delete Client Modal */}
      {showDeleteModal && clientToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-red-700 mb-3">Eliminar Cliente</h3>
            <p className="text-sm text-gray-700 mb-4">
              Esta acción <span className="font-semibold">ELIMINARÁ</span> permanentemente a{' '}
              <span className="font-semibold">{clientToDelete.nombre}</span> y todos sus registros
              (clases, reservas, historial de paquetes, pagos, etc.). Esta acción no se puede deshacer.
            </p>
            <p className="text-sm text-gray-700 mb-4">
              ¿Estás seguro de que quieres continuar?
            </p>
            <div className="mt-4 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false)
                  setClientToDelete(null)
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteClient}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Sí, eliminar definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

