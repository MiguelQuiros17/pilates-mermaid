// Script para asignar el paquete huérfano al cliente correcto
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

async function fixOrphanPackage() {
  try {
    console.log('=== CORRIGIENDO PAQUETE HUÉRFANO ===\n')
    
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
    console.log('')
    
    // Buscar el paquete huérfano
    const orphanPackageId = 'c048a56f-2329-4624-9c50-11e3d89d3dbf'
    const orphanPackage = await database.get('SELECT * FROM package_history WHERE id = ?', [orphanPackageId])
    
    if (!orphanPackage) {
      console.log(`❌ Paquete huérfano no encontrado`)
      return
    }
    
    console.log(`⚠️  PAQUETE HUÉRFANO ENCONTRADO:`)
    console.log(`   - Package ID: ${orphanPackage.id}`)
    console.log(`   - Package user_id (actual): ${orphanPackage.user_id}`)
    console.log(`   - Package name: ${orphanPackage.package_name}`)
    console.log(`   - Package status: ${orphanPackage.status}`)
    console.log(`   - Package end_date: ${orphanPackage.end_date}`)
    console.log('')
    
    // Verificar si el cliente ya tiene un paquete activo
    const activePackage = await database.get(`
      SELECT * FROM package_history 
      WHERE user_id = ? 
      AND status = "active"
      ORDER BY start_date DESC
      LIMIT 1
    `, [client.id])
    
    if (activePackage) {
      console.log(`⚠️  El cliente ya tiene un paquete activo:`)
      console.log(`   - Package ID: ${activePackage.id}`)
      console.log(`   - Package name: ${activePackage.package_name}`)
      console.log(`   - Package status: ${activePackage.status}`)
      console.log(`   - Package end_date: ${activePackage.end_date}`)
      console.log('')
      console.log(`💡 OPCIONES:`)
      console.log(`   1. Desactivar el paquete actual y asignar el paquete huérfano`)
      console.log(`   2. Mantener el paquete actual y eliminar el paquete huérfano`)
      console.log(`   3. Asignar el paquete huérfano y mantener ambos (no recomendado)`)
      console.log('')
      
      // Opción: Desactivar el paquete actual y asignar el paquete huérfano
      console.log(`🔧 EJECUTANDO: Desactivando paquete actual y asignando paquete huérfano...`)
      
      // Desactivar el paquete actual
      await database.run(`
        UPDATE package_history 
        SET status = 'expired'
        WHERE id = ?
      `, [activePackage.id])
      
      console.log(`   ✅ Paquete actual desactivado: ${activePackage.id}`)
    }
    
    // Asignar el paquete huérfano al cliente actual
    console.log(`🔧 Asignando paquete huérfano al cliente actual...`)
    await database.run(`
      UPDATE package_history 
      SET user_id = ?
      WHERE id = ?
    `, [client.id, orphanPackageId])
    
    console.log(`   ✅ Paquete huérfano asignado al cliente: ${client.id}`)
    console.log('')
    
    // Verificar que el paquete ahora está asignado correctamente
    const fixedPackage = await database.get('SELECT * FROM package_history WHERE id = ?', [orphanPackageId])
    console.log(`✅ PAQUETE CORREGIDO:`)
    console.log(`   - Package ID: ${fixedPackage.id}`)
    console.log(`   - Package user_id (nuevo): ${fixedPackage.user_id}`)
    console.log(`   - Package name: ${fixedPackage.package_name}`)
    console.log(`   - Package status: ${fixedPackage.status}`)
    console.log(`   - Package end_date: ${fixedPackage.end_date}`)
    console.log(`   - User ID match: ${fixedPackage.user_id === client.id ? '✅ SÍ' : '❌ NO'}`)
    console.log('')
    
    // Verificar que el cliente ahora tiene el paquete
    const clientActivePackage = await database.get(`
      SELECT * FROM package_history 
      WHERE user_id = ? 
      AND status = "active"
      ORDER BY start_date DESC
      LIMIT 1
    `, [client.id])
    
    if (clientActivePackage) {
      console.log(`✅ CLIENTE AHORA TIENE PAQUETE ACTIVO:`)
      console.log(`   - Package ID: ${clientActivePackage.id}`)
      console.log(`   - Package name: ${clientActivePackage.package_name}`)
      console.log(`   - Package status: ${clientActivePackage.status}`)
      console.log(`   - Package end_date: ${clientActivePackage.end_date}`)
    } else {
      console.log(`❌ El cliente NO tiene un paquete activo después de la corrección`)
    }

  } catch (error) {
    console.error('Error al corregir paquete huérfano:', error)
  } finally {
    database.db.close()
  }
}

fixOrphanPackage()

