'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import DashboardLayout from '@/components/DashboardLayout'
import { useTranslation } from '@/hooks/useTranslation'
import { 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Download,
  Search,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Plus
} from 'lucide-react'

interface Payment {
  id: string
  date: string
  concept: string
  amount: number
  type: 'income' | 'expense'
  method: 'cash' | 'transfer'
  status: 'pending' | 'confirmed' | 'cancelled'
  client_name?: string
  coach_name?: string
  description: string
}

interface CoachPayment {
  id: string
  coach_name: string
  period_start: string
  period_end: string
  total_students: number
  first_three_students: number
  additional_students: number
  first_three_amount: number
  additional_amount: number
  total_amount: number
  status: 'pending' | 'paid'
  payment_date?: string
}

interface User {
  id: string
  nombre: string
  correo: string
  role: 'admin' | 'coach' | 'cliente'
}

export default function PaymentsPage() {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''
  const { t } = useTranslation()
  const [user, setUser] = useState<User | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'confirmed' | 'cancelled'>('all')
  const [filterDate, setFilterDate] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [isCoachPayment, setIsCoachPayment] = useState(false)
  const [coachPayments, setCoachPayments] = useState<CoachPayment[]>([])
  const [coachPaymentsLoading, setCoachPaymentsLoading] = useState(true)
  const [coachPeriod, setCoachPeriod] = useState('')
  const [coachFilter, setCoachFilter] = useState('')
  const [coachStatusFilter, setCoachStatusFilter] = useState<'all' | 'pending' | 'paid'>('all')
  const [coaches, setCoaches] = useState<{ id: string; nombre: string }[]>([])
  const [newPayment, setNewPayment] = useState({
    date: new Date().toISOString().split('T')[0],
    concept: '',
    amount: '',
    type: 'income' as 'income' | 'expense',
    method: 'cash' as 'cash' | 'transfer',
    status: 'confirmed' as 'pending' | 'confirmed' | 'cancelled',
    client_name: '',
    coach_name: '',
    description: ''
  })

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
    }
    loadPayments()
  }, [])

  useEffect(() => {
    if (user?.role === 'admin') {
      loadCoachPayments()
      loadCoaches()
    } else {
      setCoachPayments([])
      setCoachPaymentsLoading(false)
    }
  }, [user])

  useEffect(() => {
    setNewPayment(prev => ({
      ...prev,
      type: isCoachPayment ? 'expense' : 'income',
      coach_name: isCoachPayment ? prev.coach_name : '',
      client_name: isCoachPayment ? '' : prev.client_name
    }))
  }, [isCoachPayment])

  const loadPayments = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        window.location.href = '/login'
        return
      }

      const response = await fetch('/api/payments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setPayments(data.payments || [])
      } else {
        console.error('Error loading payments')
        setPayments([])
      }
    } catch (error) {
      console.error('Error loading payments:', error)
      setPayments([])
    }
    
    setIsLoading(false)
  }

  const loadCoachPayments = async () => {
    if (user?.role !== 'admin') {
      return
    }

    try {
      setCoachPaymentsLoading(true)
      const token = localStorage.getItem('token')
      if (!token) {
        return
      }

      const response = await fetch('/api/coach-payments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setCoachPayments(data.payments || [])
      } else {
        console.error('Error loading coach payments')
        setCoachPayments([])
      }
    } catch (error) {
      console.error('Error loading coach payments:', error)
      setCoachPayments([])
    } finally {
      setCoachPaymentsLoading(false)
    }
  }

  const loadCoaches = async () => {
    if (user?.role !== 'admin') {
      return
    }

    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/users/coaches', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setCoaches(data.coaches || [])
      }
    } catch (error) {
      console.error('Error loading coaches:', error)
    }
  }

  const calculateCoachPayments = async () => {
    if (user?.role !== 'admin') return

    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const selectedCoachName = coachFilter || coaches[0]?.nombre || 'Esmeralda García'
      const response = await fetch('/api/coach-payments/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          period_start: coachPeriod || new Date().toISOString().split('T')[0],
          coach_name: selectedCoachName
        })
      })

      if (response.ok) {
        alert(t('payments.calculateSuccess'))
        loadCoachPayments()
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }))
        alert(`${t('payments.calculateError')}: ${errorData.message || t('common.unknownError')}`)
      }
    } catch (error) {
      console.error('Error calculating coach payments:', error)
      alert(t('payments.calculateError'))
    }
  }

  const markCoachPaymentAsPaid = async (paymentId: string) => {
    if (user?.role !== 'admin') return

    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`${API_BASE_URL}/api/coach-payments/${paymentId}/mark-paid`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        alert('Pago de coach marcado como realizado')
        loadCoachPayments()
      } else {
        alert('Error al marcar el pago del coach')
      }
    } catch (error) {
      console.error('Error marking coach payment:', error)
      alert('Error al marcar el pago del coach')
    }
  }

  const exportCoachPaymentsToCSV = () => {
    if (!coachPayments.length) {
      alert('No hay pagos de coaches para exportar')
      return
    }

    const csvContent = [
      ['Coach', 'Período Inicio', 'Período Fin', 'Total Personas', 'Primeras 3 Personas', 'Personas Adicionales', 'Monto Primeras 3', 'Monto Adicionales', 'Total', 'Estado', 'Fecha Pago'],
      ...coachPayments.map(payment => [
        payment.coach_name,
        payment.period_start,
        payment.period_end,
        payment.total_students,
        payment.first_three_students,
        payment.additional_students,
        payment.first_three_amount,
        payment.additional_amount,
        payment.total_amount,
        payment.status === 'paid' ? 'Pagado' : 'Pendiente',
        payment.payment_date || ''
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `pagos_coaches_${new Date().toISOString().split('T')[0]}.csv`)
    link.click()
    URL.revokeObjectURL(url)
  }

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.concept.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.coach_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = filterType === 'all' || payment.type === filterType
    const matchesStatus = filterStatus === 'all' || payment.status === filterStatus
    const matchesDate = !filterDate || payment.date === filterDate
    
    return matchesSearch && matchesType && matchesStatus && matchesDate
  })

  const filteredCoachPayments = coachPayments.filter(payment => {
    const matchesCoach = !coachFilter || payment.coach_name === coachFilter
    const matchesPeriod = !coachPeriod || payment.period_start === coachPeriod
    const matchesStatus = coachStatusFilter === 'all' || payment.status === coachStatusFilter
    return matchesCoach && matchesPeriod && matchesStatus
  })

  const totalIncome = payments
    .filter(p => p.type === 'income' && p.status === 'confirmed')
    .reduce((sum, p) => sum + p.amount, 0)
  
  const totalExpenses = payments
    .filter(p => p.type === 'expense' && p.status === 'confirmed')
    .reduce((sum, p) => sum + p.amount, 0)
  
  const netProfit = totalIncome - totalExpenses
  const pendingPayments = payments.filter(p => p.status === 'pending')

  const totalCoachPending = filteredCoachPayments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.total_amount, 0)

  const totalCoachPaid = filteredCoachPayments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.total_amount, 0)

  const coachNamesFromPayments = Array.from(new Set(coachPayments.map(p => p.coach_name)))
  const coachOptions = coaches.length ? coaches.map(coach => coach.nombre) : coachNamesFromPayments

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'text-green-600 bg-green-50 border-green-200'
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'cancelled': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="h-4 w-4" />
      case 'pending': return <Clock className="h-4 w-4" />
      case 'cancelled': return <XCircle className="h-4 w-4" />
      default: return <AlertCircle className="h-4 w-4" />
    }
  }

  const getTypeColor = (type: string) => {
    return type === 'income' ? 'text-green-600' : 'text-red-600'
  }

  const handleAddPayment = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        alert('No tienes autorización para realizar esta acción')
        return
      }

      if (!newPayment.date || !newPayment.concept || !newPayment.amount) {
        alert('Por favor completa todos los campos obligatorios')
        return
      }

      if (isCoachPayment && !newPayment.coach_name) {
        alert('Selecciona el coach al que corresponde el pago')
        return
      }

      const payload = {
        ...newPayment,
        type: isCoachPayment ? 'expense' : newPayment.type,
        coach_name: isCoachPayment ? newPayment.coach_name : '',
        client_name: isCoachPayment ? '' : newPayment.client_name,
        amount: parseFloat(newPayment.amount)
      }

      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        const data = await response.json()
        alert('✅ Pago registrado exitosamente')
        await loadPayments()
        setShowAddModal(false)
        if (user?.role === 'admin') {
          loadCoachPayments()
        }
        setIsCoachPayment(false)
        setNewPayment({
          date: new Date().toISOString().split('T')[0],
          concept: '',
          amount: '',
          type: 'income',
          method: 'cash',
          status: 'confirmed',
          client_name: '',
          coach_name: '',
          description: ''
        })
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }))
        alert(`${t('payments.createError')}: ${errorData.message || t('common.unknownError')}`)
      }
    } catch (error) {
      console.error('Error creating payment:', error)
      alert(t('payments.connectionError'))
    }
  }

  const exportToCSV = () => {
    const csvContent = [
      ['Fecha', 'Concepto', 'Monto', 'Tipo', 'Método', 'Estado', 'Cliente/Coach', 'Descripción'].join(','),
      ...filteredPayments.map(payment => [
        payment.date,
        payment.concept,
        payment.amount,
        payment.type === 'income' ? 'Ingreso' : 'Gasto',
        payment.method === 'cash' ? 'Efectivo' : 'Transferencia',
        payment.status === 'confirmed' ? 'Confirmado' : payment.status === 'pending' ? 'Pendiente' : 'Cancelado',
        payment.client_name || payment.coach_name || '',
        payment.description
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `pagos_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </DashboardLayout>
    )
  }

  // Solo admin y coach pueden ver esta página
  if (user?.role === 'cliente') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Acceso Restringido</h3>
            <p className="text-gray-600">No tienes permisos para ver esta sección.</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-3xl p-8 text-white">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">{t('payments.title')}</h1>
              <p className="text-gray-300 text-lg">
                Controla ingresos, gastos y pagos a coaches
              </p>
            </div>
            <div className="mt-6 sm:mt-0 flex space-x-3">
              <button
                onClick={() => {
                  setNewPayment({
                    date: new Date().toISOString().split('T')[0],
                    concept: '',
                    amount: '',
                    type: 'income',
                    method: 'cash',
                    status: 'confirmed',
                    client_name: '',
                    coach_name: '',
                    description: ''
                  })
                  setShowAddModal(true)
                }}
                className="bg-white/10 backdrop-blur-sm text-white px-6 py-3 rounded-xl hover:bg-white/20 transition-all duration-200 flex items-center space-x-2 shadow-lg"
              >
                <Plus className="h-5 w-5" />
                <span>{t('payments.addPayment')}</span>
              </button>
              <button
                onClick={exportToCSV}
                className="bg-white/10 backdrop-blur-sm text-white px-6 py-3 rounded-xl hover:bg-white/20 transition-all duration-200 flex items-center space-x-2 shadow-lg"
              >
                <Download className="h-5 w-5" />
                <span>Exportar CSV</span>
              </button>
            </div>
          </div>
          
          {/* Decoración sutil */}
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/5 rounded-full"></div>
          <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/5 rounded-full"></div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div
            className="bg-white border border-gray-200 rounded-2xl p-6 text-center hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
            whileHover={{ scale: 1.02 }}
          >
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">${totalIncome.toLocaleString()}</p>
            <p className="text-sm text-gray-600 font-medium">{t('payments.totalIncome')}</p>
          </motion.div>

          <motion.div
            className="bg-white border border-gray-200 rounded-2xl p-6 text-center hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
            whileHover={{ scale: 1.02 }}
          >
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <TrendingDown className="h-8 w-8 text-white" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">${totalExpenses.toLocaleString()}</p>
            <p className="text-sm text-gray-600 font-medium">{t('payments.totalExpenses')}</p>
          </motion.div>

          <motion.div
            className="bg-white border border-gray-200 rounded-2xl p-6 text-center hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
            whileHover={{ scale: 1.02 }}
          >
            <div className="w-16 h-16 bg-gradient-to-br from-gray-700 to-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <DollarSign className="h-8 w-8 text-white" />
            </div>
            <p className={`text-3xl font-bold mb-1 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${netProfit.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600 font-medium">Ganancia Neta</p>
          </motion.div>

          <motion.div
            className="bg-white border border-gray-200 rounded-2xl p-6 text-center hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
            whileHover={{ scale: 1.02 }}
          >
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Clock className="h-8 w-8 text-white" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{pendingPayments.length}</p>
            <p className="text-sm text-gray-600 font-medium">Pendientes</p>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Buscar pagos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-transparent"
            >
              <option value="all">Todos los tipos</option>
              <option value="income">{t('payments.income')}</option>
              <option value="expense">{t('payments.expenses')}</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-transparent"
            >
              <option value="all">Todos los estados</option>
              <option value="confirmed">Confirmado</option>
              <option value="pending">Pendiente</option>
              <option value="cancelled">Cancelado</option>
            </select>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Concepto
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Método
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Persona
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(payment.date).toLocaleDateString('es-MX')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="font-medium">{payment.concept}</div>
                      <div className="text-gray-500">{payment.description}</div>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getTypeColor(payment.type)}`}>
                      ${payment.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        payment.type === 'income' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {payment.type === 'income' ? 'Ingreso' : 'Gasto'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.method === 'cash' ? 'Efectivo' : 'Transferencia'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(payment.status)}`}>
                        {getStatusIcon(payment.status)}
                        <span className="ml-1">
                          {payment.status === 'confirmed' ? 'Confirmado' : 
                           payment.status === 'pending' ? 'Pendiente' : 'Cancelado'}
                        </span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.client_name || payment.coach_name || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredPayments.length === 0 && (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No se encontraron pagos</h3>
              <p className="text-gray-600">Intenta ajustar los filtros de búsqueda.</p>
            </div>
          )}
        </div>

      {/* Coach payments section */}
      {user?.role === 'admin' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{t('payments.coachPayments')}</h2>
                <p className="text-gray-600 mt-1">
                  Calcula, registra y controla los pagos realizados a los coaches.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={exportCoachPaymentsToCSV}
                  className="bg-gray-900 text-white px-4 py-2 rounded-xl hover:bg-gray-800 transition-colors flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Exportar CSV</span>
                </button>
                <button
                  onClick={calculateCoachPayments}
                  className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <DollarSign className="h-4 w-4" />
                  <span>Calcular pagos automáticos</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div
              className="bg-white border border-gray-200 rounded-2xl p-6"
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pendiente de Pago</p>
                  <p className="text-2xl font-bold text-gray-900">${totalCoachPending.toLocaleString()}</p>
                </div>
              </div>
            </motion.div>
            <motion.div
              className="bg-white border border-gray-200 rounded-2xl p-6"
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pagado</p>
                  <p className="text-2xl font-bold text-gray-900">${totalCoachPaid.toLocaleString()}</p>
                </div>
              </div>
            </motion.div>
            <motion.div
              className="bg-white border border-gray-200 rounded-2xl p-6"
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Coaches con registros</p>
                  <p className="text-2xl font-bold text-gray-900">{coachOptions.length}</p>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de inicio del período
                </label>
                <input
                  type="date"
                  value={coachPeriod}
                  onChange={(e) => setCoachPeriod(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Coach
                </label>
                <select
                  value={coachFilter}
                  onChange={(e) => setCoachFilter(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                >
                  <option value="">Todos</option>
                  {coachOptions.map((coach) => (
                    <option key={coach} value={coach}>{coach}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado
                </label>
                <select
                  value={coachStatusFilter}
                  onChange={(e) => setCoachStatusFilter(e.target.value as 'all' | 'pending' | 'paid')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                >
                  <option value="all">Todos</option>
                  <option value="pending">Pendiente</option>
                  <option value="paid">Pagado</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setCoachPeriod('')
                    setCoachFilter('')
                    setCoachStatusFilter('all')
                  }}
                  className="w-full bg-gray-100 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Limpiar filtros
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {coachPaymentsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mx-auto mb-4" />
                  <p className="text-gray-600">Cargando pagos de coaches...</p>
                </div>
              </div>
            ) : (
              <>
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Historial de pagos a coaches</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Coach
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Período
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Personas únicas
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Monto
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
                      {filteredCoachPayments.map(payment => (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {payment.coach_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(payment.period_start).toLocaleDateString('es-MX')} -{' '}
                            {new Date(payment.period_end).toLocaleDateString('es-MX')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="font-medium">{payment.total_students}</div>
                            <div className="text-xs text-gray-400">
                              Primeras 3: {payment.first_three_students} | Adicionales: {payment.additional_students}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="font-semibold">${payment.total_amount.toLocaleString()}</div>
                            <div className="text-xs text-gray-400">
                              Primeras 3: ${payment.first_three_amount} | Adicionales: ${payment.additional_amount}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                payment.status === 'paid'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {payment.status === 'paid' ? 'Pagado' : 'Pendiente'}
                            </span>
                            {payment.status === 'paid' && payment.payment_date && (
                              <div className="text-xs text-gray-500 mt-1">
                                Pagado el {new Date(payment.payment_date).toLocaleDateString('es-MX')}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {payment.status === 'pending' ? (
                              <button
                                onClick={() => markCoachPaymentAsPaid(payment.id)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Marcar como pagado
                              </button>
                            ) : (
                              <span className="text-green-600 font-medium">Completado</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredCoachPayments.length === 0 && (
                  <div className="text-center py-12 border-t border-gray-200">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">No hay pagos registrados</h4>
                    <p className="text-gray-600">Ajusta los filtros o calcula nuevos pagos.</p>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">📋 Reglas de pago para coaches</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
              <div>
                <h4 className="font-semibold mb-2">Primeras 3 personas del período:</h4>
                <p>$250 MXN por cada persona</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Personas adicionales:</h4>
                <p>$40 MXN por cada persona adicional</p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-100 rounded-xl text-sm text-blue-900">
              <strong>Ejemplo:</strong> Si 5 personas asisten a clases en el período → primeras 3 = $750 MXN, 2 adicionales = $80 MXN, Total = <strong>$830 MXN</strong>.
            </div>
          </div>
        </div>
      )}

        {/* Add Payment Modal */}
        {showAddModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowAddModal(false)}
          >
            <div 
              className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Agregar Pago</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    value={newPayment.date}
                    onChange={(e) => setNewPayment({...newPayment, date: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Concepto *
                  </label>
                  <input
                    type="text"
                    value={newPayment.concept}
                    onChange={(e) => setNewPayment({...newPayment, concept: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    placeholder="Ej: Pago de paquete 8 clases"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monto *
                  </label>
                  <input
                    type="number"
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment({...newPayment, amount: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    placeholder="2600"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo
                  </label>
                  <select
                    value={newPayment.type}
                    onChange={(e) => setNewPayment({...newPayment, type: e.target.value as 'income' | 'expense'})}
                    disabled={isCoachPayment}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-transparent ${
                      isCoachPayment ? 'bg-gray-100 cursor-not-allowed text-gray-500 border-gray-200' : 'border-gray-300'
                    }`}
                  >
                    <option value="income">Ingreso</option>
                    <option value="expense">Gasto</option>
                  </select>
                  {isCoachPayment && (
                    <p className="text-xs text-gray-500 mt-1">
                      Los pagos a coaches se registran como gasto automáticamente.
                    </p>
                  )}
                </div>
                
                <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">¿Es un pago a coach?</p>
                    <p className="text-xs text-gray-500">
                      Actívalo si este movimiento corresponde a un pago directo a un coach.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isCoachPayment}
                    onChange={(e) => setIsCoachPayment(e.target.checked)}
                    className="h-5 w-5 text-gray-900 rounded border-gray-300 focus:ring-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Método de Pago
                  </label>
                  <select
                    value={newPayment.method}
                    onChange={(e) => setNewPayment({...newPayment, method: e.target.value as 'cash' | 'transfer'})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  >
                    <option value="cash">Efectivo</option>
                    <option value="transfer">Transferencia</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado
                  </label>
                  <select
                    value={newPayment.status}
                    onChange={(e) => setNewPayment({...newPayment, status: e.target.value as 'pending' | 'confirmed' | 'cancelled'})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  >
                    <option value="pending">Pendiente</option>
                    <option value="confirmed">Confirmado</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Coach
                  </label>
                  {isCoachPayment ? (
                    <select
                      value={newPayment.coach_name}
                      onChange={(e) => setNewPayment({...newPayment, coach_name: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    >
                      <option value="">Selecciona un coach</option>
                      {coachOptions.map((coach) => (
                        <option key={coach} value={coach}>{coach}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={newPayment.coach_name}
                      onChange={(e) => setNewPayment({...newPayment, coach_name: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                      placeholder="Nombre del coach (opcional)"
                    />
                  )}
                </div>

                {!isCoachPayment && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cliente
                    </label>
                    <input
                      type="text"
                      value={newPayment.client_name}
                      onChange={(e) => setNewPayment({...newPayment, client_name: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                      placeholder="Nombre del cliente"
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={newPayment.description}
                    onChange={(e) => setNewPayment({...newPayment, description: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    rows={3}
                    placeholder="Descripción adicional del pago..."
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddPayment}
                  className="bg-gray-900 text-white px-6 py-2 rounded-xl hover:bg-gray-800 transition-colors"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

