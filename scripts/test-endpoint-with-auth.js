// Script para probar el endpoint con autenticación real
const http = require('http')
const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'pilates-mermaid-secret-key-2024'
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

async function testEndpointWithAuth() {
  try {
    console.log('=== PROBANDO ENDPOINT CON AUTENTICACIÓN ===\n')
    
    // Buscar el cliente
    const clientEmail = 'mqghux@gmail.com'
    const client = await database.get('SELECT * FROM users WHERE correo = ?', [clientEmail])
    
    if (!client) {
      console.log(`❌ Cliente no encontrado con email: ${clientEmail}`)
      return
    }
    
    console.log(`✅ Cliente encontrado:`)
    console.log(`   - ID: ${client.id}`)
    console.log(`   - Email: ${client.correo}`)
    console.log(`   - Rol: ${client.role}`)
    console.log('')
    
    // Generar token JWT para el cliente
    const token = jwt.sign(
      { 
        id: client.id, 
        email: client.correo, 
        role: client.role
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    )
    
    console.log(`🔑 Token generado para cliente`)
    console.log(`   - Token length: ${token.length}`)
    console.log('')
    
    // Hacer petición al endpoint
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: `/api/users/${client.id}/package-history`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
    
    console.log(`📡 Haciendo petición a: ${API_BASE_URL}${options.path}`)
    console.log(`   - Method: ${options.method}`)
    console.log(`   - Headers: Authorization: Bearer ${token.substring(0, 20)}...`)
    console.log('')
    
    const req = http.request(options, (res) => {
      console.log(`📥 Respuesta recibida:`)
      console.log(`   - Status: ${res.statusCode}`)
      console.log(`   - Status message: ${res.statusMessage}`)
      console.log('')
      
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data)
          console.log(`📦 Respuesta JSON:`)
          console.log(JSON.stringify(response, null, 2))
          console.log('')
          
          if (response.success) {
            console.log(`✅ Respuesta exitosa`)
            console.log(`   - Package history: ${response.packageHistory ? response.packageHistory.length : 0} items`)
            console.log(`   - Active package: ${response.activePackage ? 'YES' : 'NO'}`)
            
            if (response.activePackage) {
              console.log(`   - Active package name: ${response.activePackage.package_name}`)
              console.log(`   - Active package status: ${response.activePackage.status}`)
              console.log(`   - Active package end_date: ${response.activePackage.end_date}`)
              console.log('')
              console.log(`✅ El endpoint SÍ devuelve el paquete activo`)
              console.log(`   - El problema podría estar en el frontend`)
            } else {
              console.log('')
              console.log(`❌ El endpoint NO devuelve un paquete activo`)
              console.log(`   - Esto explica por qué el cliente ve "Sin Paquete Activo"`)
            }
          } else {
            console.log(`❌ Respuesta no exitosa: ${response.message}`)
          }
        } catch (error) {
          console.error('Error al parsear respuesta:', error)
          console.log('Respuesta raw:', data)
        }
        
        database.db.close()
      })
    })
    
    req.on('error', (error) => {
      console.error('Error en la petición:', error)
      database.db.close()
    })
    
    req.end()
    
  } catch (error) {
    console.error('Error al probar endpoint:', error)
    database.db.close()
  }
}

testEndpointWithAuth()



