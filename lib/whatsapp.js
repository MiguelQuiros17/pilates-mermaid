class WhatsAppService {
  static get STUDIO_PHONE() {
    return process.env.STUDIO_WHATSAPP_PHONE || '5259581062606'
  }

  static get STUDIO_NAME() {
    return 'Pilates Mermaid'
  }

  /**
   * Generate WhatsApp message URL with pre-filled message
   */
  static generateWhatsAppUrl(message) {
    const encodedMessage = encodeURIComponent(message)
    return `https://wa.me/${this.STUDIO_PHONE}?text=${encodedMessage}`
  }

  /**
   * Generate message for package purchase
   */
  static generatePackagePurchaseMessage(clientName, packageType, packageName, price) {
    return `Hola, soy ${clientName}. Quiero comprar el paquete ${packageName} (${packageType} clases) por $${price} MXN. ¿Podrían ayudarme con el proceso de pago?`
  }

  /**
   * Generate message for package renewal
   */
  static generatePackageRenewalMessage(clientName, currentPackage, remainingClasses) {
    return `Hola, soy ${clientName}. Quiero renovar mi paquete actual de ${currentPackage} clases. Tengo ${remainingClasses} clases restantes. ¿Cuál es el proceso para renovar?`
  }

  /**
   * Generate message for late cancellation fee
   */
  static generateLateCancellationMessage(clientName, classTitle, classDate, fee) {
    return `Hola, soy ${clientName}. Necesito pagar la multa por cancelación tardía de la clase "${classTitle}" del ${classDate}. El monto es de $${fee} MXN. ¿Cómo puedo proceder con el pago?`
  }

  /**
   * Generate message for no-show fee
   */
  static generateNoShowMessage(clientName, classTitle, classDate, fee) {
    return `Hola, soy ${clientName}. Necesito pagar la multa por no asistir a la clase "${classTitle}" del ${classDate}. El monto es de $${fee} MXN. ¿Cómo puedo proceder con el pago?`
  }

  /**
   * Generate message for general inquiry
   */
  static generateGeneralInquiryMessage(clientName, inquiry) {
    return `Hola, soy ${clientName}. ${inquiry}`
  }

  /**
   * Generate message for schedule change request
   */
  static generateScheduleChangeMessage(clientName, originalClass, originalDate, newClass, newDate) {
    let message = `Hola, soy ${clientName}. Quiero cambiar mi clase "${originalClass}" del ${originalDate}`
    
    if (newClass && newDate) {
      message += ` por "${newClass}" del ${newDate}`
    } else {
      message += ` por otra fecha disponible`
    }
    
    message += `. ¿Es posible hacer este cambio?`
    
    return message
  }

  /**
   * Generate message for class booking
   */
  static generateClassBookingMessage(clientName, classTitle, classDate, classTime) {
    return `Hola, soy ${clientName}. Quiero reservar la clase "${classTitle}" del ${classDate} a las ${classTime}. ¿Está disponible?`
  }

  /**
   * Generate message for coach payment inquiry
   */
  static generateCoachPaymentMessage(coachName, period, classesTaught, totalAmount) {
    return `Hola, soy ${coachName}. Quiero consultar sobre mi pago del ${period}. Impartí ${classesTaught} clases y según mis cálculos debería recibir $${totalAmount} MXN. ¿Podrían confirmar el monto?`
  }

  /**
   * Generate message for birthday wishes
   */
  static generateBirthdayMessage(clientName) {
    return `¡Feliz cumpleaños ${clientName}! 🎉🎂\n\nEsperamos que tengas un día maravilloso. ¿Te gustaría agendar una clase especial para celebrar?`
  }

  /**
   * Generate message for package expiration reminder
   */
  static generateExpirationReminderMessage(clientName, packageType, remainingClasses, expirationDate) {
    return `Hola ${clientName}, tu paquete de ${packageType} clases expira el ${expirationDate}. Te quedan ${remainingClasses} clases por usar. ¿Te gustaría renovar tu paquete o agendar las clases restantes?`
  }

  /**
   * Generate message for class reminder
   */
  static generateClassReminderMessage(clientName, classTitle, classDate, classTime) {
    return `Recordatorio: Tienes una clase "${classTitle}" mañana (${classDate}) a las ${classTime}. ¡Nos vemos pronto! 💪`
  }

  /**
   * Generate message for new client welcome
   */
  static generateWelcomeMessage(clientName) {
    return `¡Bienvenido a Pilates Mermaid ${clientName}! 🧜‍♀️\n\nEstamos emocionados de tenerte en nuestro estudio. Si tienes alguna pregunta o necesitas ayuda con tu primera clase, no dudes en contactarnos.`
  }

  /**
   * Generate message for coach schedule update
   */
  static generateCoachScheduleUpdateMessage(coachName, changes) {
    return `Hola ${coachName}, hay cambios en tu horario:\n\n${changes}\n\nPor favor confirma tu disponibilidad.`
  }

  /**
   * Open WhatsApp in new tab/window
   */
  static openWhatsApp(message) {
    if (typeof window !== 'undefined') {
      const url = this.generateWhatsAppUrl(message)
      window.open(url, '_blank')
    }
  }

  /**
   * Get formatted phone number for display
   */
  static formatPhoneNumber(phone) {
    const cleanPhone = phone.replace(/\D/g, '')
    
    if (cleanPhone.length === 10) {
      return `+52 ${cleanPhone.slice(0, 2)} ${cleanPhone.slice(2, 6)} ${cleanPhone.slice(6)}`
    }
    
    if (cleanPhone.length === 12 && cleanPhone.startsWith('52')) {
      return `+${cleanPhone.slice(0, 2)} ${cleanPhone.slice(2, 4)} ${cleanPhone.slice(4, 8)} ${cleanPhone.slice(8)}`
    }
    
    return phone
  }

  /**
   * Validate phone number for WhatsApp
   */
  static validateWhatsAppPhone(phone) {
    const cleanPhone = phone.replace(/\D/g, '')
    return cleanPhone.length >= 10 && cleanPhone.length <= 15
  }
}

module.exports = { WhatsAppService }
