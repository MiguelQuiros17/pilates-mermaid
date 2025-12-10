const nodemailer = require('nodemailer')
const { EmailTemplates } = require('./email-templates.js')

class EmailService {
  constructor() {
    try {
      this.transporter = this.createTransporter()
      console.log('[Email Service] Transporter created successfully')
    } catch (error) {
      console.error('[Email Service] Error creating transporter:', error.message)
      this.transporter = null
    }
  }

  createTransporter() {
    const emailProvider = (process.env.EMAIL_PROVIDER || 'gmail').toLowerCase()
    console.log('[Email Service] Creating transporter for provider:', emailProvider)
    
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
        // Use explicit SMTP settings for better Railway compatibility
        // Railway may block outbound SMTP, so we use explicit host/port
        const useSecurePort = process.env.GMAIL_USE_SECURE_PORT !== 'false' // Default to true
        const config = {
          // Don't use 'service: gmail' - use explicit host/port for better control
          host: 'smtp.gmail.com',
          port: useSecurePort ? 465 : 587,
          secure: useSecurePort, // true for 465, false for 587
          // Increased timeouts for Railway network latency
          connectionTimeout: 30000, // 30 seconds
          socketTimeout: 30000, // 30 seconds
          greetingTimeout: 30000, // 30 seconds
          pool: false,
          maxConnections: 1,
          maxMessages: 1,
          // Modern TLS settings for Gmail
          tls: {
            rejectUnauthorized: true,
            minVersion: 'TLSv1.2'
          },
          // Require TLS for port 587
          requireTLS: !useSecurePort
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
          if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
            throw new Error('Gmail App Password requires EMAIL_USER and EMAIL_PASSWORD environment variables')
          }
          config.auth = {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
          }
          console.log('[Email Service] Using Gmail App Password authentication')
        }

        const transporter = nodemailer.createTransport(config)
        console.log('[Email Service] Gmail transporter created')
        return transporter
    }
  }

  async sendEmail(to, subject, html, text = null) {
    try {
      // Check if email is configured based on provider
      const emailProvider = (process.env.EMAIL_PROVIDER || 'gmail').toLowerCase()
      let isConfigured = false
      let configDetails = {}

      switch (emailProvider) {
        case 'sendgrid':
          isConfigured = !!process.env.SENDGRID_API_KEY
          configDetails = { hasApiKey: !!process.env.SENDGRID_API_KEY }
          break
        case 'mailgun':
          isConfigured = !!(process.env.MAILGUN_SMTP_USER && process.env.MAILGUN_SMTP_PASSWORD)
          configDetails = { 
            hasUser: !!process.env.MAILGUN_SMTP_USER, 
            hasPassword: !!process.env.MAILGUN_SMTP_PASSWORD 
          }
          break
        case 'ses':
        case 'aws-ses':
          isConfigured = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
          configDetails = { 
            hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID, 
            hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY 
          }
          break
        case 'smtp':
          isConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD)
          configDetails = { 
            hasHost: !!process.env.SMTP_HOST, 
            hasUser: !!process.env.SMTP_USER, 
            hasPassword: !!process.env.SMTP_PASSWORD 
          }
          break
        case 'gmail':
        default:
          // Check for OAuth2 or App Password
          const hasOAuth2 = !!(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN)
          const hasAppPassword = !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD && process.env.EMAIL_PASSWORD !== 'tu-app-password-aqui')
          isConfigured = hasOAuth2 || hasAppPassword
          configDetails = { 
            provider: emailProvider,
            hasOAuth2,
            hasAppPassword,
            hasEmailUser: !!process.env.EMAIL_USER,
            hasEmailPassword: !!process.env.EMAIL_PASSWORD,
            emailUserValue: process.env.EMAIL_USER ? `${process.env.EMAIL_USER.substring(0, 3)}...` : 'missing',
            emailPasswordLength: process.env.EMAIL_PASSWORD ? process.env.EMAIL_PASSWORD.length : 0
          }
      }

      console.log('[Email Service] Configuration check:', { emailProvider, isConfigured, ...configDetails })

      if (!isConfigured) {
        console.error('❌ Email no configurado: Faltan las variables de entorno necesarias para', emailProvider)
        console.error('❌ Config details:', configDetails)
        return { 
          success: false, 
          error: `Email service not configured. Please set the required environment variables for ${emailProvider}. Required: ${JSON.stringify(configDetails)}` 
        }
      }

      // Verify transporter is valid
      if (!this.transporter) {
        console.error('❌ Email transporter is null or undefined')
        return {
          success: false,
          error: 'Email transporter not initialized. Check email service configuration.'
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

      // Skip verification for Gmail on Railway (often times out but sending works)
      // Only verify for non-Gmail providers
      // emailProvider is already declared above (line 152)
      if (emailProvider !== 'gmail') {
        try {
          await this.transporter.verify()
          console.log('✅ Email transporter verified successfully')
        } catch (verifyError) {
          console.error('❌ Email transporter verification failed:', verifyError.message)
          console.error('Verification error details:', {
            code: verifyError.code,
            command: verifyError.command,
            response: verifyError.response,
            responseCode: verifyError.responseCode
          })
          // Continue anyway - verification might fail but sending could still work
        }
      } else {
        console.log('[Email Service] Skipping Gmail verification (may timeout on Railway)')
      }

      // Add timeout to prevent hanging (20 seconds)
      console.log('[Email Service] Attempting to send email to:', to)
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
        message: error.message,
        stack: error.stack
      })
      
      // Provide more specific error messages
      let errorMessage = error.message || 'Unknown error sending email'
      if (error.code === 'EAUTH') {
        errorMessage = 'Authentication failed. Check EMAIL_USER and EMAIL_PASSWORD credentials.'
      } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
        errorMessage = 'Connection to email server failed. Check network and server settings.'
      } else if (error.code === 'EENVELOPE') {
        errorMessage = 'Invalid email address or envelope configuration.'
      }
      
      return { success: false, error: errorMessage }
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


