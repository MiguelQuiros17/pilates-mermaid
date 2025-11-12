// Script para resetear la contraseña del cliente
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

async function resetClientPassword() {
  try {
    console.log('=== RESETEANDO CONTRASEÑA DEL CLIENTE ===\n')
    
    const clientEmail = 'mqghux@gmail.com'
    const newPassword = 'cliente123'
    
    // Buscar el cliente
    const client = await database.get('SELECT * FROM users WHERE correo = ?', [clientEmail])
    
    if (!client) {
      console.log(`❌ Cliente no encontrado: ${clientEmail}`)
      return
    }
    
    console.log(`✅ Cliente encontrado: ${client.nombre}`)
    
    // Generar hash de la nueva contraseña
    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(newPassword, salt)
    
    // Actualizar la contraseña
    await database.run(
      'UPDATE users SET password_hash = ? WHERE correo = ?',
      [passwordHash, clientEmail]
    )
    
    console.log(`\n✅ Contraseña actualizada exitosamente`)
    console.log(`\n📝 CREDENCIALES:`)
    console.log(`   - Email: ${clientEmail}`)
    console.log(`   - Contraseña: ${newPassword}`)
    console.log(`\n🔐 Ahora puedes iniciar sesión con estas credenciales`)

  } catch (error) {
    console.error('Error al resetear contraseña:', error)
  } finally {
    database.db.close()
  }
}

resetClientPassword()


