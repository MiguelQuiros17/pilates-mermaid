/**
 * Wipe all class-related data from the database
 * This removes ALL classes, bookings, attendance records, and class history
 * Use with caution!
 */

const path = require('path')
const sqlite3 = require('sqlite3')
const { promisify } = require('util')

const DB_PATH = path.join(process.cwd(), 'data', 'pilates_mermaid.db')

async function wipeClassData() {
  console.log('⚠️  WARNING: This will delete ALL class-related data!')
  console.log('Database path:', DB_PATH)
  
  const db = new sqlite3.Database(DB_PATH)
  const run = promisify(db.run.bind(db))
  const get = promisify(db.get.bind(db))

  try {
    // Get current counts
    const bookingsCount = await get('SELECT COUNT(*) as count FROM bookings').catch(() => ({ count: 0 }))
    const classesCount = await get('SELECT COUNT(*) as count FROM classes').catch(() => ({ count: 0 }))
    const classHistoryCount = await get('SELECT COUNT(*) as count FROM class_history').catch(() => ({ count: 0 }))
    const attendanceCount = await get('SELECT COUNT(*) as count FROM attendance_records').catch(() => ({ count: 0 }))
    const cancellationsCount = await get('SELECT COUNT(*) as count FROM recurring_class_cancellations').catch(() => ({ count: 0 }))
    
    console.log('\n📊 Before cleanup:')
    console.log(`   Classes: ${classesCount.count}`)
    console.log(`   Bookings: ${bookingsCount.count}`)
    console.log(`   Class history: ${classHistoryCount.count}`)
    console.log(`   Attendance records: ${attendanceCount.count}`)
    console.log(`   Recurring cancellations: ${cancellationsCount.count}`)

    console.log('\n🗑️  Deleting all class-related data...')

    // Delete in correct order due to foreign key constraints
    await run('DELETE FROM attendance_records').catch(() => console.log('   (attendance_records table does not exist)'))
    await run('DELETE FROM class_history').catch(() => console.log('   (class_history table does not exist)'))
    await run('DELETE FROM recurring_class_cancellations').catch(() => console.log('   (recurring_class_cancellations table does not exist)'))
    await run('DELETE FROM bookings').catch(() => console.log('   (bookings table does not exist)'))
    await run('DELETE FROM classes').catch(() => console.log('   (classes table does not exist)'))

    // Get final counts
    const finalBookingsCount = await get('SELECT COUNT(*) as count FROM bookings').catch(() => ({ count: 0 }))
    const finalClassesCount = await get('SELECT COUNT(*) as count FROM classes').catch(() => ({ count: 0 }))
    const finalClassHistoryCount = await get('SELECT COUNT(*) as count FROM class_history').catch(() => ({ count: 0 }))
    
    console.log('\n✅ Cleanup complete!')
    console.log('\n📊 After cleanup:')
    console.log(`   Classes: ${finalClassesCount.count}`)
    console.log(`   Bookings: ${finalBookingsCount.count}`)
    console.log(`   Class history: ${finalClassHistoryCount.count}`)

  } catch (error) {
    console.error('❌ Error during cleanup:', error)
  } finally {
    db.close()
  }
}

wipeClassData()

