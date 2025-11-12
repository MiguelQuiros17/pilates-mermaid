const { database } = require('../lib/database.js')
const { EmailService } = require('../lib/email.js')
const { v4: uuidv4 } = require('uuid')

async function sendExpirationNotifications() {
  try {
    console.log('⚠️ Iniciando envío de notificaciones de vencimiento...')
    
    const emailService = new EmailService()
    const today = new Date()
    const warningDays = 7 // Notificar 7 días antes del vencimiento
    
    // Calcular fecha de advertencia
    const warningDate = new Date(today)
    warningDate.setDate(today.getDate() + warningDays)
    const warningDateStr = warningDate.toISOString().split('T')[0]
    
    // Obtener paquetes que vencen pronto
    const expiringPackages = await database.all(`
      SELECT 
        ph.user_id,
        u.nombre,
        u.correo,
        ph.package_name,
        ph.end_date,
        ph.classes_included,
        ph.amount_paid
      FROM package_history ph
      JOIN users u ON ph.user_id = u.id
      WHERE ph.status = 'active'
        AND ph.end_date = ?
        AND u.correo IS NOT NULL 
        AND u.correo != ''
        AND u.role = 'cliente'
    `, [warningDateStr])
    
    if (expiringPackages.length === 0) {
      console.log(`📅 No hay paquetes que venzan en ${warningDays} días`)
      return
    }
    
    console.log(`⚠️ Encontrados ${expiringPackages.length} paquetes que vencen en ${warningDays} días:`)
    
    let successCount = 0
    let errorCount = 0
    
    for (const packageInfo of expiringPackages) {
      try {
        console.log(`📧 Enviando notificación de vencimiento a ${packageInfo.nombre}`)
        
        // Obtener clases restantes del usuario
        const user = await database.get('SELECT clases_restantes FROM users WHERE id = ?', [packageInfo.user_id])
        const remainingClasses = user ? user.clases_restantes : 0
        
        const result = await emailService.sendPackageExpirationNotification(
          packageInfo.correo,
          packageInfo.nombre,
          packageInfo.package_name,
          packageInfo.end_date,
          remainingClasses
        )
        
        if (result.success) {
          console.log(`✅ Email enviado exitosamente a ${packageInfo.nombre}`)
          successCount++
          
          // Log successful notification
          await database.run(`
            INSERT INTO notification_log (id, user_id, type, subject, sent_at, status, created_at)
            VALUES (?, ?, ?, ?, datetime('now'), 'sent', datetime('now'))
          `, [
            uuidv4(),
            packageInfo.user_id,
            'expiration',
            `Notificación de vencimiento: ${packageInfo.package_name} vence el ${new Date(packageInfo.end_date).toLocaleDateString('es-ES')}`
          ])
        } else {
          // Log failed notification
          await database.run(`
            INSERT INTO notification_log (id, user_id, type, subject, sent_at, status, error_message, created_at)
            VALUES (?, ?, ?, ?, datetime('now'), 'failed', ?, datetime('now'))
          `, [
            uuidv4(),
            packageInfo.user_id,
            'expiration',
            `Notificación de vencimiento: ${packageInfo.package_name} vence el ${new Date(packageInfo.end_date).toLocaleDateString('es-ES')}`,
            result.error || 'Error desconocido'
          ])
          
          console.error(`❌ Error enviando email a ${packageInfo.nombre}:`, result.error)
          errorCount++
        }
      } catch (error) {
        console.error(`❌ Error procesando ${packageInfo.nombre}:`, error)
        errorCount++
      }
    }
    
    console.log(`\n📊 Resumen de notificaciones de vencimiento:`)
    console.log(`✅ Exitosas: ${successCount}`)
    console.log(`❌ Errores: ${errorCount}`)
    console.log(`⚠️ Total procesados: ${expiringPackages.length}`)
    
  } catch (error) {
    console.error('💥 Error en el proceso de notificaciones de vencimiento:', error)
    throw error
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  sendExpirationNotifications()
    .then(() => {
      console.log('🎉 Proceso de notificaciones de vencimiento completado!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Error en el proceso:', error)
      process.exit(1)
    })
}

module.exports = { sendExpirationNotifications }



