'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from '@/hooks/useTranslation'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

export default function RegisterPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    nombre: '',
    apellidos: '',
    correo: '',
    numero_de_telefono: '',
    password: '',
    confirmPassword: '',
    role: 'cliente',
    instagram: '',
    cumpleanos: '',
    lesion_o_limitacion_fisica: '',
    genero: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // If already logged in, redirect to dashboard
  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    if (token && userData) {
      router.replace('/dashboard')
    }
  }, [router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError('')
    setSuccess('')
  }

  const validateForm = () => {
    if (!formData.nombre.trim()) {
      setError(t('auth.register.nameRequired'))
      return false
    }

    if (!formData.apellidos.trim()) {
      setError(t('auth.register.lastNameRequired'))
      return false
    }

    if (!formData.correo.trim()) {
      setError(t('auth.register.emailRequired'))
      return false
    }

    if (!formData.numero_de_telefono.trim()) {
      setError(t('auth.register.phoneRequired'))
      return false
    }

    if (formData.password.length < 8) {
      setError(t('auth.register.passwordMinLength'))
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      setError(t('auth.register.passwordMismatch'))
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // Concatenar nombre y apellidos para enviar al backend
      const nombreCompleto = `${formData.nombre.trim()} ${formData.apellidos.trim()}`.trim()
      
      // Preparar datos para enviar al backend (excluir apellidos y confirmPassword)
      const { apellidos, confirmPassword, ...dataToSend } = formData
      
      // Build register URL with runtime fallback to current origin (production proxy safety)
      const baseUrl = API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '')
      const registerUrl = baseUrl
        ? `${baseUrl.replace(/\/$/, '')}/api/auth/register`
        : '/api/auth/register'

      const response = await fetch(registerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...dataToSend,
          nombre: nombreCompleto, // Enviar nombre completo concatenado
          type_of_class: 'Sin paquete' // Default until they buy a package
        }),
      })

      const data = await response.json().catch(() => {
        // If JSON parsing fails, return empty object
        return {}
      })

      if (response.ok && data.success && data.token) {
        // Store token and user data immediately - ensure synchronous write
        try {
          localStorage.setItem('token', data.token)
          if (data.user) {
            localStorage.setItem('user', JSON.stringify(data.user))
          }
        } catch (storageError) {
          console.error('Error storing auth data:', storageError)
          setError('Error al guardar los datos de sesión. Intenta iniciar sesión manualmente.')
          setIsLoading(false)
          return
        }
        
        setSuccess(t('auth.register.success'))
        setIsLoading(false)
        
        // Redirect to dashboard - use router.push for Next.js navigation
        // Small delay ensures localStorage write completes and UI updates
        setTimeout(() => {
          router.push('/dashboard')
        }, 200)
      } else {
        setIsLoading(false)
        // Show specific error messages
        if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
          // Show first error or format multiple errors
          const errorMessages = data.errors.map((err: any) => {
            if (typeof err === 'string') return err
            return err.message || err.msg || err
          }).join(', ')
          setError(errorMessages)
        } else if (data.message) {
          setError(data.message)
        } else if (!response.ok) {
          setError(`Error del servidor (${response.status}). Intenta de nuevo.`)
        } else {
          setError('Error al crear la cuenta. Por favor, verifica los datos ingresados.')
        }
      }
    } catch (error: any) {
      console.error('Registration error:', error)
      setIsLoading(false)
      setError('Error de conexión. Intenta de nuevo.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center mb-6">
            <Image 
              src="/Logo.png" 
              alt="Pilates Mermaid Logo" 
              width={100} 
              height={100}
              className="object-contain"
            />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900">
            {t('auth.register.title')}
          </h2>
          <p className="mt-2 text-gray-600">
            {t('auth.register.subtitle')}
          </p>
        </div>

        {/* Form */}
        <form className="card space-y-6" onSubmit={handleSubmit}>
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">{t('auth.register.personalInfo')}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('auth.register.firstName')} *
                </label>
                <input
                  id="nombre"
                  name="nombre"
                  type="text"
                  required
                  className="input-field"
                  placeholder={t('auth.register.firstName')}
                  value={formData.nombre}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <label htmlFor="apellidos" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('auth.register.lastName')} *
                </label>
                <input
                  id="apellidos"
                  name="apellidos"
                  type="text"
                  required
                  className="input-field"
                  placeholder={t('auth.register.lastName')}
                  value={formData.apellidos}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="correo" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('auth.register.email')} *
                </label>
                <input
                  id="correo"
                  name="correo"
                  type="email"
                  autoComplete="email"
                  required
                  className="input-field"
                  placeholder="tu@email.com"
                  value={formData.correo}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <label htmlFor="numero_de_telefono" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('auth.register.phone')} *
                </label>
                <input
                  id="numero_de_telefono"
                  name="numero_de_telefono"
                  type="tel"
                  required
                  className="input-field"
                  placeholder="55 1234 5678"
                  value={formData.numero_de_telefono}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="instagram" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('auth.register.instagram')}
                </label>
                <input
                  id="instagram"
                  name="instagram"
                  type="text"
                  className="input-field"
                  placeholder="@tuusuario"
                  value={formData.instagram}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <label htmlFor="genero" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('auth.register.gender')}
                </label>
                <select
                  id="genero"
                  name="genero"
                  className="input-field"
                  value={formData.genero}
                  onChange={handleInputChange}
                >
                  <option value="">{t('auth.register.gender.select')}</option>
                  <option value="Masculino">{t('auth.register.gender.male')}</option>
                  <option value="Femenino">{t('auth.register.gender.female')}</option>
                  <option value="Otro">{t('auth.register.gender.other')}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="cumpleanos" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('auth.register.birthday')}
                </label>
                <input
                  id="cumpleanos"
                  name="cumpleanos"
                  type="date"
                  className="input-field"
                  value={formData.cumpleanos}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div>
              <label htmlFor="lesion_o_limitacion_fisica" className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.register.injuries')}
              </label>
              <textarea
                id="lesion_o_limitacion_fisica"
                name="lesion_o_limitacion_fisica"
                className="input-field h-20 resize-none"
                placeholder={t('auth.register.injuries.placeholder')}
                value={formData.lesion_o_limitacion_fisica}
                onChange={(e) => handleInputChange(e as any)}
              />
            </div>
          </div>

          {/* Account Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">{t('auth.register.accountInfo')}</h3>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <h4 className="text-sm font-medium text-blue-900">{t('auth.register.clientNote')}</h4>
              </div>
              <p className="text-sm text-blue-700">
                {t('auth.register.clientNoteDesc')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('auth.register.password')} *
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    className="input-field pr-12"
                    placeholder={t('auth.register.passwordMinLength')}
                    value={formData.password}
                    onChange={handleInputChange}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('auth.register.confirmPassword')} *
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    className="input-field pr-12"
                    placeholder={t('auth.register.confirmPassword')}
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg"
            >
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm">{error}</span>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center space-x-2 text-green-600 bg-green-50 p-4 rounded-lg"
            >
              <CheckCircle className="h-5 w-5" />
              <div>
                <span className="text-sm font-medium">{success}</span>
                <p className="text-xs text-green-700 mt-1">
                  {t('auth.register.redirecting')}
                </p>
              </div>
            </motion.div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-primary"
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="spinner"></div>
                <span>{t('auth.register.loading')}</span>
              </div>
            ) : (
              t('auth.register.button')
            )}
          </button>

          {/* Links */}
          <div className="text-center">
            <div className="text-sm text-gray-600">
              {t('auth.register.hasAccount')}{' '}
              <Link
                href="/login"
                className="text-black hover:underline font-medium"
              >
                {t('auth.register.login')}
              </Link>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
