import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { User } from '@/types'

const JWT_SECRET = process.env.JWT_SECRET || 'pilates-mermaid-secret-key-2024'
// Tokens do not expire - users stay logged in indefinitely until they log out

export class AuthService {
  // Password hashing
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12
    return await bcrypt.hash(password, saltRounds)
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash)
  }

  // JWT token management - tokens do not expire
  static generateToken(user: User): string {
    return jwt.sign(
      { 
        id: user.id, 
        email: user.correo, 
        role: user.role
      },
      JWT_SECRET
      // No expiresIn - tokens never expire
    )
  }

  static verifyToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET)
    } catch (error) {
      return null
    }
  }


  // Password validation
  static validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (password.length < 8) {
      errors.push('La contraseña debe tener al menos 8 caracteres')
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('La contraseña debe contener al menos una letra mayúscula')
    }

    if (!/[a-z]/.test(password)) {
      errors.push('La contraseña debe contener al menos una letra minúscula')
    }

    if (!/[0-9]/.test(password)) {
      errors.push('La contraseña debe contener al menos un número')
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('La contraseña debe contener al menos un carácter especial')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Email validation
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Phone validation (Mexican format)
  static validatePhone(phone: string): boolean {
    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, '')
    
    // Check if it's a valid Mexican phone number (10 digits)
    if (cleanPhone.length === 10) {
      return true
    }
    
    // Check if it's a valid Mexican phone number with country code (12 digits)
    if (cleanPhone.length === 12 && cleanPhone.startsWith('52')) {
      return true
    }
    
    return false
  }

  // Role-based access control
  static hasPermission(userRole: string, requiredRole: string): boolean {
    const roleHierarchy = {
      'admin': 3,
      'coach': 2,
      'cliente': 1
    }

    return roleHierarchy[userRole as keyof typeof roleHierarchy] >= 
           roleHierarchy[requiredRole as keyof typeof roleHierarchy]
  }

  // Generate secure random string
  static generateSecureToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  // Session management
  static createSession(user: User): {
    token: string
    user: Omit<User, 'password_hash'>
  } {
    const token = this.generateToken(user)
    const { password_hash, ...userWithoutSecrets } = user

    return {
      token,
      user: userWithoutSecrets
    }
  }

  // Token refresh (not needed since tokens don't expire, but kept for compatibility)
  static refreshToken(oldToken: string): string | null {
    const decoded = this.verifyToken(oldToken)
    if (!decoded) return null

    // Create new token with same payload
    return jwt.sign(
      { 
        id: decoded.id, 
        email: decoded.email, 
        role: decoded.role
      },
      JWT_SECRET
      // No expiresIn - tokens never expire
    )
  }
}

// Middleware for protecting routes
export const requireAuth = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Token de acceso requerido' })
  }

  const decoded = AuthService.verifyToken(token)
  if (!decoded) {
    return res.status(401).json({ success: false, message: 'Token inválido' })
  }

  req.user = decoded
  next()
}

// Middleware for role-based access
export const requireRole = (roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Usuario no autenticado' })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Permisos insuficientes' })
    }

    next()
  }
}



