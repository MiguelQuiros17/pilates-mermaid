// Script de prueba para verificar la configuración de emails
// Nota: Este script requiere que las variables de entorno estén configuradas
// Si usas dotenv, descomenta la siguiente línea:
// require('dotenv').config()

const { EmailService } = require('./lib/email.js')

async function testEmail() {
  console.log('🧪 Iniciando prueba de email...')
  console.log('')
  
  // Verificar variables de entorno
  const emailUser = process.env.EMAIL_USER
  const emailPassword = process.env.EMAIL_PASSWORD
  
  if (!emailUser || !emailPassword) {
    console.error('❌ Error: Variables de entorno no configuradas')
    console.error('   Asegúrate de tener EMAIL_USER y EMAIL_PASSWORD en tu archivo .env')
    console.error('')
    console.error('   Ejemplo de .env:')
    console.error('   EMAIL_USER=tu-email@gmail.com')
    console.error('   EMAIL_PASSWORD=tu-app-password-aqui')
    process.exit(1)
  }
  
  console.log('✅ Variables de entorno encontradas:')
  console.log(`   EMAIL_USER: ${emailUser}`)
  console.log(`   EMAIL_PASSWORD: ${emailPassword ? '***' + emailPassword.slice(-4) : 'NO CONFIGURADA'}`)
  console.log('')
  
  // Crear servicio de email
  const emailService = new EmailService()
  
  // Probar envío de email simple
  console.log('📧 Enviando email de prueba...')
  console.log('')
  
  try {
    // Probar email simple primero
    console.log('📧 Enviando email de prueba simple...')
    const result = await emailService.sendEmail(
      emailUser, // Enviar a ti mismo para probar
      '🧪 Prueba de Email - PilatesMermaid',
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
          <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🧜‍♀️ PilatesMermaid</h1>
            <p style="color: #e0e0e0; margin: 10px 0 0 0; font-size: 16px;">Email de Prueba</p>
          </div>
          <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0;">¡Hola!</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              Este es un email de prueba del sistema de PilatesMermaid.
            </p>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              Si recibes este email, significa que tu configuración está correcta. 🎉
            </p>
            <div style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #667eea;">
              <h3 style="color: #333; margin-top: 0;">Próximos pasos:</h3>
              <ul style="color: #666; font-size: 16px; line-height: 1.8;">
                <li>Verifica que recibiste este email</li>
                <li>Prueba los diferentes tipos de emails</li>
                <li>Configura los scripts automáticos (opcional)</li>
              </ul>
            </div>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>PilatesMermaid - Sistema de Gestión</p>
            <p>Este email fue enviado automáticamente. No responder.</p>
          </div>
        </div>
      `
    )
    
    if (result.success) {
      console.log('✅ Email enviado exitosamente!')
      console.log(`   Message ID: ${result.messageId}`)
      console.log('')
      console.log('📬 Revisa tu bandeja de entrada (y spam) para ver el email.')
      console.log('')
      console.log('🎉 ¡Configuración correcta!')
    } else {
      console.error('❌ Error enviando email:', result.error)
      console.error('')
      console.error('🔍 Posibles soluciones:')
      console.error('   1. Verifica que EMAIL_USER sea correcto')
      console.error('   2. Verifica que EMAIL_PASSWORD sea una contraseña de aplicación')
      console.error('   3. Verifica que la verificación en 2 pasos esté activada')
      console.error('   4. Verifica tu conexión a internet')
      process.exit(1)
    }
  } catch (error) {
    console.error('❌ Error inesperado:', error.message)
    console.error('')
    console.error('🔍 Posibles soluciones:')
    console.error('   1. Verifica que las variables de entorno estén configuradas')
    console.error('   2. Verifica que el archivo .env exista en la raíz del proyecto')
    console.error('   3. Verifica que nodemailer esté instalado: npm install nodemailer')
    process.exit(1)
  }
}

// Ejecutar prueba
testEmail()

