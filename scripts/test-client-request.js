// Script para simular la petición del cliente al endpoint de package-history
const path = require('path')
const sqlite3 = require('sqlite3')
const { promisify } = require('util')
const jwt = require('jsonwebtoken')

const DB_PATH = path.join(process.cwd(), 'data', 'pilates_mermaid.db')
const JWT_SECRET = process.env.JWT_SECRET || 'pilates-mermaid-secret-key-2024'

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

async function testClientRequest() {
  try {
    console.log('=== SIMULANDO PETICIÓN DEL CLIENTE ===\n')
    
    // Buscar el cliente
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
    
    // Simular lo que hace el endpoint
    console.log(`📦 Simulando endpoint GET /api/users/${client.id}/package-history`)
    console.log('')
    
    // Obtener historial de paquetes
    const packageHistory = await database.all('SELECT * FROM package_history WHERE user_id = ? ORDER BY start_date DESC', [client.id])
    console.log(`   - Package history count: ${packageHistory.length}`)
    
    // Obtener paquete activo
    const activePackage = await database.get(`
      SELECT * FROM package_history 
      WHERE user_id = ? 
      AND status = "active"
      ORDER BY start_date DESC
      LIMIT 1
    `, [client.id])
    
    console.log(`   - Active package found: ${activePackage ? 'YES' : 'NO'}`)
    
    if (activePackage) {
      console.log(`   - Active package: ${activePackage.package_name}`)
      console.log(`   - Status: ${activePackage.status}`)
      console.log(`   - End date: ${activePackage.end_date}`)
      console.log(`   - Package ID: ${activePackage.id}`)
      console.log(`   - Package user_id: ${activePackage.user_id}`)
      console.log(`   - Client ID: ${client.id}`)
      console.log(`   - User ID match: ${activePackage.user_id === client.id ? '✅ SÍ' : '❌ NO'}`)
      
      // Verificar si el status es 'active'
      if (activePackage.status === 'active') {
        console.log(`   - ✅ Package status is 'active' - should be returned`)
      } else {
        console.log(`   - ❌ Package status is '${activePackage.status}' - will NOT be returned`)
      }
    } else {
      console.log(`   - ⚠️  NO HAY PAQUETE ACTIVO`)
    }
    
    console.log('')
    console.log(`📤 RESPUESTA SIMULADA:`)
    const response = {
      success: true,
      packageHistory: packageHistory || [],
      activePackage: activePackage || null
    }
    console.log(JSON.stringify(response, null, 2))
    
    console.log('')
    if (response.activePackage) {
      console.log(`✅ El endpoint DEBERÍA devolver el paquete activo`)
    } else {
      console.log(`❌ El endpoint NO devolverá un paquete activo`)
      console.log(`   - Esto explica por qué el cliente ve "Sin Paquete Activo"`)
    }

  } catch (error) {
    console.error('Error al simular petición:', error)
  } finally {
    database.db.close()
  }
}

testClientRequest()


