const fs = require('fs')
const path = require('path')
const { database } = require('../lib/database.js')

async function backupDatabase() {
  try {
    console.log('💾 Iniciando respaldo de base de datos...')
    
    const dbPath = path.join(__dirname, '../data/pilates_mermaid.db')
    const backupDir = path.join(__dirname, '../backups')
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFileName = `pilates_mermaid_backup_${timestamp}.db`
    const backupPath = path.join(backupDir, backupFileName)
    
    // Crear directorio de respaldos si no existe
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }
    
    // Verificar que la base de datos existe
    if (!fs.existsSync(dbPath)) {
      throw new Error('Base de datos no encontrada')
    }
    
    // Copiar archivo de base de datos
    fs.copyFileSync(dbPath, backupPath)
    
    // Obtener información del respaldo
    const stats = fs.statSync(backupPath)
    const backupSize = (stats.size / 1024 / 1024).toFixed(2) // MB
    
    console.log(`✅ Respaldo creado exitosamente:`)
    console.log(`📁 Archivo: ${backupFileName}`)
    console.log(`📊 Tamaño: ${backupSize} MB`)
    console.log(`📅 Fecha: ${new Date().toLocaleString('es-ES')}`)
    
    // Limpiar respaldos antiguos (mantener solo los últimos 30 días)
    await cleanOldBackups(backupDir)
    
    return {
      success: true,
      fileName: backupFileName,
      filePath: backupPath,
      size: backupSize,
      timestamp: new Date().toISOString()
    }
    
  } catch (error) {
    console.error('💥 Error creando respaldo:', error)
    throw error
  }
}

async function cleanOldBackups(backupDir) {
  try {
    console.log('🧹 Limpiando respaldos antiguos...')
    
    const files = fs.readdirSync(backupDir)
    const backupFiles = files.filter(file => file.startsWith('pilates_mermaid_backup_') && file.endsWith('.db'))
    
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    let deletedCount = 0
    
    for (const file of backupFiles) {
      const filePath = path.join(backupDir, file)
      const stats = fs.statSync(filePath)
      
      if (stats.mtime < thirtyDaysAgo) {
        fs.unlinkSync(filePath)
        deletedCount++
        console.log(`🗑️ Eliminado respaldo antiguo: ${file}`)
      }
    }
    
    if (deletedCount > 0) {
      console.log(`✅ Se eliminaron ${deletedCount} respaldos antiguos`)
    } else {
      console.log('✅ No se encontraron respaldos antiguos para eliminar')
    }
    
  } catch (error) {
    console.error('❌ Error limpiando respaldos antiguos:', error)
  }
}

async function restoreDatabase(backupFileName) {
  try {
    console.log(`🔄 Iniciando restauración desde: ${backupFileName}`)
    
    const backupDir = path.join(__dirname, '../backups')
    const backupPath = path.join(backupDir, backupFileName)
    const dbPath = path.join(__dirname, '../data/pilates_mermaid.db')
    
    // Verificar que el respaldo existe
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Respaldo no encontrado: ${backupFileName}`)
    }
    
    // Crear respaldo del estado actual antes de restaurar
    const currentTimestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const currentBackupName = `pilates_mermaid_current_${currentTimestamp}.db`
    const currentBackupPath = path.join(backupDir, currentBackupName)
    
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, currentBackupPath)
      console.log(`💾 Respaldo del estado actual creado: ${currentBackupName}`)
    }
    
    // Restaurar desde el respaldo
    fs.copyFileSync(backupPath, dbPath)
    
    console.log(`✅ Base de datos restaurada exitosamente desde: ${backupFileName}`)
    
    return {
      success: true,
      restoredFrom: backupFileName,
      currentBackup: currentBackupName
    }
    
  } catch (error) {
    console.error('💥 Error restaurando base de datos:', error)
    throw error
  }
}

async function listBackups() {
  try {
    const backupDir = path.join(__dirname, '../backups')
    
    if (!fs.existsSync(backupDir)) {
      console.log('📁 No hay directorio de respaldos')
      return []
    }
    
    const files = fs.readdirSync(backupDir)
    const backupFiles = files.filter(file => file.startsWith('pilates_mermaid_backup_') && file.endsWith('.db'))
    
    const backups = backupFiles.map(file => {
      const filePath = path.join(backupDir, file)
      const stats = fs.statSync(filePath)
      const size = (stats.size / 1024 / 1024).toFixed(2) // MB
      
      return {
        fileName: file,
        size: `${size} MB`,
        date: stats.mtime.toLocaleString('es-ES'),
        timestamp: stats.mtime.toISOString()
      }
    })
    
    // Ordenar por fecha (más reciente primero)
    backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    
    console.log('📋 Respaldo disponibles:')
    console.table(backups)
    
    return backups
    
  } catch (error) {
    console.error('💥 Error listando respaldos:', error)
    throw error
  }
}

// Ejecutar según el comando
if (require.main === module) {
  const command = process.argv[2]
  
  switch (command) {
    case 'backup':
      backupDatabase()
        .then(() => {
          console.log('🎉 Respaldo completado exitosamente!')
          process.exit(0)
        })
        .catch((error) => {
          console.error('💥 Error en el respaldo:', error)
          process.exit(1)
        })
      break
      
    case 'restore':
      const backupFile = process.argv[3]
      if (!backupFile) {
        console.error('❌ Debes especificar el archivo de respaldo a restaurar')
        process.exit(1)
      }
      
      restoreDatabase(backupFile)
        .then(() => {
          console.log('🎉 Restauración completada exitosamente!')
          process.exit(0)
        })
        .catch((error) => {
          console.error('💥 Error en la restauración:', error)
          process.exit(1)
        })
      break
      
    case 'list':
      listBackups()
        .then(() => {
          process.exit(0)
        })
        .catch((error) => {
          console.error('💥 Error listando respaldos:', error)
          process.exit(1)
        })
      break
      
    default:
      console.log('📖 Comandos disponibles:')
      console.log('  node scripts/backup-database.js backup     - Crear respaldo')
      console.log('  node scripts/backup-database.js restore <archivo> - Restaurar desde respaldo')
      console.log('  node scripts/backup-database.js list      - Listar respaldos disponibles')
      process.exit(0)
  }
}

module.exports = { backupDatabase, restoreDatabase, listBackups }






