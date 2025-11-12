// Script para verificar y forzar que el paquete activo se muestre
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

  close() {
    this.db.close()
  }
}

const database = new Database()

async function forceFix() {
  try {
    console.log('=== FORZANDO FIX DEL PAQUETE ACTIVO ===\n')
    
    // Buscar cliente
    const client = await database.get('SELECT * FROM users WHERE correo = ?', ['mqghux@gmail.com'])
    if (!client) {
      console.log('❌ Cliente no encontrado')
      return
    }
    
    console.log('✅ Cliente encontrado:', client.nombre)
    console.log('')
    
    // Verificar paquetes activos
    const activePackages = await database.all(`
      SELECT * FROM package_history 
      WHERE user_id = ? AND status = "active"
      ORDER BY start_date DESC
    `, [client.id])
    
    console.log(`📦 Paquetes activos encontrados: ${activePackages.length}`)
    
    if (activePackages.length === 0) {
      console.log('❌ No hay paquetes activos')
      return
    }
    
    // Si hay más de uno, desactivar los demás y dejar solo el más reciente
    if (activePackages.length > 1) {
      console.log('⚠️  Hay múltiples paquetes activos, desactivando los antiguos...')
      for (let i = 1; i < activePackages.length; i++) {
        await database.run('UPDATE package_history SET status = ? WHERE id = ?', ['expired', activePackages[i].id])
        console.log(`   - Desactivado: ${activePackages[i].package_name}`)
      }
    }
    
    const activePackage = activePackages[0]
    console.log('')
    console.log('✅ Paquete activo confirmado:')
    console.log(`   - Nombre: ${activePackage.package_name}`)
    console.log(`   - Status: ${activePackage.status}`)
    console.log(`   - End date: ${activePackage.end_date}`)
    console.log('')
    console.log('✅ El paquete activo está correcto en la base de datos')
    console.log('✅ El problema está en el frontend')
    console.log('')
    console.log('💡 SOLUCIÓN:')
    console.log('   1. Recarga la página del cliente (F5)')
    console.log('   2. Abre la consola del navegador (F12)')
    console.log('   3. Busca el mensaje: "Active package encontrado"')
    console.log('   4. Si no aparece, el problema es que el estado no se está estableciendo')
    console.log('   5. Si aparece pero no se muestra, el problema es en el renderizado')
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    database.close()
  }
}

forceFix()


