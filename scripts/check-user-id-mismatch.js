// Script para verificar si hay un problema con los IDs de usuario
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

async function checkUserIdMismatch() {
  try {
    console.log('=== VERIFICANDO PROBLEMA DE IDs ===\n')
    
    // Verificar el cliente con el email mqghux@gmail.com
    const clientEmail = 'mqghux@gmail.com'
    const client = await database.get('SELECT * FROM users WHERE correo = ?', [clientEmail])
    
    if (!client) {
      console.log(`❌ Cliente no encontrado con email: ${clientEmail}`)
      return
    }
    
    console.log(`✅ Cliente encontrado:`)
    console.log(`   - Nombre: ${client.nombre}`)
    console.log(`   - Email: ${client.correo}`)
    console.log(`   - ID: ${client.id}`)
    console.log(`   - Rol: ${client.role}`)
    console.log(`   - type_of_class: ${client.type_of_class}`)
    console.log(`   - expiration_date: ${client.expiration_date}`)
    console.log('')
    
    // Verificar el paquete huérfano
    const orphanPackageId = 'ec7f1b8d-348c-49e5-b2a5-e30666eabc0f'
    const orphanPackage = await database.get('SELECT * FROM package_history WHERE user_id = ?', [orphanPackageId])
    
    if (orphanPackage) {
      console.log(`⚠️  PAQUETE HUÉRFANO ENCONTRADO:`)
      console.log(`   - Package ID: ${orphanPackage.id}`)
      console.log(`   - Package user_id: ${orphanPackage.user_id}`)
      console.log(`   - Package name: ${orphanPackage.package_name}`)
      console.log(`   - Package status: ${orphanPackage.status}`)
      console.log(`   - Package end_date: ${orphanPackage.end_date}`)
      console.log('')
      
      // Verificar si existe un usuario con ese ID
      const orphanUser = await database.get('SELECT * FROM users WHERE id = ?', [orphanPackageId])
      if (orphanUser) {
        console.log(`   ✅ Usuario encontrado con ID ${orphanPackageId}:`)
        console.log(`      - Nombre: ${orphanUser.nombre}`)
        console.log(`      - Email: ${orphanUser.correo}`)
        console.log(`      - Rol: ${orphanUser.role}`)
        console.log('')
        console.log(`   ⚠️  PROBLEMA: El paquete está asignado a un usuario diferente`)
        console.log(`      - Cliente actual ID: ${client.id}`)
        console.log(`      - Paquete user_id: ${orphanPackage.user_id}`)
        console.log(`      - Usuario del paquete: ${orphanUser.nombre} (${orphanUser.correo})`)
      } else {
        console.log(`   ❌ NO existe un usuario con ID ${orphanPackageId}`)
        console.log(`   ⚠️  El paquete está asignado a un usuario que no existe`)
      }
    }
    
    // Verificar todos los paquetes del cliente actual
    console.log(`\n📦 PAQUETES DEL CLIENTE ACTUAL (${client.id}):`)
    const clientPackages = await database.all('SELECT * FROM package_history WHERE user_id = ? ORDER BY start_date DESC', [client.id])
    
    if (clientPackages.length > 0) {
      for (const pkg of clientPackages) {
        console.log(`   - ${pkg.package_name} - Status: ${pkg.status} - End date: ${pkg.end_date}`)
        console.log(`     Package ID: ${pkg.id}`)
        console.log(`     Package user_id: ${pkg.user_id}`)
      }
    } else {
      console.log(`   ⚠️  NO HAY PAQUETES para el cliente actual`)
    }
    
    // Verificar si el cliente debería tener el paquete huérfano
    if (orphanPackage && orphanPackage.status === 'active') {
      console.log(`\n💡 SOLUCIÓN: El paquete huérfano debería ser asignado al cliente actual`)
      console.log(`   - Paquete: ${orphanPackage.package_name}`)
      console.log(`   - Status: ${orphanPackage.status}`)
      console.log(`   - End date: ${orphanPackage.end_date}`)
      console.log(`   - Cliente actual debería tener este paquete: ${client.correo}`)
    }

  } catch (error) {
    console.error('Error al verificar IDs:', error)
  } finally {
    database.db.close()
  }
}

checkUserIdMismatch()



