'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  User,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Users,
  X,
  Star
} from 'lucide-react'
import DashboardLayout from '@/components/DashboardLayout'
import { useTranslation } from '@/hooks/useTranslation'

interface Coach {
  id: string
  nombre: string
  correo: string
  numero_de_telefono: string
  instagram?: string
  role: string
  cumpleanos?: string
  lesion_o_limitacion_fisica?: string
  genero?: string
  created_at: string
  updated_at: string
}

export default function CoachesPage() {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''
  const { t } = useTranslation()
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState('')
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)

  const loadCoaches = async () => {
    try {
      setIsLoading(true)
      setError('')
      const token = localStorage.getItem('token')
      if (!token) {
        setError(t('coaches.noToken'))
        setIsLoading(false)
        return
      }

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
        setError(t('coaches.error'))
        console.error('Error loading coaches:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error loading coaches:', error)
      setError(t('coaches.connectionError'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCoaches()
  }, [])

  const filteredCoaches = coaches.filter(coach => {
    return coach.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
           coach.correo.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const handleViewCoach = (coach: Coach) => {
    setSelectedCoach(coach)
    setShowViewModal(true)
  }

  const handleEditCoach = (coach: Coach) => {
    setSelectedCoach(coach)
    setShowEditModal(true)
  }

  const handleDeleteCoach = async (coach: Coach) => {
    if (!confirm(`${t('coaches.deleteConfirm')} ${coach.nombre}?`)) {
      return
    }

    try {
      // Por ahora eliminamos solo del estado local
      setCoaches(coaches.filter(c => c.id !== coach.id))
      alert(t('coaches.deleteSuccess'))
    } catch (error) {
      console.error('Error deleting coach:', error)
      alert(t('coaches.deleteError'))
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
            <h1 className="text-2xl font-bold text-gray-900">{t('coaches.title')}</h1>
            <p className="text-gray-600 mt-1">
              {t('coaches.subtitle')}
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="card">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder={t('coaches.search')}
                  className="input-field pl-10 ls-3"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card text-center">
            <User className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{coaches.length}</p>
            <p className="text-sm text-gray-600">{t('coaches.total')}</p>
          </div>
          <div className="card text-center">
            <Calendar className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">18</p>
            <p className="text-sm text-gray-600">{t('coaches.classesThisWeek')}</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Coaches Table */}
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('coaches.name')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('coaches.contact')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('coaches.birthday')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('coaches.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCoaches.map((coach, index) => (
                  <motion.tr
                    key={coach.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {coach.nombre}
                          </div>
                          <div className="text-sm text-gray-500">
                            {coach.instagram || t('coaches.noInstagram')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{coach.correo}</div>
                      <div className="text-sm text-gray-500">{coach.numero_de_telefono}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {coach.cumpleanos ? new Date(coach.cumpleanos).toLocaleDateString('es-ES') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button 
                        onClick={() => handleViewCoach(coach)}
                        className="text-blue-600 hover:text-blue-900"
                        title={t('coaches.viewDetails')}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleEditCoach(coach)}
                        className="text-gray-600 hover:text-gray-900"
                        title={t('coaches.editCoach')}
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteCoach(coach)}
                        className="text-red-600 hover:text-red-900"
                        title={t('coaches.deleteCoach')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredCoaches.length === 0 && (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">{t('coaches.noResults')}</p>
            </div>
          )}
        </div>
      </div>

      {/* View Coach Modal */}
      {showViewModal && selectedCoach && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{t('coaches.coachDetails')}</h3>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('coaches.name')}</label>
                  <p className="text-sm text-gray-900">{selectedCoach.nombre}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('coaches.email')}</label>
                  <p className="text-sm text-gray-900">{selectedCoach.correo}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('coaches.phone')}</label>
                  <p className="text-sm text-gray-900">{selectedCoach.numero_de_telefono}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('coaches.instagram')}</label>
                  <p className="text-sm text-gray-900">{selectedCoach.instagram || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('coaches.birthday')}</label>
                  <p className="text-sm text-gray-900">
                    {selectedCoach.cumpleanos ? new Date(selectedCoach.cumpleanos).toLocaleDateString('es-ES') : '-'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('coaches.gender')}</label>
                  <p className="text-sm text-gray-900">{selectedCoach.genero || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('coaches.registrationDate')}</label>
                  <p className="text-sm text-gray-900">
                    {selectedCoach.created_at ? new Date(selectedCoach.created_at).toLocaleDateString('es-ES') : '-'}
                  </p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('coaches.injuries')}</label>
                <p className="text-sm text-gray-900">{selectedCoach.lesion_o_limitacion_fisica || t('coaches.none')}</p>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {t('common.close')}
              </button>
              <button
                onClick={() => {
                  setShowViewModal(false)
                  handleEditCoach(selectedCoach)
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t('common.edit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Coach Modal */}
      {showEditModal && selectedCoach && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{t('coaches.edit')}</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault()
              const formData = new FormData(e.target as HTMLFormElement)
              const updates: Partial<Coach> = {
                nombre: formData.get('nombre') as string,
                correo: formData.get('correo') as string,
                numero_de_telefono: formData.get('numero_de_telefono') as string,
                instagram: (formData.get('instagram') as string) || undefined,
                cumpleanos: (formData.get('cumpleanos') as string) || undefined,
                lesion_o_limitacion_fisica: (formData.get('lesion_o_limitacion_fisica') as string) || undefined,
                genero: (formData.get('genero') as string) || undefined,
              }

              try {
                // Por ahora actualizamos solo el estado local
                setCoaches(prev =>
                    prev.map(c =>
                        c.id === selectedCoach.id ? { ...c, ...updates } : c
                    )
                )
                setShowEditModal(false)
                alert(t('coaches.updateSuccess'))
              } catch (error) {
                console.error('Error updating coach:', error)
                alert(t('coaches.updateError'))
              }
            }}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                    <input
                      type="text"
                      name="nombre"
                      defaultValue={selectedCoach.nombre}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      name="correo"
                      defaultValue={selectedCoach.correo}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono *</label>
                    <input
                      type="tel"
                      name="numero_de_telefono"
                      defaultValue={selectedCoach.numero_de_telefono}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
                    <input
                      type="text"
                      name="instagram"
                      defaultValue={selectedCoach.instagram || ''}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cumpleaños</label>
                    <input
                      type="date"
                      name="cumpleanos"
                      defaultValue={selectedCoach.cumpleanos ? selectedCoach.cumpleanos.split('T')[0] : ''}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Género</label>
                    <select name="genero" className="input-field">
                      <option value="">Seleccionar...</option>
                      <option value="Femenino">Femenino</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lesiones o Limitaciones Físicas</label>
                  <textarea
                    name="lesion_o_limitacion_fisica"
                    defaultValue={selectedCoach.lesion_o_limitacion_fisica || ''}
                    className="input-field"
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
