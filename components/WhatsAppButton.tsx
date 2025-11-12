'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { MessageCircle, X } from 'lucide-react'
import { WhatsAppService } from '@/lib/whatsapp'

interface WhatsAppButtonProps {
  message: string
  className?: string
  variant?: 'primary' | 'secondary' | 'success'
  size?: 'sm' | 'md' | 'lg'
  children?: React.ReactNode
}

export default function WhatsAppButton({ 
  message, 
  className = '', 
  variant = 'primary',
  size = 'md',
  children 
}: WhatsAppButtonProps) {
  const [isHovered, setIsHovered] = useState(false)

  const handleClick = () => {
    WhatsAppService.openWhatsApp(message)
  }

  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-green-600 hover:bg-green-700 text-white'
      case 'secondary':
        return 'bg-white hover:bg-gray-50 text-green-600 border border-green-600'
      case 'success':
        return 'bg-green-500 hover:bg-green-600 text-white'
      default:
        return 'bg-green-600 hover:bg-green-700 text-white'
    }
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-2 text-sm'
      case 'md':
        return 'px-4 py-3 text-base'
      case 'lg':
        return 'px-6 py-4 text-lg'
      default:
        return 'px-4 py-3 text-base'
    }
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        ${getVariantClasses()}
        ${getSizeClasses()}
        ${className}
        flex items-center space-x-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
      `}
    >
      <MessageCircle className="h-5 w-5" />
      {children && <span>{children}</span>}
    </motion.button>
  )
}

// Predefined message templates
export const WhatsAppTemplates = {
  packagePurchase: (clientName: string, packageType: string, packageName: string, price: number) => 
    WhatsAppService.generatePackagePurchaseMessage(clientName, packageType, packageName, price),
  
  packageRenewal: (clientName: string, currentPackage: string, remainingClasses: number) =>
    WhatsAppService.generatePackageRenewalMessage(clientName, currentPackage, remainingClasses),
  
  lateCancellation: (clientName: string, classTitle: string, classDate: string, fee: number) =>
    WhatsAppService.generateLateCancellationMessage(clientName, classTitle, classDate, fee),
  
  noShow: (clientName: string, classTitle: string, classDate: string, fee: number) =>
    WhatsAppService.generateNoShowMessage(clientName, classTitle, classDate, fee),
  
  generalInquiry: (clientName: string, inquiry: string) =>
    WhatsAppService.generateGeneralInquiryMessage(clientName, inquiry),
  
  scheduleChange: (clientName: string, originalClass: string, originalDate: string, newClass?: string, newDate?: string) =>
    WhatsAppService.generateScheduleChangeMessage(clientName, originalClass, originalDate, newClass, newDate),
  
  classBooking: (clientName: string, classTitle: string, classDate: string, classTime: string) =>
    WhatsAppService.generateClassBookingMessage(clientName, classTitle, classDate, classTime),
  
  coachPayment: (coachName: string, period: string, classesTaught: number, totalAmount: number) =>
    WhatsAppService.generateCoachPaymentMessage(coachName, period, classesTaught, totalAmount),
  
  birthdayWishes: (clientName: string) =>
    WhatsAppService.generateBirthdayMessage(clientName),
  
  expirationReminder: (clientName: string, packageType: string, remainingClasses: number, expirationDate: string) =>
    WhatsAppService.generateExpirationReminderMessage(clientName, packageType, remainingClasses, expirationDate),
  
  classReminder: (clientName: string, classTitle: string, classDate: string, classTime: string) =>
    WhatsAppService.generateClassReminderMessage(clientName, classTitle, classDate, classTime),
  
  welcome: (clientName: string) =>
    WhatsAppService.generateWelcomeMessage(clientName)
}

// WhatsApp Modal Component
interface WhatsAppModalProps {
  isOpen: boolean
  onClose: () => void
  message: string
  title?: string
}

export function WhatsAppModal({ isOpen, onClose, message, title = "Contactar por WhatsApp" }: WhatsAppModalProps) {
  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative bg-white rounded-xl p-6 max-w-md w-full"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-3">Mensaje que se enviará:</p>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-800">{message}</p>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 btn-secondary"
          >
            Cancelar
          </button>
          <WhatsAppButton
            message={message}
            className="flex-1"
          >
            Abrir WhatsApp
          </WhatsAppButton>
        </div>
      </motion.div>
    </motion.div>
  )
}

// WhatsApp Contact Card
interface WhatsAppContactCardProps {
  title: string
  description: string
  message: string
  icon?: React.ReactNode
}

export function WhatsAppContactCard({ title, description, message, icon }: WhatsAppContactCardProps) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <div className="card-hover text-center group cursor-pointer" onClick={() => setShowModal(true)}>
        <div className="h-16 w-16 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
          {icon || <MessageCircle className="h-8 w-8 text-green-600" />}
        </div>
        <h3 className="font-medium text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>

      <WhatsAppModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        message={message}
        title={title}
      />
    </>
  )
}


