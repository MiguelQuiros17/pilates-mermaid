const nodemailer = require('nodemailer')
const { EmailTemplates } = require('./email-templates.js')

class EmailService {
  constructor() {
    this.transporter = this.createTransporter()
  }

  createTransporter() {
    const emailProvider = (process.env.EMAIL_PROVIDER || 'gmail').toLowerCase()
    
    // Common timeout settings for all providers
    const timeoutSettings = {
      connectionTimeout: 10000, // 10 seconds to establish connection
      socketTimeout: 10000, // 10 seconds for socket operations
      greetingTimeout: 10000, // 10 seconds for SMTP greeting
      pool: false,
      maxConnections: 1,
      maxMessages: 1
    }

    switch (emailProvider) {
      case 'sendgrid':
        return nodemailer.createTransport({
          host: 'smtp.sendgrid.net',
          port: 587,
          secure: false, // Use STARTTLS
          auth: {
            user: 'apikey',
            pass: process.env.SENDGRID_API_KEY
          },
          ...timeoutSettings
        })

      case 'mailgun':
        return nodemailer.createTransport({
          host: process.env.MAILGUN_SMTP_HOST || 'smtp.mailgun.org',
          port: 587,
          secure: false, // Use STARTTLS
          auth: {
            user: process.env.MAILGUN_SMTP_USER,
            pass: process.env.MAILGUN_SMTP_PASSWORD
          },
          ...timeoutSettings
        })

      case 'ses':
      case 'aws-ses':
        // AWS SES requires AWS SDK (install with: npm install aws-sdk)
        try {
          const aws = require('aws-sdk')
          const ses = new aws.SES({
            region: process.env.AWS_REGION || 'us-east-1',
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
          })
          return nodemailer.createTransport({
            SES: { ses, aws },
            sendingRate: 14
          })
        } catch (error) {
          console.error('AWS SDK not installed. Install with: npm install aws-sdk')
          throw new Error('AWS SDK is required for SES provider. Install with: npm install aws-sdk')
        }

      case 'smtp':
        // Generic SMTP with modern TLS
        return nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465', // true for 465, false for other ports
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
          },
          tls: {
            // Modern TLS settings - require TLS 1.2 or higher
            minVersion: 'TLSv1.2',
            rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false',
            // Use secure cipher suites
            ciphers: 'HIGH:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA'
          },
          ...timeoutSettings
        })

      case 'gmail':
      default:
        // Gmail with OAuth2 support (more secure) or App Password fallback
        const config = {
          service: 'gmail',
          ...timeoutSettings,
          // Modern TLS settings for Gmail
          tls: {
            rejectUnauthorized: true,
            minVersion: 'TLSv1.2'
          }
        }

        // Try OAuth2 first (more secure - recommended for production)
        if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN) {
          config.auth = {
            type: 'OAuth2',
            user: process.env.EMAIL_USER || process.env.GMAIL_USER,
            clientId: process.env.GMAIL_CLIENT_ID,
            clientSecret: process.env.GMAIL_CLIENT_SECRET,
            refreshToken: process.env.GMAIL_REFRESH_TOKEN,
            accessToken: process.env.GMAIL_ACCESS_TOKEN // Optional, will be refreshed if not provided
          }
        } else {
          // Fallback to App Password (less secure but easier to set up)
          // Note: Gmail may require "Less secure app access" or App Passwords
          config.auth = {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
          }
        }

        return nodemailer.createTransport(config)
    }
  }

  async sendEmail(to, subject, html, text = null) {
    try {
      // Check if email is configured based on provider
      const emailProvider = (process.env.EMAIL_PROVIDER || 'gmail').toLowerCase()
      let isConfigured = false

      switch (emailProvider) {
        case 'sendgrid':
          isConfigured = !!process.env.SENDGRID_API_KEY
          break
        case 'mailgun':
          isConfigured = !!(process.env.MAILGUN_SMTP_USER && process.env.MAILGUN_SMTP_PASSWORD)
          break
        case 'ses':
        case 'aws-ses':
          isConfigured = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
          break
        case 'smtp':
          isConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD)
          break
        case 'gmail':
        default:
          // Check for OAuth2 or App Password
          const hasOAuth2 = !!(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN)
          const hasAppPassword = !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD && process.env.EMAIL_PASSWORD !== 'tu-app-password-aqui')
          isConfigured = hasOAuth2 || hasAppPassword
      }

      if (!isConfigured) {
        console.error('❌ Email no configurado: Faltan las variables de entorno necesarias para', emailProvider)
        return { 
          success: false, 
          error: `Email service not configured. Please set the required environment variables for ${emailProvider}.` 
        }
      }

      // Determine sender email based on provider
      let fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || process.env.SMTP_USER || 'noreply@pilatesmermaid.com'
      const fromName = process.env.EMAIL_FROM_NAME || 'PilatesMermaid'

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: to,
        subject: subject,
        html: html,
        text: text || html.replace(/<[^>]*>/g, ''), // Convertir HTML a texto plano
        // Modern email headers
        headers: {
          'X-Mailer': 'PilatesMermaid',
          'X-Priority': '3',
          'Importance': 'normal'
        }
      }

      // Add timeout to prevent hanging (20 seconds)
      const sendMailPromise = this.transporter.sendMail(mailOptions)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email sending timeout after 20 seconds')), 20000)
      )

      const result = await Promise.race([sendMailPromise, timeoutPromise])
      console.log('✅ Email enviado exitosamente:', result.messageId, 'to:', to)
      return { success: true, messageId: result.messageId }
    } catch (error) {
      console.error('❌ Error enviando email:', error)
      console.error('Error details:', {
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode,
        message: error.message
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


