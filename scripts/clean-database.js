const { database } = require('../lib/database.js')
const bcrypt = require('bcryptjs')

async function cleanDatabase() {
  console.log('🧹 Limpiando base de datos...')
  console.log('')

  try {
    // 1. Obtener el ID del admin para mantenerlo
    let admin = await database.get(`
      SELECT id FROM users WHERE correo = 'admin@pilatesmermaid.com'
    `)

    if (!admin) {
      console.log('⚠️ No se encontró el usuario admin. Creando admin por defecto...')
      const adminPassword = await bcrypt.hash('admin123', 12)
      const adminUser = await database.createUser({
        nombre: 'Admin',
        correo: 'admin@pilatesmermaid.com',
        numero_de_telefono: '5512345678',
        instagram: '@admin',
        role: 'admin',
        type_of_class: 'Ilimitado',
        cumpleanos: '1980-01-15',
        lesion_o_limitacion_fisica: 'Ninguna',
        genero: 'Femenino',
        clases_tomadas: 0,
        clases_restantes: 999,
        total_pagado: 0,
        password_hash: adminPassword,
      })
      console.log('✅ Admin creado:', adminUser.nombre)
      console.log('')
      // Obtener el admin recién creado
      admin = await database.get(`SELECT id FROM users WHERE correo = 'admin@pilatesmermaid.com'`)
    }

    const adminId = admin.id
    console.log(`✅ Admin encontrado: ${adminId}`)
    console.log('')

    // Verificar si existe el coach Esmeralda García (necesario para las clases grupales)
    let coach = await database.get(`SELECT id FROM users WHERE nombre = ? AND role = ?`, ['Esmeralda García', 'coach'])
    
    if (!coach) {
      console.log('⚠️ No se encontró el coach Esmeralda García. Creando coach por defecto...')
      const coachPassword = await bcrypt.hash('coach123', 12)
      const coachUser = await database.createUser({
        nombre: 'Esmeralda García',
        correo: 'esmeralda@pilatesmermaid.com',
        numero_de_telefono: '5512345679',
        instagram: '@esmeralda_pilates',
        role: 'coach',
        type_of_class: 'Ilimitado',
        cumpleanos: '1985-06-20',
        lesion_o_limitacion_fisica: 'Ninguna',
        genero: 'Femenino',
        clases_tomadas: 0,
        clases_restantes: 999,
        total_pagado: 0,
        password_hash: coachPassword,
      })
      console.log('✅ Coach creado:', coachUser.nombre)
      console.log('')
      coach = await database.get(`SELECT id FROM users WHERE nombre = ? AND role = ?`, ['Esmeralda García', 'coach'])
    } else {
      console.log(`✅ Coach encontrado: ${coach.id} (Esmeralda García)`)
      console.log('')
    }

    const coachId = coach.id

    console.log('📋 Eliminando datos...')
    console.log('')

    // 2. Eliminar todas las reservas (bookings)
    await database.run('DELETE FROM bookings')
    console.log('✅ Reservas eliminadas')

    // 3. Eliminar todo el historial de clases
    await database.run('DELETE FROM class_history')
    console.log('✅ Historial de clases eliminado')

    // 4. Eliminar todo el historial de pagos
    await database.run('DELETE FROM payment_history')
    console.log('✅ Historial de pagos eliminado')

    // 5. Eliminar todo el historial de paquetes
    await database.run('DELETE FROM package_history')
    console.log('✅ Historial de paquetes eliminado')

    // 6. Eliminar todas las solicitudes de clases privadas
    await database.run('DELETE FROM private_class_requests')
    console.log('✅ Solicitudes de clases privadas eliminadas')

    // 7. Eliminar todos los pagos a coaches
    await database.run('DELETE FROM coach_payments')
    console.log('✅ Pagos a coaches eliminados')

    // 8. Eliminar todos los registros de notificaciones
    await database.run('DELETE FROM notification_log')
    console.log('✅ Registros de notificaciones eliminados')

    // 9. Eliminar todas las asistencias
    await database.run('DELETE FROM attendance')
    console.log('✅ Asistencias eliminadas')

    // 10. Eliminar todos los pagos
    await database.run('DELETE FROM payments')
    console.log('✅ Pagos eliminados')

    // 11. Eliminar todos los registros financieros
    await database.run('DELETE FROM financial_records')
    console.log('✅ Registros financieros eliminados')

    // 12. Eliminar todas las clases PRIVADAS
    await database.run("DELETE FROM classes WHERE type = 'private'")
    console.log('✅ Clases privadas eliminadas')

    // 13. Resetear current_bookings de todas las clases grupales a 0
    await database.run("UPDATE classes SET current_bookings = 0 WHERE type = 'group'")
    console.log('✅ Reservas de clases grupales reseteadas a 0')

    // 14. Eliminar todos los usuarios excepto el admin y el coach Esmeralda
    await database.run('DELETE FROM users WHERE id != ? AND id != ?', [adminId, coachId])
    console.log('✅ Usuarios eliminados (excepto admin y coach Esmeralda)')

    // 15. Eliminar configuraciones de notificaciones excepto del admin y coach
    await database.run('DELETE FROM notification_settings WHERE user_id != ? AND user_id != ?', [adminId, coachId])
    console.log('✅ Configuraciones de notificaciones eliminadas (excepto admin y coach)')

    // 16. Resetear estadísticas del admin
    await database.run(`
      UPDATE users 
      SET clases_tomadas = 0, 
          clases_restantes = 999, 
          total_pagado = 0,
          type_of_class = 'Ilimitado',
          expiration_date = NULL
      WHERE id = ?
    `, [adminId])
    console.log('✅ Estadísticas del admin reseteadas')

    // 17. Verificar que solo queden clases grupales
    const groupClasses = await database.all("SELECT COUNT(*) as count FROM classes WHERE type = 'group'")
    const privateClasses = await database.all("SELECT COUNT(*) as count FROM classes WHERE type = 'private'")
    const users = await database.all('SELECT COUNT(*) as count FROM users')
    const bookings = await database.all('SELECT COUNT(*) as count FROM bookings')

    // Obtener información de usuarios
    const allUsers = await database.all('SELECT nombre, role, correo FROM users ORDER BY role')
    
    console.log('')
    console.log('📊 Estado final de la base de datos:')
    console.log(`   - Usuarios: ${users[0].count}`)
    allUsers.forEach(user => {
      console.log(`      • ${user.nombre} (${user.role}) - ${user.correo}`)
    })
    console.log(`   - Clases grupales: ${groupClasses[0].count}`)
    console.log(`   - Clases privadas: ${privateClasses[0].count}`)
    console.log(`   - Reservas: ${bookings[0].count}`)
    console.log('')

    console.log('🎉 ¡Base de datos limpiada exitosamente!')
    console.log('')
    console.log('📋 Cuentas disponibles:')
    console.log('   👑 Admin:')
    console.log('      Email: admin@pilatesmermaid.com')
    console.log('      Contraseña: admin123')
    console.log('')
    console.log('   🏃 Coach:')
    console.log('      Email: esmeralda@pilatesmermaid.com')
    console.log('      Contraseña: coach123')
    console.log('')
    if (groupClasses[0].count === 0) {
      console.log('💡 Para generar clases grupales, ejecuta:')
      console.log('   npm run init-classes')
      console.log('')
    }

  } catch (error) {
    console.error('❌ Error limpiando la base de datos:', error)
    throw error
  } finally {
    try {
      database.close()
    } catch (error) {
      // La base de datos ya está cerrada, ignorar el error
    }
  }
}

// Ejecutar la limpieza
cleanDatabase()

