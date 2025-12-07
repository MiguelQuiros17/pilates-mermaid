'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Package,
  DollarSign,
  Calendar,
  Users,
  CheckCircle,
  MessageCircle
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

interface Package {
  id: string
  name: string
  type: string
  classes_included: number
  price: number
  validity_days: number
  category: string
}

export default function SelectPackagePage() {
  const router = useRouter()
  const { t } = useTranslation()
  const [packages, setPackages] = useState<Package[]>([])
  const [user, setUser] = useState<any>(null)
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/login')
      return
    }

    setUser(JSON.parse(userData))

    // Paquetes reales de Pilates Mermaid
    const availablePackages = (
      // Clases Grupales
      [
        {
          id: '1',
          name: 'Clase Prueba',
          type: 'Clase Prueba',
          classes_included: 1,
          price: 300,
          validity_days: 30,
          category: 'Grupal'
        },
        {
          id: '2',
          name: '1 Clase Grupal',
          type: '1 Clase Grupal',
          classes_included: 1,
          price: 400,
          validity_days: 30,
          category: 'Grupal'
        },
        {
          id: '3',
          name: '4 Clases Grupales',
          type: '4 Clases Grupales',
          classes_included: 4,
          price: 1400,
          validity_days: 30,
          category: 'Grupal'
        },
        {
          id: '4',
          name: '8 Clases Grupales',
          type: '8 Clases Grupales',
          classes_included: 8,
          price: 2600,
          validity_days: 30,
          category: 'Grupal'
        },
        {
          id: '5',
          name: '12 Clases Grupales',
          type: '12 Clases Grupales',
          classes_included: 12,
          price: 3600,
          validity_days: 30,
          category: 'Grupal'
        },
        {
          id: '6',
          name: 'Clases Grupales Ilimitadas',
          type: 'Clases Grupales Ilimitadas',
          classes_included: 999,
          price: 4000,
          validity_days: 30,
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
          category: 'Privada'
        },
        {
          id: '8',
          name: '4 Clases Privadas',
          type: '4 Clases Privadas',
          classes_included: 4,
          price: 4400,
          validity_days: 30,
          category: 'Privada'
        },
        {
          id: '9',
          name: '8 Clases Privadas',
          type: '8 Clases Privadas',
          classes_included: 8,
          price: 8000,
          validity_days: 30,
          category: 'Privada'
        },
        {
          id: '10',
          name: '12 Clases Privadas',
          type: '12 Clases Privadas',
          classes_included: 12,
          price: 10800,
          validity_days: 30,
          category: 'Privada'
        },
        {
          id: '11',
          name: '16 Clases Privadas',
          type: '16 Clases Privadas',
          classes_included: 16,
          price: 13600,
          validity_days: 30,
          category: 'Privada'
        },
        {
          id: '12',
          name: '20 Clases Privadas',
          type: '20 Clases Privadas',
          classes_included: 20,
          price: 17000,
          validity_days: 30,
          category: 'Privada'
        }
      ]
    )

    setPackages(availablePackages)
  }, [router])

  const handlePackageSelect = (pkg: Package) => {
    setSelectedPackage(pkg)
  }

  const handleContactWhatsApp = () => {
    if (!selectedPackage) return

    const message = `Hola, soy ${user?.nombre}. Quiero comprar el paquete "${selectedPackage.name}" por $${selectedPackage.price.toLocaleString()} MXN. ¿Podrían ayudarme con el proceso de pago?`
    const whatsappUrl = `https://wa.me/5259581062606?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
    
    // Redirect to dashboard after a delay
    setTimeout(() => {
      router.push('/dashboard')
    }, 2000)
  }

  const handleAlreadyHavePackage = () => {
    const message = `Hola, soy ${user?.nombre}. Ya tengo un paquete de clases comprado y quiero que me lo agreguen a mi cuenta en la plataforma. ¿Podrían ayudarme?`
    const whatsappUrl = `https://wa.me/5259581062606?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
    
    // Redirect to dashboard after a delay
    setTimeout(() => {
      router.push('/dashboard')
    }, 2000)
  }

  const groupPackages = packages.filter(pkg => pkg.category === 'Grupal')
  const privatePackages = packages.filter(pkg => pkg.category === 'Privada')

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            ¡Bienvenido a Pilates Mermaid, {user?.nombre}!
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            {t('selectPackage.subtitle')}
          </p>
        </div>

        {/* Selected Package Info */}
        {selectedPackage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8"
          >
            <div className="flex items-center space-x-3 mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <h3 className="text-lg font-semibold text-green-900">{t('selectPackage.selected')}</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-green-700">{t('selectPackage.package')}:</p>
                <p className="font-semibold text-green-900">{selectedPackage.name}</p>
              </div>
              <div>
                <p className="text-sm text-green-700">{t('selectPackage.price')}:</p>
                <p className="font-semibold text-green-900">${selectedPackage.price.toLocaleString()} MXN</p>
              </div>
              <div>
                <p className="text-sm text-green-700">{t('selectPackage.classes')}:</p>
                <p className="font-semibold text-green-900">{selectedPackage.classes_included} {t('selectPackage.classes')}</p>
              </div>
            </div>
            <button
              onClick={handleContactWhatsApp}
              className="mt-4 w-full bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
            >
              <MessageCircle className="h-5 w-5" />
              <span>{t('selectPackage.contact')}</span>
            </button>
          </motion.div>
        )}

        {/* Already Have Package Option */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Package className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-900">{t('selectPackage.alreadyHave')}</h3>
          </div>
          <p className="text-blue-700 mb-4">
            {t('selectPackage.alreadyHaveDesc')}
          </p>
          <button
            onClick={handleAlreadyHavePackage}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <MessageCircle className="h-5 w-5" />
            <span>{t('selectPackage.alreadyHaveContact')}</span>
          </button>
        </div>

        {/* Clases Grupales */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">{t('selectPackage.groupClasses')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groupPackages.map((pkg, index) => (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`card-hover cursor-pointer ${
                  selectedPackage?.id === pkg.id ? 'ring-2 ring-green-500 bg-green-50' : ''
                }`}
                onClick={() => handlePackageSelect(pkg)}
              >
                <div className="text-center">
                  <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{pkg.name}</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center justify-center space-x-2">
                      <Package className="h-4 w-4" />
                      <span>{pkg.classes_included} {t('selectPackage.classes')}</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <DollarSign className="h-4 w-4" />
                      <span className="font-semibold text-lg">${pkg.price.toLocaleString()} MXN</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>{t('selectPackage.validity')} {pkg.validity_days} {t('selectPackage.days')}</span>
                    </div>
                  </div>
                  {selectedPackage?.id === pkg.id && (
                    <div className="mt-4">
                      <CheckCircle className="h-6 w-6 text-green-600 mx-auto" />
                      <p className="text-sm text-green-600 font-medium">{t('selectPackage.selected')}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Clases Privadas */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">{t('selectPackage.privateClasses')}</h2>
          <p className="text-center text-gray-600 mb-4 text-sm">
            Válido por 30 días · Solo con cita previa · Disponibilidad limitada
          </p>
          <p className="text-center text-gray-500 mb-6 text-xs italic">
            Los precios pueden cambiar sin previo aviso
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {privatePackages.map((pkg, index) => (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (index + groupPackages.length) * 0.1 }}
                className={`card-hover cursor-pointer ${
                  selectedPackage?.id === pkg.id ? 'ring-2 ring-green-500 bg-green-50' : ''
                }`}
                onClick={() => handlePackageSelect(pkg)}
              >
                <div className="text-center">
                  <div className="h-16 w-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Package className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{pkg.name}</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center justify-center space-x-2">
                      <Package className="h-4 w-4" />
                      <span>{pkg.classes_included} {t('selectPackage.classes')}</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <DollarSign className="h-4 w-4" />
                      <span className="font-semibold text-lg">${pkg.price.toLocaleString()} MXN</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>{t('selectPackage.validity')} {pkg.validity_days} {t('selectPackage.days')}</span>
                    </div>
                  </div>
                  {selectedPackage?.id === pkg.id && (
                    <div className="mt-4">
                      <CheckCircle className="h-6 w-6 text-green-600 mx-auto" />
                      <p className="text-sm text-green-600 font-medium">{t('selectPackage.selected')}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
