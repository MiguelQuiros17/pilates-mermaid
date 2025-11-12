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

  const fetchClients = async () => {
    try {
      setIsLoading(true)
      setError('')
      
      const token = localStorage.getItem('token')
      if (!token) {
        window.location.href = '/login'
        return
      }

      const response = await fetch('${API_BASE_URL}/api/users/clients', {
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
  }, [])

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.correo.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPackage = !selectedPackage || client.type_of_class === selectedPackage
    return matchesSearch && matchesPackage
  })

  const handleViewClient = (client: Client) => {
    setSelectedClient(client)
    setShowViewModal(true)
  }

  const handleEditClient = (client: Client) => {
    setSelectedClient(client)
    setShowEditModal(true)
  }

  const handleDeleteClient = async (client: Client) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar a ${client.nombre}? Esta acción no se puede deshacer.`)) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        alert('No hay token de autenticación')
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/users/${client.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        // Remove from local state
        setClients(clients.filter(c => c.id !== client.id))
        alert('Cliente eliminado exitosamente')
        // Refresh clients list to get latest data
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

      const response = await fetch(`${API_BASE_URL}/api/users/${client.id}/package-history`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setPackageHistory(data.packageHistory || [])
        setActivePackage(data.activePackage)
        setSelectedClient(client)
        setShowPackageModal(true)
      } else {
        alert('Error al cargar el historial de paquetes')
      }
    } catch (error) {
      console.error('Error loading package history:', error)
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
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Clientes</h1>
            <p className="text-gray-600 mt-1">
              Administra todos los clientes del estudio
            </p>
          </div>
          <button className="btn-primary mt-4 sm:mt-0">
            <Plus className="h-5 w-5 mr-2" />
            Nuevo Cliente
          </button>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o email..."
                  className="input-field pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                className="input-field"
                value={selectedPackage}
                onChange={(e) => setSelectedPackage(e.target.value)}
              >
                <option value="">Todos los paquetes</option>
                <option value="Cortesía">Cortesía</option>
                <option value="Muestra">Muestra</option>
                <option value="Individual">Individual</option>
                <option value="4">4 clases</option>
                <option value="8">8 clases</option>
                <option value="12">12 clases</option>
                <option value="Ilimitado">Ilimitado</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card text-center">
            <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{clients.length}</p>
            <p className="text-sm text-gray-600">Total Clientes</p>
          </div>
          <div className="card text-center">
            <Package className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">
              {clients.filter(c => c.type_of_class === '8').length}
            </p>
            <p className="text-sm text-gray-600">Paquete 8 clases</p>
          </div>
          <div className="card text-center">
            <Calendar className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">
              {clients.filter(c => {
                if (!c.expiration_date) return false
                const expiration = new Date(c.expiration_date)
                const today = new Date()
                const daysUntilExpiration = Math.ceil((expiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                return daysUntilExpiration <= 7 && daysUntilExpiration >= 0
              }).length}
            </p>
            <p className="text-sm text-gray-600">Por Expirar</p>
          </div>
          <div className="card text-center">
            <MessageCircle className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">
              {clients.filter(c => {
                if (!c.cumpleanos) return false
                const birthday = new Date(c.cumpleanos)
                const today = new Date()
                const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
                birthday.setFullYear(today.getFullYear())
                return birthday >= today && birthday <= nextWeek
              }).length}
            </p>
            <p className="text-sm text-gray-600">Cumpleaños</p>
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="status-badge bg-blue-100 text-blue-800">
                        {getPackageDisplayName(client.type_of_class)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`status-badge ${getStatusColor(client.expiration_date || undefined)}`}>
                        {getStatusText(client.expiration_date || undefined)}
                      </span>
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
                        onClick={() => handleDeleteClient(client)}
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
                type_of_class: String(formData.get('type_of_class') || 'Sin paquete'),
                expiration_date: formData.get('expiration_date') ? String(formData.get('expiration_date')) : null,
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

                const response = await fetch(`${API_BASE_URL}/api/users/${selectedClient.id}`, {
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

                {/* Información del Paquete */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Paquete de Clases</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Paquete</label>
                      <select
                        name="type_of_class"
                        defaultValue={selectedClient.type_of_class || ''}
                        className="input-field"
                      >
                        <option value="Sin paquete">Sin paquete</option>
                        <option value="Clase Prueba">Clase Prueba</option>
                        <option value="1 Clase Grupal">1 Clase Grupal</option>
                        <option value="4 Clases Grupales">4 Clases Grupales</option>
                        <option value="8 Clases Grupales">8 Clases Grupales</option>
                        <option value="12 Clases Grupales">12 Clases Grupales</option>
                        <option value="Clases Grupales Ilimitadas">Clases Grupales Ilimitadas</option>
                        <option value="1 Clase Privada">1 Clase Privada</option>
                        <option value="4 Clases Privadas">4 Clases Privadas</option>
                        <option value="8 Clases Privadas">8 Clases Privadas</option>
                        <option value="12 Clases Privadas">12 Clases Privadas</option>
                        <option value="15 Clases Privadas">15 Clases Privadas</option>
                        <option value="20 Clases Privadas">20 Clases Privadas</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Expiración</label>
                      <input
                        type="date"
                        name="expiration_date"
                        defaultValue={selectedClient.expiration_date || ''}
                        className="input-field"
                      />
                    </div>
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
      {showPackageModal && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Gestión de Paquetes - {selectedClient.nombre}
              </h3>
              <button
                onClick={() => setShowPackageModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Paquete Activo */}
              {activePackage && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-green-900 mb-2">Paquete Activo</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-green-700">Paquete</label>
                      <p className="text-sm text-green-900">{activePackage.package_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-green-700">Método de Pago</label>
                      <p className="text-sm text-green-900">{activePackage.payment_method}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-green-700">Vencimiento</label>
                      <p className="text-sm text-green-900">
                        {new Date(activePackage.end_date).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-green-700">Clases Incluidas</label>
                      <p className="text-sm text-green-900">{activePackage.classes_included}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-green-700">Monto Pagado</label>
                      <p className="text-sm text-green-900">${activePackage.amount_paid} MXN</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-green-700">Estado</label>
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        {activePackage.status}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Historial de Paquetes */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">Historial de Paquetes</h4>
                {packageHistory.length > 0 ? (
                  <div className="space-y-3">
                    {packageHistory.map((pkg, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Paquete</label>
                            <p className="text-sm text-gray-900">{pkg.package_name}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Período</label>
                            <p className="text-sm text-gray-900">
                              {new Date(pkg.start_date).toLocaleDateString('es-ES')} - {new Date(pkg.end_date).toLocaleDateString('es-ES')}
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Método de Pago</label>
                            <p className="text-sm text-gray-900">{pkg.payment_method}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Estado</label>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              pkg.status === 'active' ? 'bg-green-100 text-green-800' :
                              pkg.status === 'expired' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {pkg.status === 'active' ? 'Activo' :
                               pkg.status === 'expired' ? 'Expirado' : 'Cancelado'}
                            </span>
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
      )}
    </DashboardLayout>
  )
}
