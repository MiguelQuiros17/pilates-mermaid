// Script para actualizar la información del paquete del usuario en la tabla users
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

  async run(sql, params = []) {
    const run = promisify(this.db.run.bind(this.db))
    return await run(sql, params)
  }
}

const database = new Database()

async function updateUserPackageInfo() {
  try {
    console.log('=== ACTUALIZANDO INFORMACIÓN DEL PAQUETE DEL USUARIO ===\n')
    
    // Buscar el cliente con el email mqghux@gmail.com
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
    console.log(`   - type_of_class (actual): ${client.type_of_class}`)
    console.log(`   - expiration_date (actual): ${client.expiration_date}`)
    console.log('')
    
    // Obtener el paquete activo del cliente
    const activePackage = await database.get(`
      SELECT * FROM package_history 
      WHERE user_id = ? 
      AND status = "active"
      ORDER BY start_date DESC
      LIMIT 1
    `, [client.id])
    
    if (!activePackage) {
      console.log(`❌ No se encontró un paquete activo para el cliente`)
      return
    }
    
    console.log(`✅ Paquete activo encontrado:`)
    console.log(`   - Package name: ${activePackage.package_name}`)
    console.log(`   - Package type: ${activePackage.package_type}`)
    console.log(`   - End date: ${activePackage.end_date}`)
    console.log('')
    
    // Verificar si la información del usuario coincide con el paquete
    if (client.type_of_class !== activePackage.package_name || client.expiration_date !== activePackage.end_date) {
      console.log(`⚠️  La información del usuario NO coincide con el paquete activo`)
      console.log(`   - Usuario type_of_class: ${client.type_of_class}`)
      console.log(`   - Paquete package_name: ${activePackage.package_name}`)
      console.log(`   - Usuario expiration_date: ${client.expiration_date}`)
      console.log(`   - Paquete end_date: ${activePackage.end_date}`)
      console.log('')
      
      // Actualizar la información del usuario
      console.log(`🔧 Actualizando información del usuario...`)
      await database.run(`
        UPDATE users 
        SET type_of_class = ?, expiration_date = ?
        WHERE id = ?
      `, [activePackage.package_name, activePackage.end_date, client.id])
      
      console.log(`   ✅ Usuario actualizado:`)
      console.log(`      - type_of_class: ${activePackage.package_name}`)
      console.log(`      - expiration_date: ${activePackage.end_date}`)
    } else {
      console.log(`✅ La información del usuario YA coincide con el paquete activo`)
    }

  } catch (error) {
    console.error('Error al actualizar información del usuario:', error)
  } finally {
    database.db.close()
  }
}

updateUserPackageInfo()



