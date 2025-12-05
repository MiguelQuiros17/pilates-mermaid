/**
 * Cleanup orphaned booking and attendance data
 * This script removes bookings and attendance records that reference non-existent classes
 */

const path = require('path')
const sqlite3 = require('sqlite3')
const { promisify } = require('util')

const DB_PATH = path.join(process.cwd(), 'data', 'pilates_mermaid.db')

async function cleanup() {
  console.log('🧹 Starting database cleanup...')
  console.log('Database path:', DB_PATH)
  
  const db = new sqlite3.Database(DB_PATH)
  const run = promisify(db.run.bind(db))
  const get = promisify(db.get.bind(db))
  const all = promisify(db.all.bind(db))

  try {
    // Get current counts (handle missing tables gracefully)
    const bookingsCount = await get('SELECT COUNT(*) as count FROM bookings').catch(() => ({ count: 0 }))
    const attendanceCount = await get('SELECT COUNT(*) as count FROM attendance_records').catch(() => ({ count: 0 }))
    const classesCount = await get('SELECT COUNT(*) as count FROM classes').catch(() => ({ count: 0 }))
    const classHistoryCount = await get('SELECT COUNT(*) as count FROM class_history').catch(() => ({ count: 0 }))
    
    console.log('\n📊 Current state:')
    console.log(`   Classes: ${classesCount.count}`)
    console.log(`   Bookings: ${bookingsCount.count}`)
    console.log(`   Attendance records: ${attendanceCount.count}`)
    console.log(`   Class history: ${classHistoryCount.count}`)

    // Find orphaned bookings (bookings without a matching class)
    const orphanedBookings = await all(`
      SELECT b.id, b.class_id, b.user_id, u.nombre as user_name
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      WHERE b.class_id NOT IN (SELECT id FROM classes)
    `)
    
    console.log(`\n🔍 Found ${orphanedBookings.length} orphaned bookings`)

    // Find orphaned attendance records (handle missing table)
    const orphanedAttendance = await all(`
      SELECT ar.id, ar.class_id, ar.user_id, ar.user_name
      FROM attendance_records ar
      WHERE ar.class_id NOT IN (SELECT id FROM classes)
    `).catch(() => [])
    
    console.log(`🔍 Found ${orphanedAttendance.length} orphaned attendance records`)

    // Find orphaned class history
    const orphanedHistory = await all(`
      SELECT ch.id, ch.class_id, ch.user_id
      FROM class_history ch
      WHERE ch.class_id NOT IN (SELECT id FROM classes)
    `)
    
    console.log(`🔍 Found ${orphanedHistory.length} orphaned class history records`)

    // Delete orphaned bookings
    if (orphanedBookings.length > 0) {
      console.log('\n🗑️  Deleting orphaned bookings...')
      await run(`
        DELETE FROM bookings 
        WHERE class_id NOT IN (SELECT id FROM classes)
      `)
      console.log(`   Deleted ${orphanedBookings.length} orphaned bookings`)
    }

    // Delete orphaned attendance records (handle missing table)
    if (orphanedAttendance.length > 0) {
      console.log('🗑️  Deleting orphaned attendance records...')
      await run(`
        DELETE FROM attendance_records 
        WHERE class_id NOT IN (SELECT id FROM classes)
      `).catch(() => {})
      console.log(`   Deleted ${orphanedAttendance.length} orphaned attendance records`)
    }

    // Delete orphaned class history
    if (orphanedHistory.length > 0) {
      console.log('🗑️  Deleting orphaned class history records...')
      await run(`
        DELETE FROM class_history 
        WHERE class_id NOT IN (SELECT id FROM classes)
      `)
      console.log(`   Deleted ${orphanedHistory.length} orphaned class history records`)
    }

    // Delete orphaned recurring class cancellations
    const orphanedCancellations = await all(`
      SELECT rcc.id
      FROM recurring_class_cancellations rcc
      WHERE rcc.class_id NOT IN (SELECT id FROM classes)
    `)
    
    if (orphanedCancellations.length > 0) {
      console.log('🗑️  Deleting orphaned recurring class cancellations...')
      await run(`
        DELETE FROM recurring_class_cancellations 
        WHERE class_id NOT IN (SELECT id FROM classes)
      `)
      console.log(`   Deleted ${orphanedCancellations.length} orphaned cancellation records`)
    }

    // Get final counts (handle missing tables)
    const finalBookingsCount = await get('SELECT COUNT(*) as count FROM bookings').catch(() => ({ count: 0 }))
    const finalAttendanceCount = await get('SELECT COUNT(*) as count FROM attendance_records').catch(() => ({ count: 0 }))
    const finalClassHistoryCount = await get('SELECT COUNT(*) as count FROM class_history').catch(() => ({ count: 0 }))
    
    console.log('\n✅ Cleanup complete!')
    console.log('\n📊 Final state:')
    console.log(`   Bookings: ${finalBookingsCount.count}`)
    console.log(`   Attendance records: ${finalAttendanceCount.count}`)
    console.log(`   Class history: ${finalClassHistoryCount.count}`)

  } catch (error) {
    console.error('❌ Error during cleanup:', error)
  } finally {
    db.close()
  }
}

cleanup()

