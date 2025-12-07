const sqlite3 = require('sqlite3')
const { promisify } = require('util')
const path = require('path')

// Allow overriding the SQLite path via env so we can mount a persistent volume in production (e.g., Railway)
const DB_PATH = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'data', 'pilates_mermaid.db')

class Database {
  constructor() {
    // Ensure data directory exists
    const fs = require('fs')
    const dataDir = path.dirname(DB_PATH)
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    this.db = new sqlite3.Database(DB_PATH)
    this.initTables()
  }

  async initTables() {
    const run = promisify(this.db.run.bind(this.db))

    // Users table
    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        unique_identifier TEXT UNIQUE NOT NULL,
        nombre TEXT NOT NULL,
        correo TEXT UNIQUE NOT NULL,
        numero_de_telefono TEXT NOT NULL,
        instagram TEXT,
        role TEXT NOT NULL CHECK (role IN ('admin', 'coach', 'cliente')),
        type_of_class TEXT NOT NULL,
        expiration_date TEXT,
        cumpleanos TEXT,
        lesion_o_limitacion_fisica TEXT,
        genero TEXT,
        clases_tomadas INTEGER DEFAULT 0,
        clases_restantes INTEGER DEFAULT 0,
        total_pagado REAL DEFAULT 0,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Classes table
    await run(`
      CREATE TABLE IF NOT EXISTS classes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('group', 'private')),
        coach_id TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        end_time TEXT,
        duration INTEGER NOT NULL,
        max_capacity INTEGER NOT NULL,
        current_bookings INTEGER DEFAULT 0,
        status TEXT NOT NULL CHECK (status IN ('scheduled', 'completed', 'cancelled')),
        description TEXT,
        instructors TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (coach_id) REFERENCES users (id)
      )
    `)

    // Safe migrations for new columns in existing databases
    try {
      await run(`ALTER TABLE classes ADD COLUMN end_time TEXT`)
    } catch (e) {
      // Ignore if column already exists
    }

    try {
      await run(`ALTER TABLE classes ADD COLUMN instructors TEXT`)
    } catch (e) {
      // Ignore if column already exists
    }

    // Add new columns for class features
    try {
      await run(`ALTER TABLE classes ADD COLUMN is_recurring BOOLEAN DEFAULT 0`)
    } catch (e) {}
    try {
      await run(`ALTER TABLE classes ADD COLUMN recurrence_end_date TEXT`)
    } catch (e) {}
    try {
      await run(`ALTER TABLE classes ADD COLUMN is_public BOOLEAN DEFAULT 1`)
    } catch (e) {}
    try {
      await run(`ALTER TABLE classes ADD COLUMN walk_ins_welcome BOOLEAN DEFAULT 1`)
    } catch (e) {}
    try {
      await run(`ALTER TABLE classes ADD COLUMN assigned_client_ids TEXT`)
    } catch (e) {}
    try {
      await run(`ALTER TABLE classes ADD COLUMN recurrence_days_of_week TEXT`)
    } catch (e) {}
    
    // Add coach_name column for convenience (denormalized from users table)
    try {
      await run(`ALTER TABLE classes ADD COLUMN coach_name TEXT`)
    } catch (e) {}

    // Recurring class canceled occurrences table
    await run(`
      CREATE TABLE IF NOT EXISTS recurring_class_cancellations (
        id TEXT PRIMARY KEY,
        class_id TEXT NOT NULL,
        occurrence_date TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (class_id) REFERENCES classes (id),
        UNIQUE(class_id, occurrence_date)
      )
    `)

    // Add columns for user class tracking
    try {
      await run(`ALTER TABLE users ADD COLUMN private_classes_remaining INTEGER DEFAULT 0`)
    } catch (e) {}
    try {
      await run(`ALTER TABLE users ADD COLUMN group_classes_remaining INTEGER DEFAULT 0`)
    } catch (e) {}

    // Add columns for package auto-renewal and category
    try {
      await run(`ALTER TABLE package_history ADD COLUMN auto_renew BOOLEAN DEFAULT 0`)
    } catch (e) {}
    try {
      await run(`ALTER TABLE package_history ADD COLUMN last_renewal_date TEXT`)
    } catch (e) {}
    try {
      await run(`ALTER TABLE package_history ADD COLUMN package_category TEXT DEFAULT 'Grupal'`)
    } catch (e) {}
    try {
      await run(`ALTER TABLE package_history ADD COLUMN renewal_months INTEGER DEFAULT 0`)
    } catch (e) {}

    // Add missing columns for packages table (category, description, scheduling)
    try {
      await run(`ALTER TABLE packages ADD COLUMN category TEXT DEFAULT 'Grupal'`)
    } catch (e) {}
    try {
      await run(`ALTER TABLE packages ADD COLUMN description TEXT`)
    } catch (e) {}
    try {
      await run(`ALTER TABLE packages ADD COLUMN is_live BOOLEAN DEFAULT 1`)
    } catch (e) {}
    try {
      await run(`ALTER TABLE packages ADD COLUMN live_from TEXT`)
    } catch (e) {}
    try {
      await run(`ALTER TABLE packages ADD COLUMN live_until TEXT`)
    } catch (e) {}
    // Add validity_months column (replaces validity_days for new logic)
    try {
      await run(`ALTER TABLE packages ADD COLUMN validity_months INTEGER DEFAULT 1`)
    } catch (e) {}
    // Add sale price columns
    try {
      await run(`ALTER TABLE packages ADD COLUMN original_price REAL`)
    } catch (e) {}
    try {
      await run(`ALTER TABLE packages ADD COLUMN sale_price REAL`)
    } catch (e) {}

    // Packages table
    await run(`
      CREATE TABLE IF NOT EXISTS packages (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        classes_included INTEGER NOT NULL,
        price REAL NOT NULL,
        validity_days INTEGER NOT NULL,
        validity_months INTEGER DEFAULT 1,
        category TEXT NOT NULL DEFAULT 'Grupal',
        description TEXT,
        is_live BOOLEAN DEFAULT 1,
        live_from TEXT,
        live_until TEXT,
        original_price REAL,
        sale_price REAL,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Package bundles table (multi-month discounted packages - can include group AND/OR private)
    await run(`
      CREATE TABLE IF NOT EXISTS package_bundles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        package_id TEXT,
        group_package_id TEXT,
        private_package_id TEXT,
        months_included INTEGER NOT NULL,
        price REAL NOT NULL,
        is_live BOOLEAN DEFAULT 1,
        live_from TEXT,
        live_until TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_package_id) REFERENCES packages (id),
        FOREIGN KEY (private_package_id) REFERENCES packages (id)
      )
    `)
    
    // Migrations for bundle dual-package support
    try {
      await run(`ALTER TABLE package_bundles ADD COLUMN group_package_id TEXT`)
    } catch (e) {}
    try {
      await run(`ALTER TABLE package_bundles ADD COLUMN private_package_id TEXT`)
    } catch (e) {}
    
    // Migrations for separate months for group and private packages
    try {
      await run(`ALTER TABLE package_bundles ADD COLUMN group_months_included INTEGER`)
    } catch (e) {}
    try {
      await run(`ALTER TABLE package_bundles ADD COLUMN private_months_included INTEGER`)
    } catch (e) {}
    
    // Migration: Remove NOT NULL constraint from package_id (handled by table recreation above)

    // Class history table
    await run(`
      CREATE TABLE IF NOT EXISTS class_history (
        id TEXT PRIMARY KEY,
        class_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        class_name TEXT NOT NULL,
        class_date TEXT NOT NULL,
        class_time TEXT NOT NULL,
        coach_name TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('confirmed', 'attended', 'no_show', 'cancelled', 'scheduled')),
        cancellation_reason TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (class_id) REFERENCES classes (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `)

    // Payment history table
    await run(`
      CREATE TABLE IF NOT EXISTS payment_history (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        amount REAL NOT NULL,
        payment_type TEXT NOT NULL CHECK (payment_type IN ('package_purchase', 'class_payment', 'fine', 'refund', 'monthly_renewal')),
        package_name TEXT,
        payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'transfer')),
        payment_date TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `)

    // Package history table
    await run(`
      CREATE TABLE IF NOT EXISTS package_history (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        package_name TEXT NOT NULL,
        package_type TEXT NOT NULL,
        package_category TEXT NOT NULL CHECK (package_category IN ('Grupal', 'Privada')),
        classes_included INTEGER NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        payment_method TEXT NOT NULL,
        amount_paid REAL NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'cancelled')),
        auto_renew BOOLEAN DEFAULT 0,
        last_renewal_date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `)

    // Notification settings table
    await run(`
      CREATE TABLE IF NOT EXISTS notification_settings (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        email_notifications BOOLEAN DEFAULT 1,
        expiration_reminder_days INTEGER DEFAULT 7,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `)

    // Admin settings table
    await run(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id TEXT PRIMARY KEY,
        setting_key TEXT UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Initialize default admin settings
    try {
      await run(`
        INSERT OR IGNORE INTO admin_settings (id, setting_key, setting_value)
        VALUES (?, ?, ?)
      `, [require('uuid').v4(), 'auto_renew_default_behavior', 'override'])
    } catch (e) {
      // Ignore if already exists
    }

    // Bookings table
    await run(`
      CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        class_id TEXT NOT NULL,
        booking_date TEXT NOT NULL,
        occurrence_date TEXT,
        status TEXT NOT NULL CHECK (status IN ('confirmed', 'pending', 'cancelled', 'attended', 'no_show')),
        payment_method TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (class_id) REFERENCES classes (id)
      )
    `)
    
    // Add occurrence_date column if it doesn't exist (migration)
    try {
      await run(`ALTER TABLE bookings ADD COLUMN occurrence_date TEXT`)
    } catch (e) {}
    
    // Add updated_at column to bookings if it doesn't exist
    try {
      await run(`ALTER TABLE bookings ADD COLUMN updated_at DATETIME`)
    } catch (e) {}
    
    // Add attendance tracking columns to bookings
    try {
      await run(`ALTER TABLE bookings ADD COLUMN attendance_status TEXT`)
    } catch (e) {}
    try {
      await run(`ALTER TABLE bookings ADD COLUMN attendance_marked_by TEXT`)
    } catch (e) {}
    try {
      await run(`ALTER TABLE bookings ADD COLUMN attendance_marked_at DATETIME`)
    } catch (e) {}
    try {
      await run(`ALTER TABLE bookings ADD COLUMN late_cancellation BOOLEAN DEFAULT 0`)
    } catch (e) {}
    try {
      await run(`ALTER TABLE bookings ADD COLUMN credit_deducted BOOLEAN DEFAULT 1`)
    } catch (e) {}

    // Attendance records table for historical class attendance
    await run(`
      CREATE TABLE IF NOT EXISTS attendance_records (
        id TEXT PRIMARY KEY,
        class_id TEXT NOT NULL,
        occurrence_date TEXT NOT NULL,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        attendance_status TEXT NOT NULL CHECK (attendance_status IN ('present', 'absent', 'late_cancel', 'excused')),
        marked_by TEXT NOT NULL,
        marked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (class_id) REFERENCES classes (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `)

    // Private class requests table
    await run(`
      CREATE TABLE IF NOT EXISTS private_class_requests (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        requested_date TEXT NOT NULL,
        requested_time TEXT NOT NULL,
        duration INTEGER NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
        admin_notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `)

    // Coach payments table
    await run(`
      CREATE TABLE IF NOT EXISTS coach_payments (
        id TEXT PRIMARY KEY,
        coach_name TEXT NOT NULL,
        period_start TEXT NOT NULL,
        period_end TEXT NOT NULL,
        total_students INTEGER NOT NULL,
        first_three_students INTEGER NOT NULL,
        additional_students INTEGER NOT NULL,
        first_three_amount INTEGER NOT NULL,
        additional_amount INTEGER NOT NULL,
        total_amount INTEGER NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'paid')),
        payment_date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Notification log table
    await run(`
      CREATE TABLE IF NOT EXISTS notification_log (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('birthday', 'expiration', 'class_confirmation', 'class_reminder', 'classes_running_out', 'password_reset', 'welcome')),
        subject TEXT NOT NULL,
        sent_at TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `)

    // Attendance table
    await run(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        classId TEXT NOT NULL,
        className TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        coach TEXT NOT NULL,
        clientId TEXT NOT NULL,
        clientName TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('attended', 'absent', 'late_cancellation', 'no_show', 'studio_cancelled')),
        reason TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Payments table
    await run(`
      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        concept TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
        method TEXT NOT NULL CHECK (method IN ('cash', 'transfer')),
        status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled')),
        client_name TEXT,
        coach_name TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Financial records table
    await run(`
      CREATE TABLE IF NOT EXISTS financial_records (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        concept TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
        method TEXT NOT NULL CHECK (method IN ('cash', 'transfer')),
        note TEXT,
        status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create indexes for better performance
    await run(`CREATE INDEX IF NOT EXISTS idx_users_role ON users (role)`)
    await run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users (correo)`)
    await run(`CREATE INDEX IF NOT EXISTS idx_classes_coach ON classes (coach_id)`)
    await run(`CREATE INDEX IF NOT EXISTS idx_classes_date ON classes (date)`)
    await run(`CREATE INDEX IF NOT EXISTS idx_class_history_user ON class_history (user_id)`)

    // Password reset tokens table
    await run(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        used BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `)

    await run(`CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens (token)`)
    await run(`CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens (user_id)`)
    await run(`CREATE INDEX IF NOT EXISTS idx_class_history_class ON class_history (class_id)`)
    await run(`CREATE INDEX IF NOT EXISTS idx_payment_history_user ON payment_history (user_id)`)
    await run(`CREATE INDEX IF NOT EXISTS idx_payment_history_date ON payment_history (payment_date)`)
    await run(`CREATE INDEX IF NOT EXISTS idx_package_history_user ON package_history (user_id)`)
    await run(`CREATE INDEX IF NOT EXISTS idx_package_history_status ON package_history (status)`)
    await run(`CREATE INDEX IF NOT EXISTS idx_package_history_dates ON package_history (start_date, end_date)`)
    await run(`CREATE INDEX IF NOT EXISTS idx_notification_settings_user ON notification_settings (user_id)`)
    await run(`CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings (user_id)`)
    await run(`CREATE INDEX IF NOT EXISTS idx_bookings_class ON bookings (class_id)`)
    await run(`CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status)`)
    await run(`CREATE INDEX IF NOT EXISTS idx_private_class_requests_user ON private_class_requests (user_id)`)
    await run(`CREATE INDEX IF NOT EXISTS idx_private_class_requests_status ON private_class_requests (status)`)
    await run(`CREATE INDEX IF NOT EXISTS idx_attendance_class ON attendance (classId)`)
    await run(`CREATE INDEX IF NOT EXISTS idx_payments_coach ON payments (coach_name)`)
    await run(`CREATE INDEX IF NOT EXISTS idx_coach_payments_coach ON coach_payments (coach_name)`)
    await run(`CREATE INDEX IF NOT EXISTS idx_coach_payments_period ON coach_payments (period_start, period_end)`)
    await run(`CREATE INDEX IF NOT EXISTS idx_coach_payments_status ON coach_payments (status)`)
    await run(`CREATE INDEX IF NOT EXISTS idx_notification_log_user ON notification_log (user_id)`)
    await run(`CREATE INDEX IF NOT EXISTS idx_notification_log_type ON notification_log (type)`)
    await run(`CREATE INDEX IF NOT EXISTS idx_notification_log_sent_at ON notification_log (sent_at)`)

    console.log('Database tables initialized successfully')
  }

  // Generic query methods
  async run(sql, params = []) {
    const run = promisify(this.db.run.bind(this.db))
    return await run(sql, params)
  }

  async get(sql, params = []) {
    const get = promisify(this.db.get.bind(this.db))
    return await get(sql, params)
  }

  async all(sql, params = []) {
    const all = promisify(this.db.all.bind(this.db))
    return await all(sql, params)
  }

  // User methods
  async createUser(user) {
    const id = require('uuid').v4()
    const unique_identifier = require('uuid').v4()
    
    await this.run(`
      INSERT INTO users (
        id, unique_identifier, nombre, correo, numero_de_telefono, instagram,
        role, type_of_class, expiration_date, cumpleanos, lesion_o_limitacion_fisica,
        genero, clases_tomadas, clases_restantes, total_pagado, password_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, unique_identifier, user.nombre, user.correo, user.numero_de_telefono,
      user.instagram, user.role, user.type_of_class, user.expiration_date,
      user.cumpleanos, user.lesion_o_limitacion_fisica, user.genero,
      user.clases_tomadas || 0, user.clases_restantes || 0, user.total_pagado || 0,
      user.password_hash
    ])

    return this.getUserById(id)
  }

  async getUserById(id) {
    const user = await this.get('SELECT * FROM users WHERE id = ?', [id])
    if (!user) return null
    
    // CRITICAL: Preserve email exactly as stored in database (no normalization)
    const historial_de_clases = await this.all(
      'SELECT * FROM class_history WHERE user_id = ? ORDER BY created_at DESC',
      [id]
    )
    
    // Return user with email preserved exactly as stored (correo field unchanged)
    return {
      ...user,
      correo: user.correo, // Explicitly preserve email format
      historial_de_clases
    }
  }

  async getUserByEmail(email) {
    if (!email) return null
    
    // Normalize Gmail addresses for comparison (remove dots from local part)
    const normalizeEmailForLookup = (email) => {
      if (!email) return ''
      const lower = email.toLowerCase().trim()
      const [localPart, domain] = lower.split('@')
      if (domain === 'gmail.com' || domain === 'googlemail.com') {
        // Remove dots from local part for Gmail addresses
        return localPart.replace(/\./g, '') + '@' + domain
      }
      return lower
    }
    
    const normalizedEmail = normalizeEmailForLookup(email)
    
    // Try to find user by exact match first (for non-Gmail or exact format)
    let user = await this.get('SELECT * FROM users WHERE LOWER(correo) = LOWER(?)', [email])
    
    // If not found and it's a Gmail address, try normalized lookup
    if (!user && (email.toLowerCase().includes('@gmail.com') || email.toLowerCase().includes('@googlemail.com'))) {
      // Get all users and check normalized emails
      const allUsers = await this.all('SELECT * FROM users', [])
      user = allUsers.find(u => normalizeEmailForLookup(u.correo) === normalizedEmail) || null
    }
    
    if (!user) return null
    
    const historial_de_clases = await this.all(
      'SELECT * FROM class_history WHERE user_id = ? ORDER BY created_at DESC',
      [user.id]
    )
    
    return {
      ...user,
      historial_de_clases
    }
  }

  async updateUserRole(userId, role) {
    await this.run('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [role, userId])
    return this.getUserById(userId)
  }

  async updateUser(id, updates) {
    const fields = Object.keys(updates).filter(key => key !== 'id' && key !== 'historial_de_clases')
    
    // CRITICAL: If updating email, preserve it exactly as provided (no normalization)
    if (updates.correo && typeof updates.correo === 'string') {
      updates.correo = updates.correo.trim()
      console.log('💾 [database.updateUser] Email to save:', updates.correo)
    }
    
    const values = fields.map(field => updates[field])
    
    if (fields.length === 0) {
      console.log('⚠️ [database.updateUser] No fields to update')
      return this.getUserById(id)
    }
    
    console.log('💾 [database.updateUser] Updating fields:', fields)
    console.log('💾 [database.updateUser] Values:', values)
    
    const setClause = fields.map(field => `${field} = ?`).join(', ')
    await this.run(
      `UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [...values, id]
    )
    
    const updated = await this.getUserById(id)
    console.log('✅ [database.updateUser] User updated. Email in DB:', updated?.correo)
    return updated
  }

  async getAllUsers(role) {
    let sql = 'SELECT * FROM users'
    let params = []
    
    if (role) {
      sql += ' WHERE role = ?'
      params.push(role)
    }
    
    sql += ' ORDER BY created_at DESC'
    
    const users = await this.all(sql, params)
    
    // Fetch class history for each user
    for (let user of users) {
      const historial_de_clases = await this.all(
        'SELECT * FROM class_history WHERE user_id = ? ORDER BY created_at DESC',
        [user.id]
      )
      user.historial_de_clases = historial_de_clases
    }
    
    return users
  }

  async getUsersByRole(role) {
    return await this.all(
      'SELECT * FROM users WHERE role = ? ORDER BY created_at DESC',
      [role]
    )
  }

  // Class methods
  async createClass(classData) {
    const id = require('uuid').v4()
    
    await this.run(`
      INSERT INTO classes (
        id, title, type, coach_id, date, time, duration, max_capacity,
        current_bookings, status, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, classData.title, classData.type, classData.coach_id,
      classData.date, classData.time, classData.duration, classData.max_capacity,
      classData.current_bookings || 0, classData.status || 'scheduled',
      classData.description
    ])
    
    return this.getClassById(id)
  }

  async getClassById(id) {
    return await this.get('SELECT * FROM classes WHERE id = ?', [id])
  }

  async getClassesByDateRange(startDate, endDate) {
    return await this.all(
      'SELECT * FROM classes WHERE date BETWEEN ? AND ? ORDER BY date, time',
      [startDate, endDate]
    )
  }

  async getClassesByCoach(coachId, startDate, endDate) {
    let sql = 'SELECT * FROM classes WHERE coach_id = ?'
    let params = [coachId]
    
    if (startDate && endDate) {
      sql += ' AND date BETWEEN ? AND ?'
      params.push(startDate, endDate)
    }
    
    sql += ' ORDER BY date, time'
    
    return await this.all(sql, params)
  }

  async updateClassHistoryClient(classId, userId) {
    await this.run(`
      UPDATE class_history 
      SET user_id = ?
      WHERE class_id = ?
    `, [userId, classId])
  }

  async updateClass(id, updates) {
    const fields = Object.keys(updates).filter(key => key !== 'id')
    const values = fields.map(field => {
      if (field === 'instructors' && Array.isArray(updates[field])) {
        // Limit to 10 instructors and store as JSON string
        return JSON.stringify(updates[field].slice(0, 10))
      }
      return updates[field]
    })
    
    if (fields.length === 0) return this.getClassById(id)
    
    const setClause = fields.map(field => `${field} = ?`).join(', ')
    await this.run(
      `UPDATE classes SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [...values, id]
    )
    
    return this.getClassById(id)
  }

  // Package methods
  async createPackage(packageData) {
    const id = require('uuid').v4()
    // Convert months to days for backwards compatibility (30 days per month)
    const validityDays = packageData.validity_months ? packageData.validity_months * 30 : (packageData.validity_days || 30)
    
    await this.run(`
      INSERT INTO packages (
        id, name, type, classes_included, price, validity_days, validity_months, category, description, is_live, live_from, live_until, original_price, sale_price, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, packageData.name, packageData.type, packageData.classes_included,
      packageData.sale_price || packageData.price, // Current price is sale_price if set, otherwise normal price
      validityDays,
      packageData.validity_months || Math.ceil(validityDays / 30),
      packageData.category || 'Grupal',
      packageData.description || '',
      packageData.is_live !== undefined ? packageData.is_live : true,
      packageData.live_from || null,
      packageData.live_until || null,
      packageData.original_price || null,
      packageData.sale_price || null,
      packageData.is_active !== undefined ? packageData.is_active : true
    ])
    
    return this.getPackageById(id)
  }

  async getPackageById(id) {
    return await this.get('SELECT * FROM packages WHERE id = ?', [id])
  }

  async getAllPackages() {
    return await this.all('SELECT * FROM packages WHERE is_active = 1 ORDER BY price ASC')
  }

  async getPackages(options = {}) {
    const { includeInactive = false, includeScheduled = false, onlyLive = true, category = null } = options
    const todayStr = new Date().toISOString().split('T')[0]
    
    const conditions = []
    const params = []
    
    if (!includeInactive) {
      conditions.push('is_active = 1')
    }
    
    if (category) {
      conditions.push('category = ?')
      params.push(category)
    }
    
    if (onlyLive) {
      conditions.push(`is_live = 1`)
      conditions.push(`(live_from IS NULL OR live_from <= ?)`)
      conditions.push(`(live_until IS NULL OR live_until >= ?)`)
      params.push(todayStr, todayStr)
    } else if (!includeScheduled) {
      // If not including scheduled, ensure currently live window or null
      conditions.push(`(live_from IS NULL OR live_from <= ?)`)
      conditions.push(`(live_until IS NULL OR live_until >= ?)`)
      params.push(todayStr, todayStr)
    }
    
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    return await this.all(`SELECT * FROM packages ${where} ORDER BY price ASC`, params)
  }

  async updatePackage(id, updates) {
    const fields = Object.keys(updates).filter(key => key !== 'id')
    const values = fields.map(field => updates[field])
    
    if (fields.length === 0) return this.getPackageById(id)
    
    const setClause = fields.map(field => `${field} = ?`).join(', ')
    await this.run(
      `UPDATE packages SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [...values, id]
    )
    
    return this.getPackageById(id)
  }
  
  async deletePackage(id) {
    await this.run(`
      UPDATE packages
      SET is_active = 0, is_live = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [id])
    return this.getPackageById(id)
  }

  // Package bundle methods
  async createPackageBundle(bundleData) {
    const id = require('uuid').v4()
    
    // Convert booleans to 0/1 for SQLite
    const isLive = bundleData.is_live !== undefined ? (bundleData.is_live ? 1 : 0) : 1
    const isActive = bundleData.is_active !== undefined ? (bundleData.is_active ? 1 : 0) : 1
    
    await this.run(`
      INSERT INTO package_bundles (
        id, name, description, package_id, group_package_id, private_package_id, months_included, group_months_included, private_months_included, price, is_live, live_from, live_until, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      bundleData.name,
      bundleData.description || '',
      bundleData.package_id || null, // Legacy support
      bundleData.group_package_id || null,
      bundleData.private_package_id || null,
      bundleData.months_included || null, // Legacy support
      bundleData.group_months_included || null,
      bundleData.private_months_included || null,
      bundleData.price,
      isLive,
      bundleData.live_from || null,
      bundleData.live_until || null,
      isActive
    ])
    
    return this.getPackageBundleById(id)
  }

  async getPackageBundleById(id) {
    try {
      // Get bundle with both package details
      const bundle = await this.get(`
        SELECT pb.*,
          gp.name as group_package_name, gp.price as group_package_price, gp.classes_included as group_classes_included, gp.validity_months as group_validity_months,
          pp.name as private_package_name, pp.price as private_package_price, pp.classes_included as private_classes_included, pp.validity_months as private_validity_months,
          COALESCE(gp.name, pp.name) as package_name,
          COALESCE(gp.price, pp.price, 0) as package_price,
          COALESCE(gp.classes_included, pp.classes_included, 0) as classes_included,
          CASE WHEN gp.id IS NOT NULL AND pp.id IS NOT NULL THEN 'Combo' WHEN gp.id IS NOT NULL THEN 'Grupal' ELSE 'Privada' END as category
        FROM package_bundles pb
        LEFT JOIN packages gp ON pb.group_package_id = gp.id
        LEFT JOIN packages pp ON pb.private_package_id = pp.id
        WHERE pb.id = ?
      `, [id])
      return bundle
    } catch (error) {
      console.error('[DB getPackageBundleById] Error for ID', id, ':', error)
      throw error
    }
  }

  async getAllPackageBundles(options = {}) {
    const { includeInactive = false, onlyLive = true } = options
    const conditions = []
    const params = []
    
    if (!includeInactive) {
      conditions.push('pb.is_active = 1')
    }
    if (onlyLive) {
      conditions.push('pb.is_live = 1')
    }
    
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    return await this.all(`
      SELECT pb.*,
        gp.name as group_package_name, gp.price as group_package_price, gp.classes_included as group_classes_included, gp.validity_months as group_validity_months,
        pp.name as private_package_name, pp.price as private_package_price, pp.classes_included as private_classes_included, pp.validity_months as private_validity_months,
        COALESCE(gp.name, pp.name) as package_name,
        (COALESCE(gp.price, 0) + COALESCE(pp.price, 0)) as package_price,
        COALESCE(gp.classes_included, 0) + COALESCE(pp.classes_included, 0) as classes_included,
        CASE WHEN gp.id IS NOT NULL AND pp.id IS NOT NULL THEN 'Combo' WHEN gp.id IS NOT NULL THEN 'Grupal' ELSE 'Privada' END as category
      FROM package_bundles pb
      LEFT JOIN packages gp ON pb.group_package_id = gp.id
      LEFT JOIN packages pp ON pb.private_package_id = pp.id
      ${where}
      ORDER BY pb.price ASC
    `, params)
  }

  async updatePackageBundle(id, updates) {
    try {
      // Filter out id and convert empty strings to null for package IDs
      const processedUpdates = { ...updates }
      delete processedUpdates.id
      
      // Convert empty strings to null for foreign key fields
      if (processedUpdates.group_package_id === '') processedUpdates.group_package_id = null
      if (processedUpdates.private_package_id === '') processedUpdates.private_package_id = null
      if (processedUpdates.package_id === '') processedUpdates.package_id = null
      
      // Convert boolean values to 0/1 for SQLite
      if (processedUpdates.is_active !== undefined) {
        const originalValue = processedUpdates.is_active
        processedUpdates.is_active = (originalValue === true || originalValue === 1 || originalValue === 'true') ? 1 : 0
        console.log('[DB updatePackageBundle] Converting is_active:', originalValue, '->', processedUpdates.is_active)
      }
      if (processedUpdates.is_live !== undefined) {
        const originalValue = processedUpdates.is_live
        processedUpdates.is_live = (originalValue === true || originalValue === 1 || originalValue === 'true') ? 1 : 0
        console.log('[DB updatePackageBundle] Converting is_live:', originalValue, '->', processedUpdates.is_live)
      }
      
      // Remove undefined values (but keep 0 values!)
      Object.keys(processedUpdates).forEach(key => {
        if (processedUpdates[key] === undefined) delete processedUpdates[key]
      })
      
      const fields = Object.keys(processedUpdates)
      const values = fields.map(field => processedUpdates[field])
      
      if (fields.length === 0) return this.getPackageBundleById(id)
      
      const setClause = fields.map(field => `${field} = ?`).join(', ')
      const query = `UPDATE package_bundles SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
      
      console.log('[DB updatePackageBundle] Query:', query)
      console.log('[DB updatePackageBundle] Values:', JSON.stringify([...values, id]))
      console.log('[DB updatePackageBundle] Fields being updated:', fields)
      
      await this.run(query, [...values, id])
      
      return this.getPackageBundleById(id)
    } catch (error) {
      console.error('[DB updatePackageBundle] Error:', error)
      throw error
    }
  }

  async deletePackageBundle(id) {
    // Hard delete - remove the bundle completely
    await this.run(`
      DELETE FROM package_bundles
      WHERE id = ?
    `, [id])
    return { id, deleted: true }
  }

  // Attendance methods
  async getClassAttendance(classId, occurrenceDate = null) {
    let query = `
      SELECT ar.*, u.correo as user_email
      FROM attendance_records ar
      JOIN users u ON ar.user_id = u.id
      WHERE ar.class_id = ?
    `
    const params = [classId]
    
    if (occurrenceDate) {
      query += ` AND ar.occurrence_date = ?`
      params.push(occurrenceDate)
    }
    
    query += ` ORDER BY ar.created_at DESC`
    return await this.all(query, params)
  }

  async setAttendance(attendanceData) {
    const { classId, occurrenceDate, userId, userName, status, markedBy, notes } = attendanceData
    
    // Check if record exists
    const existing = await this.get(`
      SELECT id FROM attendance_records 
      WHERE class_id = ? AND occurrence_date = ? AND user_id = ?
    `, [classId, occurrenceDate, userId])
    
    if (existing) {
      // Update existing record
      await this.run(`
        UPDATE attendance_records 
        SET attendance_status = ?, marked_by = ?, marked_at = datetime('now'), notes = ?
        WHERE id = ?
      `, [status, markedBy, notes || null, existing.id])
      return this.get('SELECT * FROM attendance_records WHERE id = ?', [existing.id])
    } else {
      // Create new record
      const id = require('uuid').v4()
      await this.run(`
        INSERT INTO attendance_records (id, class_id, occurrence_date, user_id, user_name, attendance_status, marked_by, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [id, classId, occurrenceDate, userId, userName, status, markedBy, notes || null])
      return this.get('SELECT * FROM attendance_records WHERE id = ?', [id])
    }
  }

  async getUserAttendanceRecord(userId) {
    // Get attendance statistics for a user
    const stats = await this.get(`
      SELECT 
        COUNT(*) as total_classes,
        SUM(CASE WHEN attendance_status = 'present' THEN 1 ELSE 0 END) as attended,
        SUM(CASE WHEN attendance_status = 'absent' THEN 1 ELSE 0 END) as no_show,
        SUM(CASE WHEN attendance_status = 'late_cancel' THEN 1 ELSE 0 END) as late_cancellations,
        SUM(CASE WHEN attendance_status = 'excused' THEN 1 ELSE 0 END) as excused
      FROM attendance_records
      WHERE user_id = ?
    `, [userId])
    
    // Get recent attendance history
    const history = await this.all(`
      SELECT ar.*, c.title as class_title, c.type as class_type
      FROM attendance_records ar
      JOIN classes c ON ar.class_id = c.id
      WHERE ar.user_id = ?
      ORDER BY ar.occurrence_date DESC, ar.created_at DESC
      LIMIT 50
    `, [userId])
    
    return { stats, history }
  }

  async getClassAttendanceSheet(classId, occurrenceDate) {
    // Get all users registered for this class occurrence with their attendance status
    const attendees = await this.all(`
      SELECT 
        b.user_id,
        b.status as booking_status,
        b.late_cancellation,
        b.credit_deducted,
        u.nombre as user_name,
        u.correo as user_email,
        ar.attendance_status,
        ar.marked_by,
        ar.marked_at,
        ar.notes
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      LEFT JOIN attendance_records ar ON ar.class_id = b.class_id 
        AND ar.user_id = b.user_id 
        AND ar.occurrence_date = ?
      WHERE b.class_id = ? 
        AND (b.occurrence_date = ? OR (b.occurrence_date IS NULL AND ? IS NULL))
        AND b.status NOT IN ('pending', 'cancelled')
      ORDER BY u.nombre
    `, [occurrenceDate, classId, occurrenceDate, occurrenceDate])
    
    return attendees
  }

  async markLateCancellation(bookingId) {
    await this.run(`
      UPDATE bookings 
      SET late_cancellation = 1, updated_at = datetime('now')
      WHERE id = ?
    `, [bookingId])
  }

  // Class history methods
  async addClassHistory(classHistory) {
    const id = require('uuid').v4()
    
    await this.run(`
      INSERT INTO class_history (
        id, class_id, user_id, class_name, class_date, class_time, coach_name, status, cancellation_reason, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, classHistory.class_id, classHistory.user_id, classHistory.class_name,
      classHistory.class_date, classHistory.class_time, classHistory.coach_name,
      classHistory.status, classHistory.cancellation_reason, classHistory.notes
    ])
    
    return this.getClassHistoryById(id)
  }

  async getClassHistoryById(id) {
    return await this.get('SELECT * FROM class_history WHERE id = ?', [id])
  }

  async getClassHistoryByUser(userId) {
    return await this.all('SELECT * FROM class_history WHERE user_id = ? ORDER BY class_date DESC, class_time DESC', [userId])
  }

  async updateClassHistoryStatus(id, status, cancellationReason = null, notes = null) {
    await this.run(`
      UPDATE class_history 
      SET status = ?, cancellation_reason = ?, notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `, [status, cancellationReason, notes, id])
    
    return this.getClassHistoryById(id)
  }

  // Payment history methods
  async addPaymentHistory(paymentHistory) {
    const id = require('uuid').v4()
    
    await this.run(`
      INSERT INTO payment_history (
        id, user_id, amount, payment_type, package_name, payment_method, payment_date, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, paymentHistory.user_id, paymentHistory.amount, paymentHistory.payment_type,
      paymentHistory.package_name, paymentHistory.payment_method, paymentHistory.payment_date,
      paymentHistory.description
    ])
    
    return this.getPaymentHistoryById(id)
  }

  async getPaymentHistoryById(id) {
    return await this.get('SELECT * FROM payment_history WHERE id = ?', [id])
  }

  async getPaymentHistoryByUser(userId) {
    return await this.all('SELECT * FROM payment_history WHERE user_id = ? ORDER BY payment_date DESC', [userId])
  }

  // Package history methods
  async addPackageHistory(packageHistory) {
    const id = require('uuid').v4()
    
    await this.run(`
      INSERT INTO package_history (
        id, user_id, package_name, package_type, package_category, classes_included, start_date, end_date, payment_method, amount_paid, status, auto_renew, last_renewal_date, renewal_months
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, packageHistory.user_id, packageHistory.package_name, packageHistory.package_type,
      packageHistory.package_category || 'Grupal', packageHistory.classes_included, packageHistory.start_date, packageHistory.end_date,
      packageHistory.payment_method, packageHistory.amount_paid, packageHistory.status,
      packageHistory.auto_renew || false, packageHistory.last_renewal_date || null, packageHistory.renewal_months || 0
    ])
    
    return this.getPackageHistoryById(id)
  }

  async getPackageHistoryById(id) {
    return await this.get('SELECT * FROM package_history WHERE id = ?', [id])
  }

  async getPackageHistoryByUser(userId) {
    return await this.all('SELECT * FROM package_history WHERE user_id = ? ORDER BY start_date DESC', [userId])
  }

  async getActivePackageByUser(userId, category = null) {
    // Obtener el paquete activo más reciente (sin filtrar por fecha, eso se hace en el endpoint)
    // Esto evita problemas de timezone en la comparación de fechas
    let query = `
      SELECT * FROM package_history 
      WHERE user_id = ? 
      AND status = "active"
    `
    const params = [userId]
    
    if (category) {
      query += ` AND package_category = ?`
      params.push(category)
    }
    
    query += ` ORDER BY start_date DESC LIMIT 1`
    
    const pkg = await this.get(query, params)
    
    if (!pkg) {
      console.log(`[getActivePackageByUser] No active package found for user ${userId}`)
      return null
    }
    
    console.log(`[getActivePackageByUser] Found active package for user ${userId}: ${pkg.package_name} (end_date: ${pkg.end_date})`)
    return pkg
  }

  async updatePackageStatus(id, status) {
    // Fetch package to know user and category for side effects
    const pkg = await this.getPackageHistoryById(id)

    await this.run(`
      UPDATE package_history 
      SET status = ?
      WHERE id = ?
    `, [status, id])
    
    // If marking as expired, wipe remaining classes for that user/category
    if (pkg && status === 'expired') {
      if (pkg.package_category === 'Grupal') {
        await this.run(`
          UPDATE users
          SET group_classes_remaining = 0, updated_at = datetime('now')
          WHERE id = ?
        `, [pkg.user_id])
      } else if (pkg.package_category === 'Privada') {
        await this.run(`
          UPDATE users
          SET private_classes_remaining = 0, updated_at = datetime('now')
          WHERE id = ?
        `, [pkg.user_id])
      }
    }

    return this.getPackageHistoryById(id)
  }

  async getExpiringPackages(daysAhead = 7) {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + daysAhead)
    const futureDateString = futureDate.toISOString().split('T')[0]
    
    return await this.all(`
      SELECT ph.*, u.nombre, u.correo, u.numero_de_telefono
      FROM package_history ph
      JOIN users u ON ph.user_id = u.id
      WHERE ph.status = 'active' AND ph.end_date <= ? AND ph.end_date >= date('now')
      ORDER BY ph.end_date ASC
    `, [futureDateString])
  }

  // Notification settings methods
  async getNotificationSettings(userId) {
    return await this.get('SELECT * FROM notification_settings WHERE user_id = ?', [userId])
  }

  async updateNotificationSettings(userId, settings) {
    const existing = await this.getNotificationSettings(userId)
    
    if (existing) {
      await this.run(`
        UPDATE notification_settings 
        SET email_notifications = ?, expiration_reminder_days = ?, updated_at = datetime('now')
        WHERE user_id = ?
      `, [settings.email_notifications, settings.expiration_reminder_days, userId])
    } else {
      const id = require('uuid').v4()
      await this.run(`
        INSERT INTO notification_settings (id, user_id, email_notifications, expiration_reminder_days)
        VALUES (?, ?, ?, ?)
      `, [id, userId, settings.email_notifications, settings.expiration_reminder_days])
    }
    
    return this.getNotificationSettings(userId)
  }

  async getUserNotifications(userId, limit = 50) {
    return await this.all(`
      SELECT * FROM notification_log 
      WHERE user_id = ? 
      ORDER BY sent_at DESC 
      LIMIT ?
    `, [userId, limit])
  }

  // Booking methods
  async createBooking(booking) {
    const id = require('uuid').v4()
    
    await this.run(`
      INSERT INTO bookings (id, user_id, class_id, booking_date, occurrence_date, status, payment_method, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, booking.user_id, booking.class_id, booking.booking_date, 
      booking.occurrence_date || null,
      booking.status || 'confirmed', booking.payment_method, booking.notes
    ])
    
    return this.getBookingById(id)
  }

  async getBookingById(id) {
    return await this.get('SELECT * FROM bookings WHERE id = ?', [id])
  }

  async getBookingsByUser(userId) {
    return await this.all(`
      SELECT b.*, c.title, c.date, c.time, c.type, c.coach_id, u.nombre as coach_name
      FROM bookings b
      JOIN classes c ON b.class_id = c.id
      LEFT JOIN users u ON c.coach_id = u.id
      WHERE b.user_id = ?
      ORDER BY c.date DESC, c.time DESC
    `, [userId])
  }

  async getBookingsByClass(classId) {
    return await this.all(`
      SELECT b.*, u.nombre, u.correo, u.numero_de_telefono
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      WHERE b.class_id = ?
      ORDER BY b.created_at ASC
    `, [classId])
  }

  async updateBookingStatus(id, status) {
    await this.run(`
      UPDATE bookings 
      SET status = ?, updated_at = datetime('now')
      WHERE id = ?
    `, [status, id])
    
    return this.getBookingById(id)
  }

  async cancelBooking(id) {
    return await this.updateBookingStatus(id, 'cancelled')
  }

  // Private class request methods
  async createPrivateClassRequest(request) {
    const id = require('uuid').v4()
    
    await this.run(`
      INSERT INTO private_class_requests (id, user_id, requested_date, requested_time, duration, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      id, request.user_id, request.requested_date, request.requested_time, 
      request.duration, request.status || 'pending'
    ])
    
    return this.getPrivateClassRequestById(id)
  }

  async getPrivateClassRequestById(id) {
    return await this.get('SELECT * FROM private_class_requests WHERE id = ?', [id])
  }

  async getPrivateClassRequestsByUser(userId) {
    return await this.all(`
      SELECT pcr.*, u.nombre, u.correo
      FROM private_class_requests pcr
      JOIN users u ON pcr.user_id = u.id
      WHERE pcr.user_id = ?
      ORDER BY pcr.requested_date DESC, pcr.requested_time DESC
    `, [userId])
  }

  async getPendingPrivateClassRequests() {
    return await this.all(`
      SELECT pcr.*, u.nombre, u.correo, u.numero_de_telefono
      FROM private_class_requests pcr
      JOIN users u ON pcr.user_id = u.id
      WHERE pcr.status = 'pending'
      ORDER BY pcr.created_at ASC
    `)
  }

  async updatePrivateClassRequestStatus(id, status, adminNotes = null) {
    await this.run(`
      UPDATE private_class_requests 
      SET status = ?, admin_notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `, [status, adminNotes, id])
    
    return this.getPrivateClassRequestById(id)
  }

  // Helper method to check if user has available classes
  async checkUserAvailableClasses(userId, classType = 'group') {
    const user = await this.getUserById(userId)
    if (!user) return { hasClasses: false, remaining: 0, privateRemaining: 0, groupRemaining: 0 }
    
    const privateRemaining = user.private_classes_remaining || 0
    const groupRemaining = user.group_classes_remaining || 0
    
    if (classType === 'private') {
      return {
        hasClasses: privateRemaining > 0,
        remaining: privateRemaining,
        privateRemaining,
        groupRemaining,
        packageType: user.type_of_class
      }
    } else {
      return {
        hasClasses: groupRemaining > 0,
        remaining: groupRemaining,
        privateRemaining,
        groupRemaining,
        packageType: user.type_of_class
      }
    }
  }

  // Helper method to deduct class from user's package
  async deductClassFromUser(userId, classType = 'group') {
    const user = await this.getUserById(userId)
    if (!user) {
      throw new Error('Usuario no encontrado')
    }
    
    if (classType === 'private') {
      if ((user.private_classes_remaining || 0) <= 0) {
        throw new Error('Usuario no tiene clases privadas disponibles')
      }
      const newRemaining = (user.private_classes_remaining || 0) - 1
      await this.run(`
        UPDATE users 
        SET private_classes_remaining = ?, updated_at = datetime('now')
        WHERE id = ?
      `, [newRemaining, userId])
    } else {
      if ((user.group_classes_remaining || 0) <= 0) {
        throw new Error('Usuario no tiene clases grupales disponibles')
      }
      const newRemaining = (user.group_classes_remaining || 0) - 1
      await this.run(`
        UPDATE users 
        SET group_classes_remaining = ?, updated_at = datetime('now')
        WHERE id = ?
      `, [newRemaining, userId])
    }
    
    return this.getUserById(userId)
  }

  // Helper method to add class back to user's package (for cancellations)
  async addClassToUser(userId, classType = 'group') {
    const user = await this.getUserById(userId)
    if (!user) {
      throw new Error('Usuario no encontrado')
    }
    
    if (classType === 'private') {
      const newRemaining = (user.private_classes_remaining || 0) + 1
      await this.run(`
        UPDATE users 
        SET private_classes_remaining = ?, updated_at = datetime('now')
        WHERE id = ?
      `, [newRemaining, userId])
    } else {
      const newRemaining = (user.group_classes_remaining || 0) + 1
      await this.run(`
        UPDATE users 
        SET group_classes_remaining = ?, updated_at = datetime('now')
        WHERE id = ?
      `, [newRemaining, userId])
    }
    
    return this.getUserById(userId)
  }

  // Get admin setting
  async getAdminSetting(key, defaultValue = null) {
    const setting = await this.get('SELECT * FROM admin_settings WHERE setting_key = ?', [key])
    return setting ? setting.setting_value : defaultValue
  }

  // Update admin setting
  async updateAdminSetting(key, value) {
    const existing = await this.get('SELECT * FROM admin_settings WHERE setting_key = ?', [key])
    if (existing) {
      await this.run(`
        UPDATE admin_settings 
        SET setting_value = ?, updated_at = datetime('now')
        WHERE setting_key = ?
      `, [value, key])
    } else {
      const id = require('uuid').v4()
      await this.run(`
        INSERT INTO admin_settings (id, setting_key, setting_value)
        VALUES (?, ?, ?)
      `, [id, key, value])
    }
  }

  // Helper to ensure user packages are up to date (auto-renewal check)
  // This should be called whenever user status is checked
  async ensureUserPackagesUpToDate(userId, autoRenewDefaultBehavior = null) {
    // Get default behavior from admin settings if not provided
    if (!autoRenewDefaultBehavior) {
      autoRenewDefaultBehavior = await this.getAdminSetting('auto_renew_default_behavior', 'override')
    }

    const user = await this.getUserById(userId)
    if (!user) return

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]

    // Check group package
    const groupPackage = await this.getActivePackageByUser(userId, 'Grupal')
    if (groupPackage && groupPackage.end_date) {
      const endDate = new Date(groupPackage.end_date)
      endDate.setHours(0, 0, 0, 0)
      
      if (endDate < today) {
        // Package expired - set count to 0
        await this.run(`
          UPDATE users 
          SET group_classes_remaining = 0, updated_at = datetime('now')
          WHERE id = ?
        `, [userId])

        // Check if auto-renew is enabled and has renewal months remaining
        if (groupPackage.auto_renew && groupPackage.renewal_months && groupPackage.renewal_months > 0) {
          // Subtract 1 month from renewal_months
          const newRenewalMonths = Math.max(0, groupPackage.renewal_months - 1)
          
          const startDate = new Date(groupPackage.start_date || today)
          const newEndDate = new Date(startDate)
          newEndDate.setDate(newEndDate.getDate() + 30) // 30 days from original start
          
          // Update package end date and renewal_months
          await this.run(`
            UPDATE package_history 
            SET end_date = ?, last_renewal_date = ?, renewal_months = ?, updated_at = datetime('now')
            WHERE id = ?
          `, [newEndDate.toISOString().split('T')[0], todayStr, newRenewalMonths, groupPackage.id])
          
          // If renewal_months reached 0, mark as expired
          if (newRenewalMonths === 0) {
            await this.run(`
              UPDATE package_history 
              SET status = 'expired', updated_at = datetime('now')
              WHERE id = ?
            `, [groupPackage.id])
            return // Don't reset class count if expired
          }

          // Reset class count based on behavior
          const currentCount = user.group_classes_remaining || 0
          let newCount = groupPackage.classes_included
          
          if (autoRenewDefaultBehavior === 'deduct' && currentCount < 0) {
            newCount = groupPackage.classes_included + currentCount // Deduct negative balance
          }
          // else 'override' - just set to classes_included

          await this.run(`
            UPDATE users 
            SET group_classes_remaining = ?, updated_at = datetime('now')
            WHERE id = ?
          `, [newCount, userId])
        } else {
          // Mark as expired
          await this.run(`
            UPDATE package_history 
            SET status = 'expired', updated_at = datetime('now')
            WHERE id = ?
          `, [groupPackage.id])
        }
      }
    }
    // If no active group package but user still has remaining classes, reset to 0
    if (!groupPackage && (user.group_classes_remaining || 0) > 0) {
      await this.run(`
        UPDATE users
        SET group_classes_remaining = 0, updated_at = datetime('now')
        WHERE id = ?
      `, [userId])
    }

    // Check private package
    const privatePackage = await this.getActivePackageByUser(userId, 'Privada')
    if (privatePackage && privatePackage.end_date) {
      const endDate = new Date(privatePackage.end_date)
      endDate.setHours(0, 0, 0, 0)
      
      if (endDate < today) {
        // Package expired - set count to 0
        await this.run(`
          UPDATE users 
          SET private_classes_remaining = 0, updated_at = datetime('now')
          WHERE id = ?
        `, [userId])

        // Check if auto-renew is enabled and has renewal months remaining
        if (privatePackage.auto_renew && privatePackage.renewal_months && privatePackage.renewal_months > 0) {
          // Subtract 1 month from renewal_months
          const newRenewalMonths = Math.max(0, privatePackage.renewal_months - 1)
          
          const startDate = new Date(privatePackage.start_date || today)
          const newEndDate = new Date(startDate)
          newEndDate.setDate(newEndDate.getDate() + 30) // 30 days from original start
          
          // Update package end date and renewal_months
          await this.run(`
            UPDATE package_history 
            SET end_date = ?, last_renewal_date = ?, renewal_months = ?, updated_at = datetime('now')
            WHERE id = ?
          `, [newEndDate.toISOString().split('T')[0], todayStr, newRenewalMonths, privatePackage.id])
          
          // If renewal_months reached 0, mark as expired
          if (newRenewalMonths === 0) {
            await this.run(`
              UPDATE package_history 
              SET status = 'expired', updated_at = datetime('now')
              WHERE id = ?
            `, [privatePackage.id])
            return // Don't reset class count if expired
          }

          // Reset class count based on behavior
          const currentCount = user.private_classes_remaining || 0
          let newCount = privatePackage.classes_included
          
          if (autoRenewDefaultBehavior === 'deduct' && currentCount < 0) {
            newCount = privatePackage.classes_included + currentCount // Deduct negative balance
          }
          // else 'override' - just set to classes_included

          await this.run(`
            UPDATE users 
            SET private_classes_remaining = ?, updated_at = datetime('now')
            WHERE id = ?
          `, [newCount, userId])
        } else {
          // Mark as expired
          await this.run(`
            UPDATE package_history 
            SET status = 'expired', updated_at = datetime('now')
            WHERE id = ?
          `, [privatePackage.id])
        }
      }
    }
    // If no active private package but user still has remaining classes, reset to 0
    if (!privatePackage && (user.private_classes_remaining || 0) > 0) {
      await this.run(`
        UPDATE users
        SET private_classes_remaining = 0, updated_at = datetime('now')
        WHERE id = ?
      `, [userId])
    }
  }

  // User statistics methods
  async updateUserStats(userId) {
    // Get total classes taken
    const classesTaken = await this.get(`
      SELECT COUNT(*) as count FROM class_history 
      WHERE user_id = ? AND status = 'attended'
    `, [userId])
    
    // Get total paid
    const totalPaid = await this.get(`
      SELECT SUM(amount) as total FROM payment_history 
      WHERE user_id = ?
    `, [userId])
    
    // Get remaining classes (this would need to be calculated based on package)
    const user = await this.getUserById(userId)
    const remainingClasses = user.type_of_class === 'Clases Grupales Ilimitadas' ? 999 : 
                           user.type_of_class === 'Sin paquete' ? 0 : 
                           Math.max(0, this.getPackageClasses(user.type_of_class) - (classesTaken.count || 0))
    
    // Update user stats
    await this.run(`
      UPDATE users 
      SET clases_tomadas = ?, clases_restantes = ?, total_pagado = ?, updated_at = datetime('now')
      WHERE id = ?
    `, [classesTaken.count || 0, remainingClasses, totalPaid.total || 0, userId])
    
    return this.getUserById(userId)
  }

  getPackageClasses(packageType) {
    const packageClasses = {
      'Clase Prueba': 1,
      '1 Clase Grupal': 1,
      '4 Clases Grupales': 4,
      '8 Clases Grupales': 8,
      '12 Clases Grupales': 12,
      'Clases Grupales Ilimitadas': 999,
      '1 Clase Privada': 1,
      '4 Clases Privadas': 4,
      '8 Clases Privadas': 8,
      '12 Clases Privadas': 12,
      '16 Clases Privadas': 16,
      '20 Clases Privadas': 20
    }
    return packageClasses[packageType] || 0
  }

  // Attendance methods
  async recordAttendance(attendance) {
    const id = require('uuid').v4()
    
    await this.run(`
      INSERT INTO attendance (
        id, classId, className, date, time, coach, clientId, clientName, status, reason, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, attendance.classId, attendance.className, attendance.date, attendance.time,
      attendance.coach, attendance.clientId, attendance.clientName, attendance.status,
      attendance.reason, attendance.notes
    ])
    
    return this.getAttendanceById(id)
  }

  async getAttendanceById(id) {
    return await this.get('SELECT * FROM attendance WHERE id = ?', [id])
  }

  async getAttendanceByClass(classId) {
    return await this.all('SELECT * FROM attendance WHERE classId = ?', [classId])
  }

  // Payment methods
  async createPayment(payment) {
    const id = require('uuid').v4()
    
    await this.run(`
      INSERT INTO payments (
        id, date, concept, amount, type, method, status, client_name, coach_name, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, payment.date, payment.concept, payment.amount,
      payment.type, payment.method, payment.status || 'pending', 
      payment.client_name, payment.coach_name, payment.description
    ])
    
    return this.getPaymentById(id)
  }

  async getPaymentById(id) {
    return await this.get('SELECT * FROM payments WHERE id = ?', [id])
  }

  async getPaymentsByCoach(coachName) {
    return await this.all('SELECT * FROM payments WHERE coach_name = ? ORDER BY created_at DESC', [coachName])
  }

  async getPendingPayments() {
    return await this.all('SELECT * FROM payments WHERE status = "pending" ORDER BY created_at DESC')
  }

  // Financial records methods
  async createFinancialRecord(record) {
    const id = require('uuid').v4()
    
    await this.run(`
      INSERT INTO financial_records (
        id, date, concept, amount, type, method, note, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, record.date, record.concept, record.amount,
      record.type, record.method, record.note, record.status || 'pending'
    ])
    
    return this.getFinancialRecordById(id)
  }

  async getFinancialRecordById(id) {
    return await this.get('SELECT * FROM financial_records WHERE id = ?', [id])
  }

  async getFinancialRecordsByDateRange(startDate, endDate) {
    return await this.all(
      'SELECT * FROM financial_records WHERE date BETWEEN ? AND ? ORDER BY date DESC',
      [startDate, endDate]
    )
  }

  // Password reset tokens methods
  async getResetTokenByTokenAndUser(token, userId) {
    return await this.get(`
      SELECT * FROM password_reset_tokens
      WHERE token = ? AND user_id = ? AND used = 0
      ORDER BY created_at DESC
      LIMIT 1
    `, [token, userId])
  }

  async markResetTokenAsUsed(id) {
    await this.run('UPDATE password_reset_tokens SET used = 1 WHERE id = ?', [id])
  }

  // Close database connection
  close() {
    this.db.close()
  }
}

module.exports = { database: new Database() }
