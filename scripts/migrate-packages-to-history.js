// Importar database igual que en server/index.js
const path = require('path')
const sqlite3 = require('sqlite3')
const { promisify } = require('util')

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

  async run(sql, params = []) {
    const run = promisify(this.db.run.bind(this.db))
    return await run(sql, params)
  }

  async get(sql, params = []) {
    const get = promisify(this.db.get.bind(this.db))
    return await get(sql, params)
  }

  async all(sql, params = []) {
    const all = promisify(this.db.all.bind(this.db))
    return await all(sql, params)
  }

  async getUsersByRole(role) {
    return await this.all('SELECT * FROM users WHERE role = ? ORDER BY created_at DESC', [role])
  }

  async getPackageHistoryByUser(userId) {
    return await this.all('SELECT * FROM package_history WHERE user_id = ? ORDER BY start_date DESC', [userId])
  }

  async getActivePackageByUser(userId) {
    return await this.get('SELECT * FROM package_history WHERE user_id = ? AND status = "active" ORDER BY start_date DESC LIMIT 1', [userId])
  }

  async getUserById(id) {
    return await this.get('SELECT * FROM users WHERE id = ?', [id])
  }

  async addPackageHistory(packageHistory) {
    const id = require('uuid').v4()
    
    await this.run(`
      INSERT INTO package_history (
        id, user_id, package_name, package_type, classes_included, start_date, end_date, payment_method, amount_paid, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, packageHistory.user_id, packageHistory.package_name, packageHistory.package_type,
      packageHistory.classes_included, packageHistory.start_date, packageHistory.end_date,
      packageHistory.payment_method, packageHistory.amount_paid, packageHistory.status
    ])
    
    return this.get('SELECT * FROM package_history WHERE id = ?', [id])
  }

  async updatePackageStatus(id, status) {
    await this.run(`
      UPDATE package_history 
      SET status = ?, updated_at = datetime('now')
      WHERE id = ?
    `, [status, id])
    
    return this.get('SELECT * FROM package_history WHERE id = ?', [id])
  }
}

const database = new Database()

// Mapeo de tipos de paquetes
const packageMapping = {
  'Clase Prueba': { name: 'Clase Prueba', type: 'Clase Prueba', classes_included: 1 },
  '1 Clase Grupal': { name: '1 Clase Grupal', type: '1 Clase Grupal', classes_included: 1 },
  '4 Clases Grupales': { name: '4 Clases Grupales', type: '4 Clases Grupales', classes_included: 4 },
  '8 Clases Grupales': { name: '8 Clases Grupales', type: '8 Clases Grupales', classes_included: 8 },
  '12 Clases Grupales': { name: '12 Clases Grupales', type: '12 Clases Grupales', classes_included: 12 },
  'Clases Grupales Ilimitadas': { name: 'Clases Grupales Ilimitadas', type: 'Clases Grupales Ilimitadas', classes_included: 999 },
  '1 Clase Privada': { name: '1 Clase Privada', type: '1 Clase Privada', classes_included: 1 },
  '4 Clases Privadas': { name: '4 Clases Privadas', type: '4 Clases Privadas', classes_included: 4 },
  '8 Clases Privadas': { name: '8 Clases Privadas', type: '8 Clases Privadas', classes_included: 8 },
  '12 Clases Privadas': { name: '12 Clases Privadas', type: '12 Clases Privadas', classes_included: 12 },
  '15 Clases Privadas': { name: '15 Clases Privadas', type: '15 Clases Privadas', classes_included: 15 },
  '20 Clases Privadas': { name: '20 Clases Privadas', type: '20 Clases Privadas', classes_included: 20 }
}

async function migratePackages() {
  try {
    console.log('Migrando paquetes a package_history...\n')
    
    // Obtener todos los clientes
    const clients = await database.getUsersByRole('cliente')
    console.log(`Total de clientes: ${clients.length}\n`)
    
    let migrated = 0
    let skipped = 0
    let errors = 0
    
    for (const client of clients) {
      if (!client.type_of_class || client.type_of_class === 'Sin paquete') {
        skipped++
        continue
      }
      
      // Verificar si ya tiene registro en package_history
      const packageHistory = await database.getPackageHistoryByUser(client.id)
      const activePackage = await database.getActivePackageByUser(client.id)
      
      if (activePackage) {
        console.log(`⏭️  Cliente ${client.nombre} ya tiene paquete activo: ${activePackage.package_name}`)
        skipped++
        continue
      }
      
      // Obtener información del paquete
      const packageInfo = packageMapping[client.type_of_class]
      if (!packageInfo) {
        console.log(`⚠️  Tipo de paquete no reconocido para ${client.nombre}: ${client.type_of_class}`)
        errors++
        continue
      }
      
      // Calcular fechas
      const today = new Date()
      const expirationDate = client.expiration_date ? new Date(client.expiration_date) : null
      
      // Si no hay fecha de expiración, usar 30 días desde hoy
      let startDate = today
      let endDate = expirationDate || new Date()
      if (!expirationDate) {
        endDate.setDate(endDate.getDate() + 30)
      } else {
        // Si la fecha de expiración es futura, usar hoy como inicio
        if (expirationDate > today) {
          startDate = today
          endDate = expirationDate
        } else {
          // Si ya expiró, usar fecha de expiración como inicio y 30 días después
          startDate = expirationDate
          endDate = new Date(expirationDate)
          endDate.setDate(endDate.getDate() + 30)
        }
      }
      
      // Determinar si el paquete está activo
      const isActive = endDate >= today
      const status = isActive ? 'active' : 'expired'
      
      // Desactivar paquetes anteriores si hay uno activo
      if (isActive) {
        const existingActive = await database.getActivePackageByUser(client.id)
        if (existingActive) {
          await database.updatePackageStatus(existingActive.id, 'expired')
        }
      }
      
      // Crear registro en package_history
      try {
        await database.addPackageHistory({
          user_id: client.id,
          package_name: packageInfo.name,
          package_type: packageInfo.type,
          classes_included: packageInfo.classes_included,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          payment_method: 'N/A',
          amount_paid: 0,
          status: status
        })
        
        console.log(`✅ Migrado: ${client.nombre} - ${packageInfo.name} (${status})`)
        migrated++
      } catch (error) {
        console.error(`❌ Error migrando ${client.nombre}:`, error.message)
        errors++
      }
    }
    
    console.log('\n=== RESUMEN ===')
    console.log(`Migrados: ${migrated}`)
    console.log(`Omitidos: ${skipped}`)
    console.log(`Errores: ${errors}`)
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    process.exit(0)
  }
}

migratePackages()

