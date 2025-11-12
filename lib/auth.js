const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'pilates-mermaid-secret-key-2024'
const JWT_EXPIRES_IN = '7d'

class AuthService {
  // Password hashing
  static async hashPassword(password) {
    const saltRounds = 12
    return await bcrypt.hash(password, saltRounds)
  }

  static async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash)
  }

  // JWT token management
  static generateToken(user) {
    return jwt.sign(
      { 
        id: user.id, 
        email: user.correo, 
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )
  }

  static verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET)
    } catch (error) {
      return null
    }
  }


  // Password validation (using SecurityService for stronger validation)
  static validatePassword(password) {
    const { SecurityService } = require('./security.js')
    return SecurityService.validatePasswordStrength(password)
  }

  // Email validation
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Phone validation (Mexican format)
  static validatePhone(phone) {
    const cleanPhone = phone.replace(/\D/g, '')
    
    if (cleanPhone.length === 10) {
      return true
    }
    
    if (cleanPhone.length === 12 && cleanPhone.startsWith('52')) {
      return true
    }
    
    return false
  }

  // Role-based access control
  static hasPermission(userRole, requiredRole) {
    const roleHierarchy = {
      'admin': 3,
      'coach': 2,
      'cliente': 1
    }

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
  }

  // Generate secure random string
  static generateSecureToken(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  // Session management
  static createSession(user) {
    const token = this.generateToken(user)
    const { password_hash, ...userWithoutSecrets } = user

    return {
      token,
      user: userWithoutSecrets
    }
  }

  // Token refresh
  static refreshToken(oldToken) {
    const decoded = this.verifyToken(oldToken)
    if (!decoded) return null

    return jwt.sign(
      { 
        id: decoded.id, 
        email: decoded.email, 
        role: decoded.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )
  }
}

// Middleware for protecting routes
const requireAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token de acceso requerido' })
    }

    // Verify token
    const decoded = AuthService.verifyToken(token)
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Token inválido o expirado' })
    }

    // Verify user still exists in database and get fresh user data
    const { database } = require('./database.js')
    const user = await database.getUserById(decoded.id)
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Usuario no encontrado' })
    }

    // Check if user is still active (you can add an active field to users table)
    // if (user.status !== 'active') {
    //   return res.status(401).json({ success: false, message: 'Usuario inactivo' })
    // }

    // Verify role hasn't changed (prevent role escalation)
    if (user.role !== decoded.role) {
      // Log security event
      const { SecurityService } = require('./security.js')
      SecurityService.logSecurityEvent('ROLE_MISMATCH', {
        userId: decoded.id,
        tokenRole: decoded.role,
        dbRole: user.role,
        ip: SecurityService.getClientIP(req)
      })
      
      return res.status(403).json({ success: false, message: 'Sesión inválida. Por favor, inicia sesión nuevamente.' })
    }

    // Attach user data to request
    req.user = {
      id: user.id,
      email: user.correo,
      role: user.role,
      // Store full user object for database operations
      _user: user
    }
    
    next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    return res.status(500).json({ success: false, message: 'Error de autenticación' })
  }
}

// Middleware for role-based access
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Usuario no autenticado' })
    }

    // Verify roles is an array
    if (!Array.isArray(roles)) {
      return res.status(500).json({ success: false, message: 'Error de configuración del servidor' })
    }

    // Check if user role is in allowed roles
    if (!roles.includes(req.user.role)) {
      // Log unauthorized access attempt
      const { SecurityService } = require('./security.js')
      SecurityService.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: roles,
        path: req.path,
        method: req.method,
        ip: SecurityService.getClientIP(req)
      })
      
      return res.status(403).json({ 
        success: false, 
        message: 'No tienes permisos para acceder a este recurso' 
      })
    }

    next()
  }
}

module.exports = { AuthService, requireAuth, requireRole }


