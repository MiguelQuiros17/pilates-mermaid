const { database } = require('../lib/database.js')
const { v4: uuidv4 } = require('uuid')

async function initializeAllClasses() {
  try {
    console.log('🏃‍♀️ Inicializando clases grupales...')
    
    console.log('🧹 Limpiando clases, reservas y asistencias existentes...')
    await database.run('DELETE FROM attendance')
    await database.run('DELETE FROM bookings')
    await database.run('DELETE FROM classes')
    
    // Obtener el ID de Esmeralda García (coach)
    const coach = await database.get('SELECT id FROM users WHERE nombre = ? AND role = ?', ['Esmeralda García', 'coach'])
    if (!coach) {
      throw new Error('No se encontró el coach Esmeralda García')
    }
    
    // Establecer fecha de inicio (una semana atrás desde hoy)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 7)
    startDate.setHours(0, 0, 0, 0) // Resetear a medianoche para evitar problemas de zona horaria
    
    // Establecer fecha de fin (31 de diciembre de 2026)
    const endDate = new Date(2026, 11, 31) // Mes 11 = Diciembre (0-indexed)
    endDate.setHours(23, 59, 59, 999) // Final del día
    
    let classCounter = 0
    const classes = []
    
    // Función helper para formatear fecha como YYYY-MM-DD sin problemas de zona horaria
    const formatDate = (date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    
    // Generar clases para cada día desde startDate hasta endDate
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      // Skip Tuesdays (day 2 = martes)
      const dayOfWeek = currentDate.getDay()
      if (dayOfWeek !== 2) { // Solo procesar si NO es martes
        const times = ['06:00', '08:00', '18:00']
        times.forEach(time => {
          const classId = uuidv4()
          const classData = {
            id: classId,
            title: 'Clase Grupal de Pilates',
            description: 'Clase grupal de pilates mat',
            date: formatDate(currentDate), // Usar formato local en lugar de ISO
            time: time,
            duration: 60,
            max_capacity: 9,
            current_bookings: 0,
            coach_id: coach.id,
            type: 'group',
            status: 'scheduled'
          }
          
          classes.push(classData)
          classCounter++
        })
      }
      
      // Avanzar al siguiente día
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    // Insertar todas las clases en la base de datos
    for (const classData of classes) {
      await database.run(`
        INSERT OR IGNORE INTO classes (
          id, title, description, date, time, duration, max_capacity, 
          current_bookings, coach_id, type, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        classData.id, classData.title, classData.description, classData.date,
        classData.time, classData.duration, classData.max_capacity,
        classData.current_bookings, classData.coach_id, classData.type,
        classData.status
      ])
    }
    
    console.log(`✅ Se inicializaron ${classCounter} clases grupales hasta diciembre de 2026`)
    console.log(`📅 Período: ${formatDate(startDate)} a ${formatDate(endDate)}`)
    console.log(`🕐 Horarios: 06:00, 08:00, 18:00 (todos los días excepto martes)`)
    console.log(`📊 Capacidad: 9 espacios por clase`)
    console.log(`🚫 Día de descanso: Martes`)
    
    return classCounter
  } catch (error) {
    console.error('❌ Error al inicializar las clases:', error)
    throw error
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  initializeAllClasses()
    .then(() => {
      console.log('🎉 Inicialización completada exitosamente!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Error en la inicialización:', error)
      process.exit(1)
    })
}

module.exports = { initializeAllClasses }
