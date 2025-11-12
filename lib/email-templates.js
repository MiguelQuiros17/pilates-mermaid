// Email templates with elegant design and logo
const path = require('path')
const fs = require('fs')

class EmailTemplates {
  // Base template with logo and footer
  static getBaseTemplate(content, backgroundColor = '#f8f9fa') {
    // Logo URL - Try to load from file first, fallback to URL
    let logoUrl = process.env.LOGO_URL || 'https://pilatesmermaid.com/Logo.png'
    
    // Try to embed logo as base64 for better email client support
    try {
      const logoPath = path.join(process.cwd(), 'public', 'Logo.png')
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath)
        const logoBase64 = logoBuffer.toString('base64')
        logoUrl = `data:image/png;base64,${logoBase64}`
      }
    } catch (error) {
      console.warn('Could not load logo from file, using URL:', error.message)
      // Fallback to URL if file doesn't exist
      logoUrl = process.env.LOGO_URL || 'https://pilatesmermaid.com/Logo.png'
    }
    
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>PilatesMermaid</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
          
          body {
            margin: 0;
            padding: 0;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: ${backgroundColor};
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
          
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: ${backgroundColor};
            padding: 20px;
          }
          
          .email-wrapper {
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
          }
          
          .email-header {
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
            padding: 40px 30px;
            text-align: center;
            position: relative;
          }
          
          .logo-container {
            margin-bottom: 20px;
          }
          
          .logo {
            max-width: 180px;
            height: auto;
            display: block;
            margin: 0 auto;
            background-color: transparent;
          }
          
          /* Invert logo to white for dark background */
          .logo-white {
            filter: brightness(0) invert(1);
          }
          
          .email-header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 24px;
            font-weight: 600;
            letter-spacing: -0.5px;
          }
          
          .email-header p {
            color: #e0e0e0;
            margin: 10px 0 0 0;
            font-size: 14px;
            font-weight: 400;
          }
          
          .email-body {
            padding: 40px 30px;
          }
          
          .email-content {
            color: #333333;
            font-size: 16px;
            line-height: 1.7;
          }
          
          .email-content h2 {
            color: #1a1a1a;
            margin-top: 0;
            margin-bottom: 20px;
            font-size: 24px;
            font-weight: 600;
          }
          
          .email-content h3 {
            color: #1a1a1a;
            margin-top: 0;
            margin-bottom: 15px;
            font-size: 18px;
            font-weight: 600;
          }
          
          .info-box {
            background-color: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 20px;
            border-radius: 8px;
            margin: 25px 0;
          }
          
          .info-box.warning {
            background-color: #fff3cd;
            border-left-color: #ffc107;
          }
          
          .info-box.warning h3 {
            color: #856404;
          }
          
          .info-box.warning p {
            color: #856404;
          }
          
          .info-box.success {
            background-color: #d4edda;
            border-left-color: #28a745;
          }
          
          .info-box.success h3 {
            color: #155724;
          }
          
          .info-box.success p {
            color: #155724;
          }
          
          .info-box.danger {
            background-color: #f8d7da;
            border-left-color: #dc3545;
          }
          
          .info-box.danger h3 {
            color: #721c24;
          }
          
          .info-box.danger p {
            color: #721c24;
          }
          
          .info-box ul {
            margin: 10px 0;
            padding-left: 20px;
          }
          
          .info-box li {
            margin: 8px 0;
            color: #666666;
          }
          
          .button {
            display: inline-block;
            padding: 14px 28px;
            background-color: #25D366;
            color: #ffffff;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            margin: 20px 0;
            transition: background-color 0.3s ease;
          }
          
          .button:hover {
            background-color: #20BA5A;
          }
          
          .button-center {
            text-align: center;
            margin: 30px 0;
          }
          
          .divider {
            height: 1px;
            background-color: #e0e0e0;
            margin: 30px 0;
          }
          
          .email-footer {
            background-color: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e0e0e0;
          }
          
          .email-footer p {
            color: #999999;
            font-size: 12px;
            margin: 5px 0;
            line-height: 1.6;
          }
          
          .social-links {
            margin: 20px 0;
          }
          
          .social-links a {
            display: inline-block;
            margin: 0 10px;
            color: #667eea;
            text-decoration: none;
            font-size: 14px;
          }
          
          @media only screen and (max-width: 600px) {
            .email-container {
              padding: 10px;
            }
            
            .email-header {
              padding: 30px 20px;
            }
            
            .email-body {
              padding: 30px 20px;
            }
            
            .email-footer {
              padding: 20px;
            }
            
            .logo {
              max-width: 150px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="email-wrapper">
            <div class="email-header">
              <div class="logo-container">
                <img src="${logoUrl}" alt="PilatesMermaid Logo" class="logo logo-white" style="max-width: 180px; height: auto; display: block; margin: 0 auto; filter: brightness(0) invert(1);" />
              </div>
              ${content.header || ''}
            </div>
            <div class="email-body">
              <div class="email-content">
                ${content.body || ''}
              </div>
            </div>
            <div class="email-footer">
              ${content.footer || this.getDefaultFooter()}
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }

  static getDefaultFooter() {
    return `
      <p><strong>PilatesMermaid</strong></p>
      <p>Tu estudio de Pilates en Oaxaca</p>
      <div class="divider"></div>
      <p>📱 WhatsApp: <a href="https://wa.me/5259581062606" style="color: #25D366; text-decoration: none;">+52 958 106 2606</a></p>
      <p>📍 Ubicación: Oaxaca, México</p>
      <div class="divider"></div>
      <p style="color: #999999; font-size: 11px;">
        Este email fue enviado automáticamente por el sistema de gestión de PilatesMermaid.<br>
        Si no solicitaste este email, puedes ignorarlo de manera segura.
      </p>
      <p style="color: #999999; font-size: 11px; margin-top: 10px;">
        © ${new Date().getFullYear()} PilatesMermaid. Todos los derechos reservados.
      </p>
    `
  }

  // Class confirmation email
  static getClassConfirmationTemplate(clientName, className, classDate, classTime, coachName, classType) {
    const formattedDate = new Date(classDate).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    return this.getBaseTemplate({
      header: `
        <h1>✅ Clase Confirmada</h1>
        <p>Tu reserva ha sido realizada exitosamente</p>
      `,
      body: `
        <h2>¡Hola ${clientName}! 👋</h2>
        <p>Tu clase ha sido confirmada exitosamente. Aquí están los detalles:</p>
        
        <div class="info-box">
          <h3>📅 Detalles de la Clase</h3>
          <ul>
            <li><strong>Clase:</strong> ${className}</li>
            <li><strong>Tipo:</strong> ${classType === 'group' ? 'Grupal' : 'Privada'}</li>
            <li><strong>Fecha:</strong> ${formattedDate}</li>
            <li><strong>Hora:</strong> ${classTime}</li>
            <li><strong>Coach:</strong> ${coachName}</li>
          </ul>
        </div>
        
        <div class="info-box success">
          <p style="margin: 0;">
            💡 <strong>Recordatorio:</strong> Llega 5 minutos antes de tu clase y trae una botella de agua.
          </p>
        </div>
        
        <div class="button-center">
          <p style="color: #666666; margin-bottom: 15px;">
            Si necesitas cancelar o reprogramar tu clase, contáctanos por WhatsApp:
          </p>
          <a href="https://wa.me/5259581062606?text=Hola, soy ${encodeURIComponent(clientName)}. Necesito cancelar o reprogramar mi clase del ${encodeURIComponent(formattedDate)} a las ${classTime}." class="button">
            📱 Contactar por WhatsApp
          </a>
        </div>
      `,
      footer: this.getDefaultFooter()
    })
  }

  // Class reminder email (24 hours before)
  static getClassReminderTemplate(clientName, className, classDate, classTime, coachName, classType) {
    const formattedDate = new Date(classDate).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    return this.getBaseTemplate({
      header: `
        <h1>🔔 Recordatorio de Clase</h1>
        <p>Tu clase está programada para mañana</p>
      `,
      body: `
        <h2>¡Hola ${clientName}! 👋</h2>
        <p>Te recordamos que tienes una clase programada:</p>
        
        <div class="info-box">
          <h3>📅 Detalles de la Clase</h3>
          <ul>
            <li><strong>Clase:</strong> ${className}</li>
            <li><strong>Tipo:</strong> ${classType === 'group' ? 'Grupal' : 'Privada'}</li>
            <li><strong>Fecha:</strong> ${formattedDate}</li>
            <li><strong>Hora:</strong> ${classTime}</li>
            <li><strong>Coach:</strong> ${coachName}</li>
          </ul>
        </div>
        
        <div class="info-box success">
          <p style="margin: 0;">
            💡 <strong>Preparación:</strong> Llega 5 minutos antes, trae una botella de agua y ropa cómoda.
          </p>
        </div>
        
        <div class="button-center">
          <p style="color: #666666; margin-bottom: 15px;">
            Si necesitas cancelar o reprogramar, contáctanos con al menos 24 horas de anticipación:
          </p>
          <a href="https://wa.me/5259581062606?text=Hola, soy ${encodeURIComponent(clientName)}. Necesito cancelar o reprogramar mi clase del ${encodeURIComponent(formattedDate)} a las ${classTime}." class="button">
            📱 Contactar por WhatsApp
          </a>
        </div>
      `,
      footer: this.getDefaultFooter()
    })
  }

  // Classes running out email
  static getClassesRunningOutTemplate(clientName, packageName, remainingClasses, expirationDate) {
    const formattedExpirationDate = new Date(expirationDate).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    return this.getBaseTemplate({
      header: `
        <h1>⚠️ Clases por Terminarse</h1>
        <p>Te quedan pocas clases en tu paquete</p>
      `,
      body: `
        <h2>¡Hola ${clientName}! 👋</h2>
        <p>Te informamos que te quedan pocas clases en tu paquete actual:</p>
        
        <div class="info-box warning">
          <h3>📊 Estado de tu Paquete</h3>
          <ul>
            <li><strong>Paquete:</strong> ${packageName}</li>
            <li><strong>Clases restantes:</strong> ${remainingClasses}</li>
            <li><strong>Fecha de vencimiento:</strong> ${formattedExpirationDate}</li>
          </ul>
        </div>
        
        <div class="info-box">
          <p style="margin: 0;">
            💡 <strong>Recomendación:</strong> Aprovecha tus clases restantes antes de que expire tu paquete.
          </p>
        </div>
        
        <div class="button-center">
          <p style="color: #666666; margin-bottom: 15px;">
            Si quieres renovar tu paquete o comprar uno nuevo, contáctanos:
          </p>
          <a href="https://wa.me/5259581062606?text=Hola, soy ${encodeURIComponent(clientName)}. Quiero renovar mi paquete ${encodeURIComponent(packageName)}. Me quedan ${remainingClasses} clases." class="button">
            📱 Renovar Paquete
          </a>
        </div>
      `,
      footer: this.getDefaultFooter()
    })
  }

  // Package expiration email
  static getPackageExpirationTemplate(clientName, packageName, expirationDate, remainingClasses) {
    const formattedExpirationDate = new Date(expirationDate).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    const daysUntilExpiration = Math.ceil((new Date(expirationDate) - new Date()) / (1000 * 60 * 60 * 24))

    return this.getBaseTemplate({
      header: `
        <h1>⏰ Paquete por Vencer</h1>
        <p>Tu paquete vence pronto</p>
      `,
      body: `
        <h2>¡Hola ${clientName}! 👋</h2>
        <p>Te recordamos que tu paquete está por vencer:</p>
        
        <div class="info-box danger">
          <h3>⚠️ Tu paquete vence en ${daysUntilExpiration} día${daysUntilExpiration !== 1 ? 's' : ''}</h3>
          <ul>
            <li><strong>Paquete:</strong> ${packageName}</li>
            <li><strong>Clases restantes:</strong> ${remainingClasses}</li>
            <li><strong>Fecha de vencimiento:</strong> ${formattedExpirationDate}</li>
          </ul>
        </div>
        
        <div class="info-box warning">
          <p style="margin: 0;">
            💡 <strong>Importante:</strong> Si no renuevas tu paquete antes del vencimiento, perderás las clases restantes.
          </p>
        </div>
        
        <div class="button-center">
          <p style="color: #666666; margin-bottom: 15px;">
            Renueva tu paquete ahora para no perder tus clases:
          </p>
          <a href="https://wa.me/5259581062606?text=Hola, soy ${encodeURIComponent(clientName)}. Quiero renovar mi paquete ${encodeURIComponent(packageName)} antes de que venza el ${encodeURIComponent(formattedExpirationDate)}." class="button">
            📱 Renovar Paquete Ahora
          </a>
        </div>
      `,
      footer: this.getDefaultFooter()
    })
  }

  // Birthday email
  static getBirthdayTemplate(clientName) {
    return this.getBaseTemplate({
      header: `
        <h1>🎂 ¡Feliz Cumpleaños!</h1>
        <p>¡Que tengas un día maravilloso!</p>
      `,
      body: `
        <div style="text-align: center; margin-bottom: 30px;">
          <h2 style="font-size: 36px; margin: 0;">🎉</h2>
          <h2 style="margin: 20px 0;">¡Feliz Cumpleaños, ${clientName}!</h2>
        </div>
        
        <div class="info-box success">
          <p style="margin: 0; text-align: center; font-size: 18px;">
            🎊 Esperamos que tengas un día maravilloso lleno de alegría, salud y felicidad.
          </p>
        </div>
        
        <p style="text-align: center; color: #666666; margin: 30px 0;">
          Que este nuevo año de vida te traiga mucha energía positiva y bienestar.
        </p>
        
        <div class="info-box">
          <p style="margin: 0; text-align: center;">
            💝 <strong>¡Te esperamos en tu próxima clase!</strong><br>
            Mantente activa y saludable con PilatesMermaid
          </p>
        </div>
        
        <div class="button-center">
          <p style="color: #666666; margin-bottom: 15px;">
            ¿Quieres agendar una clase especial para tu cumpleaños?
          </p>
          <a href="https://wa.me/5259581062606?text=Hola, soy ${encodeURIComponent(clientName)}. Es mi cumpleaños y quiero agendar una clase especial." class="button">
            📱 Agendar Clase Especial
          </a>
        </div>
      `,
      footer: this.getDefaultFooter()
    })
  }

  // Password reset email
  static getPasswordResetTemplate(clientName, resetToken, resetLink) {
    return this.getBaseTemplate({
      header: `
        <h1>🔐 Recuperación de Contraseña</h1>
        <p>Restablece tu contraseña de forma segura</p>
      `,
      body: `
        <h2>¡Hola ${clientName}! 👋</h2>
        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en PilatesMermaid.</p>
        
        <div class="info-box warning">
          <p style="margin: 0;">
            ⚠️ <strong>Importante:</strong> Si no solicitaste este cambio, ignora este email y tu contraseña permanecerá sin cambios.
          </p>
        </div>
        
        <div class="button-center">
          <p style="color: #666666; margin-bottom: 15px;">
            Haz clic en el botón siguiente para restablecer tu contraseña:
          </p>
          <a href="${resetLink}" class="button" style="background-color: #667eea;">
            🔐 Restablecer Contraseña
          </a>
        </div>
        
        <div class="info-box">
          <p style="margin: 0; font-size: 14px;">
            <strong>¿El botón no funciona?</strong><br>
            Copia y pega el siguiente enlace en tu navegador:<br>
            <a href="${resetLink}" style="color: #667eea; word-break: break-all;">${resetLink}</a>
          </p>
        </div>
        
        <div class="info-box">
          <p style="margin: 0; font-size: 14px;">
            <strong>Token de seguridad:</strong><br>
            <code style="background-color: #f8f9fa; padding: 5px 10px; border-radius: 4px; font-family: monospace;">${resetToken}</code>
          </p>
        </div>
        
        <p style="color: #999999; font-size: 14px; margin-top: 30px;">
          <strong>Nota de seguridad:</strong> Este enlace expirará en 1 hora por razones de seguridad.
        </p>
      `,
      footer: this.getDefaultFooter()
    })
  }

  // Password reset success email
  static getPasswordResetSuccessTemplate(clientName) {
    return this.getBaseTemplate({
      header: `
        <h1>✅ Contraseña Restablecida</h1>
        <p>Tu contraseña ha sido cambiada exitosamente</p>
      `,
      body: `
        <h2>¡Hola ${clientName}! 👋</h2>
        <p>Tu contraseña ha sido restablecida exitosamente.</p>
        
        <div class="info-box success">
          <p style="margin: 0;">
            ✅ <strong>¡Listo!</strong> Ya puedes iniciar sesión con tu nueva contraseña.
          </p>
        </div>
        
        <div class="info-box warning">
          <p style="margin: 0;">
            ⚠️ <strong>¿No reconoces este cambio?</strong><br>
            Si no realizaste este cambio, por favor contáctanos inmediatamente por WhatsApp.
          </p>
        </div>
        
        <div class="button-center">
          <a href="https://wa.me/5259581062606?text=Hola, soy ${encodeURIComponent(clientName)}. No reconocí el cambio de contraseña en mi cuenta." class="button" style="background-color: #dc3545;">
            📱 Reportar Problema
          </a>
        </div>
      `,
      footer: this.getDefaultFooter()
    })
  }

  // Welcome email for new clients
  static getWelcomeTemplate(clientName) {
    return this.getBaseTemplate({
      header: `
        <h1>👋 ¡Bienvenida a PilatesMermaid!</h1>
        <p>Estamos emocionados de tenerte con nosotros</p>
      `,
      body: `
        <h2>¡Hola ${clientName}! 👋</h2>
        <p>¡Bienvenida a PilatesMermaid! Estamos emocionados de tenerte como parte de nuestra comunidad.</p>
        
        <div class="info-box success">
          <p style="margin: 0;">
            🎉 <strong>¡Tu cuenta ha sido creada exitosamente!</strong><br>
            Ahora puedes comenzar a reservar tus clases y disfrutar de todos los beneficios.
          </p>
        </div>
        
        <div class="info-box">
          <h3>📱 Próximos Pasos</h3>
          <ul>
            <li>Contacta por WhatsApp para comprar tu paquete de clases</li>
            <li>Explora nuestros horarios disponibles</li>
            <li>Reserva tu primera clase</li>
            <li>Disfruta de tu experiencia en PilatesMermaid</li>
          </ul>
        </div>
        
        <div class="button-center">
          <p style="color: #666666; margin-bottom: 15px;">
            ¿Tienes preguntas? Contáctanos:
          </p>
          <a href="https://wa.me/5259581062606?text=Hola, soy ${encodeURIComponent(clientName)}. Acabo de registrarme y tengo algunas preguntas." class="button">
            📱 Contactar por WhatsApp
          </a>
        </div>
      `,
      footer: this.getDefaultFooter()
    })
  }

}

module.exports = { EmailTemplates }

