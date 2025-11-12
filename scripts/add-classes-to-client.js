// Script para agregar clases a Miguel Quirós García
const path = require('path')
const sqlite3 = require('sqlite3')
const { promisify } = require('util')
const { v4: uuidv4 } = require('uuid')

const DB_PATH = path.join(process.cwd(), 'data', 'pilates_mermaid.db')

class Database {
  constructor() {
    const fs = require('fs')
    const dataDir = path.dirname(DB_PATH)
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
    this.db = new sqlite3.Database(DB_PATH)
  }

  async get(sql, params = []) {
    const get = promisify(this.db.get.bind(this.db))
    return await get(sql, params)
  }

  async all(sql, params = []) {
    const all = promisify(this.db.all.bind(this.db))
    return await all(sql, params)
  }

  async run(sql, params = []) {
    const run = promisify(this.db.run.bind(this.db))
    return await run(sql, params)
  }

  async addClassHistory(classHistory) {
    const id = uuidv4()
    
    await this.run(`
      INSERT INTO class_history (
        id, class_id, user_id, class_name, class_date, class_time, coach_name, status, cancellation_reason, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, 
      classHistory.class_id, 
      classHistory.user_id, 
      classHistory.class_name,
      classHistory.class_date, 
      classHistory.class_time, 
      classHistory.coach_name,
      classHistory.status, 
      classHistory.cancellation_reason || null, 
      classHistory.notes || null
    ])
    
    return await this.get('SELECT * FROM class_history WHERE id = ?', [id])
  }

  close() {
    this.db.close()
  }
}

const database = new Database()

async function addClassesToClient() {
  try {
    console.log('=== AGREGANDO CLASES A MIGUEL QUIRÓS GARCÍA ===\n')
    
    // 1. Buscar el cliente
    const clientEmail = 'mqghux@gmail.com'
    const client = await database.get('SELECT * FROM users WHERE correo = ?', [clientEmail])
    
    if (!client) {
      console.log('❌ Cliente no encontrado con email:', clientEmail)
      return
    }
    
    console.log('✅ Cliente encontrado:')
    console.log(`   - ID: ${client.id}`)
    console.log(`   - Nombre: ${client.nombre}`)
    console.log(`   - Email: ${client.correo}`)
    console.log('')
    
    // 2. Buscar un coach para las clases
    const coach = await database.get('SELECT * FROM users WHERE role = ? LIMIT 1', ['coach'])
    if (!coach) {
      console.log('⚠️  No hay coaches disponibles, usando "Coach" como nombre')
    }
    
    const coachName = coach ? coach.nombre : 'Coach'
    const coachId = coach ? coach.id : null
    console.log(`✅ Coach: ${coachName}`)
    console.log('')
    
    // 3. Buscar clases existentes o crear algunas
    const existingClasses = await database.all(`
      SELECT * FROM classes 
      WHERE type = 'group' 
      AND date >= date('now')
      ORDER BY date, time
      LIMIT 10
    `)
    
    console.log(`📚 Clases existentes encontradas: ${existingClasses.length}`)
    
    // 4. Si no hay clases, crear algunas de ejemplo
    let classesToAdd = []
    
    if (existingClasses.length >= 2) {
      // Usar las primeras 2 clases existentes
      classesToAdd = existingClasses.slice(0, 2)
      console.log('✅ Usando clases existentes')
    } else {
      // Crear clases de ejemplo
      console.log('⚠️  No hay suficientes clases existentes, creando clases de ejemplo...')
      
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const dayAfter = new Date(today)
      dayAfter.setDate(dayAfter.getDate() + 2)
      
      // Crear clase 1
      const class1Id = uuidv4()
      const class1Date = tomorrow.toISOString().split('T')[0]
      await database.run(`
        INSERT INTO classes (
          id, title, type, coach_id, date, time, duration, max_capacity, current_bookings, status, description
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        class1Id,
        'Pilates Grupal',
        'group',
        coachId,
        class1Date,
        '10:00',
        60,
        9,
        0,
        'scheduled',
        'Clase de pilates grupal'
      ])
      classesToAdd.push({
        id: class1Id,
        title: 'Pilates Grupal',
        date: class1Date,
        time: '10:00',
        coach_name: coachName
      })
      
      // Crear clase 2
      const class2Id = uuidv4()
      const class2Date = dayAfter.toISOString().split('T')[0]
      await database.run(`
        INSERT INTO classes (
          id, title, type, coach_id, date, time, duration, max_capacity, current_bookings, status, description
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        class2Id,
        'Pilates Grupal',
        'group',
        coachId,
        class2Date,
        '18:00',
        60,
        9,
        0,
        'scheduled',
        'Clase de pilates grupal'
      ])
      classesToAdd.push({
        id: class2Id,
        title: 'Pilates Grupal',
        date: class2Date,
        time: '18:00',
        coach_name: coachName
      })
      
      console.log('✅ Clases creadas')
    }
    
    console.log('')
    console.log(`📦 Clases a agregar: ${classesToAdd.length}`)
    classesToAdd.forEach((cls, index) => {
      console.log(`   ${index + 1}. ${cls.title} - ${cls.date} ${cls.time}`)
    })
    console.log('')
    
    // 5. Agregar clases al historial del cliente
    console.log('🔧 Agregando clases al historial del cliente...')
    console.log('')
    
    const addedClasses = []
    for (const cls of classesToAdd) {
      try {
        // Verificar si la clase ya está en el historial
        const existing = await database.get(`
          SELECT * FROM class_history 
          WHERE user_id = ? AND class_id = ?
        `, [client.id, cls.id])
        
        if (existing) {
          console.log(`⚠️  Clase ${cls.title} (${cls.date} ${cls.time}) ya está en el historial`)
          continue
        }
        
        // Agregar al historial
        const classHistory = await database.addClassHistory({
          class_id: cls.id,
          user_id: client.id,
          class_name: cls.title || 'Pilates Grupal',
          class_date: cls.date,
          class_time: cls.time,
          coach_name: cls.coach_name || coachName,
          status: 'scheduled',
          cancellation_reason: null,
          notes: null
        })
        
        console.log(`✅ Clase agregada: ${cls.title} - ${cls.date} ${cls.time}`)
        addedClasses.push(classHistory)
        
        // Actualizar el conteo de la clase
        await database.run(`
          UPDATE classes 
          SET current_bookings = current_bookings + 1
          WHERE id = ?
        `, [cls.id])
        
      } catch (error) {
        console.error(`❌ Error agregando clase ${cls.title}:`, error.message)
      }
    }
    
    console.log('')
    console.log('✅ CLASES AGREGADAS EXITOSAMENTE')
    console.log(`   - Total de clases agregadas: ${addedClasses.length}`)
    console.log('')
    
    // 6. Verificar el historial de clases del cliente
    const clientClasses = await database.all(`
      SELECT * FROM class_history 
      WHERE user_id = ? 
      ORDER BY class_date DESC, class_time DESC
    `, [client.id])
    
    console.log(`📚 Historial de clases del cliente: ${clientClasses.length} clases`)
    clientClasses.forEach((cls, index) => {
      console.log(`   ${index + 1}. ${cls.class_name} - ${cls.class_date} ${cls.class_time} - Status: ${cls.status}`)
    })
    console.log('')
    console.log('✅ Proceso completado')

  } catch (error) {
    console.error('Error:', error)
  } finally {
    database.close()
  }
}

addClassesToClient()


