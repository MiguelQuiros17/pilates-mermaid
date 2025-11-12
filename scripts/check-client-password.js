// Script para verificar la contraseña del cliente
const path = require('path')
const sqlite3 = require('sqlite3')
const { promisify } = require('util')
const bcrypt = require('bcryptjs')

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

async function checkClientPassword() {
  try {
    console.log('=== VERIFICANDO CONTRASEÑA DEL CLIENTE ===\n')
    
    const clientEmail = 'mqghux@gmail.com'
    
    // Buscar el cliente
    const client = await database.get('SELECT * FROM users WHERE correo = ?', [clientEmail])
    
    if (!client) {
      console.log(`❌ Cliente no encontrado: ${clientEmail}`)
      return
    }
    
    console.log(`✅ Cliente encontrado:`)
    console.log(`   - Nombre: ${client.nombre}`)
    console.log(`   - Email: ${client.correo}`)
    console.log(`   - Rol: ${client.role}`)
    console.log(`   - Tiene contraseña: ${client.password_hash ? 'SI' : 'NO'}`)
    
    // Probar contraseñas comunes
    const commonPasswords = [
      'cliente123',
      'password123',
      '123456',
      'mqghux123',
      'miguel123',
      'password',
      'cliente',
      'test123'
    ]
    
    if (client.password_hash) {
      console.log(`\n🔍 Probando contraseñas comunes...`)
      let found = false
      
      for (const password of commonPasswords) {
        const match = await bcrypt.compare(password, client.password_hash)
        if (match) {
          console.log(`\n✅ CONTRASEÑA ENCONTRADA: ${password}`)
          found = true
          break
        }
      }
      
      if (!found) {
        console.log(`\n❌ Ninguna contraseña común funciona`)
        console.log(`\n💡 OPCIONES:`)
        console.log(`   1. Usar "Olvidé mi contraseña" en el login`)
        console.log(`   2. Iniciar sesión como admin y resetear la contraseña`)
        console.log(`   3. Crear una nueva contraseña usando bcrypt`)
      }
    } else {
      console.log(`\n⚠️  El cliente no tiene contraseña`)
      console.log(`\n💡 Necesitas crear una contraseña para el cliente`)
    }

  } catch (error) {
    console.error('Error al verificar contraseña:', error)
  } finally {
    database.db.close()
  }
}

checkClientPassword()



