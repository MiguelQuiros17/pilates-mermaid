const { database } = require('../lib/database.js')

async function migratePaymentsTable() {
  try {
    console.log('🔄 Iniciando migración de tabla de pagos...')
    
    // Verificar si la tabla existe y tiene la estructura antigua
    const tableInfo = await database.all("PRAGMA table_info(coach_payments)")
    const hasOldStructure = tableInfo.some(column => column.name === 'total_classes')
    
    if (hasOldStructure) {
      console.log('📋 Tabla antigua detectada, creando nueva estructura...')
      
      // Crear tabla temporal con nueva estructura
      await database.run(`
        CREATE TABLE coach_payments_new (
          id TEXT PRIMARY KEY,
          coach_name TEXT NOT NULL,
          period_start TEXT NOT NULL,
          period_end TEXT NOT NULL,
          total_students INTEGER NOT NULL,
          first_three_students INTEGER NOT NULL,
          additional_students INTEGER NOT NULL,
          first_three_amount INTEGER NOT NULL,
          additional_amount INTEGER NOT NULL,
          total_amount INTEGER NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('pending', 'paid')),
          payment_date TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)
      
      // Migrar datos existentes (si los hay)
      const existingPayments = await database.all('SELECT * FROM coach_payments')
      
      if (existingPayments.length > 0) {
        console.log(`📊 Migrando ${existingPayments.length} registros existentes...`)
        
        for (const payment of existingPayments) {
          // Asumir que las clases antiguas se convierten a estudiantes
          const totalStudents = payment.total_classes || 0
          const firstThreeStudents = Math.min(totalStudents, 3)
          const additionalStudents = Math.max(0, totalStudents - 3)
          
          await database.run(`
            INSERT INTO coach_payments_new (
              id, coach_name, period_start, period_end, 
              total_students, first_three_students, additional_students,
              first_three_amount, additional_amount, total_amount,
              status, payment_date, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            payment.id,
            payment.coach_name,
            payment.period_start,
            payment.period_end,
            totalStudents,
            firstThreeStudents,
            additionalStudents,
            payment.first_three_amount || (firstThreeStudents * 250),
            payment.additional_amount || (additionalStudents * 40),
            payment.total_amount || ((firstThreeStudents * 250) + (additionalStudents * 40)),
            payment.status,
            payment.payment_date,
            payment.created_at,
            payment.updated_at
          ])
        }
        
        console.log('✅ Datos migrados exitosamente')
      }
      
      // Eliminar tabla antigua y renombrar la nueva
      await database.run('DROP TABLE coach_payments')
      await database.run('ALTER TABLE coach_payments_new RENAME TO coach_payments')
      
      console.log('✅ Migración completada exitosamente')
    } else {
      console.log('✅ La tabla ya tiene la estructura correcta')
    }
    
    // Verificar estructura final
    const finalTableInfo = await database.all("PRAGMA table_info(coach_payments)")
    console.log('📋 Estructura final de la tabla:')
    finalTableInfo.forEach(column => {
      console.log(`  - ${column.name}: ${column.type}`)
    })
    
  } catch (error) {
    console.error('💥 Error en la migración:', error)
    throw error
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  migratePaymentsTable()
    .then(() => {
      console.log('🎉 Migración completada exitosamente!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Error en la migración:', error)
      process.exit(1)
    })
}

module.exports = { migratePaymentsTable }








