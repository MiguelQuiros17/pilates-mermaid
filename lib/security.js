// Security utilities and middleware
const crypto = require('crypto')
const validator = require('validator')

class SecurityService {
  // Input sanitization
  static sanitizeInput(input) {
    if (typeof input !== 'string') return input
    
    // Remove null bytes
    input = input.replace(/\0/g, '')
    
    // Remove script tags and event handlers
    input = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    input = input.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    
    // Escape HTML entities
    input = validator.escape(input)
    
    // Trim whitespace
    input = input.trim()
    
    return input
  }

  // Sanitize object recursively
  static sanitizeObject(obj) {
    if (obj === null || obj === undefined) return obj
    if (typeof obj !== 'object') return this.sanitizeInput(String(obj))
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item))
    }
    
    const sanitized = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const sanitizedKey = this.sanitizeInput(key)
        sanitized[sanitizedKey] = this.sanitizeObject(obj[key])
      }
    }
    
    return sanitized
  }

  // Validate email
  static validateEmail(email) {
    if (!email || typeof email !== 'string') return false
    return validator.isEmail(email) && email.length <= 255
  }

  // Validate phone number
  static validatePhone(phone) {
    if (!phone || typeof phone !== 'string') return false
    const cleanPhone = phone.replace(/\D/g, '')
    return cleanPhone.length >= 10 && cleanPhone.length <= 15
  }

  // Validate role
  static validateRole(role) {
    const validRoles = ['admin', 'coach', 'cliente']
    return validRoles.includes(role)
  }

  // Validate UUID
  static validateUUID(uuid) {
    if (!uuid || typeof uuid !== 'string') return false
    return validator.isUUID(uuid)
  }

  // Validate date
  static validateDate(date) {
    if (!date) return false
    if (typeof date !== 'string') return false
    const dateObj = new Date(date)
    return dateObj instanceof Date && !isNaN(dateObj.getTime())
  }

  // Validate number
  static validateNumber(num, min = null, max = null) {
    if (typeof num !== 'number' && typeof num !== 'string') return false
    const number = Number(num)
    if (isNaN(number)) return false
    if (min !== null && number < min) return false
    if (max !== null && number > max) return false
    return true
  }

  // Generate CSRF token
  static generateCSRFToken() {
    return crypto.randomBytes(32).toString('hex')
  }

  // Hash sensitive data
  static hashData(data) {
    return crypto.createHash('sha256').update(data).digest('hex')
  }

  // Generate secure random string
  static generateSecureString(length = 32) {
    return crypto.randomBytes(length).toString('hex')
  }

  // Validate password strength
  static validatePasswordStrength(password) {
    if (!password || typeof password !== 'string') {
      return { isValid: false, errors: ['La contraseña es requerida'] }
    }

    const errors = []

    if (password.length < 12) {
      errors.push('La contraseña debe tener al menos 12 caracteres')
    }

    if (password.length > 128) {
      errors.push('La contraseña no puede exceder 128 caracteres')
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

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('La contraseña debe contener al menos un carácter especial')
    }

    // Check for common passwords
    const commonPasswords = [
      'password', '123456', '12345678', 'qwerty', 'abc123',
      'monkey', '1234567', 'letmein', 'trustno1', 'dragon',
      'baseball', 'iloveyou', 'master', 'sunshine', 'ashley',
      'bailey', 'passw0rd', 'shadow', '123123', '654321',
      'superman', 'qazwsx', 'michael', 'football', 'welcome'
    ]

    if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
      errors.push('La contraseña no puede contener palabras comunes')
    }

    // Check for repeated characters
    if (/(.)\1{3,}/.test(password)) {
      errors.push('La contraseña no puede contener caracteres repetidos más de 3 veces')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Check for SQL injection patterns
  static detectSQLInjection(input) {
    if (typeof input !== 'string') return false
    
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/gi,
      /(--|#|\/\*|\*\/|;)/g,
      /(OR|AND)\s+\d+\s*=\s*\d+/gi,
      /(OR|AND)\s+['"]\s*=\s*['"]/gi,
      /(UNION\s+SELECT|UNION\s+ALL\s+SELECT)/gi
    ]
    
    return sqlPatterns.some(pattern => pattern.test(input))
  }

  // Check for XSS patterns
  static detectXSS(input) {
    if (typeof input !== 'string') return false
    
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /<object[^>]*>.*?<\/object>/gi,
      /<embed[^>]*>.*?<\/embed>/gi,
      /on\w+\s*=\s*["'][^"']*["']/gi,
      /javascript:/gi,
      /data:text\/html/gi
    ]
    
    return xssPatterns.some(pattern => pattern.test(input))
  }

  // Validate and sanitize user input
  static validateAndSanitize(input, type = 'string', options = {}) {
    if (input === null || input === undefined) {
      return options.required ? null : input
    }

    // Sanitize first
    let sanitized = this.sanitizeInput(String(input))

    // Check for malicious patterns
    if (this.detectSQLInjection(sanitized) || this.detectXSS(sanitized)) {
      throw new Error('Input contains potentially malicious content')
    }

    // Validate by type
    switch (type) {
      case 'email':
        if (!this.validateEmail(sanitized)) {
          throw new Error('Invalid email format')
        }
        break
      case 'phone':
        if (!this.validatePhone(sanitized)) {
          throw new Error('Invalid phone number format')
        }
        break
      case 'role':
        if (!this.validateRole(sanitized)) {
          throw new Error('Invalid role')
        }
        break
      case 'uuid':
        if (!this.validateUUID(sanitized)) {
          throw new Error('Invalid UUID format')
        }
        break
      case 'date':
        if (!this.validateDate(sanitized)) {
          throw new Error('Invalid date format')
        }
        break
      case 'number':
        if (!this.validateNumber(sanitized, options.min, options.max)) {
          throw new Error('Invalid number')
        }
        sanitized = Number(sanitized)
        break
      case 'string':
        if (options.minLength && sanitized.length < options.minLength) {
          throw new Error(`String must be at least ${options.minLength} characters`)
        }
        if (options.maxLength && sanitized.length > options.maxLength) {
          throw new Error(`String must be at most ${options.maxLength} characters`)
        }
        break
    }

    return sanitized
  }

  // Get client IP address
  static getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.headers['x-real-ip'] ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           req.ip ||
           'unknown'
  }

  // Check if IP is blocked (simple in-memory cache, in production use Redis)
  static blockedIPs = new Map()

  static blockIP(ip, duration = 60 * 60 * 1000) { // 1 hour default
    this.blockedIPs.set(ip, Date.now() + duration)
  }

  static unblockIP(ip) {
    this.blockedIPs.delete(ip)
  }

  static clearBlockedIPs() {
    this.blockedIPs.clear()
  }

  static isIPBlocked(ip) {
    const blockedUntil = this.blockedIPs.get(ip)
    if (!blockedUntil) return false
    if (Date.now() > blockedUntil) {
      this.blockedIPs.delete(ip)
      return false
    }
    return true
  }

  // Log security event
  static logSecurityEvent(event, details = {}) {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      event,
      details: JSON.stringify(details)
    }
    
    // In production, send to logging service
    console.error(`[SECURITY] ${timestamp} - ${event}`, details)
    
    // Could also write to file or send to monitoring service
    try {
      const fs = require('fs')
      const path = require('path')
      const logFile = path.join(process.cwd(), 'logs', 'security.log')
      const logDir = path.dirname(logFile)
      
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true })
      }
      
      fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n')
    } catch (error) {
      // Log file writing failed, but don't crash
      console.error('Failed to write security log:', error)
    }
  }
}

module.exports = { SecurityService }



