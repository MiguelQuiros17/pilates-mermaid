const nodemailer = require('nodemailer')
const { EmailTemplates } = require('./email-templates.js')
const path = require('path')
const fs = require('fs')

class EmailService {
  constructor() {
    // Configuración para Gmail (puedes cambiar por otro proveedor)
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'pilatesmermaid@gmail.com',
        pass: process.env.EMAIL_PASSWORD || 'tu-app-password-aqui'
      }
    })

    // Para producción, puedes usar otras configuraciones:
    // - SMTP personalizado
    // - SendGrid
    // - Mailgun
    // - AWS SES
  }

  async sendEmail(to, subject, html, text = null) {
    try {
      // Check if email is configured
      const emailUser = process.env.EMAIL_USER
      const emailPassword = process.env.EMAIL_PASSWORD
      
      if (!emailUser || !emailPassword || emailPassword === 'tu-app-password-aqui') {
        console.error('❌ Email no configurado: EMAIL_USER o EMAIL_PASSWORD no están establecidos')
        return { 
          success: false, 
          error: 'Email service not configured. Please set EMAIL_USER and EMAIL_PASSWORD environment variables.' 
        }
      }

      const mailOptions = {
        from: `"PilatesMermaid" <${emailUser}>`,
        to: to,
        subject: subject,
        html: html,
        text: text || html.replace(/<[^>]*>/g, '') // Convertir HTML a texto plano
      }

      const result = await this.transporter.sendMail(mailOptions)
      console.log('✅ Email enviado exitosamente:', result.messageId, 'to:', to)
      return { success: true, messageId: result.messageId }
    } catch (error) {
      console.error('❌ Error enviando email:', error)
      console.error('Error details:', {
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode
      })
      return { success: false, error: error.message || 'Unknown error sending email' }
    }
  }

  async sendClassConfirmation(clientEmail, clientName, className, classDate, classTime, coachName, classType) {
    const subject = `✅ Confirmación de Clase - ${className}`
    const html = EmailTemplates.getClassConfirmationTemplate(
      clientName,
      className,
      classDate,
      classTime,
      coachName,
      classType
    )
    return await this.sendEmail(clientEmail, subject, html)
  }

  async sendClassReminder(clientEmail, clientName, className, classDate, classTime, coachName, classType) {
    const subject = `🔔 Recordatorio: Tu clase es mañana - ${className}`
    const html = EmailTemplates.getClassReminderTemplate(
      clientName,
      className,
      classDate,
      classTime,
      coachName,
      classType
    )
    return await this.sendEmail(clientEmail, subject, html)
  }

  async sendClassesRunningOut(clientEmail, clientName, packageName, remainingClasses, expirationDate) {
    const subject = `⚠️ Te quedan pocas clases en tu paquete ${packageName}`
    const html = EmailTemplates.getClassesRunningOutTemplate(
      clientName,
      packageName,
      remainingClasses,
      expirationDate
    )
    return await this.sendEmail(clientEmail, subject, html)
  }

  async sendPackageExpirationNotification(clientEmail, clientName, packageName, expirationDate, remainingClasses) {
    const subject = `⏰ Tu paquete ${packageName} está por vencer`
    const html = EmailTemplates.getPackageExpirationTemplate(
      clientName,
      packageName,
      expirationDate,
      remainingClasses
    )
    return await this.sendEmail(clientEmail, subject, html)
  }

  async sendBirthdayNotification(clientEmail, clientName) {
    const subject = `🎂 ¡Feliz Cumpleaños ${clientName}!`
    const html = EmailTemplates.getBirthdayTemplate(clientName)
    return await this.sendEmail(clientEmail, subject, html)
  }

  async sendPasswordReset(clientEmail, clientName, resetToken) {
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}&email=${encodeURIComponent(clientEmail)}`
    const subject = `🔐 Recuperación de Contraseña - PilatesMermaid`
    const html = EmailTemplates.getPasswordResetTemplate(clientName, resetToken, resetLink)
    return await this.sendEmail(clientEmail, subject, html)
  }

  async sendPasswordResetSuccess(clientEmail, clientName) {
    const subject = `✅ Contraseña Restablecida - PilatesMermaid`
    const html = EmailTemplates.getPasswordResetSuccessTemplate(clientName)
    return await this.sendEmail(clientEmail, subject, html)
  }

  async sendWelcomeEmail(clientEmail, clientName) {
    const subject = `👋 ¡Bienvenida a PilatesMermaid!`
    const html = EmailTemplates.getWelcomeTemplate(clientName)
    return await this.sendEmail(clientEmail, subject, html)
  }
}

module.exports = { EmailService }


