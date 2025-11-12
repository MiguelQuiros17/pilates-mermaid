import sqlite3 from 'sqlite3'
import { promisify } from 'util'
import path from 'path'
import { User, Class, Package, Attendance, Payment, FinancialRecord } from '@/types'

const DB_PATH = path.join(process.cwd(), 'data', 'pilates_mermaid.db')

class Database {
  private db: sqlite3.Database

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

  private async initTables() {
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
        duration INTEGER NOT NULL,
        max_capacity INTEGER NOT NULL,
        current_bookings INTEGER DEFAULT 0,
        status TEXT NOT NULL CHECK (status IN ('scheduled', 'completed', 'cancelled')),
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (coach_id) REFERENCES users (id)
      )
    `)

    // Packages table
    await run(`
      CREATE TABLE IF NOT EXISTS packages (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        classes_included INTEGER NOT NULL,
        price REAL NOT NULL,
        validity_days INTEGER NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Class history table
    await run(`
      CREATE TABLE IF NOT EXISTS class_history (
        id TEXT PRIMARY KEY,
        class_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('confirmed', 'attended', 'no_show', 'cancelled')),
        cancellation_reason TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (class_id) REFERENCES classes (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `)

    // Attendance table
    await run(`
      CREATE TABLE IF NOT EXISTS attendance (
        id TEXT PRIMARY KEY,
        class_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        coach_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('attended', 'no_show')),
        cancellation_reason TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (class_id) REFERENCES classes (id),
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (coach_id) REFERENCES users (id)
      )
    `)

    // Payments table
    await run(`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        coach_id TEXT NOT NULL,
        class_id TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('class_payment', 'bonus')),
        status TEXT NOT NULL CHECK (status IN ('pending', 'paid')),
        payment_date TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (coach_id) REFERENCES users (id),
        FOREIGN KEY (class_id) REFERENCES classes (id)
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
    await run(`CREATE INDEX IF NOT EXISTS idx_attendance_class ON attendance (class_id)`)
    await run(`CREATE INDEX IF NOT EXISTS idx_payments_coach ON payments (coach_id)`)

    console.log('Database tables initialized successfully')
  }

  // Generic query methods
  async run(sql: string, params: any[] = []): Promise<any> {
    const run = promisify(this.db.run.bind(this.db))
    return await run(sql, params)
  }

  async get(sql: string, params: any[] = []): Promise<any> {
    const get = promisify(this.db.get.bind(this.db))
    return await get(sql, params)
  }

  async all(sql: string, params: any[] = []): Promise<any[]> {
    const all = promisify(this.db.all.bind(this.db))
    return await all(sql, params)
  }

  // User methods
  async createUser(user: Partial<User> & { password_hash: string }): Promise<User> {
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

  async getUserById(id: string): Promise<User | null> {
    const user = await this.get('SELECT * FROM users WHERE id = ?', [id])
    if (!user) return null
    
    const historial_de_clases = await this.all(
      'SELECT * FROM class_history WHERE user_id = ? ORDER BY created_at DESC',
      [id]
    )
    
    return {
      ...user,
      historial_de_clases
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const user = await this.get('SELECT * FROM users WHERE correo = ?', [email])
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

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const fields = Object.keys(updates).filter(key => key !== 'id' && key !== 'historial_de_clases')
    const values = fields.map(field => updates[field as keyof User])
    
    if (fields.length === 0) return this.getUserById(id)
    
    const setClause = fields.map(field => `${field} = ?`).join(', ')
    await this.run(
      `UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [...values, id]
    )
    
    return this.getUserById(id)
  }

