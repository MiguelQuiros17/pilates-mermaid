'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from '@/hooks/useTranslation'

export default function LoginPage() {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''
  const router = useRouter()
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    correo: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // If already logged in, redirect to dashboard
  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    if (token && userData) {
      router.replace('/dashboard')
    }
  }, [router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        // Store token and user data
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        
        // Redirect based on user role
        router.push('/dashboard')
      } else {
        setError(data.message || t('auth.login.error'))
      }
    } catch (error) {
      setError(t('auth.login.connectionError'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-8"
      >
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center items-center mb-6">
            <Image 
              src="/Logo.png" 
              alt="Pilates Mermaid Logo" 
              width={180} 
              height={180}
              className="object-contain"
            />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900">
            {t('auth.login.title')}
          </h2>
          <p className="mt-2 text-gray-600">
            {t('auth.login.subtitle')}
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Email Field */}
            <div>
              <label htmlFor="correo" className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.login.email')}
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

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.login.password')}
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="input-field pr-12"
                  placeholder={t('auth.login.password')}
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
          </div>

          {/* Error Message */}
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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-primary"
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="spinner"></div>
                <span>{t('auth.login.loading')}</span>
              </div>
            ) : (
              t('auth.login.button')
            )}
          </button>

          {/* Links */}
          <div className="text-center space-y-2">
            <Link
              href="/forgot-password"
              className="text-sm text-gray-600 hover:text-black transition-colors"
            >
              {t('auth.login.forgotPassword')}
            </Link>
            <div className="text-sm text-gray-600">
              {t('auth.login.noAccount')}{' '}
              <Link
                href="/register"
                className="text-black hover:underline font-medium"
              >
                {t('auth.login.register')}
              </Link>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
