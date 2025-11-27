'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export default function RegisterPage() {
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
      setError('El nombre es requerido')
      return false
    }

    if (!formData.apellidos.trim()) {
      setError('Los apellidos son requeridos')
      return false
    }

    if (!formData.correo.trim()) {
      setError('El correo electrónico es requerido')
      return false
    }

    if (!formData.numero_de_telefono.trim()) {
      setError('El número de teléfono es requerido')
      return false
    }

    if (formData.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden')
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
      
      const response = await fetch('/api/auth/register', {
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

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess('¡Cuenta creada exitosamente!')
        
        // Store token and user data
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        
        // Redirect to dashboard immediately using window.location for reliable redirect
        setIsLoading(false)
        // Use setTimeout to ensure localStorage is written before redirect
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 100)
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
            Crear Cuenta
          </h2>
          <p className="mt-2 text-gray-600">
            Registra una cuenta en el sistema de Pilates Mermaid
          </p>
        </div>

        {/* Form */}
        <form className="card space-y-6" onSubmit={handleSubmit}>
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Información Personal</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  id="nombre"
                  name="nombre"
                  type="text"
                  required
                  className="input-field"
                  placeholder="Tu nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <label htmlFor="apellidos" className="block text-sm font-medium text-gray-700 mb-1">
                  Apellidos *
                </label>
                <input
                  id="apellidos"
                  name="apellidos"
                  type="text"
                  required
                  className="input-field"
                  placeholder="Tus apellidos"
                  value={formData.apellidos}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="correo" className="block text-sm font-medium text-gray-700 mb-1">
                  Correo electrónico *
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
                  Teléfono *
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
                  Instagram
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
                  Género
                </label>
                <select
                  id="genero"
                  name="genero"
                  className="input-field"
                  value={formData.genero}
                  onChange={handleInputChange}
                >
                  <option value="">Seleccionar...</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="cumpleanos" className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de cumpleaños
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
                Lesiones o limitaciones físicas
              </label>
              <textarea
                id="lesion_o_limitacion_fisica"
                name="lesion_o_limitacion_fisica"
                className="input-field h-20 resize-none"
                placeholder="Describe cualquier lesión o limitación física que debamos conocer..."
                value={formData.lesion_o_limitacion_fisica}
                onChange={(e) => handleInputChange(e as any)}
              />
            </div>
          </div>

          {/* Account Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Información de Cuenta</h3>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <h4 className="text-sm font-medium text-blue-900">Registro de Cliente</h4>
              </div>
              <p className="text-sm text-blue-700">
                Estás creando una cuenta de cliente. Después del registro, podrás elegir tu paquete de clases desde una lista completa con precios.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña *
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    className="input-field pr-12"
                    placeholder="Mínimo 8 caracteres"
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
                  Confirmar contraseña *
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    className="input-field pr-12"
                    placeholder="Repite tu contraseña"
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
                  Redirigiendo al dashboard...
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
                <span>Creando cuenta...</span>
              </div>
            ) : (
              'Crear Cuenta'
            )}
          </button>

          {/* Links */}
          <div className="text-center">
            <div className="text-sm text-gray-600">
              ¿Ya tienes cuenta?{' '}
              <Link
                href="/login"
                className="text-black hover:underline font-medium"
              >
                Inicia sesión aquí
              </Link>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
