'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { UserPlus, Trash2, Save, AlertCircle, CheckCircle, Mail, Shield } from 'lucide-react'
import DashboardLayout from '@/components/DashboardLayout'
import { getApiUrl } from '@/lib/utils/api'

interface RoleAssignment {
  email: string
  role: 'admin' | 'coach' | 'cliente'
}

export default function RoleAssignmentsPage() {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''
  const [assignments, setAssignments] = useState<RoleAssignment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('')
  const [updatingEmail, setUpdatingEmail] = useState<string | null>(null)
  
  // Form state for adding new assignment
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState<'admin' | 'coach' | 'cliente'>('cliente')

  const PROTECTED_EMAIL = 'pilatesmermaidweb@gmail.com'

  useEffect(() => {
    // Get current user email
    const userData = localStorage.getItem('user')
    if (userData) {
      try {
        const user = JSON.parse(userData)
        setCurrentUserEmail(user.correo?.toLowerCase() || '')
      } catch (error) {
        console.error('Error parsing user data:', error)
      }
    }
    loadAssignments()
  }, [])

  const loadAssignments = async () => {
    setIsLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setError('No se encontró el token de autenticación')
        return
      }

      const response = await fetch(getApiUrl('/api/admin/role-assignments'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setAssignments(data.assignments || [])
        } else {
          setError(data.message || 'Error al cargar asignaciones')
        }
      } else {
        const data = await response.json()
        setError(data.message || 'Error al cargar asignaciones')
      }
    } catch (error) {
      console.error('Error loading assignments:', error)
      setError('Error de conexión al cargar asignaciones')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddAssignment = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!newEmail.trim()) {
      setError('El email es requerido')
      return
    }

    setIsSaving(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setError('No se encontró el token de autenticación')
        return
      }

      const response = await fetch(getApiUrl('/api/admin/role-assignments'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: newEmail.trim(),
          role: newRole
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess(data.message || 'Asignación guardada exitosamente')
        setNewEmail('')
        setNewRole('cliente')
        await loadAssignments()
      } else {
        // Show more detailed error message
        let errorMsg = data.message || data.errors?.[0]?.msg || data.error || data.errorType || 'Error al guardar asignación'
        
        // Always show error details if available
        if (data.error) {
          errorMsg += `: ${data.error}`
        }
        if (data.errorCode && data.errorCode !== 'NO_CODE') {
          errorMsg += ` (${data.errorCode})`
        }
        
        setError(errorMsg)
        console.error('Full error response:', JSON.stringify(data, null, 2))
        if (data.stack) {
          console.error('Error stack:', data.stack)
        }
        if (data.fullError) {
          console.error('Full error details:', data.fullError)
        }
      }
    } catch (error) {
      console.error('Error saving assignment:', error)
      setError('Error de conexión al guardar asignación')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRoleChange = async (email: string, newRole: 'admin' | 'coach' | 'cliente') => {
    setError('')
    setSuccess('')
    setUpdatingEmail(email)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setError('No se encontró el token de autenticación')
        return
      }

      const response = await fetch(getApiUrl('/api/admin/role-assignments'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: email,
          role: newRole
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess(data.message || 'Rol actualizado exitosamente')
        await loadAssignments()
      } else {
        // Show more detailed error message
        const errorMsg = data.message || data.errors?.[0]?.msg || data.error || 'Error al actualizar rol'
        setError(errorMsg)
        console.error('Full error response object:', JSON.stringify(data, null, 2))
        console.error('Error response keys:', Object.keys(data))
        console.error('Error field:', data.error)
        console.error('Error type field:', data.errorType)
        console.error('Error code field:', data.errorCode)
      }
    } catch (error) {
      console.error('Error updating role:', error)
      setError('Error de conexión al actualizar rol')
    } finally {
      setUpdatingEmail(null)
    }
  }

  const handleDeleteAssignment = async (email: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar la asignación para ${email}?`)) {
      return
    }

    setError('')
    setSuccess('')

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setError('No se encontró el token de autenticación')
        return
      }

      const response = await fetch(getApiUrl(`/api/admin/role-assignments/${encodeURIComponent(email)}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess(data.message || 'Asignación eliminada exitosamente')
        await loadAssignments()
      } else {
        setError(data.message || 'Error al eliminar asignación')
      }
    } catch (error) {
      console.error('Error deleting assignment:', error)
      setError('Error de conexión al eliminar asignación')
    }
  }

  const isProtected = (email: string) => {
    const emailLower = email.toLowerCase()
    return emailLower === PROTECTED_EMAIL.toLowerCase() || emailLower === currentUserEmail
  }

  const getRoleLabel = (role: string) => {
    const labels: { [key: string]: string } = {
      'admin': 'Administrador',
      'coach': 'Coach',
      'cliente': 'Cliente'
    }
    return labels[role] || role
  }

  const getRoleColor = (role: string) => {
    const colors: { [key: string]: string } = {
      'admin': 'bg-red-100 text-red-800 border-red-200',
      'coach': 'bg-blue-100 text-blue-800 border-blue-200',
      'cliente': 'bg-green-100 text-green-800 border-green-200'
    }
    return colors[role] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Asignación de Roles</h1>
          <p className="mt-2 text-gray-600">
            Gestiona los roles que se asignarán automáticamente cuando los usuarios se registren con estos emails.
          </p>
        </div>

        {/* Messages */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center space-x-2 text-red-600 bg-red-50 p-4 rounded-lg border border-red-200"
          >
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center space-x-2 text-green-600 bg-green-50 p-4 rounded-lg border border-green-200"
          >
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">{success}</span>
          </motion.div>
        )}

        {/* Add New Assignment Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <div className="flex items-center space-x-2 mb-4">
            <UserPlus className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Agregar Nueva Asignación</h2>
          </div>

          <form onSubmit={handleAddAssignment} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  className="input-field"
                  placeholder="usuario@ejemplo.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  Rol *
                </label>
                <select
                  id="role"
                  required
                  className="input-field"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'admin' | 'coach' | 'cliente')}
                >
                  <option value="cliente">Cliente</option>
                  <option value="coach">Coach</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="btn-primary flex items-center space-x-2"
            >
              {isSaving ? (
                <>
                  <div className="spinner"></div>
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Agregar Asignación</span>
                </>
              )}
            </button>
          </form>
        </motion.div>

        {/* Assignments List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card"
        >
          <div className="flex items-center space-x-2 mb-4">
            <Shield className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Asignaciones Actuales</h2>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="spinner"></div>
            </div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No hay asignaciones configuradas</p>
              <p className="text-sm text-gray-400 mt-1">
                Agrega asignaciones para que los usuarios reciban roles automáticamente al registrarse
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rol
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {assignments.map((assignment, index) => (
                    <motion.tr
                      key={assignment.email}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">{assignment.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {isProtected(assignment.email) ? (
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getRoleColor(assignment.role)}`}>
                            {getRoleLabel(assignment.role)}
                          </span>
                        ) : (
                          <select
                            value={assignment.role}
                            onChange={(e) => handleRoleChange(assignment.email, e.target.value as 'admin' | 'coach' | 'cliente')}
                            disabled={updatingEmail === assignment.email}
                            className={`input-field text-xs py-1 px-2 min-w-[120px] ${updatingEmail === assignment.email ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <option value="cliente">Cliente</option>
                            <option value="coach">Coach</option>
                            <option value="admin">Administrador</option>
                          </select>
                        )}
                        {updatingEmail === assignment.email && (
                          <span className="ml-2 text-xs text-gray-500">Actualizando...</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {isProtected(assignment.email) ? (
                          <span className="text-gray-400 text-xs italic">Protegido</span>
                        ) : (
                          <button
                            onClick={() => handleDeleteAssignment(assignment.email)}
                            className="text-red-600 hover:text-red-900 flex items-center space-x-1 ml-auto"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>Eliminar</span>
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-blue-50 border border-blue-200 rounded-lg p-4"
        >
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">¿Cómo funciona?</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>Cuando un usuario se registre con un email en esta lista, recibirá automáticamente el rol asignado.</li>
                <li>Si el email no está en la lista, el usuario recibirá el rol de "Cliente" por defecto.</li>
                <li>Los cambios se aplican a nuevos registros. Los usuarios existentes no se modifican automáticamente.</li>
                <li>Para cambiar el rol de un usuario existente, ve a la sección de Clientes o Coaches.</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  )
}

