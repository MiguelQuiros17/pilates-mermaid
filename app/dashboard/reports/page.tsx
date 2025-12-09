'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import DashboardLayout from '@/components/DashboardLayout'
import { getApiUrl } from '@/lib/utils/api'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Calendar,
  Download,
  Filter,
  DollarSign,
  PieChart,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

interface ReportData {
  period: string
  totalIncome: number
  totalExpenses: number
  netProfit: number
  totalClients: number
  totalClasses: number
  averageClassSize: number
  coachPayments: number
}

interface User {
  id: string
  nombre: string
  correo: string
  role: 'admin' | 'coach' | 'cliente'
}

export default function ReportsPage() {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''
  const [user, setUser] = useState<User | null>(null)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
    }
    loadReportData()
  }, [selectedPeriod, dateRange])

  const loadReportData = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        window.location.href = '/login'
        return
      }

      let url = getApiUrl('/api/reports')
      const params = new URLSearchParams()
      
      if (selectedPeriod === 'custom' && dateRange.start && dateRange.end) {
        params.append('startDate', dateRange.start)
        params.append('endDate', dateRange.end)
      } else if (selectedPeriod === 'week') {
        const endDate = new Date()
        const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)
        params.append('startDate', startDate.toISOString().split('T')[0])
        params.append('endDate', endDate.toISOString().split('T')[0])
      } else if (selectedPeriod === 'month') {
        const endDate = new Date()
        const startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1)
        params.append('startDate', startDate.toISOString().split('T')[0])
        params.append('endDate', endDate.toISOString().split('T')[0])
      } else if (selectedPeriod === 'year') {
        const endDate = new Date()
        const startDate = new Date(endDate.getFullYear(), 0, 1)
        params.append('startDate', startDate.toISOString().split('T')[0])
        params.append('endDate', endDate.toISOString().split('T')[0])
      }
      
      if (params.toString()) {
        url += '?' + params.toString()
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setReportData(data.report)
      } else {
        console.error('Error loading report data')
        setReportData(null)
      }
    } catch (error) {
      console.error('Error loading report data:', error)
      setReportData(null)
    }
    
    setIsLoading(false)
  }

  const exportReport = () => {
    const csvContent = [
      ['Período', 'Ingresos', 'Gastos', 'Ganancia Neta', 'Clientes', 'Clases', 'Promedio por Clase', 'Pagos a Coaches'].join(','),
      [
        reportData?.period || '',
        reportData?.totalIncome || 0,
        reportData?.totalExpenses || 0,
        reportData?.netProfit || 0,
        reportData?.totalClients || 0,
        reportData?.totalClasses || 0,
        reportData?.averageClassSize || 0,
        reportData?.coachPayments || 0
      ].join(',')
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `reporte_${new Date().toISOString().split('T')[0]}.csv`)
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

  // Solo admin puede ver esta página
  if (user?.role !== 'admin') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Acceso Restringido</h3>
            <p className="text-gray-600">Solo los administradores pueden ver esta sección.</p>
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
              <h1 className="text-4xl font-bold mb-2">Reportes y Análisis</h1>
              <p className="text-gray-300 text-lg">
                Análisis completo del rendimiento del estudio
              </p>
            </div>
            <div className="mt-6 sm:mt-0">
              <button
                onClick={exportReport}
                className="bg-white/10 backdrop-blur-sm text-white px-6 py-3 rounded-xl hover:bg-white/20 transition-all duration-200 flex items-center space-x-2 shadow-lg"
              >
                <Download className="h-5 w-5" />
                <span>Exportar Reporte</span>
              </button>
            </div>
          </div>
          
          {/* Decoración sutil */}
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/5 rounded-full"></div>
          <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/5 rounded-full"></div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Período
              </label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              >
                <option value="month">Este mes</option>
                <option value="week">Esta semana</option>
                <option value="year">Este año</option>
                <option value="custom">Rango personalizado</option>
              </select>
            </div>
            {selectedPeriod === 'custom' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha inicio
                  </label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha fin
                  </label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div
            className="bg-white border border-gray-200 rounded-2xl p-6 text-center hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
            whileHover={{ scale: 1.02 }}
          >
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              ${reportData?.totalIncome?.toLocaleString() || '0'}
            </p>
            <p className="text-sm text-gray-600 font-medium">Ingresos Totales</p>
          </motion.div>

          <motion.div
            className="bg-white border border-gray-200 rounded-2xl p-6 text-center hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
            whileHover={{ scale: 1.02 }}
          >
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <DollarSign className="h-8 w-8 text-white" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              ${reportData?.totalExpenses?.toLocaleString() || '0'}
            </p>
            <p className="text-sm text-gray-600 font-medium">Gastos Totales</p>
          </motion.div>

          <motion.div
            className="bg-white border border-gray-200 rounded-2xl p-6 text-center hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
            whileHover={{ scale: 1.02 }}
          >
            <div className="w-16 h-16 bg-gradient-to-br from-gray-700 to-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Activity className="h-8 w-8 text-white" />
            </div>
            <p className={`text-3xl font-bold mb-1 ${(reportData?.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${reportData?.netProfit?.toLocaleString() || '0'}
            </p>
            <p className="text-sm text-gray-600 font-medium">Ganancia Neta</p>
          </motion.div>

          <motion.div
            className="bg-white border border-gray-200 rounded-2xl p-6 text-center hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
            whileHover={{ scale: 1.02 }}
          >
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-white" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {reportData?.totalClients || '0'}
            </p>
            <p className="text-sm text-gray-600 font-medium">Clientes Activos</p>
          </motion.div>
        </div>

        {/* Activity Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{reportData?.totalClasses || '0'}</p>
                <p className="text-sm text-gray-600">Clases Impartidas</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{reportData?.averageClassSize || '0'}</p>
                <p className="text-sm text-gray-600">Promedio por Clase</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  ${reportData?.coachPayments?.toLocaleString() || '0'}
                </p>
                <p className="text-sm text-gray-600">Pagos a Coaches</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Charts Placeholder */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ingresos vs Gastos</h3>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-xl">
              <div className="text-center">
                <PieChart className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Gráfico de ingresos vs gastos</p>
                <p className="text-sm text-gray-400">(Funcionalidad próximamente)</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tendencia de Clases</h3>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-xl">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Gráfico de tendencia de clases</p>
                <p className="text-sm text-gray-400">(Funcionalidad próximamente)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Table */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen Ejecutivo</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Métrica
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descripción
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Ingresos Totales
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                    ${reportData?.totalIncome?.toLocaleString() || '0'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    Total de ingresos por venta de paquetes
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Gastos Totales
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">
                    ${reportData?.totalExpenses?.toLocaleString() || '0'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    Total de pagos a coaches y gastos operativos
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Ganancia Neta
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${(reportData?.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${reportData?.netProfit?.toLocaleString() || '0'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    Ingresos menos gastos
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Clientes Activos
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                    {reportData?.totalClients || '0'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    Número total de clientes con paquetes activos
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Clases Impartidas
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                    {reportData?.totalClasses || '0'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    Total de clases impartidas en el período
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Promedio por Clase
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                    {reportData?.averageClassSize || '0'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    Promedio de alumnos por clase
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

