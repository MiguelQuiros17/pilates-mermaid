// Script to send notifications when clients are running out of classes
const { database } = require('../lib/database.js')
const { EmailService } = require('../lib/email.js')
const { v4: uuidv4 } = require('uuid')

const emailService = new EmailService()

async function sendClassesRunningOutNotifications() {
  try {
    console.log('📧 Iniciando envío de notificaciones de clases por terminarse...')
    
    // Get all clients with active packages
    const clients = await database.all(`
      SELECT 
        u.id,
        u.nombre,
        u.correo,
        u.type_of_class,
        u.clases_restantes,
        u.expiration_date,
        ph.package_name,
        ph.package_type,
        ph.start_date,
        ph.end_date,
        ph.status
      FROM users u
      LEFT JOIN package_history ph ON u.id = ph.user_id
      WHERE u.role = 'cliente'
        AND u.type_of_class != 'Sin paquete'
        AND u.type_of_class != 'Cortesía'
        AND u.clases_restantes > 0
        AND (ph.status = 'active' OR ph.status IS NULL)
        AND (u.expiration_date IS NULL OR u.expiration_date > DATE('now'))
      ORDER BY u.clases_restantes ASC
    `)

    console.log(`📊 Encontrados ${clients.length} clientes con paquetes activos`)

    let sentCount = 0
    let failedCount = 0

    for (const client of clients) {
      try {
        // Check if classes are running out (less than 3 classes remaining)
        if (client.clases_restantes >= 3) {
          continue
        }

        // Check if notification was already sent in the last 7 days
        const existingNotification = await database.get(`
          SELECT id FROM notification_log
          WHERE user_id = ?
            AND type = 'classes_running_out'
            AND DATE(sent_at) >= DATE('now', '-7 days')
        `, [client.id])

        if (existingNotification) {
          console.log(`⏭️  Notificación ya enviada recientemente a ${client.nombre}`)
          continue
        }

        // Determine package name
        const packageName = client.package_name || client.type_of_class || 'Paquete activo'
        const expirationDate = client.expiration_date || client.end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

        // Send notification email
        const result = await emailService.sendClassesRunningOut(
          client.correo,
          client.nombre,
          packageName,
          client.clases_restantes,
          expirationDate
        )

        if (result.success) {
          // Log successful notification
          await database.run(`
            INSERT INTO notification_log (id, user_id, type, subject, sent_at, status, created_at)
            VALUES (?, ?, ?, ?, datetime('now'), 'sent', datetime('now'))
          `, [
            uuidv4(),
            client.id,
            'classes_running_out',
            `Notificación: Te quedan ${client.clases_restantes} clases en tu paquete ${packageName}`
          ])

          sentCount++
          console.log(`✅ Notificación enviada a ${client.nombre} - ${client.clases_restantes} clases restantes`)
        } else {
          // Log failed notification
          await database.run(`
            INSERT INTO notification_log (id, user_id, type, subject, sent_at, status, error_message, created_at)
            VALUES (?, ?, ?, ?, datetime('now'), 'failed', ?, datetime('now'))
          `, [
            uuidv4(),
            client.id,
            'classes_running_out',
            `Notificación: Te quedan ${client.clases_restantes} clases en tu paquete ${packageName}`,
            result.error || 'Error desconocido'
          ])

          failedCount++
          console.error(`❌ Error enviando notificación a ${client.nombre}:`, result.error)
        }
      } catch (error) {
        console.error(`❌ Error procesando notificación para ${client.nombre}:`, error)
        failedCount++
        
        // Log error
        try {
          await database.run(`
            INSERT INTO notification_log (id, user_id, type, subject, sent_at, status, error_message, created_at)
            VALUES (?, ?, ?, ?, datetime('now'), 'failed', ?, datetime('now'))
          `, [
            uuidv4(),
            client.id,
            'classes_running_out',
            `Notificación: Te quedan ${client.clases_restantes} clases en tu paquete`,
            error.message
          ])
        } catch (logError) {
          console.error('Error logging notification:', logError)
        }
      }
    }

    console.log(`\n📊 Resumen de notificaciones:`)
    console.log(`   ✅ Enviados: ${sentCount}`)
    console.log(`   ❌ Fallidos: ${failedCount}`)
    console.log(`   📧 Total procesados: ${clients.length}`)

    process.exit(0)
  } catch (error) {
    console.error('❌ Error en el script de notificaciones:', error)
    process.exit(1)
  }
}

// Run script
sendClassesRunningOutNotifications()






