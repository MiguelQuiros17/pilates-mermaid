const { database } = require('../lib/database.js')
const { EmailService } = require('../lib/email.js')
const { v4: uuidv4 } = require('uuid')

async function sendBirthdayNotifications() {
  try {
    console.log('🎂 Iniciando envío de notificaciones de cumpleaños...')
    
    const emailService = new EmailService()
    const today = new Date()
    const todayStr = `${today.getMonth() + 1}-${today.getDate()}` // MM-DD format
    
    // Obtener usuarios que cumplen años hoy
    const birthdayUsers = await database.all(`
      SELECT id, nombre, correo, cumpleanos
      FROM users 
      WHERE role = 'cliente' 
        AND cumpleanos IS NOT NULL 
        AND STRFTIME('%m-%d', cumpleanos) = ?
        AND correo IS NOT NULL 
        AND correo != ''
    `, [todayStr])
    
    if (birthdayUsers.length === 0) {
      console.log('📅 No hay usuarios que cumplan años hoy')
      return
    }
    
    console.log(`🎉 Encontrados ${birthdayUsers.length} usuarios que cumplen años hoy:`)
    
    let successCount = 0
    let errorCount = 0
    
    for (const user of birthdayUsers) {
      try {
        console.log(`📧 Enviando felicitación a ${user.nombre} (${user.correo})`)
        
        const result = await emailService.sendBirthdayNotification(user.correo, user.nombre)
        
        if (result.success) {
          console.log(`✅ Email enviado exitosamente a ${user.nombre}`)
          successCount++
          
          // Log successful notification
          await database.run(`
            INSERT INTO notification_log (id, user_id, type, subject, sent_at, status, created_at)
            VALUES (?, ?, ?, ?, datetime('now'), 'sent', datetime('now'))
          `, [
            uuidv4(),
            user.id,
            'birthday',
            `Feliz cumpleaños: ${user.nombre}`
          ])
        } else {
          // Log failed notification
          await database.run(`
            INSERT INTO notification_log (id, user_id, type, subject, sent_at, status, error_message, created_at)
            VALUES (?, ?, ?, ?, datetime('now'), 'failed', ?, datetime('now'))
          `, [
            uuidv4(),
            user.id,
            'birthday',
            `Feliz cumpleaños: ${user.nombre}`,
            result.error || 'Error desconocido'
          ])
          
          console.error(`❌ Error enviando email a ${user.nombre}:`, result.error)
          errorCount++
        }
      } catch (error) {
        console.error(`❌ Error procesando ${user.nombre}:`, error)
        errorCount++
      }
    }
    
    console.log(`\n📊 Resumen de notificaciones de cumpleaños:`)
    console.log(`✅ Exitosas: ${successCount}`)
    console.log(`❌ Errores: ${errorCount}`)
    console.log(`📅 Total procesados: ${birthdayUsers.length}`)
    
  } catch (error) {
    console.error('💥 Error en el proceso de notificaciones de cumpleaños:', error)
    throw error
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  sendBirthdayNotifications()
    .then(() => {
      console.log('🎉 Proceso de notificaciones de cumpleaños completado!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Error en el proceso:', error)
      process.exit(1)
    })
}

module.exports = { sendBirthdayNotifications }



