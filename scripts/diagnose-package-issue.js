// Script de diagnóstico completo para el problema del paquete activo
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

  close() {
    this.db.close()
  }
}

const database = new Database()

async function diagnose() {
  try {
    console.log('=== DIAGNÓSTICO COMPLETO DEL PROBLEMA ===\n')
    
    // 1. Verificar cliente
    const clientEmail = 'mqghux@gmail.com'
    const client = await database.get('SELECT * FROM users WHERE correo = ?', [clientEmail])
    
    if (!client) {
      console.log('❌ Cliente no encontrado')
      return
    }
    
    console.log('✅ Cliente encontrado:')
    console.log(`   ID: ${client.id}`)
    console.log(`   Email: ${client.correo}`)
    console.log(`   type_of_class: ${client.type_of_class}`)
    console.log(`   expiration_date: ${client.expiration_date}`)
    console.log('')
    
    // 2. Verificar paquetes en BD
    const packages = await database.all('SELECT * FROM package_history WHERE user_id = ? ORDER BY start_date DESC', [client.id])
    console.log(`📦 Paquetes en BD: ${packages.length}`)
    packages.forEach((pkg, i) => {
      console.log(`   ${i + 1}. ${pkg.package_name} - Status: ${pkg.status} - End: ${pkg.end_date}`)
    })
    console.log('')
    
    // 3. Verificar paquete activo
    const activePackage = await database.get(`
      SELECT * FROM package_history 
      WHERE user_id = ? AND status = "active"
      ORDER BY start_date DESC
      LIMIT 1
    `, [client.id])
    
    if (activePackage) {
      console.log('✅ Paquete activo encontrado en BD:')
      console.log(`   ID: ${activePackage.id}`)
      console.log(`   Nombre: ${activePackage.package_name}`)
      console.log(`   Status: ${activePackage.status}`)
      console.log(`   End date: ${activePackage.end_date}`)
    } else {
      console.log('❌ NO hay paquete activo en BD')
    }
    console.log('')
    
    // 4. Probar endpoint
    console.log('🔍 Probando endpoint...')
    const token = jwt.sign({ id: client.id, email: client.correo, role: client.role }, JWT_SECRET, { expiresIn: '7d' })
    
    return new Promise((resolve) => {
      const req = http.request({
        hostname: 'localhost',
        port: 3001,
        path: `/api/users/${client.id}/package-history`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      }, (res) => {
        let data = ''
        res.on('data', chunk => data += chunk)
        res.on('end', () => {
          try {
            const response = JSON.parse(data)
            console.log('📥 Respuesta del endpoint:')
            console.log(`   Status: ${res.statusCode}`)
            console.log(`   Success: ${response.success}`)
            console.log(`   Package history: ${response.packageHistory?.length || 0} items`)
            console.log(`   Active package: ${response.activePackage ? 'YES' : 'NO'}`)
            
            if (response.activePackage) {
              console.log('✅ El endpoint SÍ devuelve el paquete activo')
              console.log(`   Nombre: ${response.activePackage.package_name}`)
              console.log(`   Status: ${response.activePackage.status}`)
            } else {
              console.log('❌ El endpoint NO devuelve el paquete activo')
            }
            
            console.log('')
            console.log('💡 CONCLUSIÓN:')
            if (response.activePackage) {
              console.log('   - El backend funciona correctamente')
              console.log('   - El problema está en el frontend')
              console.log('   - Necesitamos forzar el renderizado del paquete activo')
            } else {
              console.log('   - El backend no está devolviendo el paquete activo')
              console.log('   - Necesitamos revisar la lógica del endpoint')
            }
            
            resolve()
          } catch (e) {
            console.error('Error:', e)
            resolve()
          }
        })
      })
      
      req.on('error', (e) => {
        console.error('Error en petición:', e.message)
        resolve()
      })
      
      req.end()
    })
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    database.close()
  }
}

diagnose()


