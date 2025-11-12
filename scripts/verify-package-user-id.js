// Script para verificar que el user_id del paquete coincide con el ID del cliente
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

  async get(sql, params = []) {
    const get = promisify(this.db.get.bind(this.db))
    return await get(sql, params)
  }

  async all(sql, params = []) {
    const all = promisify(this.db.all.bind(this.db))
    return await all(sql, params)
  }
}

const database = new Database()

async function verifyPackageUserIds() {
  try {
    console.log('=== VERIFICANDO USER_ID DE PAQUETES ===\n')
    
    // Obtener todos los clientes
    const clients = await database.all('SELECT id, nombre, correo, role FROM users WHERE role = "cliente"')
    
    console.log(`Total de clientes: ${clients.length}\n`)
    
    for (const client of clients) {
      console.log(`📋 Cliente: ${client.nombre} (${client.correo})`)
      console.log(`   ID: ${client.id}`)
      
      // Obtener todos los paquetes de este cliente
      const packages = await database.all('SELECT * FROM package_history WHERE user_id = ? ORDER BY start_date DESC', [client.id])
      
      console.log(`   Historial de paquetes: ${packages.length} registros`)
      
      if (packages.length > 0) {
        console.log(`   Paquetes en historial:`)
        for (const pkg of packages) {
          console.log(`     - ${pkg.package_name} - Status: ${pkg.status} - End date: ${pkg.end_date}`)
          console.log(`       Package ID: ${pkg.id}`)
          console.log(`       Package user_id: ${pkg.user_id}`)
          console.log(`       User ID match: ${pkg.user_id === client.id ? '✅ SÍ' : '❌ NO'}`)
          
          if (pkg.user_id !== client.id) {
            console.log(`       ⚠️  PROBLEMA: El user_id del paquete (${pkg.user_id}) NO coincide con el ID del cliente (${client.id})`)
          }
        }
        
        // Obtener paquete activo
        const activePackage = await database.get(`
          SELECT * FROM package_history 
          WHERE user_id = ? 
          AND status = "active"
          ORDER BY start_date DESC
          LIMIT 1
        `, [client.id])
        
        if (activePackage) {
          console.log(`   ✅ PAQUETE ACTIVO ENCONTRADO:`)
          console.log(`      - Nombre: ${activePackage.package_name}`)
          console.log(`      - Status: ${activePackage.status}`)
          console.log(`      - Start date: ${activePackage.start_date}`)
          console.log(`      - End date: ${activePackage.end_date}`)
          console.log(`      - Package ID: ${activePackage.id}`)
          console.log(`      - Package user_id: ${activePackage.user_id}`)
          console.log(`      - Client ID: ${client.id}`)
          console.log(`      - User ID match: ${activePackage.user_id === client.id ? '✅ SÍ' : '❌ NO'}`)
        } else {
          console.log(`   ⚠️  NO HAY PAQUETE ACTIVO`)
        }
      } else {
        console.log(`   ⚠️  NO HAY PAQUETES EN EL HISTORIAL`)
      }
      
      console.log('')
    }
    
    // Verificar si hay paquetes huérfanos (paquetes sin cliente)
    const orphanPackages = await database.all(`
      SELECT ph.*, u.id as user_exists
      FROM package_history ph
      LEFT JOIN users u ON ph.user_id = u.id
      WHERE u.id IS NULL
    `)
    
    if (orphanPackages.length > 0) {
      console.log(`⚠️  PAQUETES HUÉRFANOS ENCONTRADOS (sin cliente): ${orphanPackages.length}`)
      for (const pkg of orphanPackages) {
        console.log(`   - Package ID: ${pkg.id}, user_id: ${pkg.user_id}, nombre: ${pkg.package_name}`)
      }
    } else {
      console.log(`✅ NO HAY PAQUETES HUÉRFANOS`)
    }

  } catch (error) {
    console.error('Error al verificar user_id de paquetes:', error)
  } finally {
    database.db.close()
  }
}

verifyPackageUserIds()

