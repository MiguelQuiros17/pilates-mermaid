'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Users,
  DollarSign,
  Calendar,
  CheckCircle
} from 'lucide-react'
import DashboardLayout from '@/components/DashboardLayout'
import WhatsAppButton, { WhatsAppTemplates } from '@/components/WhatsAppButton'

interface Package {
    id: string
    name: string
    type: string
    classes_included: number
    price: number
    validity_days: number
    is_active: boolean
    category: 'Grupal' | 'Privada'
}

interface Client {
  id: string
  nombre: string
  correo: string
  type_of_class: string
  expiration_date?: string
}

export default function PackagesPage() {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''
  const [packages, setPackages] = useState<Package[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [selectedPackage, setSelectedPackage] = useState<string>('')

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)

      // Solo hacer fetch si es admin
      if (parsedUser?.role === 'admin') {
        const fetchClients = async () => {
          try {
            const token = localStorage.getItem('token')
            if (!token) return

            const response = await fetch('/api/users/clients', {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            })

            if (response.ok) {
              const data = await response.json()
              setClients(data.clients || [])
            }
          } catch (error) {
            console.error('Error fetching clients:', error)
          }
        }

        fetchClients()
      }
    }

      // Paquetes reales de Pilates Mermaid
      const samplePackages: Package[] = [
      // Clases Grupales
      {
        id: '1',
        name: 'Clase Prueba',
        type: 'Clase Prueba',
        classes_included: 1,
        price: 300,
        validity_days: 30,
        is_active: true,
        category: 'Grupal',
      },
      {
        id: '2',
        name: '1 Clase Grupal',
        type: '1 Clase Grupal',
        classes_included: 1,
        price: 400,
        validity_days: 30,
        is_active: true,
        category: 'Grupal',
      },
      {
        id: '3',
        name: '4 Clases Grupales',
        type: '4 Clases Grupales',
        classes_included: 4,
        price: 1400,
        validity_days: 30,
        is_active: true,
        category: 'Grupal'
      },
      {
        id: '4',
        name: '8 Clases Grupales',
        type: '8 Clases Grupales',
        classes_included: 8,
        price: 2600,
        validity_days: 30,
        is_active: true,
        category: 'Grupal'
      },
      {
        id: '5',
        name: '12 Clases Grupales',
        type: '12 Clases Grupales',
        classes_included: 12,
        price: 3600,
        validity_days: 30,
        is_active: true,
        category: 'Grupal'
      },
      {
        id: '6',
        name: 'Clases Grupales Ilimitadas',
        type: 'Clases Grupales Ilimitadas',
        classes_included: 999,
        price: 4000,
        validity_days: 30,
        is_active: true,
        category: 'Grupal'
      },
      // Clases Privadas
      {
        id: '7',
        name: '1 Clase Privada',
        type: '1 Clase Privada',
        classes_included: 1,
        price: 1200,
        validity_days: 30,
        is_active: true,
        category: 'Privada'
      },
      {
        id: '8',
        name: '4 Clases Privadas',
        type: '4 Clases Privadas',
        classes_included: 4,
        price: 4400,
        validity_days: 30,
        is_active: true,
        category: 'Privada'
      },
      {
        id: '9',
        name: '8 Clases Privadas',
        type: '8 Clases Privadas',
        classes_included: 8,
        price: 8000,
        validity_days: 30,
        is_active: true,
        category: 'Privada'
      },
      {
        id: '10',
        name: '12 Clases Privadas',
        type: '12 Clases Privadas',
        classes_included: 12,
        price: 10800,
        validity_days: 30,
        is_active: true,
        category: 'Privada'
      },
      {
        id: '11',
        name: '16 Clases Privadas',
        type: '16 Clases Privadas',
        classes_included: 16,
        price: 13600,
        validity_days: 30,
        is_active: true,
        category: 'Privada'
      },
      {
        id: '12',
        name: '20 Clases Privadas',
        type: '20 Clases Privadas',
        classes_included: 20,
        price: 17000,
        validity_days: 30,
        is_active: true,
        category: 'Privada'
      }
    ]

    setPackages(samplePackages)
    setIsLoading(false)
  }, []) // Removed user dependency to prevent infinite loop

  const getPackageDisplayName = (packageType: string) => {
    switch (packageType) {
      case 'Cortesía': return 'Cortesía'
      case 'Muestra': return 'Muestra'
      case 'Individual': return 'Individual'
      case '4': return '4 clases'
      case '8': return '8 clases'
      case '12': return '12 clases'
      case 'Ilimitado': return 'Ilimitado'
      case 'Sin paquete': return 'Sin paquete'
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


  const refreshClients = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/users/clients', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setClients(data.clients || [])
      }
    } catch (error) {
      console.error('Error refreshing clients:', error)
    }
  }

  const handleAssignPackage = async () => {
    if (!selectedClient || !selectedPackage) {
      alert('Por favor selecciona un cliente y un paquete')
      return
    }

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        alert('No tienes autorización para realizar esta acción')
        return
      }

      console.log('Sending request to assign package:', {
        clientId: selectedClient,
        packageId: selectedPackage
      })

      const response = await fetch('/api/packages/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          clientId: selectedClient,
          packageId: selectedPackage
        })
      })

      console.log('Response status:', response.status)
      console.log('Response headers:', response.headers)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('Response data:', data)

      if (data.success) {
        alert(data.message)
        
        // Refresh clients data from server
        await refreshClients()
        
        // Notify other pages that clients data has been updated
        localStorage.setItem('clientsUpdated', 'true')
        
        // Si el cliente asignado es el usuario actual, actualizar su información en localStorage
        const currentUser = localStorage.getItem('user')
        if (currentUser) {
          try {
            const parsedUser = JSON.parse(currentUser)
            if (parsedUser.id === selectedClient && data.client) {
              // Actualizar información del usuario en localStorage
              const updatedUser = {
                ...parsedUser,
                type_of_class: data.client.type_of_class,
                expiration_date: data.client.expiration_date
              }
              localStorage.setItem('user', JSON.stringify(updatedUser))
              
              // Notificar que el usuario actual fue actualizado
              localStorage.setItem('userPackageUpdated', 'true')
              
              // Disparar evento personalizado para notificar a otras pestañas/ventanas
              window.dispatchEvent(new CustomEvent('userPackageUpdated', {
                detail: { client: data.client }
              }))
            }
          } catch (error) {
            console.error('Error updating user in localStorage:', error)
          }
        }
        
        // Notificar que un paquete fue asignado a un cliente específico
        localStorage.setItem(`clientPackageUpdated_${selectedClient}`, 'true')
        window.dispatchEvent(new CustomEvent('clientPackageUpdated', {
          detail: { clientId: selectedClient, client: data.client }
        }))
        
        // Reset form
        setSelectedClient('')
        setSelectedPackage('')
      } else {
        alert(data.message || 'Error al asignar paquete')
      }
      } catch (error) {
          console.error('Error assigning package:', error)

          if (error instanceof Error) {
              alert('Error al conectar con el servidor: ' + error.message)
          } else {
              alert('Error al conectar con el servidor')
          }
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {user?.role === 'cliente' ? 'Mi Paquete' : 'Gestión de Paquetes'}
            </h1>
            <p className="text-gray-600 mt-1">
              {user?.role === 'cliente' 
                ? 'Ve tu paquete actual y clases restantes'
                : 'Administra paquetes y asigna a clientes'
              }
            </p>
          </div>
        </div>


        {/* Assign Package Section - Only for Admin */}
        {user?.role === 'admin' && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Asignar Paquete a Cliente</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Seleccionar Cliente
                </label>
                <select
                  className="input-field"
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                >
                  <option value="">Seleccionar cliente...</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.nombre} - {getPackageDisplayName(client.type_of_class)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Seleccionar Paquete
                </label>
                <select
                  className="input-field"
                  value={selectedPackage}
                  onChange={(e) => setSelectedPackage(e.target.value)}
                >
                  <option value="">Seleccionar paquete...</option>
                  {packages.map(pkg => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} - ${pkg.price}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleAssignPackage}
                  className="btn-primary w-full"
                >
                  Asignar Paquete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Packages Grid */}
        {/* Clases Grupales */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-gray-900">Clases Grupales</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.filter(pkg => pkg.category === 'Grupal').map((pkg, index) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="card-hover"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{pkg.name}</h3>
                  <p className="text-sm text-gray-600">{getPackageDisplayName(pkg.type)}</p>
                </div>
                <span className={`status-badge ${pkg.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {pkg.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <Package className="h-4 w-4 mr-2" />
                  {pkg.classes_included} clases incluidas
                </div>

                <div className="flex items-center text-sm text-gray-600">
                  <DollarSign className="h-4 w-4 mr-2" />
                  ${pkg.price.toLocaleString()} MXN
                </div>

                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  Válido por {pkg.validity_days} días
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                {user?.role === 'admin' ? (
                  <div className="flex space-x-2">
                    <button className="text-blue-600 hover:text-blue-900">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button className="text-red-600 hover:text-red-900">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <WhatsAppButton
                    message={WhatsAppTemplates.packagePurchase(
                      user?.nombre || 'Cliente',
                      getPackageDisplayName(pkg.type),
                      pkg.name,
                      pkg.price
                    )}
                    variant="primary"
                    className="w-full"
                  >
                    Comprar Paquete
                  </WhatsAppButton>
                )}
              </div>
            </motion.div>
          ))}
          </div>
        </div>

        {/* Clases Privadas */}
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Clases Privadas</h3>
            <p className="text-sm text-gray-600 mb-1">
              Válido por 30 días · Solo con cita previa · Disponibilidad limitada
            </p>
            <p className="text-xs text-gray-500 italic">
              Los precios pueden cambiar sin previo aviso
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.filter(pkg => pkg.category === 'Privada').map((pkg, index) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="card-hover"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{pkg.name}</h3>
                  <p className="text-sm text-gray-600">{getPackageDisplayName(pkg.type)}</p>
                </div>
                <span className={`status-badge ${pkg.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {pkg.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <Package className="h-4 w-4 mr-2" />
                  {pkg.classes_included} clases incluidas
                </div>

                <div className="flex items-center text-sm text-gray-600">
                  <DollarSign className="h-4 w-4 mr-2" />
                  ${pkg.price.toLocaleString()} MXN
                </div>

                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  Válido por {pkg.validity_days} días
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                {user?.role === 'admin' ? (
                  <div className="flex space-x-2">
                    <button className="text-blue-600 hover:text-blue-900">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button className="text-red-600 hover:text-red-900">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <WhatsAppButton
                    message={WhatsAppTemplates.packagePurchase(
                      user?.nombre || 'Cliente',
                      getPackageDisplayName(pkg.type),
                      pkg.name,
                      pkg.price
                    )}
                    variant="primary"
                    className="w-full"
                  >
                    Comprar Paquete
                  </WhatsAppButton>
                )}
              </div>
            </motion.div>
          ))}
          </div>
        </div>

        {/* Client Packages - Only for Admin */}
        {user?.role === 'admin' && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Clientes y sus Paquetes</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Paquete Actual
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clients.map((client, index) => (
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
                              {client.correo}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="status-badge bg-blue-100 text-blue-800">
                          {getPackageDisplayName(client.type_of_class)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`status-badge ${getStatusColor(client.expiration_date)}`}>
                          {getStatusText(client.expiration_date)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button className="text-blue-600 hover:text-blue-900">
                          <Edit className="h-4 w-4" />
                        </button>
                        <WhatsAppButton
                          message={WhatsAppTemplates.packageRenewal(
                            client.nombre,
                            getPackageDisplayName(client.type_of_class),
                            0
                          )}
                          variant="secondary"
                          size="sm"
                        >
                          <Package className="h-4 w-4" />
                        </WhatsAppButton>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
