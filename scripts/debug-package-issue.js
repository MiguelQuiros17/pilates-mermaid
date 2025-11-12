// Script para debuggear el problema del paquete activo
const path = require('path')
const sqlite3 = require('sqlite3')
const { promisify } = require('util')
const jwt = require('jsonwebtoken')
const http = require('http')

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

  async run(sql, params = []) {
    const run = promisify(this.db.run.bind(this.db))
    return await run(sql, params)
  }

  close() {
    this.db.close()
  }
}

const database = new Database()

async function debugPackageIssue() {
  try {
    console.log('=== DEBUGGING PACKAGE ISSUE ===\n')
    
    // 1. Buscar el cliente
    const clientEmail = 'mqghux@gmail.com'
    const client = await database.get('SELECT * FROM users WHERE correo = ?', [clientEmail])
    
    if (!client) {
      console.log(`❌ Cliente no encontrado con email: ${clientEmail}`)
      return
    }
    
    console.log(`✅ Cliente encontrado:`)
    console.log(`   - ID: ${client.id}`)
    console.log(`   - Email: ${client.correo}`)
    console.log(`   - Nombre: ${client.nombre}`)
    console.log(`   - type_of_class: ${client.type_of_class}`)
    console.log(`   - expiration_date: ${client.expiration_date}`)
    console.log('')
    
    // 2. Verificar paquetes en la base de datos
    const packages = await database.all('SELECT * FROM package_history WHERE user_id = ? ORDER BY start_date DESC', [client.id])
    console.log(`📦 Paquetes en la base de datos: ${packages.length}`)
    packages.forEach((pkg, index) => {
      console.log(`   ${index + 1}. ${pkg.package_name} - Status: ${pkg.status} - End date: ${pkg.end_date}`)
    })
    console.log('')
    
    // 3. Verificar paquete activo usando getActivePackageByUser
    const activePackage = await database.get(`
      SELECT * FROM package_history 
      WHERE user_id = ? 
      AND status = "active"
      ORDER BY start_date DESC
      LIMIT 1
    `, [client.id])
    
    console.log(`📦 Paquete activo en la base de datos:`)
    if (activePackage) {
      console.log(`   ✅ ENCONTRADO:`)
      console.log(`   - ID: ${activePackage.id}`)
      console.log(`   - Nombre: ${activePackage.package_name}`)
      console.log(`   - Status: ${activePackage.status}`)
      console.log(`   - End date: ${activePackage.end_date}`)
      console.log(`   - User ID: ${activePackage.user_id}`)
      console.log(`   - Match con cliente: ${activePackage.user_id === client.id ? '✅ SÍ' : '❌ NO'}`)
    } else {
      console.log(`   ❌ NO ENCONTRADO`)
    }
    console.log('')
    
    // 4. Probar el endpoint directamente
    console.log(`🔍 Probando endpoint GET /api/users/${client.id}/package-history`)
    console.log('')
    
    // Generar token
    const token = jwt.sign(
      { 
        id: client.id, 
        email: client.correo, 
        role: client.role
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    )
    
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
    
    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        console.log(`📥 Respuesta del servidor:`)
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
                console.log(`   ✅ PAQUETE ACTIVO ENCONTRADO:`)
                console.log(`      - Nombre: ${response.activePackage.package_name}`)
                console.log(`      - Status: ${response.activePackage.status}`)
                console.log(`      - End date: ${response.activePackage.end_date}`)
                console.log('')
                console.log(`   💡 El endpoint SÍ devuelve el paquete activo`)
                console.log(`   💡 El problema está en el frontend`)
              } else {
                console.log('')
                console.log(`   ❌ NO HAY PAQUETE ACTIVO EN LA RESPUESTA`)
                console.log(`   💡 El problema está en el backend`)
                console.log('')
                console.log(`   🔍 Verificando por qué no se devuelve el paquete activo...`)
                
                // Verificar si hay un paquete activo pero no se está devolviendo
                if (activePackage) {
                  console.log(`   ⚠️  Hay un paquete activo en la BD pero no se devuelve`)
                  console.log(`   ⚠️  Posible problema en la lógica del endpoint`)
                } else {
                  console.log(`   ⚠️  No hay paquete activo en la BD`)
                  console.log(`   💡 Necesitamos crear uno o verificar por qué no existe`)
                }
              }
            } else {
              console.log(`❌ Respuesta no exitosa: ${response.message}`)
            }
            
            resolve()
          } catch (error) {
            console.error('❌ Error al parsear respuesta:', error)
            console.log('Respuesta raw:', data)
            reject(error)
          }
        })
      })
      
      req.on('error', (error) => {
        console.error('❌ Error en la petición:', error)
        reject(error)
      })
      
      req.end()
    })
    
  } catch (error) {
    console.error('Error al debuggear:', error)
  } finally {
    database.close()
  }
}

debugPackageIssue()


