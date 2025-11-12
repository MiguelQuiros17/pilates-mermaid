// Script para verificar paquetes activos en la base de datos
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
    const pkg = await this.get(`
      SELECT * FROM package_history 
      WHERE user_id = ? 
      AND status = "active"
      ORDER BY start_date DESC
      LIMIT 1
    `, [userId])
    return pkg
  }

  async getUserById(id) {
    return await this.get('SELECT * FROM users WHERE id = ?', [id])
  }
}

const database = new Database()

async function checkActivePackages() {
  try {
    console.log('=== VERIFICANDO PAQUETES ACTIVOS ===\n')
    
    // Obtener todos los clientes
    const clients = await database.getUsersByRole('cliente')
    console.log(`Total de clientes: ${clients.length}\n`)

    for (const client of clients) {
      console.log(`\n📋 Cliente: ${client.nombre} (${client.correo})`)
      console.log(`   ID: ${client.id}`)
      console.log(`   type_of_class: ${client.type_of_class || 'null'}`)
      console.log(`   expiration_date: ${client.expiration_date || 'null'}`)
      
      // Obtener historial de paquetes
      const packageHistory = await database.getPackageHistoryByUser(client.id)
      console.log(`   Historial de paquetes: ${packageHistory.length} registros`)
      
      if (packageHistory.length > 0) {
        console.log(`   Paquetes en historial:`)
        packageHistory.forEach((pkg, index) => {
          console.log(`     ${index + 1}. ${pkg.package_name} - Status: ${pkg.status} - End date: ${pkg.end_date}`)
        })
      }
      
      // Obtener paquete activo
      const activePackage = await database.getActivePackageByUser(client.id)
      if (activePackage) {
        console.log(`   ✅ PAQUETE ACTIVO ENCONTRADO:`)
        console.log(`      - Nombre: ${activePackage.package_name}`)
        console.log(`      - Status: ${activePackage.status}`)
        console.log(`      - Start date: ${activePackage.start_date}`)
        console.log(`      - End date: ${activePackage.end_date}`)
        console.log(`      - ID: ${activePackage.id}`)
        
        // Verificar fecha de expiración
        if (activePackage.end_date) {
          const dateParts = activePackage.end_date.split('-')
          let endDate
          if (dateParts.length === 3) {
            endDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]))
          } else {
            endDate = new Date(activePackage.end_date)
          }
          
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          endDate.setHours(0, 0, 0, 0)
          
          console.log(`      - Today: ${today.toISOString().split('T')[0]}`)
          console.log(`      - End date: ${endDate.toISOString().split('T')[0]}`)
          console.log(`      - Comparison: ${endDate >= today ? '✅ ACTIVO' : '❌ EXPIRADO'}`)
        }
      } else {
        console.log(`   ❌ NO HAY PAQUETE ACTIVO EN package_history`)
        
        // Verificar si el usuario tiene type_of_class y expiration_date
        if (client.type_of_class && client.type_of_class !== 'Sin paquete' && client.expiration_date) {
          console.log(`   ⚠️  PERO el usuario tiene type_of_class y expiration_date`)
          console.log(`      - type_of_class: ${client.type_of_class}`)
          console.log(`      - expiration_date: ${client.expiration_date}`)
        }
      }
    }

    console.log('\n=== FIN DE VERIFICACIÓN ===\n')

  } catch (error) {
    console.error('Error al verificar paquetes activos:', error)
  } finally {
    // Cerrar la base de datos
    database.db.close()
  }
}

checkActivePackages()




