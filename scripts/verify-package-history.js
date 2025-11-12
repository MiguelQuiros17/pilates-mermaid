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
}

const database = new Database()

async function verifyPackageHistory() {
  try {
    console.log('Verificando paquetes en la base de datos...\n')
    
    // Obtener todos los clientes
    const clients = await database.getUsersByRole('cliente')
    console.log(`Total de clientes: ${clients.length}\n`)
    
    let clientsWithPackage = 0
    let clientsWithoutHistory = 0
    let clientsWithActivePackage = 0
    
    for (const client of clients) {
      if (client.type_of_class && client.type_of_class !== 'Sin paquete') {
        clientsWithPackage++
        
        // Verificar si tiene registro en package_history
        const packageHistory = await database.getPackageHistoryByUser(client.id)
        const activePackage = await database.getActivePackageByUser(client.id)
        
        if (packageHistory.length === 0) {
          clientsWithoutHistory++
          console.log(`❌ Cliente sin historial: ${client.nombre} (${client.correo})`)
          console.log(`   - type_of_class: ${client.type_of_class}`)
          console.log(`   - expiration_date: ${client.expiration_date}`)
          console.log('')
        } else {
          console.log(`✅ Cliente con historial: ${client.nombre} (${client.correo})`)
          console.log(`   - type_of_class: ${client.type_of_class}`)
          console.log(`   - expiration_date: ${client.expiration_date}`)
          console.log(`   - Registros en historial: ${packageHistory.length}`)
          if (activePackage) {
            clientsWithActivePackage++
            console.log(`   - Paquete activo: ${activePackage.package_name} (${activePackage.status})`)
          } else {
            console.log(`   - ⚠️  Sin paquete activo en historial`)
          }
          console.log('')
        }
      }
    }
    
    console.log('\n=== RESUMEN ===')
    console.log(`Clientes con paquete asignado: ${clientsWithPackage}`)
    console.log(`Clientes sin historial: ${clientsWithoutHistory}`)
    console.log(`Clientes con paquete activo: ${clientsWithActivePackage}`)
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    process.exit(0)
  }
}

verifyPackageHistory()

