const sqlite3 = require('sqlite3')
const path = require('path')
const { promisify } = require('util')

const DB_PATH = path.join(process.cwd(), 'data', 'pilates_mermaid.db')

async function wipeDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('❌ Error connecting to database:', err.message)
        return reject(err)
      }
      console.log('✅ Connected to database')
    })

    const run = promisify(db.run.bind(db))
    const exec = promisify(db.exec.bind(db))

    async function deleteAllData() {
      try {
        console.log('🗑️  Wiping all data from database...')
        
        // Disable foreign keys temporarily
        await run('PRAGMA foreign_keys = OFF')
        
        // Get all table names
        const tables = await new Promise((resolve, reject) => {
          db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", [], (err, rows) => {
            if (err) reject(err)
            else resolve(rows.map(r => r.name))
          })
        })
        
        console.log('📋 Found tables:', tables.join(', '))
        
        // Delete all data from each table
        for (const table of tables) {
          const count = await new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(*) as count FROM ${table}`, [], (err, row) => {
              if (err) reject(err)
              else resolve(row.count)
            })
          })
          
          await run(`DELETE FROM ${table}`)
          console.log(`✅ Deleted ${count} rows from ${table}`)
        }
        
        // Reset auto-increment sequences (SQLite uses sqlite_sequence table)
        await run('DELETE FROM sqlite_sequence')
        
        // Re-enable foreign keys
        await run('PRAGMA foreign_keys = ON')
        
        console.log('✅ Database wiped successfully!')
        
        db.close((err) => {
          if (err) {
            console.error('❌ Error closing database:', err.message)
            return reject(err)
          }
          console.log('✅ Database connection closed')
          resolve()
        })
      } catch (error) {
        db.close()
        console.error('❌ Error wiping database:', error)
        reject(error)
      }
    }
    
    deleteAllData().catch(reject)
  })
}

// Run the script
wipeDatabase()
  .then(() => {
    console.log('🎉 Database wipe complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Failed to wipe database:', error)
    process.exit(1)
  })
