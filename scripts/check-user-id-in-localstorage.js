// Script para verificar qué ID debería tener el usuario en localStorage
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
}

const database = new Database()

async function checkUserIdInLocalStorage() {
  try {
    console.log('=== VERIFICANDO ID DEL USUARIO PARA LOCALSTORAGE ===\n')
    
    // Buscar el cliente con el email mqghux@gmail.com
    const clientEmail = 'mqghux@gmail.com'
    const client = await database.get('SELECT * FROM users WHERE correo = ?', [clientEmail])
    
    if (!client) {
      console.log(`❌ Cliente no encontrado con email: ${clientEmail}`)
      return
    }
    
    console.log(`✅ Cliente encontrado:`)
    console.log(`   - ID: ${client.id}`)
    console.log(`   - Nombre: ${client.nombre}`)
    console.log(`   - Email: ${client.correo}`)
    console.log(`   - Rol: ${client.role}`)
    console.log('')
    
    // Verificar el paquete activo
    const activePackage = await database.get(`
      SELECT * FROM package_history 
      WHERE user_id = ? 
      AND status = "active"
      ORDER BY start_date DESC
      LIMIT 1
    `, [client.id])
    
    if (activePackage) {
      console.log(`✅ Paquete activo encontrado:`)
      console.log(`   - Package ID: ${activePackage.id}`)
      console.log(`   - Package user_id: ${activePackage.user_id}`)
      console.log(`   - Package name: ${activePackage.package_name}`)
      console.log(`   - Package status: ${activePackage.status}`)
      console.log(`   - Package end_date: ${activePackage.end_date}`)
      console.log(`   - User ID match: ${activePackage.user_id === client.id ? '✅ SÍ' : '❌ NO'}`)
    } else {
      console.log(`❌ No hay paquete activo para el cliente`)
    }
    
    console.log('')
    console.log(`📝 INFORMACION PARA LOCALSTORAGE:`)
    console.log(`   El usuario deberia tener este ID en localStorage:`)
    console.log(`   - ID: ${client.id}`)
    console.log(`   - Email: ${client.correo}`)
    console.log(`   - Nombre: ${client.nombre}`)
    console.log(`   - Rol: ${client.role}`)
    console.log('')
    console.log(`💡 PARA VERIFICAR:`)
    console.log(`   1. Abre la consola del navegador (F12)`)
    console.log(`   2. Ejecuta: localStorage.getItem('user')`)
    console.log(`   3. Compara el ID con: ${client.id}`)
    console.log(`   4. Si son diferentes, ese es el problema`)

  } catch (error) {
    console.error('Error al verificar ID del usuario:', error)
  } finally {
    database.db.close()
  }
}

checkUserIdInLocalStorage()



