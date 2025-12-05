const { database } = require('../lib/database.js')

async function wipeClasses() {
  try {
    console.log('🗑️  Wiping all classes from database...')
    
    // Delete all classes
    await database.run('DELETE FROM classes')
    
    console.log('✅ All classes have been deleted successfully!')
    console.log('📝 Note: This script only deletes classes. Bookings and attendance records remain.')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error wiping classes:', error)
    process.exit(1)
  }
}

wipeClasses()