  async getAllUsers(role?: string): Promise<User[]> {
    let sql = 'SELECT * FROM users'
    let params: any[] = []
    
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

  // Class methods
  async createClass(classData: Partial<Class>): Promise<Class> {
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

  async getClassById(id: string): Promise<Class | null> {
    return await this.get('SELECT * FROM classes WHERE id = ?', [id])
  }

  async getClassesByDateRange(startDate: string, endDate: string): Promise<Class[]> {
    return await this.all(
      'SELECT * FROM classes WHERE date BETWEEN ? AND ? ORDER BY date, time',
      [startDate, endDate]
    )
  }

  async getClassesByCoach(coachId: string, startDate?: string, endDate?: string): Promise<Class[]> {
    let sql = 'SELECT * FROM classes WHERE coach_id = ?'
    let params: any[] = [coachId]
    
    if (startDate && endDate) {
      sql += ' AND date BETWEEN ? AND ?'
      params.push(startDate, endDate)
    }
    
    sql += ' ORDER BY date, time'
    
    return await this.all(sql, params)
  }

  async updateClass(id: string, updates: Partial<Class>): Promise<Class | null> {
    const fields = Object.keys(updates).filter(key => key !== 'id')
    const values = fields.map(field => updates[field as keyof Class])
    
    if (fields.length === 0) return this.getClassById(id)
    
    const setClause = fields.map(field => `${field} = ?`).join(', ')
    await this.run(
      `UPDATE classes SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [...values, id]
    )
    
    return this.getClassById(id)
  }

  // Package methods
  async createPackage(packageData: Partial<Package>): Promise<Package> {
    const id = require('uuid').v4()
    
    await this.run(`
      INSERT INTO packages (
        id, name, type, classes_included, price, validity_days, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      id, packageData.name, packageData.type, packageData.classes_included,
      packageData.price, packageData.validity_days, packageData.is_active || true
    ])
    
    return this.getPackageById(id)
  }

  async getPackageById(id: string): Promise<Package | null> {
    return await this.get('SELECT * FROM packages WHERE id = ?', [id])
  }

  async getAllPackages(): Promise<Package[]> {
    return await this.all('SELECT * FROM packages WHERE is_active = 1 ORDER BY classes_included')
  }

  async updatePackage(id: string, updates: Partial<Package>): Promise<Package | null> {
    const fields = Object.keys(updates).filter(key => key !== 'id')
    const values = fields.map(field => updates[field as keyof Package])
    
    if (fields.length === 0) return this.getPackageById(id)
    
    const setClause = fields.map(field => `${field} = ?`).join(', ')
    await this.run(
      `UPDATE packages SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [...values, id]
    )
    
    return this.getPackageById(id)
  }

  // Attendance methods
  async recordAttendance(attendance: Partial<Attendance>): Promise<Attendance> {
    const id = require('uuid').v4()
    
    await this.run(`
      INSERT INTO attendance (
        id, class_id, user_id, coach_id, status, cancellation_reason, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      id, attendance.class_id, attendance.user_id, attendance.coach_id,
      attendance.status, attendance.cancellation_reason, attendance.notes
    ])
    
    return this.getAttendanceById(id)
  }

  async getAttendanceById(id: string): Promise<Attendance | null> {
    return await this.get('SELECT * FROM attendance WHERE id = ?', [id])
  }

  async getAttendanceByClass(classId: string): Promise<Attendance[]> {
    return await this.all('SELECT * FROM attendance WHERE class_id = ?', [classId])
  }

  // Payment methods
  async createPayment(payment: Partial<Payment>): Promise<Payment> {
    const id = require('uuid').v4()
    
    await this.run(`
      INSERT INTO payments (
        id, coach_id, class_id, amount, type, status, payment_date, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, payment.coach_id, payment.class_id, payment.amount,
      payment.type, payment.status || 'pending', payment.payment_date, payment.notes
    ])
    
    return this.getPaymentById(id)
  }

  async getPaymentById(id: string): Promise<Payment | null> {
    return await this.get('SELECT * FROM payments WHERE id = ?', [id])
  }

  async getPaymentsByCoach(coachId: string): Promise<Payment[]> {
    return await this.all('SELECT * FROM payments WHERE coach_id = ? ORDER BY created_at DESC', [coachId])
  }

  async getPendingPayments(): Promise<Payment[]> {
    return await this.all('SELECT * FROM payments WHERE status = "pending" ORDER BY created_at DESC')
  }

  // Financial records methods
  async createFinancialRecord(record: Partial<FinancialRecord>): Promise<FinancialRecord> {
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

  async getFinancialRecordById(id: string): Promise<FinancialRecord | null> {
    return await this.get('SELECT * FROM financial_records WHERE id = ?', [id])
  }

  async getFinancialRecordsByDateRange(startDate: string, endDate: string): Promise<FinancialRecord[]> {
    return await this.all(
      'SELECT * FROM financial_records WHERE date BETWEEN ? AND ? ORDER BY date DESC',
      [startDate, endDate]
    )
  }

  // Close database connection
  close() {
    this.db.close()
  }
}

export const database = new Database()


