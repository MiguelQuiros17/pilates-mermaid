// Migration script to update notification_log table to include new notification types
const { database } = require('../lib/database.js')

async function migrateNotificationLog() {
  try {
    console.log('🔄 Iniciando migración de notification_log...')
    
    // Drop existing table and recreate with new types
    await database.run('DROP TABLE IF EXISTS notification_log')
    
    // Recreate table with all notification types
    await database.run(`
      CREATE TABLE IF NOT EXISTS notification_log (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('birthday', 'expiration', 'class_confirmation', 'class_reminder', 'classes_running_out', 'password_reset', 'welcome')),
        subject TEXT NOT NULL,
        sent_at TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `)
    
    console.log('✅ Migración de notification_log completada exitosamente')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error en la migración:', error)
    process.exit(1)
  }
}

// Run migration
migrateNotificationLog()






