const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const { body, validationResult } = require('express-validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')
const path = require('path')
const fs = require('fs')

// Import database and auth utilities
const { database } = require('../lib/database.js')
const { AuthService, requireAuth, requireRole } = require('../lib/auth.js')
const { SecurityService } = require('../lib/security.js')
const { WhatsAppService } = require('../lib/whatsapp.js')
const { EmailService } = require('../lib/email.js')

const app = express()
const PORT = process.env.PORT || 3001

// Initialize email service
const emailService = new EmailService()

// Security middleware - Enhanced
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", API_BASE_URL, "http://localhost:3001", "http://127.0.0.1:3001"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  xFrameOptions: { action: 'deny' },
  xContentTypeOptions: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permittedCrossDomainPolicies: false,
  crossOriginEmbedderPolicy: false, // Disable for compatibility
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  originAgentCluster: true
}))

const DEFAULT_DEV_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000']
const DEFAULT_PROD_ORIGINS = [
    'https://pilatesmermaid.com',
    'https://www.pilatesmermaid.com',
    // 👇 IMPORTANT: allow the Railway app host too
    'https://pilates-mermaid-production.up.railway.app'
]

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!origin) {
            return callback(null, true)
        }

        const allowedFromEnv = process.env.CORS_ORIGIN
            ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
            : null

        const allowedOrigins = allowedFromEnv || (
            process.env.NODE_ENV === 'production'
                ? DEFAULT_PROD_ORIGINS
                : DEFAULT_DEV_ORIGINS
        )

        if (allowedOrigins.includes(origin)) {
            return callback(null, true)
        }

        // In non-prod, be permissive so you don't lock yourself out while testing
        if (process.env.NODE_ENV !== 'production') {
            console.warn('[CORS] Temporarily allowing unknown origin in non-prod:', origin)
            return callback(null, true)
        }

        // Prod: log and reject
        SecurityService.logSecurityEvent('UNAUTHORIZED_ORIGIN', {
            origin,
            ip: SecurityService.getClientIP({ headers: { origin }, ip: origin })
        })
        return callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: [],
    maxAge: 86400 // 24 hours
}))

// Rate limiting por IP
const createRateLimit = require('express-rate-limit')
const generalRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 500, // máximo 500 requests por IP por ventana (aumentado de 100)
  message: {
    success: false,
    message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // No contar requests exitosos
})

app.use('/api/', generalRateLimit)

// Rate limiting para login - más estricto
const loginRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // máximo 10 intentos de login por IP por ventana
  message: {
    success: false,
    message: 'Demasiados intentos de login, intenta de nuevo en 15 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // No contar requests exitosos
  skipFailedRequests: false,
  handler: (req, res) => {
    // Log rate limit violation
    const clientIP = SecurityService.getClientIP(req)
    SecurityService.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
      path: req.path,
      method: req.method,
      ip: clientIP,
      userAgent: req.get('user-agent')
    })
    
    res.status(429).json({
      success: false,
      message: 'Demasiados intentos de login. Por favor, intenta de nuevo en 15 minutos.'
    })
  }
})

// Rate limiting para registro - más permisivo (no bloquea IP)
const registerRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 20, // máximo 20 intentos de registro por IP por hora
  message: {
    success: false,
    message: 'Demasiados intentos de registro, intenta de nuevo más tarde'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // No contar registros exitosos
  skipFailedRequests: false,
  handler: (req, res) => {
    // Log rate limit violation pero NO bloquear IP
    const clientIP = SecurityService.getClientIP(req)
    SecurityService.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
      path: req.path,
      method: req.method,
      ip: clientIP,
      userAgent: req.get('user-agent')
    })
    
    // NO bloquear IP para registro - solo mostrar mensaje
    res.status(429).json({
      success: false,
      message: 'Demasiados intentos de registro. Por favor, intenta de nuevo en una hora.'
    })
  }
})

// Rate limiting para rutas de administración - muy permisivo
const adminRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 200, // máximo 200 requests por IP por minuto (más de 3 por segundo)
  message: {
    success: false,
    message: 'Demasiadas solicitudes, intenta de nuevo más tarde'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // No contar requests exitosos
  handler: (req, res) => {
    const clientIP = SecurityService.getClientIP(req)
    SecurityService.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
      path: req.path,
      method: req.method,
      ip: clientIP
    })
    res.status(429).json({
      success: false,
      message: 'Demasiadas solicitudes. Por favor, espera un momento antes de intentar de nuevo.'
    })
  }
})

// Stricter rate limiting for sensitive endpoints (pagos)
const strictRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // máximo 20 requests por IP por ventana (aumentado de 10)
  message: {
    success: false,
    message: 'Demasiadas solicitudes, intenta de nuevo más tarde'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // No contar requests exitosos
  handler: (req, res) => {
    const clientIP = SecurityService.getClientIP(req)
    SecurityService.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
      path: req.path,
      method: req.method,
      ip: clientIP
    })
    res.status(429).json({
      success: false,
      message: 'Demasiadas solicitudes desde esta IP'
    })
  }
})

app.use('/api/auth/login', loginRateLimit)
app.use('/api/auth/register', registerRateLimit)
// Rate limiting más permisivo para rutas de usuarios (gestión de clientes, etc.)
app.use('/api/users', adminRateLimit)
// Rate limiting estricto solo para pagos
app.use('/api/payments', strictRateLimit)
app.use('/api/coach-payments', strictRateLimit)

// Rate limiting - Temporarily disabled for development
/*
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (increased for development)
  message: {
    success: false,
    message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false
})
app.use('/api/', limiter)
*/

// Body parsing middleware with size limits
app.use(express.json({ 
  limit: '1mb', // Reduced from 10mb for security
  strict: true,
  type: 'application/json'
}))
app.use(express.urlencoded({ 
  extended: false, // Changed to false for security (no nested objects)
  limit: '1mb',
  parameterLimit: 50 // Limit number of parameters
}))

// IP blocking check middleware - NO bloquear rutas de registro/login
app.use((req, res, next) => {
  const clientIP = SecurityService.getClientIP(req)
  
  // NO bloquear IPs en rutas de registro o login - permitir que los usuarios se registren
  // Solo verificar bloqueo para otras rutas sensibles
  if (req.path !== '/api/auth/register' && req.path !== '/api/auth/login') {
    if (SecurityService.isIPBlocked(clientIP)) {
      SecurityService.logSecurityEvent('BLOCKED_IP_ACCESS', {
        ip: clientIP,
        path: req.path,
        method: req.method
      })
      return res.status(403).json({
        success: false,
        message: 'Tu IP ha sido bloqueada debido a actividad sospechosa'
      })
    }
  }
  
  next()
})

// Input sanitization middleware - Skip for auth endpoints to avoid false positives
app.use((req, res, next) => {
  // Skip aggressive sanitization for registration/login - rely on express-validator instead
  if (req.path === '/api/auth/register' || req.path === '/api/auth/login') {
    // Only basic trimming for auth endpoints - no HTML escaping or SQL injection detection
    if (req.body && typeof req.body === 'object') {
      try {
        // Only trim strings, preserve all other data
        for (const key in req.body) {
          if (typeof req.body[key] === 'string') {
            req.body[key] = req.body[key].trim()
          }
        }
      } catch (error) {
        // Don't block on sanitization errors for auth endpoints
        console.error('Sanitization error (non-blocking):', error)
      }
    }
    return next()
  }
  
  // Full sanitization for other endpoints
  if (req.body && typeof req.body === 'object') {
    try {
      req.body = SecurityService.sanitizeObject(req.body)
    } catch (error) {
      SecurityService.logSecurityEvent('SANITIZATION_ERROR', {
        error: error.message,
        path: req.path,
        ip: SecurityService.getClientIP(req)
      })
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos'
      })
    }
  }
  
  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    try {
      req.query = SecurityService.sanitizeObject(req.query)
    } catch (error) {
      SecurityService.logSecurityEvent('SANITIZATION_ERROR', {
        error: error.message,
        path: req.path,
        ip: SecurityService.getClientIP(req)
      })
      return res.status(400).json({
        success: false,
        message: 'Parámetros de consulta inválidos'
      })
    }
  }
  
  next()
})

// Request logging middleware - Enhanced
app.use((req, res, next) => {
  const clientIP = SecurityService.getClientIP(req)
  const timestamp = new Date().toISOString()
  
  // Log all requests for security monitoring
  if (process.env.NODE_ENV === 'production' || req.path.includes('/api/auth')) {
    console.log(`${timestamp} - ${req.method} ${req.path} - IP: ${clientIP}`)
  }
  
  next()
})

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'PilatesMermaid API'
  })
})

// Root endpoint - API information
app.get('/', (req, res) => {
  res.json({
    service: 'PilatesMermaid API Server',
    status: 'running',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        verify: 'GET /api/auth/verify'
      },
      info: 'This is the API server. The frontend runs on port 3000 in development mode.'
    },
    timestamp: new Date().toISOString()
  })
})

// Auth endpoints
// Middleware to preserve original email before validation
const preserveOriginalEmail = (req, res, next) => {
  if (req.body.correo) {
    req.originalEmail = String(req.body.correo)
    console.log('📧 [preserveOriginalEmail] Captured correo:', req.originalEmail)
  }
  if (req.body.email) {
    req.originalEmail = String(req.body.email)
    console.log('📧 [preserveOriginalEmail] Captured email:', req.originalEmail)
  }
  next()
}

app.post('/api/auth/register', preserveOriginalEmail, [
  body('nombre').notEmpty().withMessage('El nombre es requerido').isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('correo').custom((value) => {
    if (!value || typeof value !== 'string') {
      throw new Error('Email inválido')
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value.trim())) {
      throw new Error('Email inválido')
    }
    // CRITICAL: Return true without modifying the value
    return true
  }).withMessage('Email inválido'),
  body('numero_de_telefono').notEmpty().withMessage('El teléfono es requerido').custom((value) => {
    const cleanPhone = value.replace(/\D/g, '')
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      throw new Error('El teléfono debe tener entre 10 y 15 dígitos')
    }
    return true
  }),
  body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
  body('role').optional().isIn(['cliente']).withMessage('Solo se permite crear cuentas de cliente'),
  body('type_of_class').optional(),
  body('instagram').optional().isLength({ max: 100 }).withMessage('Instagram inválido'),
  body('genero').optional().isIn(['Masculino', 'Femenino', 'Otro']).withMessage('Género inválido'),
  body('cumpleanos').optional().custom((value) => {
    if (!value) return true // Optional field
    // Accept various date formats
    const date = new Date(value)
    return date instanceof Date && !isNaN(date.getTime())
  }).withMessage('Fecha de cumpleaños inválida'),
  body('lesion_o_limitacion_fisica').optional().isLength({ max: 500 }).withMessage('Texto demasiado largo')
], async (req, res) => {
  try {
    const clientIP = SecurityService.getClientIP(req)
    
    // Validate inputs with express-validator
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(err => ({
        field: err.param || err.path,
        message: err.msg
      }))
      
      SecurityService.logSecurityEvent('VALIDATION_ERROR', {
        path: req.path,
        errors: errorMessages,
        ip: clientIP
      })
      
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errorMessages
      })
    }

    let { nombre, numero_de_telefono, password, role, type_of_class = 'Sin paquete', instagram, cumpleanos, lesion_o_limitacion_fisica, genero } = req.body
    
    // CRITICAL: Use original email preserved before validation middleware
    let correo = req.originalEmail ? req.originalEmail.trim() : (req.body.correo ? String(req.body.correo).trim() : '')

    // Check role assignments from JSON file
    const roleAssignmentsPath = path.join(__dirname, '..', 'data', 'role-assignments.json')
    let assignedRole = 'cliente' // Default role
    
    try {
      if (fs.existsSync(roleAssignmentsPath)) {
        const roleData = JSON.parse(fs.readFileSync(roleAssignmentsPath, 'utf8'))
        const assignment = roleData.assignments?.find((a) => a.email.toLowerCase() === correo.toLowerCase())
        if (assignment && ['admin', 'coach', 'cliente'].includes(assignment.role)) {
          assignedRole = assignment.role
        }
      }
    } catch (error) {
      console.error('Error reading role assignments:', error)
      // Continue with default 'cliente' role if file read fails
    }
    
    // Use assigned role from JSON file, or default to 'cliente'
    role = assignedRole

    // Basic sanitization - only trim strings, don't escape HTML
    nombre = nombre ? nombre.trim() : ''
    // Email is already trimmed from originalEmail - preserve exactly as entered
    numero_de_telefono = numero_de_telefono ? numero_de_telefono.trim() : ''
    if (instagram) instagram = instagram.trim()
    if (genero) genero = genero.trim()
    if (cumpleanos) cumpleanos = cumpleanos.trim()
    if (lesion_o_limitacion_fisica) lesion_o_limitacion_fisica = lesion_o_limitacion_fisica.trim()

    // Validate email format (basic validation already done by express-validator)
    if (!correo || !SecurityService.validateEmail(correo)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de email inválido',
        field: 'correo'
      })
    }

    // Validate password strength (minimum 8 characters, allow more lenient validation)
    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 8 caracteres',
        field: 'password'
      })
    }

    // Validate password requirements (more lenient - allow 8+ characters)
    const passwordErrors = []
    if (!/[A-Z]/.test(password)) {
      passwordErrors.push('La contraseña debe contener al menos una letra mayúscula')
    }
    if (!/[a-z]/.test(password)) {
      passwordErrors.push('La contraseña debe contener al menos una letra minúscula')
    }
    if (!/[0-9]/.test(password)) {
      passwordErrors.push('La contraseña debe contener al menos un número')
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      passwordErrors.push('La contraseña debe contener al menos un carácter especial')
    }

    if (passwordErrors.length > 0) {
      SecurityService.logSecurityEvent('WEAK_PASSWORD_ATTEMPT', {
        email: correo,
        ip: clientIP,
        errors: passwordErrors
      })
      return res.status(400).json({
        success: false,
        message: 'La contraseña no cumple con los requisitos de seguridad',
        errors: passwordErrors,
        field: 'password'
      })
    }

    // Validate phone number (basic validation already done by express-validator)
    if (!numero_de_telefono || !SecurityService.validatePhone(numero_de_telefono)) {
      return res.status(400).json({
        success: false,
        message: 'Número de teléfono inválido. Debe tener entre 10 y 15 dígitos',
        field: 'numero_de_telefono'
      })
    }

    // Check if user already exists
    const existingUser = await database.getUserByEmail(correo)
    if (existingUser) {
      SecurityService.logSecurityEvent('DUPLICATE_REGISTRATION_ATTEMPT', {
        email: correo,
        ip: clientIP
      })
      return res.status(409).json({
        success: false,
        message: 'Ya existe un usuario con este email'
      })
    }

    // Hash password
    const password_hash = await AuthService.hashPassword(password)

    // Create user
    const userData = {
      nombre,
      correo,
      numero_de_telefono,
      instagram: instagram || null,
      role,
      type_of_class,
      cumpleanos: cumpleanos || null,
      lesion_o_limitacion_fisica: lesion_o_limitacion_fisica || null,
      genero: genero || null,
      password_hash
    }

    const user = await database.createUser(userData)
    
    // Log successful registration
    SecurityService.logSecurityEvent('USER_REGISTERED', {
      userId: user.id,
      email: user.correo,
      ip: clientIP
    })

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(user.correo, user.nombre)
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError)
      // Don't fail registration if email fails
    }

    // Generate JWT token
    const token = AuthService.generateToken(user)

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        correo: user.correo,
        role: user.role
      }
    })

  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

app.post('/api/auth/login', preserveOriginalEmail, [
  body('correo').custom((value) => {
    if (!value || typeof value !== 'string') {
      throw new Error('Email inválido')
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value.trim())) {
      throw new Error('Email inválido')
    }
    return true
  }).withMessage('Email inválido'),
  body('password').notEmpty().withMessage('Contraseña requerida')
], async (req, res) => {
  try {
    const clientIP = SecurityService.getClientIP(req)
    
    // Validate inputs
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      SecurityService.logSecurityEvent('LOGIN_VALIDATION_ERROR', {
        errors: errors.array(),
        ip: clientIP
      })
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      })
    }

    let { password } = req.body

    // CRITICAL: Use original email preserved before validation middleware
    let correo = req.originalEmail ? req.originalEmail.trim() : (req.body.correo ? String(req.body.correo).trim() : '')
    if (!correo || !SecurityService.validateEmail(correo)) {
      SecurityService.logSecurityEvent('LOGIN_INVALID_EMAIL', {
        email: correo,
        ip: clientIP
      })
      return res.status(400).json({
        success: false,
        message: 'Formato de email inválido'
      })
    }

    // Find user by email
    const user = await database.getUserByEmail(correo)
    if (!user) {
      // Don't reveal if user exists (security best practice)
      SecurityService.logSecurityEvent('LOGIN_FAILED', {
        email: correo,
        reason: 'user_not_found',
        ip: clientIP
      })
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      })
    }

    // Verify password
    const isPasswordValid = await AuthService.comparePassword(password, user.password_hash)
    if (!isPasswordValid) {
      // Log failed login attempt
      SecurityService.logSecurityEvent('LOGIN_FAILED', {
        userId: user.id,
        email: user.correo,
        reason: 'invalid_password',
        ip: clientIP
      })
      
      // Block IP after multiple failed attempts
      const failedAttempts = SecurityService.failedLoginAttempts || new Map()
      const userKey = `${user.id}_${clientIP}`
      const attempts = failedAttempts.get(userKey) || 0
      
      if (attempts >= 5) {
        SecurityService.blockIP(clientIP, 60 * 60 * 1000) // 1 hour
        SecurityService.logSecurityEvent('IP_BLOCKED_FROM_LOGIN', {
          userId: user.id,
          email: user.correo,
          ip: clientIP,
          attempts: attempts + 1
        })
        return res.status(429).json({
          success: false,
          message: 'Demasiados intentos fallidos. Tu IP ha sido bloqueada temporalmente.'
        })
      }
      
      failedAttempts.set(userKey, attempts + 1)
      SecurityService.failedLoginAttempts = failedAttempts
      
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      })
    }

    // Clear failed login attempts on successful login
    if (SecurityService.failedLoginAttempts) {
      const userKey = `${user.id}_${clientIP}`
      SecurityService.failedLoginAttempts.delete(userKey)
    }

    // Generate JWT token
    const token = AuthService.generateToken(user)

    // Log successful login
    SecurityService.logSecurityEvent('LOGIN_SUCCESS', {
      userId: user.id,
      email: user.correo,
      role: user.role,
      ip: clientIP
    })

    res.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        correo: user.correo,
        role: user.role
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    const clientIP = SecurityService.getClientIP(req)
    SecurityService.logSecurityEvent('LOGIN_ERROR', {
      error: error.message,
      ip: clientIP
    })
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      // Always include error details in this environment to help debugging
      error: error.message,
      stack: error.stack
    })
  }
})

// Verify token endpoint - Enhanced security
app.get('/api/auth/verify', requireAuth, async (req, res) => {
  try {
    const clientIP = SecurityService.getClientIP(req)
    const user = req.user

    // Get fresh user data from database
    const freshUser = await database.getUserById(user.id)
    
    if (!freshUser) {
      SecurityService.logSecurityEvent('VERIFY_TOKEN_USER_NOT_FOUND', {
        userId: user.id,
        ip: clientIP
      })
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado'
      })
    }

    // Verify role hasn't changed
    if (freshUser.role !== user.role) {
      SecurityService.logSecurityEvent('VERIFY_TOKEN_ROLE_MISMATCH', {
        userId: user.id,
        tokenRole: user.role,
        dbRole: freshUser.role,
        ip: clientIP
      })
      return res.status(401).json({
        success: false,
        message: 'Sesión inválida. Por favor, inicia sesión nuevamente.'
      })
    }

    // Return user data without sensitive information
    const { password_hash, ...safeUser } = freshUser

    res.json({
      success: true,
      user: safeUser
    })
  } catch (error) {
    console.error('Verify token error:', error)
    const clientIP = SecurityService.getClientIP(req)
    SecurityService.logSecurityEvent('VERIFY_TOKEN_ERROR', {
      error: error.message,
      ip: clientIP
    })
    res.status(500).json({
      success: false,
      message: 'Error al verificar el token'
    })
  }
})

// Password reset endpoints
app.post('/api/auth/forgot-password', preserveOriginalEmail, [
  body('correo').custom((value) => {
    if (!value || typeof value !== 'string') {
      throw new Error('Email inválido')
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value.trim())) {
      throw new Error('Email inválido')
    }
    return true
  }).withMessage('Email inválido')
], async (req, res) => {
  try {
    const clientIP = SecurityService.getClientIP(req)
    const errors = validationResult(req)
    
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      })
    }

    // CRITICAL: Use original email preserved before validation middleware
    let correo = req.originalEmail ? req.originalEmail.trim() : (req.body.correo ? String(req.body.correo).trim() : '')
    if (!correo || !SecurityService.validateEmail(correo)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de email inválido'
      })
    }

    // Find user by email
    const user = await database.getUserByEmail(correo)
    
    // Don't reveal if user exists (security best practice)
    if (!user) {
      // Log attempt for non-existent user
      SecurityService.logSecurityEvent('PASSWORD_RESET_ATTEMPT', {
        email: correo,
        reason: 'user_not_found',
        ip: clientIP
      })
      
      // Return success even if user doesn't exist (security)
      return res.json({
        success: true,
        message: 'Si el email existe, recibirás un enlace para restablecer tu contraseña'
      })
    }

    // Generate reset token
    const resetToken = SecurityService.generateSecureString(32)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now

    // Save reset token to database
    const tokenId = uuidv4()
    await database.run(`
      INSERT INTO password_reset_tokens (id, user_id, token, expires_at, used, created_at)
      VALUES (?, ?, ?, ?, 0, datetime('now'))
    `, [tokenId, user.id, resetToken, expiresAt.toISOString()])

    // Send password reset email
    try {
      await emailService.sendPasswordReset(user.correo, user.nombre, resetToken)
      
      // Log successful password reset request
      SecurityService.logSecurityEvent('PASSWORD_RESET_REQUESTED', {
        userId: user.id,
        email: user.correo,
        ip: clientIP
      })
      
      res.json({
        success: true,
        message: 'Si el email existe, recibirás un enlace para restablecer tu contraseña'
      })
    } catch (emailError) {
      console.error('Error sending password reset email:', emailError)
      // Delete token if email fails
      await database.run('DELETE FROM password_reset_tokens WHERE id = ?', [tokenId])
      
      res.status(500).json({
        success: false,
        message: 'Error al enviar el email de recuperación'
      })
    }
  } catch (error) {
    console.error('Forgot password error:', error)
    const clientIP = SecurityService.getClientIP(req)
    SecurityService.logSecurityEvent('PASSWORD_RESET_ERROR', {
      error: error.message,
      ip: clientIP
    })
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

app.post('/api/auth/reset-password', preserveOriginalEmail, [
  body('token').notEmpty().withMessage('Token requerido'),
  body('correo').custom((value) => {
    if (!value || typeof value !== 'string') {
      throw new Error('Email inválido')
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value.trim())) {
      throw new Error('Email inválido')
    }
    return true
  }).withMessage('Email inválido'),
  body('password').isLength({ min: 12 }).withMessage('La contraseña debe tener al menos 12 caracteres')
], async (req, res) => {
  try {
    const clientIP = SecurityService.getClientIP(req)
    const errors = validationResult(req)
    
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      })
    }

    const { token, password } = req.body

    // CRITICAL: Use original email preserved before validation middleware
    let correo = req.originalEmail ? req.originalEmail.trim() : (req.body.correo ? String(req.body.correo).trim() : '')
    if (!correo || !SecurityService.validateEmail(correo)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de email inválido'
      })
    }

    // Validate password strength
    const passwordValidation = AuthService.validatePassword(password)
    if (!passwordValidation.isValid) {
      SecurityService.logSecurityEvent('WEAK_PASSWORD_RESET_ATTEMPT', {
        email: correo,
        ip: clientIP
      })
      return res.status(400).json({
        success: false,
        message: 'La contraseña no cumple con los requisitos de seguridad',
        errors: passwordValidation.errors
      })
    }

    // Find user by email
    const user = await database.getUserByEmail(correo)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      })
    }

    // Find reset token
    const resetToken = await database.get(`
      SELECT * FROM password_reset_tokens
      WHERE token = ? AND user_id = ? AND used = 0
      ORDER BY created_at DESC
      LIMIT 1
    `, [token, user.id])

    if (!resetToken) {
      SecurityService.logSecurityEvent('INVALID_RESET_TOKEN', {
        userId: user.id,
        email: user.correo,
        ip: clientIP
      })
      return res.status(400).json({
        success: false,
        message: 'Token de recuperación inválido o ya utilizado'
      })
    }

    // Check if token is expired
    const expiresAt = new Date(resetToken.expires_at)
    if (expiresAt < new Date()) {
      SecurityService.logSecurityEvent('EXPIRED_RESET_TOKEN', {
        userId: user.id,
        email: user.correo,
        ip: clientIP
      })
      return res.status(400).json({
        success: false,
        message: 'El token de recuperación ha expirado. Por favor, solicita uno nuevo.'
      })
    }

    // Hash new password
    const password_hash = await AuthService.hashPassword(password)

    // Update user password
    await database.run(`
      UPDATE users 
      SET password_hash = ?, updated_at = datetime('now')
      WHERE id = ?
    `, [password_hash, user.id])

    // Mark token as used
    await database.run(`
      UPDATE password_reset_tokens 
      SET used = 1 
      WHERE id = ?
    `, [resetToken.id])

    // Send password reset success email
    try {
      await emailService.sendPasswordResetSuccess(user.correo, user.nombre)
    } catch (emailError) {
      console.error('Error sending password reset success email:', emailError)
      // Don't fail if email fails
    }

    // Log successful password reset
    SecurityService.logSecurityEvent('PASSWORD_RESET_SUCCESS', {
      userId: user.id,
      email: user.correo,
      ip: clientIP
    })

    res.json({
      success: true,
      message: 'Contraseña restablecida exitosamente'
    })
  } catch (error) {
    console.error('Reset password error:', error)
    const clientIP = SecurityService.getClientIP(req)
    SecurityService.logSecurityEvent('PASSWORD_RESET_ERROR', {
      error: error.message,
      ip: clientIP
    })
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

// User management endpoints
app.get('/api/users', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { role } = req.query
    const users = await database.getAllUsers(role)
    
    // Remove sensitive data
    const safeUsers = users.map(user => ({
      id: user.id,
      nombre: user.nombre,
      correo: user.correo,
      numero_de_telefono: user.numero_de_telefono,
      instagram: user.instagram,
      role: user.role,
      type_of_class: user.type_of_class,
      expiration_date: user.expiration_date,
      cumpleanos: user.cumpleanos,
      lesion_o_limitacion_fisica: user.lesion_o_limitacion_fisica,
      genero: user.genero,
      created_at: user.created_at,
      updated_at: user.updated_at
    }))

    res.json({
      success: true,
      users: safeUsers
    })

  } catch (error) {
    console.error('Get users error:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

// Get all clients (admin only)
app.get('/api/users/clients', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    // Fetch all users with role 'cliente' (case-insensitive matching)
    const allUsers = await database.all('SELECT * FROM users ORDER BY created_at DESC', [])
    const clients = allUsers.filter(user => user.role && user.role.toLowerCase() === 'cliente')
    
    console.log(`📋 [GET /api/users/clients] Found ${clients.length} clients out of ${allUsers.length} total users`)
    
    // Remove sensitive data
    const safeClients = clients.map(client => ({
      id: client.id,
      nombre: client.nombre,
      correo: client.correo,
      numero_de_telefono: client.numero_de_telefono,
      instagram: client.instagram,
      role: client.role,
      type_of_class: client.type_of_class,
      expiration_date: client.expiration_date,
      cumpleanos: client.cumpleanos,
      lesion_o_limitacion_fisica: client.lesion_o_limitacion_fisica,
      genero: client.genero,
      created_at: client.created_at,
      updated_at: client.updated_at
    }))

    res.json({
      success: true,
      clients: safeClients
    })
  } catch (error) {
    console.error('Error fetching clients:', error)
    res.status(500).json({
      success: false,
      message: 'Error al obtener los clientes'
    })
  }
})

// Get all coaches (admin only)
app.get('/api/users/coaches', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const allUsers = await database.all('SELECT * FROM users ORDER BY created_at DESC', [])
    const coaches = allUsers.filter(user => user.role && user.role.toLowerCase() === 'coach')

    console.log(`📋 [GET /api/users/coaches] Found ${coaches.length} coaches out of ${allUsers.length} total users`)

    const safeCoaches = coaches.map(coach => ({
      id: coach.id,
      nombre: coach.nombre,
      correo: coach.correo,
      numero_de_telefono: coach.numero_de_telefono,
      instagram: coach.instagram,
      role: coach.role,
      created_at: coach.created_at,
      updated_at: coach.updated_at
    }))

    res.json({
      success: true,
      coaches: safeCoaches
    })
  } catch (error) {
    console.error('Error fetching coaches:', error)
    res.status(500).json({
      success: false,
      message: 'Error al obtener los coaches'
    })
  }
})

app.get('/api/users/:id', requireAuth, async (req, res) => {
  try {
    const clientIP = SecurityService.getClientIP(req)
    const { id } = req.params
    const user = req.user

    // Validate UUID
    if (!SecurityService.validateUUID(id)) {
      SecurityService.logSecurityEvent('INVALID_UUID_ATTEMPT', {
        userId: user.id,
        targetId: id,
        action: 'get_user',
        ip: clientIP
      })
      return res.status(400).json({
        success: false,
        message: 'ID de usuario inválido'
      })
    }

    // Verify target user exists
    const targetUser = await database.getUserById(id)
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      })
    }

    // Check permissions - Enhanced security
    // Admin can access all users
    // Coach can access client data only
    // Client can access only their own data
    if (user.role === 'admin') {
      // Admin can access all users
    } else if (user.role === 'coach') {
      // Coach can only access client data, not other coaches or admin
      if (targetUser.role !== 'cliente') {
        SecurityService.logSecurityEvent('COACH_ACCESS_NON_CLIENT', {
          coachId: user.id,
          targetUserId: id,
          targetUserRole: targetUser.role,
          ip: clientIP
        })
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para acceder a este usuario'
        })
      }
    } else if (user.role === 'cliente') {
      // Client can only access their own data
      if (user.id !== id) {
        SecurityService.logSecurityEvent('CLIENT_ACCESS_OTHER_USER', {
          clientId: user.id,
          targetUserId: id,
          targetUserRole: targetUser.role,
          ip: clientIP
        })
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para acceder a este usuario'
        })
      }
    } else {
      // Unknown role
      SecurityService.logSecurityEvent('UNKNOWN_ROLE_ACCESS', {
        userId: user.id,
        userRole: user.role,
        targetUserId: id,
        ip: clientIP
      })
      return res.status(403).json({
        success: false,
        message: 'Permisos insuficientes'
      })
    }

    // Remove sensitive data
    const { password_hash, ...safeUser } = targetUser

    res.json({
      success: true,
      user: safeUser
    })

  } catch (error) {
    console.error('Get user error:', error)
    const clientIP = SecurityService.getClientIP(req)
    SecurityService.logSecurityEvent('GET_USER_ERROR', {
      error: error.message,
      userId: req.user.id,
      ip: clientIP
    })
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

// Update user - Enhanced security
// Allow admin to update any user, or allow any user to update themselves
app.put('/api/users/:id', requireAuth, preserveOriginalEmail, async (req, res) => {
  try {
    const clientIP = SecurityService.getClientIP(req)
    const { id } = req.params
    
    // Validate UUID
    if (!SecurityService.validateUUID(id)) {
      SecurityService.logSecurityEvent('INVALID_UUID_ATTEMPT', {
        userId: req.user.id,
        targetId: id,
        ip: clientIP
      })
      return res.status(400).json({
        success: false,
        message: 'ID de usuario inválido'
      })
    }
    
    // Check if user is admin OR updating themselves
    const isAdmin = req.user.role === 'admin'
    const isUpdatingSelf = req.user.id === id
    
    if (!isAdmin && !isUpdatingSelf) {
      SecurityService.logSecurityEvent('UNAUTHORIZED_USER_UPDATE_ATTEMPT', {
        userId: req.user.id,
        userRole: req.user.role,
        targetId: id,
        ip: clientIP
      })
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para actualizar este usuario'
      })
    }
    
    // Log incoming request
    console.log('📥 [UPDATE USER] Incoming request body:', JSON.stringify(req.body, null, 2))
    console.log('📥 [UPDATE USER] Original email from middleware:', req.originalEmail)
    
    let updates = { ...req.body }
    
    // CRITICAL: Preserve original email format if updating email (use preserved value)
    // Always use preserved email if available, otherwise use from body
    if (req.originalEmail) {
      updates.correo = req.originalEmail.trim()
      console.log('🔍 [UPDATE USER] Using preserved original email:', updates.correo)
    } else if (updates.correo) {
      updates.correo = String(updates.correo).trim()
      console.log('🔍 [UPDATE USER] Using email from request body:', updates.correo)
    }
    
    // Ensure email is not empty if it was provided
    if (updates.correo === '') {
      delete updates.correo
      console.log('⚠️ [UPDATE USER] Email was empty string, removing from updates')
    }
    
    console.log('📦 [UPDATE USER] Updates object after email processing:', JSON.stringify(updates, null, 2))

    // Get target user once at the beginning (needed for multiple validations)
    const targetUser = await database.getUserById(id)
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      })
    }
    
    console.log('👤 [UPDATE USER] Target user loaded:', targetUser.id, 'Current email:', targetUser.correo)
    
    // Prevent role escalation - Only admin can change roles, and only to valid roles
    if (updates.role) {
      // Non-admin users cannot change roles at all (including their own)
      if (!isAdmin) {
        SecurityService.logSecurityEvent('ROLE_ESCALATION_ATTEMPT', {
          userId: req.user.id,
          userRole: req.user.role,
          targetId: id,
          attemptedRole: updates.role,
          ip: clientIP
        })
        // Remove role from updates - users can't change their own role
        delete updates.role
        console.log('⚠️ [UPDATE USER] Non-admin user attempted to change role, removing from updates')
      } else {
        // Admin users can change roles
        if (!SecurityService.validateRole(updates.role)) {
          SecurityService.logSecurityEvent('INVALID_ROLE_ATTEMPT', {
            userId: req.user.id,
            targetId: id,
            attemptedRole: updates.role,
            ip: clientIP
          })
          return res.status(400).json({
            success: false,
            message: 'Rol inválido'
          })
        }
        
        // Prevent changing own role (even admins)
        if (req.user.id === id && updates.role !== targetUser.role) {
          SecurityService.logSecurityEvent('SELF_ROLE_CHANGE_ATTEMPT', {
            userId: req.user.id,
            attemptedRole: updates.role,
            ip: clientIP
          })
          return res.status(403).json({
            success: false,
            message: 'No puedes cambiar tu propio rol'
          })
        }
        
        // Log role changes
        if (updates.role !== targetUser.role) {
          SecurityService.logSecurityEvent('ROLE_CHANGED', {
            adminId: req.user.id,
            targetUserId: id,
            oldRole: targetUser.role,
            newRole: updates.role,
            ip: clientIP
          })
        }
      }
    }

    // Prevent password changes through this endpoint (use separate endpoint)
    if (updates.password || updates.password_hash) {
      SecurityService.logSecurityEvent('PASSWORD_CHANGE_ATTEMPT_VIA_UPDATE', {
        userId: req.user.id,
        targetId: id,
        ip: clientIP
      })
      delete updates.password
      delete updates.password_hash
    }


    // Validate email format if provided (email already preserved above, just validate)
    if (updates.correo) {
      // Email is already trimmed and preserved above, just validate format
      if (!SecurityService.validateEmail(updates.correo)) {
        return res.status(400).json({
          success: false,
          message: 'Email inválido'
        })
      }
      console.log('✅ [UPDATE USER] Email validated:', updates.correo)
    }

    // Validate and sanitize phone if provided
    if (updates.numero_de_telefono) {
      try {
        updates.numero_de_telefono = SecurityService.validateAndSanitize(updates.numero_de_telefono, 'phone')
        if (!SecurityService.validatePhone(updates.numero_de_telefono)) {
          return res.status(400).json({
            success: false,
            message: 'Número de teléfono inválido'
          })
        }
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Número de teléfono inválido'
        })
      }
    }

    // Validate and sanitize other fields
    if (updates.nombre) {
      try {
        updates.nombre = SecurityService.validateAndSanitize(updates.nombre, 'string', { minLength: 2, maxLength: 100 })
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Nombre inválido'
        })
      }
    }

    if (updates.instagram) {
      try {
        updates.instagram = SecurityService.validateAndSanitize(updates.instagram, 'string', { maxLength: 100 })
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Instagram inválido'
        })
      }
    }

    if (updates.lesion_o_limitacion_fisica) {
      try {
        updates.lesion_o_limitacion_fisica = SecurityService.validateAndSanitize(updates.lesion_o_limitacion_fisica, 'string', { maxLength: 500 })
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Descripción de lesión inválida'
        })
      }
    }

    // Check if email is being changed and if new email already exists
    // Note: targetUser was already fetched above
    if (updates.correo) {
      // Normalize emails for comparison (remove dots from local part for Gmail, lowercase)
      const normalizeEmailForComparison = (email) => {
        if (!email) return ''
        const lower = email.toLowerCase().trim()
        // For Gmail addresses, remove dots from local part before @
        const [localPart, domain] = lower.split('@')
        if (domain === 'gmail.com' || domain === 'googlemail.com') {
          return localPart.replace(/\./g, '') + '@' + domain
        }
        return lower
      }
      
      const currentEmailNormalized = normalizeEmailForComparison(targetUser.correo)
      const newEmailNormalized = normalizeEmailForComparison(updates.correo)
      const emailIsChanging = currentEmailNormalized !== newEmailNormalized
      
      console.log('📧 [UPDATE USER] Email comparison:', {
        current: targetUser.correo,
        currentNormalized: currentEmailNormalized,
        new: updates.correo,
        newNormalized: newEmailNormalized,
        isChanging: emailIsChanging,
        updatingSelf: req.user.id === id
      })
      
      if (emailIsChanging) {
        // Email is actually changing to a different email account
        // Check for duplicates using normalized comparison
        const allUsers = await database.all('SELECT id, correo FROM users', [])
        
        // Check if any other user (not the current user) has the same normalized email
        const duplicateUser = allUsers.find(u => {
          if (u.id === id) return false // Skip current user
          const existingNormalized = normalizeEmailForComparison(u.correo)
          return existingNormalized === newEmailNormalized
        })
        
        if (duplicateUser) {
          console.log('❌ [UPDATE USER] Duplicate email detected:', {
            duplicateUserId: duplicateUser.id,
            duplicateEmail: duplicateUser.correo,
            duplicateNormalized: normalizeEmailForComparison(duplicateUser.correo),
            requestedEmail: updates.correo,
            requestedNormalized: newEmailNormalized
          })
          return res.status(409).json({
            success: false,
            message: 'Ya existe un usuario con este email'
          })
        }
        console.log('✅ [UPDATE USER] Email change allowed, no duplicates found')
      } else {
        // Email is same (normalized comparison) but might have different format (periods, case)
        // This is the same user updating their own email format - always allow
        console.log('ℹ️ [UPDATE USER] Email format update (same email account, different format). Preserving exact format:', updates.correo)
      }
    }
    
    // Ensure email is in updates if it was provided
    if (!updates.correo && req.originalEmail) {
      console.log('⚠️ [UPDATE USER] Email was in request but missing from updates, adding it back')
      updates.correo = req.originalEmail.trim()
    }
    
    // Final check: ensure email field exists and is not empty
    if (updates.correo) {
      console.log('✅ [UPDATE USER] Email confirmed in updates object:', updates.correo)
    } else {
      console.log('⚠️ [UPDATE USER] No email in updates object')
    }
    
    console.log('💾 [UPDATE USER] Final updates object before save:', JSON.stringify(updates, null, 2))
    console.log('💾 [UPDATE USER] Fields to update:', Object.keys(updates).filter(k => k !== 'id' && k !== 'historial_de_clases'))
    const updatedUser = await database.updateUser(id, updates)
    
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      })
    }
    
    console.log('✅ [UPDATE USER] User updated successfully. New email:', updatedUser.correo)

    // Remove sensitive data
    const { password_hash, ...safeUser } = updatedUser

    // Log successful update
    SecurityService.logSecurityEvent('USER_UPDATED', {
      adminId: req.user.id,
      targetUserId: id,
      updatedFields: Object.keys(updates),
      ip: clientIP
    })

    // If email was updated, generate a new token with the updated email
    // This ensures login credentials work with the new email immediately
    let newToken = null
    if (updates.correo && req.user.id === id) {
      // Current user updated their own email - generate new token
      newToken = AuthService.generateToken(updatedUser)
      console.log('🔄 [UPDATE USER] Generated new token for user with updated email')
    }

    const responseData = {
      success: true,
      user: safeUser
    }

    // Include new token if email was updated by the current user
    if (newToken) {
      responseData.token = newToken
      responseData.message = 'Email actualizado. Tu sesión ha sido renovada.'
    }

    res.json(responseData)
  } catch (error) {
    console.error('Update user error:', error)
    const clientIP = SecurityService.getClientIP(req)
    SecurityService.logSecurityEvent('UPDATE_USER_ERROR', {
      error: error.message,
      userId: req.user.id,
      ip: clientIP
    })
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

// Delete user
app.delete('/api/users/:id', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params

    // Check if user exists
    const user = await database.getUserById(id)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      })
    }

    // Delete user
    await database.run('DELETE FROM users WHERE id = ?', [id])

    res.json({
      success: true,
      message: 'Usuario eliminado exitosamente'
    })
  } catch (error) {
    console.error('Delete user error:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

// WhatsApp integration endpoints
app.post('/api/whatsapp/generate-url', [
  body('message').notEmpty().withMessage('Mensaje requerido')
], (req, res) => {
  try {
    const { message } = req.body
    const url = WhatsAppService.generateWhatsAppUrl(message)
    
    res.json({
      success: true,
      url
    })
  } catch (error) {
    console.error('WhatsApp URL generation error:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

// Dashboard stats endpoint
app.get('/api/dashboard/stats', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const users = await database.getAllUsers()
    const clients = users.filter(u => u.role === 'cliente')
    const coaches = users.filter(u => u.role === 'coach')
    
    // Get total classes (scheduled)
    const classes = await database.all("SELECT COUNT(*) as count FROM classes WHERE status = 'scheduled'")
    const totalClasses = classes[0]?.count || 0
    
    // Get revenue for current month
    const today = new Date()
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    const firstDayStr = firstDayOfMonth.toISOString().split('T')[0]
    const lastDayStr = lastDayOfMonth.toISOString().split('T')[0]
    
    const payments = await database.all(`
      SELECT SUM(amount) as total FROM payments 
      WHERE type = 'income' 
        AND status = 'confirmed' 
        AND date BETWEEN ? AND ?
    `, [firstDayStr, lastDayStr])
    const totalRevenue = payments[0]?.total || 0
    
    // Get upcoming birthdays (next 30 days)
    const upcomingBirthdays = []
    for (const client of clients) {
      if (!client.cumpleanos) continue
      
      try {
        const birthday = new Date(client.cumpleanos)
        const currentYear = today.getFullYear()
        const currentMonth = today.getMonth()
        const currentDate = today.getDate()
        
        // Set birthday to current year
        birthday.setFullYear(currentYear)
        
        // If birthday already passed this year, set to next year
        if (birthday < today) {
          birthday.setFullYear(currentYear + 1)
        }
        
        // Calculate days until birthday
        const daysUntil = Math.ceil((birthday - today) / (1000 * 60 * 60 * 24))
        
        // Include birthdays within next 30 days
        if (daysUntil >= 0 && daysUntil <= 30) {
          upcomingBirthdays.push({
            id: client.id,
            nombre: client.nombre,
            cumpleanos: client.cumpleanos,
            daysUntil: daysUntil,
            birthdayDate: birthday.toISOString().split('T')[0],
            formattedDate: birthday.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
          })
        }
      } catch (error) {
        console.error(`Error processing birthday for ${client.nombre}:`, error)
      }
    }
    
    // Sort by days until birthday
    upcomingBirthdays.sort((a, b) => a.daysUntil - b.daysUntil)
    
    // Get recent activity (last 10 activities)
    const recentActivity = []
    
    // Recent clients (last 7 days)
    const recentClients = await database.all(`
      SELECT id, nombre, correo, created_at, 'client_registered' as type
      FROM users 
      WHERE role = 'cliente' 
        AND created_at >= datetime('now', '-7 days')
      ORDER BY created_at DESC
      LIMIT 5
    `)
    
    for (const client of recentClients) {
      const createdDate = new Date(client.created_at)
      const hoursAgo = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60))
      recentActivity.push({
        id: client.id,
        type: 'client_registered',
        title: 'Nuevo cliente registrado',
        description: client.nombre,
        time: hoursAgo < 24 ? `Hace ${hoursAgo} horas` : `Hace ${Math.floor(hoursAgo / 24)} días`,
        timestamp: client.created_at
      })
    }
    
    // Recent bookings (last 7 days)
    const recentBookings = await database.all(`
      SELECT b.id, b.created_at, u.nombre as client_name, c.title as class_title, c.date, c.time
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN classes c ON b.class_id = c.id
      WHERE b.created_at >= datetime('now', '-7 days')
        AND b.status = 'confirmed'
      ORDER BY b.created_at DESC
      LIMIT 5
    `)
    
    for (const booking of recentBookings) {
      const createdDate = new Date(booking.created_at)
      const hoursAgo = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60))
      recentActivity.push({
        id: booking.id,
        type: 'class_booked',
        title: 'Clase reservada',
        description: `${booking.client_name} reservó ${booking.class_title}`,
        time: hoursAgo < 24 ? `Hace ${hoursAgo} horas` : `Hace ${Math.floor(hoursAgo / 24)} días`,
        timestamp: booking.created_at
      })
    }
    
    // Recent payments (last 7 days)
    const recentPayments = await database.all(`
      SELECT id, concept, amount, type, method, date, created_at
      FROM payments
      WHERE created_at >= datetime('now', '-7 days')
        AND status = 'confirmed'
      ORDER BY created_at DESC
      LIMIT 5
    `)
    
    for (const payment of recentPayments) {
      const createdDate = new Date(payment.created_at)
      const hoursAgo = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60))
      recentActivity.push({
        id: payment.id,
        type: payment.type === 'income' ? 'payment_received' : 'payment_made',
        title: payment.type === 'income' ? 'Pago recibido' : 'Pago realizado',
        description: `${payment.concept} - $${payment.amount} MXN`,
        time: hoursAgo < 24 ? `Hace ${hoursAgo} horas` : `Hace ${Math.floor(hoursAgo / 24)} días`,
        timestamp: payment.created_at
      })
    }
    
    // Sort all activities by timestamp (most recent first)
    recentActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    
    // Get classes for current month only (for dashboard display) - reuse variables from above
    const monthlyClasses = await database.all(`
      SELECT COUNT(*) as count FROM classes 
      WHERE status = 'scheduled' 
        AND date >= ? 
        AND date <= ?
    `, [firstDayStr, lastDayStr])
    const totalClassesThisMonth = monthlyClasses[0]?.count || 0

    const stats = {
      totalClients: clients.length,
      totalCoaches: coaches.length,
      totalClasses: totalClassesThisMonth, // Solo clases del mes actual
      totalRevenue: totalRevenue,
      upcomingBirthdays: upcomingBirthdays.slice(0, 5), // Limit to 5
      recentActivity: recentActivity.slice(0, 10) // Limit to 10 most recent activities
    }

    res.json({
      success: true,
      stats
    })

  } catch (error) {
    console.error('Dashboard stats error:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

// Role assignments management endpoints (Admin only)
app.get('/api/admin/role-assignments', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const roleAssignmentsPath = path.join(__dirname, '..', 'data', 'role-assignments.json')
    const dataDir = path.dirname(roleAssignmentsPath)
    
    // Ensure data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
    
    if (!fs.existsSync(roleAssignmentsPath)) {
      // Create default file if it doesn't exist
      const defaultData = { assignments: [] }
      fs.writeFileSync(roleAssignmentsPath, JSON.stringify(defaultData, null, 2), 'utf8')
      return res.json({
        success: true,
        assignments: []
      })
    }

    const fileContent = fs.readFileSync(roleAssignmentsPath, 'utf8')
    let roleData
    try {
      roleData = JSON.parse(fileContent)
    } catch (parseError) {
      console.error('Error parsing role assignments file:', parseError)
      // If corrupted, create a new one
      roleData = { assignments: [] }
      fs.writeFileSync(roleAssignmentsPath, JSON.stringify(roleData, null, 2), 'utf8')
    }
    
    if (!Array.isArray(roleData.assignments)) {
      roleData.assignments = []
    }
    
    res.json({
      success: true,
      assignments: roleData.assignments || []
    })
  } catch (error) {
    console.error('Error reading role assignments:', error)
    console.error('Error stack:', error.stack)
    res.status(500).json({
      success: false,
      message: 'Error al leer asignaciones de roles',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

app.post('/api/admin/role-assignments', requireAuth, requireRole(['admin']), preserveOriginalEmail, [
  body('email').custom((value) => {
    if (!value || typeof value !== 'string') {
      throw new Error('Email inválido')
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value.trim())) {
      throw new Error('Email inválido')
    }
    return true
  }).withMessage('Email inválido'),
  body('role').isIn(['admin', 'coach', 'cliente']).withMessage('Rol inválido')
], async (req, res) => {
  console.log('========== ROLE ASSIGNMENT POST REQUEST ==========')
  console.log('Request body:', JSON.stringify(req.body, null, 2))
  console.log('User:', req.user?.correo)
  console.log('User role:', req.user?.role)
  console.log('NODE_ENV:', process.env.NODE_ENV)
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array()
      })
    }

    let { role } = req.body
    
    // CRITICAL: Use original email preserved before validation middleware
    let email = req.originalEmail ? req.originalEmail.trim() : (req.body.email ? String(req.body.email).trim() : '')
    
    // Validate user is authenticated
    if (!req.user) {
      console.error('User not authenticated - req.user is:', req.user)
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      })
    }
    
    // Get user email - check both email and correo properties
    const userEmail = (req.user.email || req.user.correo || req.user._user?.correo)?.toLowerCase()
    
    if (!userEmail) {
      console.error('User object missing email property. User object:', JSON.stringify(req.user, null, 2))
      console.error('User object keys:', Object.keys(req.user))
      return res.status(400).json({
        success: false,
        message: 'Información de usuario incompleta'
      })
    }
    
    // Preserve email as-is (just trim whitespace, preserve periods and original case structure)
    email = email ? email.trim() : ''
    const protectedEmail = 'pilatesmermaidweb@gmail.com'
    const emailLower = email.toLowerCase()
    
    // Validate email is provided
    if (!email || !emailLower) {
      return res.status(400).json({
        success: false,
        message: 'Email es requerido'
      })
    }
    
    // Check if trying to modify protected email
    if (emailLower === protectedEmail.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'No se puede modificar el email principal del sistema'
      })
    }
    
    // Check if trying to modify own email
    if (emailLower === userEmail) {
      return res.status(403).json({
        success: false,
        message: 'No puedes modificar tu propio rol'
      })
    }

    const roleAssignmentsPath = path.join(__dirname, '..', 'data', 'role-assignments.json')
    const dataDir = path.dirname(roleAssignmentsPath)
    
    // Ensure data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
    
    // Read existing assignments
    let roleData = { assignments: [] }
    if (fs.existsSync(roleAssignmentsPath)) {
      try {
        const fileContent = fs.readFileSync(roleAssignmentsPath, 'utf8')
        if (fileContent.trim()) {
          roleData = JSON.parse(fileContent)
        }
      } catch (parseError) {
        console.error('Error parsing role assignments file:', parseError)
        // If file is corrupted, reset to empty structure
        roleData = { assignments: [] }
      }
    }

    // Ensure assignments array exists
    if (!Array.isArray(roleData.assignments)) {
      roleData.assignments = []
    }

    // Check if email already exists
    const existingIndex = roleData.assignments.findIndex(
      (a) => a.email && a.email.toLowerCase() === emailLower
    )

    if (existingIndex >= 0) {
      // Check if existing assignment is protected
      const existingAssignment = roleData.assignments[existingIndex]
      if (existingAssignment.email.toLowerCase() === protectedEmail.toLowerCase() ||
          existingAssignment.email.toLowerCase() === userEmail) {
        return res.status(403).json({
          success: false,
          message: 'No se puede modificar este email'
        })
      }
      // Update existing assignment
      roleData.assignments[existingIndex].role = role
    } else {
      // Add new assignment - preserve original email with periods
      roleData.assignments.push({ email: email, role })
    }

    // Write back to file
    try {
      console.log('Attempting to write role assignments to:', roleAssignmentsPath)
      console.log('Data directory exists:', fs.existsSync(dataDir))
      console.log('Role data to write:', JSON.stringify(roleData, null, 2))
      fs.writeFileSync(roleAssignmentsPath, JSON.stringify(roleData, null, 2), 'utf8')
      console.log('Successfully wrote role assignments file')
    } catch (writeError) {
      console.error('Error writing role assignments file:', writeError)
      console.error('Write error details:', {
        code: writeError?.code,
        path: writeError?.path,
        message: writeError?.message,
        errno: writeError?.errno
      })
      throw writeError
    }

    // CRITICAL: If user exists in database, update their role there too (whether updating or adding)
    try {
      console.log(`🔄 Checking if user exists in database for email: ${email}`)
      const existingUser = await database.getUserByEmail(email)
      if (existingUser) {
        // Update the user's role in the database
        await database.updateUser(existingUser.id, { role: role })
        console.log(`✅ Updated user ${existingUser.id} (${email}) role to "${role}" in database`)
      } else {
        console.log(`ℹ️ User with email ${email} not found in database - will use role on next registration`)
      }
    } catch (dbError) {
      console.error('⚠️ Error updating user role in database:', dbError)
      // Don't fail the request - the JSON file was updated successfully
      // The role will be applied on next registration or manual update
    }

    console.log('Sending success response')
    res.json({
      success: true,
      message: existingIndex >= 0 ? 'Asignación actualizada' : 'Asignación agregada',
      assignments: roleData.assignments
    })
  } catch (error) {
    console.error('========== ERROR SAVING ROLE ASSIGNMENT ==========')
    console.error('Error object:', error)
    console.error('Error type:', typeof error)
    console.error('Error is null?', error === null)
    console.error('Error is undefined?', error === undefined)
    
    if (error) {
      console.error('Error message:', error.message)
      console.error('Error name:', error.name)
      console.error('Error code:', error.code)
      console.error('Error stack:', error.stack)
    } else {
      console.error('ERROR OBJECT IS NULL OR UNDEFINED!')
    }
    console.error('=================================================')
    
    // Always include error details - convert error to string safely
    let errorMessage = 'Unknown error'
    let errorType = 'Error'
    let errorCode = 'NO_CODE'
    let errorStack = undefined
    
    if (error) {
      try {
        errorMessage = error.message || String(error) || JSON.stringify(error) || 'Unknown error'
        errorType = error.name || 'Error'
        errorCode = error.code || String(error.errno) || 'NO_CODE'
        errorStack = error.stack
      } catch (e) {
        errorMessage = String(error) || 'Unknown error'
        console.error('Error converting error to string:', e)
      }
    } else {
      errorMessage = 'Error object is null or undefined'
    }
    
    const errorResponse = {
      success: false,
      message: 'Error al guardar asignación de rol',
      error: errorMessage,
      errorType: errorType,
      errorCode: errorCode
    }
    
    // Add full error info in development/non-production
    if (process.env.NODE_ENV !== 'production') {
      if (errorStack) {
        errorResponse.stack = errorStack
      }
      if (error) {
        errorResponse.fullError = {
          name: error.name,
          code: error.code,
          errno: error.errno,
          path: error.path,
          syscall: error.syscall,
          message: error.message
        }
      }
    }
    
    console.log('Sending error response:', JSON.stringify(errorResponse, null, 2))
    
    // Make sure response hasn't been sent yet
    if (!res.headersSent) {
      res.status(500).json(errorResponse)
    } else {
      console.error('ERROR: Response already sent, cannot send error response!')
    }
  }
})

app.put('/api/admin/role-assignments/:email', requireAuth, requireRole(['admin']), [
  body('role').isIn(['admin', 'coach', 'cliente']).withMessage('Rol inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array()
      })
    }

    const { email } = req.params
    const { role } = req.body
    const userEmail = (req.user.email || req.user.correo || req.user._user?.correo)?.toLowerCase()
    const protectedEmail = 'pilatesmermaidweb@gmail.com'
    const emailLower = email.toLowerCase()
    
    // Prevent changing role of protected email or self
    if (emailLower === protectedEmail.toLowerCase() || emailLower === userEmail) {
      return res.status(403).json({
        success: false,
        message: 'No puedes modificar el rol de este email'
      })
    }
    
    const roleAssignmentsPath = path.join(__dirname, '..', 'data', 'role-assignments.json')
    
    if (!fs.existsSync(roleAssignmentsPath)) {
      return res.status(404).json({
        success: false,
        message: 'Archivo de asignaciones no encontrado'
      })
    }

    const roleData = JSON.parse(fs.readFileSync(roleAssignmentsPath, 'utf8'))
    
    // Find and update assignment
    const assignmentIndex = roleData.assignments.findIndex(
      (a) => a.email.toLowerCase() === emailLower
    )
    
    if (assignmentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Asignación no encontrada'
      })
    }
    
    roleData.assignments[assignmentIndex].role = role
    
    // Write back to file
    fs.writeFileSync(roleAssignmentsPath, JSON.stringify(roleData, null, 2), 'utf8')

    // CRITICAL: Also update the user's role in the database
    try {
      console.log(`🔄 Updating user role in database for email: ${email}`)
      const existingUser = await database.getUserByEmail(email)
      if (existingUser) {
        await database.updateUser(existingUser.id, { role: role })
        console.log(`✅ Updated user ${existingUser.id} (${email}) role to "${role}" in database`)
      } else {
        console.log(`ℹ️ User with email ${email} not found in database - will use role on next registration`)
      }
    } catch (dbError) {
      console.error('⚠️ Error updating user role in database:', dbError)
      // Don't fail the request - the JSON file was updated successfully
    }

    res.json({
      success: true,
      message: 'Rol actualizado exitosamente',
      assignments: roleData.assignments
    })
  } catch (error) {
    console.error('Error updating role assignment:', error)
    res.status(500).json({
      success: false,
      message: 'Error al actualizar asignación de rol'
    })
  }
})

app.delete('/api/admin/role-assignments/:email', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { email } = req.params
    const userEmail = (req.user.email || req.user.correo || req.user._user?.correo)?.toLowerCase()
    const protectedEmail = 'pilatesmermaidweb@gmail.com'
    const emailLower = email.toLowerCase()
    
    // Prevent deletion of protected email
    if (emailLower === protectedEmail.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'No se puede eliminar el email principal del sistema'
      })
    }
    
    // Prevent deletion of own email
    if (emailLower === userEmail) {
      return res.status(403).json({
        success: false,
        message: 'No puedes eliminar tu propio email'
      })
    }
    
    const roleAssignmentsPath = path.join(__dirname, '..', 'data', 'role-assignments.json')
    
    if (!fs.existsSync(roleAssignmentsPath)) {
      return res.status(404).json({
        success: false,
        message: 'Archivo de asignaciones no encontrado'
      })
    }

    const roleData = JSON.parse(fs.readFileSync(roleAssignmentsPath, 'utf8'))
    
    // Remove assignment
    roleData.assignments = roleData.assignments.filter(
      (a) => a.email.toLowerCase() !== emailLower
    )

    // Write back to file
    fs.writeFileSync(roleAssignmentsPath, JSON.stringify(roleData, null, 2), 'utf8')

    res.json({
      success: true,
      message: 'Asignación eliminada',
      assignments: roleData.assignments
    })
  } catch (error) {
    console.error('Error deleting role assignment:', error)
    res.status(500).json({
      success: false,
      message: 'Error al eliminar asignación de rol'
    })
  }
})

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error)
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor'
  })
})

// Assign package to client (admin only)
app.post('/api/packages/assign', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { clientId, packageId } = req.body

    if (!clientId || !packageId) {
      return res.status(400).json({
        success: false,
        message: 'Cliente y paquete son requeridos'
      })
    }

    // Get package details
    const packages = {
      '1': { name: 'Clase Prueba', type: 'Clase Prueba', classes_included: 1, validity_days: 30 },
      '2': { name: '1 Clase Grupal', type: '1 Clase Grupal', classes_included: 1, validity_days: 30 },
      '3': { name: '4 Clases Grupales', type: '4 Clases Grupales', classes_included: 4, validity_days: 30 },
      '4': { name: '8 Clases Grupales', type: '8 Clases Grupales', classes_included: 8, validity_days: 30 },
      '5': { name: '12 Clases Grupales', type: '12 Clases Grupales', classes_included: 12, validity_days: 30 },
      '6': { name: 'Clases Grupales Ilimitadas', type: 'Clases Grupales Ilimitadas', classes_included: 999, validity_days: 30 },
      '7': { name: '1 Clase Privada', type: '1 Clase Privada', classes_included: 1, validity_days: 30 },
      '8': { name: '4 Clases Privadas', type: '4 Clases Privadas', classes_included: 4, validity_days: 30 },
      '9': { name: '8 Clases Privadas', type: '8 Clases Privadas', classes_included: 8, validity_days: 30 },
      '10': { name: '12 Clases Privadas', type: '12 Clases Privadas', classes_included: 12, validity_days: 30 },
      '11': { name: '15 Clases Privadas', type: '15 Clases Privadas', classes_included: 15, validity_days: 30 },
      '12': { name: '20 Clases Privadas', type: '20 Clases Privadas', classes_included: 20, validity_days: 30 }
    }

    const selectedPackage = packages[packageId]
    if (!selectedPackage) {
      return res.status(400).json({
        success: false,
        message: 'Paquete no válido'
      })
    }

    // Calculate dates
    const startDate = new Date()
    const expirationDate = new Date()
    expirationDate.setDate(expirationDate.getDate() + selectedPackage.validity_days)
    const startDateString = startDate.toISOString().split('T')[0]
    const expirationDateString = expirationDate.toISOString().split('T')[0]

    // Desactivar paquetes anteriores si hay uno activo
    const activePackage = await database.getActivePackageByUser(clientId)
    if (activePackage) {
      await database.updatePackageStatus(activePackage.id, 'expired')
    }

    // Update client
    await database.run(
      `UPDATE users SET 
        type_of_class = ?, 
        expiration_date = ?,
        updated_at = datetime('now')
       WHERE id = ?`,
      [selectedPackage.type, expirationDateString, clientId]
    )

    // Crear registro en package_history
    await database.addPackageHistory({
      user_id: clientId,
      package_name: selectedPackage.name,
      package_type: selectedPackage.type,
      classes_included: selectedPackage.classes_included,
      start_date: startDateString,
      end_date: expirationDateString,
      payment_method: 'N/A', // Se puede actualizar después si se proporciona
      amount_paid: 0, // Se puede actualizar después si se proporciona
      status: 'active'
    })

    // Get updated client
    const updatedClient = await database.get('SELECT * FROM users WHERE id = ?', [clientId])

    res.json({
      success: true,
      message: `Paquete ${selectedPackage.name} asignado exitosamente`,
      client: {
        id: updatedClient.id,
        nombre: updatedClient.nombre,
        correo: updatedClient.correo,
        type_of_class: updatedClient.type_of_class,
        expiration_date: updatedClient.expiration_date
      }
    })

  } catch (error) {
    console.error('Assign package error:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

// Payments endpoints
app.get('/api/payments', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
  try {
    const payments = await database.all('SELECT * FROM payments ORDER BY date DESC')
    
    // Convertir ID a string y asegurar que todos los campos estén presentes
    const formattedPayments = payments.map(payment => {
      const normalizedMethod = payment.method === 'transfer' ? 'transfer' : 'cash'
      return {
      id: String(payment.id),
      date: payment.date,
      concept: payment.concept || '',
      amount: payment.amount || 0,
      type: payment.type || 'income',
      method: normalizedMethod,
      status: payment.status || 'pending',
      client_name: payment.client_name || null,
      coach_name: payment.coach_name || null,
      description: payment.description || ''
    }})
    
    res.json({
      success: true,
      payments: formattedPayments
    })
  } catch (error) {
    console.error('Get payments error:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

app.post('/api/payments', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { date, concept, amount, type, method, status, client_name, coach_name, description } = req.body

    if (!date || !concept || !amount || !type || !method || !status) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos obligatorios son requeridos'
      })
    }

    const allowedMethods = ['cash', 'transfer']
    if (!allowedMethods.includes(method)) {
      return res.status(400).json({
        success: false,
        message: 'Método de pago no válido'
      })
    }

    const result = await database.run(
      `INSERT INTO payments (date, concept, amount, type, method, status, client_name, coach_name, description, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [date, concept, amount, type, method, status, client_name, coach_name, description]
    )

    res.json({
      success: true,
      message: 'Pago registrado exitosamente',
      payment: {
        id: result.lastID,
        date,
        concept,
        amount,
        type,
        method,
        status,
        client_name,
        coach_name,
        description
      }
    })
  } catch (error) {
    console.error('Create payment error:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

app.put('/api/payments/:id', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params
    const { date, concept, amount, type, method, status, client_name, coach_name, description } = req.body

    const allowedMethods = ['cash', 'transfer']
    if (!allowedMethods.includes(method)) {
      return res.status(400).json({
        success: false,
        message: 'Método de pago no válido'
      })
    }

    await database.run(
      `UPDATE payments SET 
        date = ?, concept = ?, amount = ?, type = ?, method = ?, status = ?, 
        client_name = ?, coach_name = ?, description = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [date, concept, amount, type, method, status, client_name, coach_name, description, id]
    )

    res.json({
      success: true,
      message: 'Pago actualizado exitosamente'
    })
  } catch (error) {
    console.error('Update payment error:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

// Attendance endpoints
app.get('/api/attendance', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
  try {
    const attendance = await database.all('SELECT * FROM attendance ORDER BY date DESC, time DESC')
    res.json({
      success: true,
      attendance: attendance
    })
  } catch (error) {
    console.error('Get attendance error:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

app.post('/api/attendance', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
  try {
    const { classId, className, date, time, coach, clientId, clientName, status, reason, notes } = req.body

    if (!classId || !date || !time || !coach || !clientId || !clientName || !status) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos obligatorios son requeridos'
      })
    }

    const result = await database.run(
      `INSERT INTO attendance (classId, className, date, time, coach, clientId, clientName, status, reason, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [classId, className, date, time, coach, clientId, clientName, status, reason, notes]
    )

    res.json({
      success: true,
      message: 'Registro de asistencia creado exitosamente',
      attendance: {
        id: result.lastID,
        classId,
        className,
        date,
        time,
        coach,
        clientId,
        clientName,
        status,
        reason,
        notes
      }
    })
  } catch (error) {
    console.error('Create attendance error:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

app.put('/api/attendance/:id', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
  try {
    const { id } = req.params
    const { status, reason, notes } = req.body

    await database.run(
      `UPDATE attendance SET status = ?, reason = ?, notes = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [status, reason, notes, id]
    )

    res.json({
      success: true,
      message: 'Registro de asistencia actualizado exitosamente'
    })
  } catch (error) {
    console.error('Update attendance error:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

// User class history endpoints
app.get('/api/users/:id/class-history', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
  try {
    const { id } = req.params
    const classHistory = await database.getClassHistoryByUser(id)
    res.json({ success: true, classHistory })
  } catch (error) {
    console.error('Get class history error:', error)
    res.status(500).json({ success: false, message: 'Error al obtener historial de clases' })
  }
})

app.get('/api/users/:id/payment-history', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
  try {
    const { id } = req.params
    const paymentHistory = await database.getPaymentHistoryByUser(id)
    res.json({ success: true, paymentHistory })
  } catch (error) {
    console.error('Get payment history error:', error)
    res.status(500).json({ success: false, message: 'Error al obtener historial de pagos' })
  }
})

app.post('/api/users/:id/class-history', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
  try {
    const { id } = req.params
    const { class_id, class_name, class_date, class_time, coach_name, status, cancellation_reason, notes } = req.body

    const classHistory = await database.addClassHistory({
      class_id,
      user_id: id,
      class_name,
      class_date,
      class_time,
      coach_name,
      status,
      cancellation_reason,
      notes
    })

    // Update user stats
    await database.updateUserStats(id)

    res.json({
      success: true,
      message: 'Historial de clase agregado exitosamente',
      classHistory
    })
  } catch (error) {
    console.error('Add class history error:', error)
    res.status(500).json({ success: false, message: 'Error al agregar historial de clase' })
  }
})

app.post('/api/users/:id/payment-history', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
  try {
    const { id } = req.params
    const { amount, payment_type, package_name, payment_method, payment_date, description } = req.body

    const paymentHistory = await database.addPaymentHistory({
      user_id: id,
      amount: parseFloat(amount),
      payment_type,
      package_name,
      payment_method,
      payment_date,
      description
    })

    // Update user stats
    await database.updateUserStats(id)

    res.json({
      success: true,
      message: 'Historial de pago agregado exitosamente',
      paymentHistory
    })
  } catch (error) {
    console.error('Add payment history error:', error)
    res.status(500).json({ success: false, message: 'Error al agregar historial de pago' })
  }
})

// Package history endpoints
app.get('/api/users/:id/package-history', requireAuth, requireRole(['admin', 'coach', 'cliente']), async (req, res) => {
  try {
    const { id } = req.params
    const user = req.user

    // Debug: Log de autenticación y permisos
    console.log(`\n[Package History Request]`)
    console.log(`  - Requested user ID (from URL): ${id}`)
    console.log(`  - Authenticated user ID (from token): ${user.id}`)
    console.log(`  - Authenticated user role: ${user.role}`)
    console.log(`  - Authenticated user email: ${user.correo}`)
    console.log(`  - ID match: ${user.id === id}`)
    console.log(`  - Is admin: ${user.role === 'admin'}`)
    console.log(`  - Is coach: ${user.role === 'coach'}`)

    // Solo el propio usuario, admin o coach pueden ver el historial
    if (user.id !== id && user.role !== 'admin' && user.role !== 'coach') {
      console.log(`  - ⚠️  ACCESS DENIED: User ${user.id} (${user.role}) cannot access package history for user ${id}`)
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver este historial'
      })
    }

    console.log(`  - ✅ ACCESS GRANTED: Fetching package history for user ${id}`)

    const packageHistory = await database.getPackageHistoryByUser(id)
    let activePackage = await database.getActivePackageByUser(id)
    
    console.log(`[Package History] User ${id}:`)
    console.log(`  - Package history count: ${packageHistory ? packageHistory.length : 0}`)
    console.log(`  - Active package found: ${activePackage ? 'YES' : 'NO'}`)
    if (activePackage) {
      console.log(`  - Active package: ${activePackage.package_name} (status: ${activePackage.status}, end_date: ${activePackage.end_date})`)
      console.log(`  - Active package ID: ${activePackage.id}`)
      console.log(`  - Active package user_id: ${activePackage.user_id}`)
    } else {
      console.log(`  - ⚠️  No active package found in database for user ${id}`)
    }
    
    // Si no hay paquete activo en package_history pero el usuario tiene type_of_class,
    // verificar si debería tener uno basado en los datos del usuario
    if (!activePackage) {
      try {
        const userData = await database.get('SELECT * FROM users WHERE id = ?', [id])
        console.log(`  - User data: type_of_class=${userData?.type_of_class}, expiration_date=${userData?.expiration_date}`)
        if (userData && userData.type_of_class && userData.type_of_class !== 'Sin paquete' && userData.expiration_date) {
          // Parsear fecha de expiración en hora local para evitar problemas de timezone
          try {
            const dateParts = userData.expiration_date.split('-')
            let expirationDate
            if (dateParts.length === 3) {
              expirationDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]))
            } else {
              expirationDate = new Date(userData.expiration_date)
            }
            
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            expirationDate.setHours(0, 0, 0, 0)
            
            console.log(`  - User expiration date: ${userData.expiration_date}, parsed: ${expirationDate.toISOString().split('T')[0]}`)
            console.log(`  - Today: ${today.toISOString().split('T')[0]}`)
            console.log(`  - Comparison: ${expirationDate >= today}`)
            
            // Solo crear si la fecha de expiración es futura o es hoy
            if (expirationDate >= today) {
              // Obtener información del paquete
              const packages = {
                'Clase Prueba': { name: 'Clase Prueba', type: 'Clase Prueba', classes_included: 1 },
                '1 Clase Grupal': { name: '1 Clase Grupal', type: '1 Clase Grupal', classes_included: 1 },
                '4 Clases Grupales': { name: '4 Clases Grupales', type: '4 Clases Grupales', classes_included: 4 },
                '8 Clases Grupales': { name: '8 Clases Grupales', type: '8 Clases Grupales', classes_included: 8 },
                '12 Clases Grupales': { name: '12 Clases Grupales', type: '12 Clases Grupales', classes_included: 12 },
                'Clases Grupales Ilimitadas': { name: 'Clases Grupales Ilimitadas', type: 'Clases Grupales Ilimitadas', classes_included: 999 },
                '1 Clase Privada': { name: '1 Clase Privada', type: '1 Clase Privada', classes_included: 1 },
                '4 Clases Privadas': { name: '4 Clases Privadas', type: '4 Clases Privadas', classes_included: 4 },
                '8 Clases Privadas': { name: '8 Clases Privadas', type: '8 Clases Privadas', classes_included: 8 },
                '12 Clases Privadas': { name: '12 Clases Privadas', type: '12 Clases Privadas', classes_included: 12 },
                '15 Clases Privadas': { name: '15 Clases Privadas', type: '15 Clases Privadas', classes_included: 15 },
                '20 Clases Privadas': { name: '20 Clases Privadas', type: '20 Clases Privadas', classes_included: 20 }
              }
              
              const packageInfo = packages[userData.type_of_class]
              if (packageInfo) {
                // Calcular fecha de inicio (30 días antes de la expiración o hoy si la expiración es muy lejana)
                const startDate = new Date(expirationDate)
                startDate.setDate(startDate.getDate() - 30)
                if (startDate > today) {
                  startDate.setTime(today.getTime())
                }
                
                try {
                  // Crear registro en package_history
                  activePackage = await database.addPackageHistory({
                    user_id: id,
                    package_name: packageInfo.name,
                    package_type: packageInfo.type,
                    classes_included: packageInfo.classes_included,
                    start_date: startDate.toISOString().split('T')[0],
                    end_date: userData.expiration_date,
                    payment_method: 'N/A',
                    amount_paid: 0,
                    status: 'active'
                  })
                  
                  console.log(`✅ Created package history for user ${id}: ${packageInfo.name}`)
                } catch (error) {
                  console.error('❌ Error creating package history:', error)
                  // No lanzar el error, solo loguearlo
                }
              } else {
                console.log(`⚠️  Package info not found for type: ${userData.type_of_class}`)
              }
            } else {
              console.log(`⚠️  User ${id} has expired package: ${userData.expiration_date}`)
            }
          } catch (dateError) {
            console.error('❌ Error parsing expiration date:', dateError)
            // No lanzar el error, solo loguearlo
          }
        }
      } catch (dbError) {
        console.error('❌ Error fetching user data:', dbError)
        // No lanzar el error, solo loguearlo
      }
    } else {
      // Si hay un paquete activo, devolverlo directamente
      // getActivePackageByUser ya filtra por status='active', así que si existe, es activo
      if (activePackage && activePackage.package_name) {
        console.log(`  - ✅ Active package found: ${activePackage.package_name}`)
        console.log(`  - Status: ${activePackage.status}`)
        console.log(`  - End date: ${activePackage.end_date}`)
        console.log(`  - ✅ Returning active package to client`)
      } else {
        console.log(`  - ⚠️  Active package found but invalid structure:`, activePackage)
        activePackage = null
      }
    }

    // Debug logging final
    console.log(`[Package History Response] User ${id}:`)
    console.log(`  - Package history: ${packageHistory ? packageHistory.length : 0} items`)
    console.log(`  - Active package:`, activePackage ? `${activePackage.package_name} (status: ${activePackage.status}, end_date: ${activePackage.end_date})` : 'null')
    if (activePackage) {
      console.log(`  - Active package details:`, JSON.stringify(activePackage, null, 2))
      console.log(`  - Active package will be sent to client: YES`)
    } else {
      console.log(`  - Active package will be sent to client: NO (null)`)
    }
    
    const response = {
      success: true,
      packageHistory: packageHistory || [],
      activePackage: activePackage || null
    }
    
    console.log(`  - Response JSON:`, JSON.stringify(response, null, 2))
    
    res.json(response)
  } catch (error) {
    console.error('Get package history error:', error)
    res.status(500).json({ success: false, message: 'Error al obtener historial de paquetes' })
  }
})

app.post('/api/users/:id/package-history', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params
    const { package_name, package_type, classes_included, start_date, end_date, payment_method, amount_paid, status } = req.body
    const adminUser = req.user

    // Debug: Log de asignación de paquete
    console.log(`\n[Package Assignment]`)
    console.log(`  - Admin user ID: ${adminUser.id}`)
    console.log(`  - Admin user email: ${adminUser.correo}`)
    console.log(`  - Target user ID (from URL): ${id}`)
    console.log(`  - Package name: ${package_name}`)
    console.log(`  - Package status: ${status || 'active'}`)
    console.log(`  - Start date: ${start_date}`)
    console.log(`  - End date: ${end_date}`)

    // Desactivar paquetes anteriores si hay uno activo
    const activePackage = await database.getActivePackageByUser(id)
    if (activePackage && status === 'active') {
      console.log(`  - ⚠️  Deactivating previous active package: ${activePackage.id}`)
      await database.updatePackageStatus(activePackage.id, 'expired')
    } else {
      console.log(`  - ✅ No previous active package found`)
    }

    console.log(`  - ✅ Creating new package history for user ${id}`)
    const packageHistory = await database.addPackageHistory({
      user_id: id,
      package_name,
      package_type,
      classes_included: parseInt(classes_included),
      start_date,
      end_date,
      payment_method,
      amount_paid: parseFloat(amount_paid),
      status: status || 'active'
    })
    
    console.log(`  - ✅ Package history created: ${packageHistory.id}`)
    console.log(`  - ✅ Package user_id: ${packageHistory.user_id}`)
    console.log(`  - ✅ Package status: ${packageHistory.status}`)

    // Agregar al historial de pagos
    await database.addPaymentHistory({
      user_id: id,
      amount: parseFloat(amount_paid),
      payment_type: 'package_purchase',
      package_name,
      payment_method,
      payment_date: start_date,
      description: `Compra de paquete: ${package_name}`
    })

    // Actualizar estadísticas del usuario
    await database.updateUserStats(id)

    res.json({
      success: true,
      message: 'Paquete agregado al historial exitosamente',
      packageHistory
    })
  } catch (error) {
    console.error('Add package history error:', error)
    res.status(500).json({ success: false, message: 'Error al agregar paquete al historial' })
  }
})

// Notification endpoints
app.get('/api/users/:id/notification-settings', requireAuth, requireRole(['admin', 'coach', 'cliente']), async (req, res) => {
  try {
    const { id } = req.params
    const user = req.user

    if (user.id !== id && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver estas configuraciones'
      })
    }

    let settings = await database.getNotificationSettings(id)
    
    // Si no existen configuraciones, crear unas por defecto
    if (!settings) {
      settings = await database.updateNotificationSettings(id, {
        email_notifications: true,
        expiration_reminder_days: 7
      })
    }

    res.json({
      success: true,
      settings
    })
  } catch (error) {
    console.error('Get notification settings error:', error)
    res.status(500).json({ success: false, message: 'Error al obtener configuraciones de notificación' })
  }
})

// Get user notifications
app.get('/api/users/:id/notifications', requireAuth, requireRole(['admin', 'coach', 'cliente']), async (req, res) => {
  try {
    const { id } = req.params
    const user = req.user
    const limit = parseInt(req.query.limit) || 50

    if (user.id !== id && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver estas notificaciones'
      })
    }

    const notifications = await database.getUserNotifications(id, limit)

    res.json({
      success: true,
      notifications
    })
  } catch (error) {
    console.error('Get notifications error:', error)
    res.status(500).json({ success: false, message: 'Error al obtener notificaciones' })
  }
})

app.put('/api/users/:id/notification-settings', requireAuth, requireRole(['admin', 'coach', 'cliente']), async (req, res) => {
  try {
    const clientIP = SecurityService.getClientIP(req)
    const { id } = req.params
    const user = req.user
    let { email_notifications, expiration_reminder_days } = req.body

    // Validate UUID
    if (!SecurityService.validateUUID(id)) {
      SecurityService.logSecurityEvent('INVALID_UUID_ATTEMPT', {
        userId: user.id,
        targetId: id,
        action: 'update_notification_settings',
        ip: clientIP
      })
      return res.status(400).json({
        success: false,
        message: 'ID de usuario inválido'
      })
    }

    // Verify target user exists
    const targetUser = await database.getUserById(id)
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      })
    }

    // Enhanced permission check - Users can only modify their own settings, unless admin
    if (user.role === 'admin') {
      // Admin can modify all notification settings
    } else if (user.id !== id) {
      SecurityService.logSecurityEvent('UNAUTHORIZED_NOTIFICATION_SETTINGS_UPDATE', {
        userId: user.id,
        userRole: user.role,
        targetUserId: id,
        targetUserRole: targetUser.role,
        ip: clientIP
      })
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para modificar estas configuraciones'
      })
    }

    // Validate and sanitize inputs
    if (expiration_reminder_days !== undefined) {
      try {
        expiration_reminder_days = SecurityService.validateAndSanitize(String(expiration_reminder_days), 'number', { min: 1, max: 30 })
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Días de recordatorio inválidos (debe ser entre 1 y 30)'
        })
      }
    }

    const settings = await database.updateNotificationSettings(id, {
      email_notifications: email_notifications !== undefined ? email_notifications : true,
      expiration_reminder_days: expiration_reminder_days || 7
    })

    res.json({
      success: true,
      message: 'Configuraciones de notificación actualizadas exitosamente',
      settings
    })
  } catch (error) {
    console.error('Update notification settings error:', error)
    res.status(500).json({ success: false, message: 'Error al actualizar configuraciones de notificación' })
  }
})

// Security management endpoints (admin only)
app.post('/api/admin/security/unblock-ip', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { ip } = req.body
    
    if (!ip) {
      return res.status(400).json({
        success: false,
        message: 'IP requerida'
      })
    }
    
    SecurityService.unblockIP(ip)
    
    SecurityService.logSecurityEvent('IP_UNBLOCKED', {
      ip,
      adminId: req.user.id,
      adminEmail: req.user.email || req.user.correo || req.user._user?.correo
    })
    
    res.json({
      success: true,
      message: `IP ${ip} desbloqueada exitosamente`
    })
  } catch (error) {
    console.error('Unblock IP error:', error)
    res.status(500).json({
      success: false,
      message: 'Error al desbloquear IP'
    })
  }
})

app.post('/api/admin/security/clear-blocked-ips', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    SecurityService.clearBlockedIPs()
    
    SecurityService.logSecurityEvent('ALL_IPS_UNBLOCKED', {
      adminId: req.user.id,
      adminEmail: req.user.email || req.user.correo || req.user._user?.correo
    })
    
    res.json({
      success: true,
      message: 'Todas las IPs bloqueadas han sido desbloqueadas'
    })
  } catch (error) {
    console.error('Clear blocked IPs error:', error)
    res.status(500).json({
      success: false,
      message: 'Error al limpiar IPs bloqueadas'
    })
  }
})

app.get('/api/admin/security/blocked-ips', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    // Get all blocked IPs (this would need to be implemented in SecurityService)
    const blockedIPs = Array.from(SecurityService.blockedIPs.entries()).map(([ip, blockedUntil]) => ({
      ip,
      blockedUntil: new Date(blockedUntil).toISOString(),
      isBlocked: SecurityService.isIPBlocked(ip)
    })).filter(item => item.isBlocked)
    
    res.json({
      success: true,
      blockedIPs,
      count: blockedIPs.length
    })
  } catch (error) {
    console.error('Get blocked IPs error:', error)
    res.status(500).json({
      success: false,
      message: 'Error al obtener IPs bloqueadas'
    })
  }
})

app.get('/api/admin/expiring-packages', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { days = 7 } = req.query
    const expiringPackages = await database.getExpiringPackages(parseInt(days))
    
    res.json({
      success: true,
      expiringPackages,
      count: expiringPackages.length
    })
  } catch (error) {
    console.error('Get expiring packages error:', error)
    res.status(500).json({ success: false, message: 'Error al obtener paquetes próximos a vencer' })
  }
})

// Send expiration notifications
app.post('/api/admin/send-expiration-notifications', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { days = 7 } = req.body
    const expiringPackages = await database.getExpiringPackages(parseInt(days))
    
    let notificationsSent = 0
    
    for (const packageInfo of expiringPackages) {
      // Enviar email de notificación
      await sendExpirationNotificationEmail(packageInfo)
      notificationsSent++
    }
    
    res.json({
      success: true,
      message: `Notificaciones enviadas a ${notificationsSent} usuarios`,
      notificationsSent,
      expiringPackages
    })
  } catch (error) {
    console.error('Send expiration notifications error:', error)
    res.status(500).json({ success: false, message: 'Error al enviar notificaciones de vencimiento' })
  }
})

// Helper function to send expiration notification email
async function sendExpirationNotificationEmail(packageInfo) {
  try {
    const response = await fetch(`${API_BASE_URL || ''}/api/email/send-expiration-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        clientEmail: packageInfo.correo,
        clientName: packageInfo.nombre,
        packageName: packageInfo.package_name,
        expirationDate: packageInfo.end_date,
        daysRemaining: Math.ceil((new Date(packageInfo.end_date) - new Date()) / (1000 * 60 * 60 * 24))
      })
    })

    if (response.ok) {
      console.log(`📧 Notificación de vencimiento enviada a ${packageInfo.nombre} (${packageInfo.correo})`)
    }
  } catch (error) {
    console.error('Error sending expiration notification:', error)
  }
}

// Booking endpoints - Enhanced security
app.post('/api/bookings', requireAuth, requireRole(['cliente', 'admin']), async (req, res) => {
  try {
    const clientIP = SecurityService.getClientIP(req)
    const { class_id, payment_method, notes } = req.body
    const userId = req.user.id

    // Validate class_id
    if (!class_id) {
      SecurityService.logSecurityEvent('BOOKING_MISSING_CLASS_ID', {
        userId: userId,
        ip: clientIP
      })
      return res.status(400).json({
        success: false,
        message: 'ID de clase requerido'
      })
    }

    // Validate UUID format
    if (!SecurityService.validateUUID(class_id)) {
      SecurityService.logSecurityEvent('BOOKING_INVALID_CLASS_ID', {
        userId: userId,
        classId: class_id,
        ip: clientIP
      })
      return res.status(400).json({
        success: false,
        message: 'ID de clase inválido'
      })
    }

    // Verificar que el usuario tiene clases disponibles
    const userClasses = await database.checkUserAvailableClasses(userId)
    if (!userClasses.hasClasses) {
      return res.status(400).json({
        success: false,
        message: 'No tienes clases disponibles en tu paquete'
      })
    }

    // Verificar que la clase existe y tiene espacio
    const classInfo = await database.getClassById(class_id)
    if (!classInfo) {
      return res.status(404).json({
        success: false,
        message: 'Clase no encontrada'
      })
    }

    if (classInfo.current_bookings >= classInfo.max_capacity) {
      return res.status(400).json({
        success: false,
        message: 'Esta clase ya está llena'
      })
    }

    // Verificar que el usuario no está ya registrado en esta clase
    const existingBooking = await database.get('SELECT * FROM bookings WHERE user_id = ? AND class_id = ? AND status != "cancelled"', [userId, class_id])
    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: 'Ya estás registrado en esta clase'
      })
    }

    // Crear la reserva
    const booking = await database.createBooking({
      user_id: userId,
      class_id: class_id,
      booking_date: classInfo.date,
      status: 'confirmed',
      payment_method: payment_method || 'package',
      notes: notes
    })

    // Actualizar el conteo de la clase
    await database.run(`
      UPDATE classes 
      SET current_bookings = current_bookings + 1, updated_at = datetime('now')
      WHERE id = ?
    `, [class_id])

    // Descontar una clase del paquete del usuario
    await database.deductClassFromUser(userId)

    // Enviar email de confirmación
    try {
      await emailService.sendClassConfirmation(
        req.user.email || req.user.correo || req.user._user?.correo,
        req.user.nombre || req.user._user?.nombre,
        classInfo.title,
        classInfo.date,
        classInfo.time,
        classInfo.coach_name || 'Coach',
        classInfo.type || 'group'
      )
      
      // Log notification sent
      await database.run(`
        INSERT INTO notification_log (id, user_id, type, subject, sent_at, status, created_at)
        VALUES (?, ?, ?, ?, datetime('now'), 'sent', datetime('now'))
      `, [
        uuidv4(),
        userId,
        'class_confirmation',
        `Confirmación de clase: ${classInfo.title}`
      ])
    } catch (emailError) {
      console.error('Error sending class confirmation email:', emailError)
      // Log failed notification
      try {
        await database.run(`
          INSERT INTO notification_log (id, user_id, type, subject, sent_at, status, error_message, created_at)
          VALUES (?, ?, ?, ?, datetime('now'), 'failed', ?, datetime('now'))
        `, [
          uuidv4(),
          userId,
          'class_confirmation',
          `Confirmación de clase: ${classInfo.title}`,
          emailError.message
        ])
      } catch (logError) {
        console.error('Error logging notification:', logError)
      }
      // Don't fail booking if email fails
    }

    res.json({
      success: true,
      message: 'Clase reservada exitosamente',
      booking,
      remainingClasses: userClasses.remaining - 1
    })
  } catch (error) {
    console.error('Create booking error:', error)
    res.status(500).json({
      success: false,
      message: 'Error al reservar la clase'
    })
  }
})

app.post('/api/bookings/cancel', requireAuth, requireRole(['cliente', 'admin']), async (req, res) => {
  try {
    const { class_id } = req.body
    const userId = req.user.id

    if (!class_id) {
      return res.status(400).json({
        success: false,
        message: 'ID de clase requerido'
      })
    }

    // Buscar la reserva del usuario
    const booking = await database.get(
      'SELECT * FROM bookings WHERE user_id = ? AND class_id = ? AND status = "confirmed"',
      [userId, class_id]
    )

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró una reserva activa para esta clase'
      })
    }

    // Actualizar el estado de la reserva a cancelada
    await database.run(
      'UPDATE bookings SET status = "cancelled", updated_at = datetime("now") WHERE id = ?',
      [booking.id]
    )

    // Actualizar el conteo de la clase
    await database.run(`
      UPDATE classes 
      SET current_bookings = current_bookings - 1, updated_at = datetime('now')
      WHERE id = ?
    `, [class_id])

    // Devolver una clase al paquete del usuario
    await database.run(
      'UPDATE users SET clases_restantes = clases_restantes + 1 WHERE id = ?',
      [userId]
    )

    res.json({
      success: true,
      message: 'Reserva cancelada exitosamente'
    })
  } catch (error) {
    console.error('Cancel booking error:', error)
    res.status(500).json({
      success: false,
      message: 'Error al cancelar la reserva'
    })
  }
})

app.get('/api/users/:id/bookings', requireAuth, requireRole(['admin', 'coach', 'cliente']), async (req, res) => {
  try {
    const { id } = req.params
    const user = req.user

    // Solo el propio usuario, admin o coach pueden ver las reservas
    if (user.id !== id && user.role !== 'admin' && user.role !== 'coach') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver estas reservas'
      })
    }

    const bookings = await database.getBookingsByUser(id)
    const availableClasses = await database.checkUserAvailableClasses(id)

    res.json({
      success: true,
      bookings,
      availableClasses
    })
  } catch (error) {
    console.error('Get user bookings error:', error)
    res.status(500).json({
      success: false,
      message: 'Error al obtener reservas del usuario'
    })
  }
})

app.put('/api/bookings/:id/cancel', requireAuth, requireRole(['cliente', 'admin']), async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    // Verificar que la reserva existe y pertenece al usuario
    const booking = await database.getBookingById(id)
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Reserva no encontrada'
      })
    }

    if (booking.user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para cancelar esta reserva'
      })
    }

    // Cancelar la reserva
    await database.cancelBooking(id)

    // Actualizar el conteo de la clase
    await database.run(`
      UPDATE classes 
      SET current_bookings = current_bookings - 1, updated_at = datetime('now')
      WHERE id = ?
    `, [booking.class_id])

    // Devolver una clase al paquete del usuario
    await database.run(`
      UPDATE users 
      SET clases_restantes = clases_restantes + 1, clases_tomadas = clases_tomadas - 1, updated_at = datetime('now')
      WHERE id = ?
    `, [userId])

    res.json({
      success: true,
      message: 'Reserva cancelada exitosamente'
    })
  } catch (error) {
    console.error('Cancel booking error:', error)
    res.status(500).json({
      success: false,
      message: 'Error al cancelar la reserva'
    })
  }
})

// Private class request endpoints
app.post('/api/private-class-requests', requireAuth, requireRole(['cliente']), async (req, res) => {
  try {
    const { requested_date, requested_time, duration } = req.body
    const userId = req.user.id

    if (!requested_date || !requested_time || !duration) {
      return res.status(400).json({
        success: false,
        message: 'Fecha, hora y duración son requeridos'
      })
    }

    // Verificar que el usuario tiene clases disponibles
    const userClasses = await database.checkUserAvailableClasses(userId)
    if (!userClasses.hasClasses) {
      return res.status(400).json({
        success: false,
        message: 'No tienes clases disponibles en tu paquete'
      })
    }

    // Crear la solicitud
    const request = await database.createPrivateClassRequest({
      user_id: userId,
      requested_date,
      requested_time,
      duration: parseInt(duration),
      status: 'pending'
    })

    res.json({
      success: true,
      message: 'Solicitud de clase privada enviada exitosamente',
      request
    })
  } catch (error) {
    console.error('Create private class request error:', error)
    res.status(500).json({
      success: false,
      message: 'Error al enviar solicitud de clase privada'
    })
  }
})

app.get('/api/private-class-requests/pending', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
  try {
    const pendingRequests = await database.getPendingPrivateClassRequests()
    
    res.json({
      success: true,
      requests: pendingRequests
    })
  } catch (error) {
    console.error('Get pending private class requests error:', error)
    res.status(500).json({
      success: false,
      message: 'Error al obtener solicitudes pendientes'
    })
  }
})

app.put('/api/private-class-requests/:id/status', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
  try {
    const { id } = req.params
    const { status, admin_notes } = req.body

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Estado debe ser "approved" o "rejected"'
      })
    }

    const request = await database.updatePrivateClassRequestStatus(id, status, admin_notes)

    if (status === 'approved') {
      // Crear la clase privada automáticamente
      const classInfo = await database.run(`
        INSERT INTO classes (
          id, title, type, coach_id, coach_name, date, time, duration, max_capacity, current_bookings, status, description, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `, [
        require('uuid').v4(),
        'Clase Privada',
        'private',
        'coach_1', // Esmeralda García
        'Esmeralda García',
        request.requested_date,
        request.requested_time,
        request.duration,
        1,
        1,
        'scheduled',
        `Clase privada para ${request.nombre} - ${admin_notes || ''}`
      ])

      // Crear reserva automática
      await database.createBooking({
        user_id: request.user_id,
        class_id: classInfo.lastID,
        booking_date: request.requested_date,
        status: 'confirmed',
        payment_method: 'package'
      })

      // Descontar una clase del paquete
      await database.deductClassFromUser(request.user_id)
    }

    res.json({
      success: true,
      message: `Solicitud ${status === 'approved' ? 'aprobada' : 'rechazada'} exitosamente`,
      request
    })
  } catch (error) {
    console.error('Update private class request status error:', error)
    res.status(500).json({
      success: false,
      message: 'Error al actualizar estado de la solicitud'
    })
  }
})

// Classes endpoints
app.post('/api/classes', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
  try {
    const {
      title,
      type,
      coach_id,
      coach_name,
      client_id,
      client_name,
      date,
      time,
      end_time,
      duration,
      description,
      status,
      instructors
    } = req.body

    if (!title || !type || !coach_id || !date || !time || !duration) {
      return res.status(400).json({
        success: false,
        message: 'Campos obligatorios: título, tipo, coach, fecha, hora y duración'
      })
    }

    const id = require('uuid').v4()
    const maxCapacity = type === 'private' ? 1 : 9
    const currentBookings = type === 'private' ? 1 : 0
    const normalizedInstructors = Array.isArray(instructors)
      ? JSON.stringify(instructors.slice(0, 10))
      : instructors
        ? JSON.stringify([instructors])
        : null

    await database.run(`
      INSERT INTO classes (
        id, title, type, coach_id, date, time, end_time, duration, max_capacity,
        current_bookings, status, description, instructors, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
      id,
      title,
      type,
      coach_id,
      date,
      time,
      end_time || null,
      duration,
      maxCapacity,
      currentBookings,
      status || 'scheduled',
      description,
      normalizedInstructors
    ])

    // Si es una clase privada, agregar al historial de clases del cliente
    if (type === 'private' && client_id) {
      await database.addClassHistory({
        class_id: id,
        user_id: client_id,
        class_name: title,
        class_date: date,
        class_time: time,
        coach_name: coach_name,
        status: 'scheduled',
        cancellation_reason: null,
        notes: description
      })
    }

    res.json({
      success: true,
      message: 'Clase creada exitosamente',
      class: {
        id,
        title,
        type,
        coach_id,
        coach_name,
        end_time: end_time || null,
        client_id,
        client_name,
        date,
        time,
        duration,
        max_capacity: maxCapacity,
        current_bookings: currentBookings,
        status: status || 'scheduled',
        description,
        instructors: normalizedInstructors ? JSON.parse(normalizedInstructors) : []
      }
    })
  } catch (error) {
    console.error('Create class error:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

// Get all classes endpoint
app.get('/api/classes', requireAuth, requireRole(['admin', 'coach', 'cliente']), async (req, res) => {
  try {
    const { filter } = req.query
    let query = `
      SELECT c.*, u.nombre as coach_name 
      FROM classes c 
      LEFT JOIN users u ON c.coach_id = u.id 
    `
    
    // Si se solicita filtrar por mes actual, agregar el filtro
    if (filter === 'current_month') {
      const today = new Date()
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      const firstDayStr = firstDayOfMonth.toISOString().split('T')[0]
      const lastDayStr = lastDayOfMonth.toISOString().split('T')[0]
      
      query += ` WHERE c.date >= ? AND c.date <= ?`
      query += ` ORDER BY c.date ASC, c.time ASC`
      
      const classes = await database.all(query, [firstDayStr, lastDayStr])
      
      return res.json({
        success: true,
        classes: classes
      })
    }
    
    // Por defecto, mostrar todas las clases futuras o del día actual
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]
    
    // Aumentar el límite para incluir todas las clases hasta diciembre 2026
    query += ` WHERE c.date >= ? ORDER BY c.date ASC, c.time ASC LIMIT 5000`
    
    const rawClasses = await database.all(query, [todayStr])

    // Normalizar campo instructors a arreglo
    const classes = rawClasses.map(cls => {
      let instructors = []
      if (cls.instructors) {
        if (Array.isArray(cls.instructors)) {
          instructors = cls.instructors
        } else if (typeof cls.instructors === 'string') {
          try {
            const parsed = JSON.parse(cls.instructors)
            instructors = Array.isArray(parsed) ? parsed : []
          } catch {
            instructors = []
          }
        }
      }
      return { ...cls, instructors }
    })
    
    res.json({
      success: true,
      classes
    })
  } catch (error) {
    console.error('Get classes error:', error)
    res.status(500).json({
      success: false,
      message: 'Error al obtener las clases'
    })
  }
})

// Get bookings for a specific class
app.get('/api/classes/:id/bookings', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
  try {
    const { id } = req.params
    
    const bookings = await database.all(`
      SELECT b.*, u.nombre as user_name, u.correo as user_email
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      WHERE b.class_id = ? AND b.status != 'cancelled'
      ORDER BY u.nombre ASC
    `, [id])
    
    res.json({
      success: true,
      bookings: bookings
    })
  } catch (error) {
    console.error('Get class bookings error:', error)
    res.status(500).json({
      success: false,
      message: 'Error al obtener las reservas de la clase'
    })
  }
})

// Update class (admin/coach)
app.put('/api/classes/:id', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
  try {
    const { id } = req.params
    const {
      title,
      date,
      time,
      end_time,
      duration,
      status,
      description,
      instructors
    } = req.body

    const updates = {}
    if (title !== undefined) updates.title = title
    if (date !== undefined) updates.date = date
    if (time !== undefined) updates.time = time
    if (end_time !== undefined) updates.end_time = end_time
    if (duration !== undefined) updates.duration = duration
    if (status !== undefined) updates.status = status
    if (description !== undefined) updates.description = description
    if (instructors !== undefined) updates.instructors = instructors

    const updatedClass = await database.updateClass(id, updates)

    if (!updatedClass) {
      return res.status(404).json({
        success: false,
        message: 'Clase no encontrada'
      })
    }

    // Normalizar instructors a arreglo
    let normalizedInstructors = []
    if (updatedClass.instructors) {
      try {
        const parsed = JSON.parse(updatedClass.instructors)
        normalizedInstructors = Array.isArray(parsed) ? parsed : []
      } catch {
        normalizedInstructors = []
      }
    }

    res.json({
      success: true,
      class: { ...updatedClass, instructors: normalizedInstructors }
    })
  } catch (error) {
    console.error('Update class error:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

// Assign/change client for a private class
app.post('/api/classes/:id/assign-client', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params
    const { client_id } = req.body

    if (!client_id) {
      return res.status(400).json({
        success: false,
        message: 'client_id es requerido'
      })
    }

    // Verify class exists
    const cls = await database.getClassById(id)
    if (!cls) {
      return res.status(404).json({
        success: false,
        message: 'Clase no encontrada'
      })
    }

    // Update class history to new client
    await database.updateClassHistoryClient(id, client_id)

    res.json({
      success: true,
      message: 'Cliente asignado exitosamente a la clase'
    })
  } catch (error) {
    console.error('Assign client to class error:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

// Delete class (admin only)
app.delete('/api/classes/:id', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params

    // Ensure class exists
    const cls = await database.getClassById(id)
    if (!cls) {
      return res.status(404).json({
        success: false,
        message: 'Clase no encontrada'
      })
    }

    // Delete related records
    await database.run('DELETE FROM class_history WHERE class_id = ?', [id])
    await database.run('DELETE FROM bookings WHERE class_id = ?', [id])
    await database.run('DELETE FROM classes WHERE id = ?', [id])

    res.json({
      success: true,
      message: 'Clase eliminada correctamente'
    })
  } catch (error) {
    console.error('Delete class error:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

// Get attendance records for a specific class
app.get('/api/attendance/class/:classId', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
  try {
    const { classId } = req.params
    
    const attendance = await database.all(`
      SELECT 
        a.id,
        a.classId,
        a.clientId,
        a.clientName,
        a.status,
        a.reason,
        a.cancellation_reason,
        a.notes,
        a.created_at,
        a.updated_at,
        a.clientId as user_id,
        a.clientName as user_name
      FROM attendance a
      WHERE a.classId = ? 
      ORDER BY a.created_at DESC
    `, [classId])
    
    res.json({
      success: true,
      attendance: attendance
    })
  } catch (error) {
    console.error('Get attendance error:', error)
    res.status(500).json({
      success: false,
      message: 'Error al obtener los registros de asistencia'
    })
  }
})

// Get classes by user
app.get('/api/users/:id/classes', requireAuth, requireRole(['admin', 'coach', 'cliente']), async (req, res) => {
  try {
    const { id } = req.params
    const user = req.user // Obtenido del middleware requireAuth

    // Solo el propio usuario, admin o coach pueden ver las clases
    if (user.id !== id && user.role !== 'admin' && user.role !== 'coach') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver estas clases'
      })
    }

    // Obtener clases grupales donde el usuario está registrado
    const groupClasses = await database.all(`
      SELECT c.*, ch.status as user_status, ch.cancellation_reason, ch.notes
      FROM classes c
      LEFT JOIN class_history ch ON c.id = ch.class_id AND ch.user_id = ?
      WHERE c.type = 'group' AND ch.user_id = ?
      ORDER BY c.date DESC, c.time DESC
    `, [id, id])

    // Obtener clases privadas asignadas al usuario
    const privateClasses = await database.all(`
      SELECT c.*, ch.status as user_status, ch.cancellation_reason, ch.notes
      FROM classes c
      LEFT JOIN class_history ch ON c.id = ch.class_id AND ch.user_id = ?
      WHERE c.type = 'private' AND ch.user_id = ?
      ORDER BY c.date DESC, c.time DESC
    `, [id, id])

    const allClasses = [...groupClasses, ...privateClasses].sort((a, b) => {
      const dateA = new Date(`${a.date} ${a.time}`)
      const dateB = new Date(`${b.date} ${b.time}`)
      return dateB.getTime() - dateA.getTime()
    })

    res.json({
      success: true,
      classes: allClasses
    })
  } catch (error) {
    console.error('Get user classes error:', error)
    res.status(500).json({
      success: false,
      message: 'Error al obtener clases del usuario'
    })
  }
})

// Record attendance for booking
app.post('/api/attendance/record', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
  try {
    const { bookingId, status, reason, notes } = req.body

    if (!bookingId || !status) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos para registrar la asistencia'
      })
    }

    // Validar que el status sea válido
    const validStatuses = ['attended', 'no_show', 'cancelled', 'absent', 'late_cancellation', 'studio_cancelled']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status de asistencia no válido'
      })
    }

    // Obtener información de la reserva
    const booking = await database.get(`
      SELECT b.*, c.title as className, c.date as classDate, c.time as classTime, c.coach_id, u.nombre as clientName, u.id as clientId
      FROM bookings b
      JOIN classes c ON b.class_id = c.id
      JOIN users u ON b.user_id = u.id
      WHERE b.id = ?
    `, [bookingId])

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Reserva no encontrada'
      })
    }

    // Obtener el nombre del coach
    let coachName = 'Coach no asignado'
    if (booking.coach_id) {
      const coach = await database.get('SELECT nombre FROM users WHERE id = ?', [booking.coach_id])
      if (coach) {
        coachName = coach.nombre
      }
    }

    // Convertir status si es necesario
    let attendanceStatus = status
    if (status === 'cancelled') {
      attendanceStatus = 'late_cancellation'
    }

    // Verificar si ya existe un registro de asistencia para esta clase y cliente
    const existingAttendance = await database.get(`
      SELECT id FROM attendance 
      WHERE classId = ? AND clientId = ?
    `, [booking.class_id, booking.clientId])

    if (existingAttendance) {
      // Actualizar registro existente
      await database.run(`
        UPDATE attendance 
        SET status = ?, reason = ?, notes = ?, updated_at = datetime('now')
        WHERE id = ?
      `, [attendanceStatus, reason || null, notes || null, existingAttendance.id])
    } else {
      // Crear nuevo registro
      await database.run(`
        INSERT INTO attendance (
          classId, className, date, time, coach, clientId, clientName, status, reason, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `, [
        booking.class_id, 
        booking.className, 
        booking.classDate, 
        booking.classTime,
        coachName, 
        booking.clientId, 
        booking.clientName, 
        attendanceStatus, 
        reason || null, 
        notes || null
      ])
    }

    // Si el estudiante asistió, actualizar su estadística de clases tomadas
    if (status === 'attended') {
      await database.run(`
        UPDATE users 
        SET clases_tomadas = clases_tomadas + 1,
            clases_restantes = CASE 
              WHEN type_of_class = 'Ilimitado' OR type_of_class LIKE '%Ilimitado%' THEN clases_restantes
              WHEN clases_restantes > 0 THEN clases_restantes - 1
              ELSE 0
            END,
            updated_at = datetime('now')
        WHERE id = ?
      `, [booking.clientId])

      // También agregar al historial de clases
      await database.run(`
        INSERT OR IGNORE INTO class_history (
          id, class_id, user_id, class_name, class_date, class_time, coach_name, status, cancellation_reason, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `, [
        uuidv4(),
        booking.class_id,
        booking.clientId,
        booking.className,
        booking.classDate,
        booking.classTime,
        coachName,
        'attended',
        null,
        notes || null
      ])
    }

    res.json({
      success: true,
      message: 'Asistencia registrada exitosamente'
    })
  } catch (error) {
    console.error('Record attendance error:', error)
    res.status(500).json({
      success: false,
      message: 'Error al registrar la asistencia: ' + error.message
    })
  }
})

// Initialize all group classes endpoint
app.post('/api/classes/initialize', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    // Limpiar clases, reservas y asistencias existentes antes de recrear el calendario
    await database.run('DELETE FROM attendance')
    await database.run('DELETE FROM bookings')
    await database.run('DELETE FROM classes')
    
    // Obtener el ID de Esmeralda García (coach)
    const coach = await database.get('SELECT id FROM users WHERE nombre = ? AND role = ?', ['Esmeralda García', 'coach'])
    if (!coach) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró el coach Esmeralda García'
      })
    }
    
    // Establecer fecha de inicio (una semana atrás desde hoy)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 7)
    startDate.setHours(0, 0, 0, 0) // Resetear a medianoche para evitar problemas de zona horaria
    
    // Establecer fecha de fin (31 de diciembre de 2026)
    const endDate = new Date(2026, 11, 31) // Mes 11 = Diciembre (0-indexed)
    endDate.setHours(23, 59, 59, 999) // Final del día
    
    // Función helper para formatear fecha como YYYY-MM-DD sin problemas de zona horaria
    const formatDate = (date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    
    let classCounter = 0
    const classes = []
    
    // Generar clases para cada día desde startDate hasta endDate
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      // Skip Tuesdays (day 2 = martes)
      const dayOfWeek = currentDate.getDay()
      if (dayOfWeek !== 2) { // Solo procesar si NO es martes
        const times = ['06:00', '08:00', '18:00']
        times.forEach(time => {
          const classId = uuidv4()
          const classData = {
            id: classId,
            title: 'Clase Grupal de Pilates',
            description: 'Clase grupal de pilates mat',
            date: formatDate(currentDate), // Usar formato local en lugar de ISO
            time: time,
            duration: 60,
            max_capacity: 9,
            current_bookings: 0,
            coach_id: coach.id,
            type: 'group',
            status: 'scheduled'
          }
          
          classes.push(classData)
          classCounter++
        })
      }
      
      // Avanzar al siguiente día
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    // Insertar todas las clases en la base de datos
    for (const classData of classes) {
      await database.run(`
        INSERT OR IGNORE INTO classes (
          id, title, description, date, time, duration, max_capacity, 
          current_bookings, coach_id, type, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        classData.id, classData.title, classData.description, classData.date,
        classData.time, classData.duration, classData.max_capacity,
        classData.current_bookings, classData.coach_id, classData.type,
        classData.status
      ])
    }
    
    res.json({
      success: true,
      message: `Se inicializaron ${classCounter} clases grupales hasta diciembre de 2026`,
      classesCreated: classCounter,
      dateRange: {
        start: formatDate(startDate),
        end: formatDate(endDate)
      },
      schedule: {
        days: 'Lunes, Miércoles, Jueves, Viernes, Sábado, Domingo',
        excludedDays: ['Martes'],
        times: ['06:00', '08:00', '18:00'],
        maxCapacity: 9
      }
    })
  } catch (error) {
    console.error('Initialize classes error:', error)
    res.status(500).json({
      success: false,
      message: 'Error al inicializar las clases'
    })
  }
})

// Email endpoints
app.post('/api/email/send-class-confirmation', async (req, res) => {
  try {
    const { clientEmail, clientName, className, classDate, classTime, coachName, classType } = req.body

    if (!clientEmail || !clientName || !className || !classDate || !classTime) {
      return res.status(400).json({
        success: false,
        message: 'Datos de email incompletos'
      })
    }

    // Enviar email real usando el servicio de email
    const result = await emailService.sendClassConfirmation(
      clientEmail, clientName, className, classDate, classTime, coachName, classType
    )

    if (result.success) {
      res.json({
        success: true,
        message: 'Email de confirmación enviado exitosamente',
        messageId: result.messageId
      })
    } else {
      console.error('Error enviando email:', result.error)
      res.status(500).json({
        success: false,
        message: 'Error al enviar el email de confirmación'
      })
    }
  } catch (error) {
    console.error('Send email error:', error)
    res.status(500).json({ success: false, message: 'Error enviando email' })
  }
})

// Send expiration notification email
app.post('/api/email/send-expiration-notification', async (req, res) => {
  try {
    const { clientEmail, clientName, packageName, expirationDate, daysRemaining } = req.body

    if (!clientEmail || !clientName || !packageName || !expirationDate) {
      return res.status(400).json({
        success: false,
        message: 'Datos de email incompletos'
      })
    }

    // Simular envío de email de notificación de vencimiento
    console.log('📧 Email de notificación de vencimiento:')
    console.log(`Para: ${clientName} (${clientEmail})`)
    console.log(`Paquete: ${packageName}`)
    console.log(`Fecha de vencimiento: ${expirationDate}`)
    console.log(`Días restantes: ${daysRemaining}`)
    console.log('---')

    // Simular delay de envío
    setTimeout(() => {
      console.log('✅ Email de vencimiento enviado exitosamente')
    }, 1000)

    res.json({
      success: true,
      message: 'Email de notificación de vencimiento enviado exitosamente'
    })
  } catch (error) {
    console.error('Send email error:', error)
    res.status(500).json({
      success: false,
      message: 'Error enviando email'
    })
  }
})

// Reports endpoint
app.get('/api/reports', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    
    // Get financial summary
    const paymentsQuery = startDate && endDate 
      ? `SELECT * FROM payments WHERE date BETWEEN ? AND ?`
      : `SELECT * FROM payments`
    
    const paymentsParams = startDate && endDate ? [startDate, endDate] : []
    const payments = await database.all(paymentsQuery, paymentsParams)
    
    // Calculate totals
    const totalIncome = payments
      .filter(p => p.type === 'income' && p.status === 'confirmed')
      .reduce((sum, p) => sum + p.amount, 0)
    
    const totalExpenses = payments
      .filter(p => p.type === 'expense' && p.status === 'confirmed')
      .reduce((sum, p) => sum + p.amount, 0)
    
    const netProfit = totalIncome - totalExpenses
    
    // Get client count
    const clientsQuery = startDate && endDate
      ? `SELECT COUNT(*) as count FROM users WHERE role = 'cliente' AND created_at BETWEEN ? AND ?`
      : `SELECT COUNT(*) as count FROM users WHERE role = 'cliente'`
    
    const clientsParams = startDate && endDate ? [startDate, endDate] : []
    const clientCount = await database.get(clientsQuery, clientsParams)
    
    // Get attendance summary
    const attendanceQuery = startDate && endDate
      ? `SELECT * FROM attendance WHERE date BETWEEN ? AND ?`
      : `SELECT * FROM attendance`
    
    const attendanceParams = startDate && endDate ? [startDate, endDate] : []
    const attendance = await database.all(attendanceQuery, attendanceParams)
    
    const totalClasses = new Set(attendance.map(a => a.classId)).size
    const averageClassSize = attendance.length > 0 ? (attendance.length / totalClasses).toFixed(1) : 0
    
    res.json({
      success: true,
      report: {
        period: startDate && endDate ? `${startDate} a ${endDate}` : 'Todos los datos',
        totalIncome,
        totalExpenses,
        netProfit,
        totalClients: clientCount.count,
        totalClasses,
        averageClassSize: parseFloat(averageClassSize),
        coachPayments: totalExpenses
      }
    })
  } catch (error) {
    console.error('Get reports error:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

// Send package expiration notification
app.post('/api/email/send-expiration-notification', async (req, res) => {
  try {
    const { clientEmail, clientName, packageName, expirationDate, remainingClasses } = req.body

    if (!clientEmail || !clientName || !packageName || !expirationDate) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos para enviar el email'
      })
    }

    const result = await emailService.sendPackageExpirationNotification(
      clientEmail, clientName, packageName, expirationDate, remainingClasses
    )

    if (result.success) {
      res.json({
        success: true,
        message: 'Notificación de vencimiento enviada exitosamente',
        messageId: result.messageId
      })
    } else {
      res.status(500).json({
        success: false,
        message: 'Error al enviar la notificación de vencimiento'
      })
    }
  } catch (error) {
    console.error('Send expiration notification error:', error)
    res.status(500).json({
      success: false,
      message: 'Error al enviar la notificación de vencimiento'
    })
  }
})

// Coach payments endpoints
app.get('/api/coach-payments', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const payments = await database.all(`
      SELECT * FROM coach_payments 
      ORDER BY period_start DESC, coach_name ASC
    `)
    
    res.json({
      success: true,
      payments: payments
    })
  } catch (error) {
    console.error('Get coach payments error:', error)
    res.status(500).json({
      success: false,
      message: 'Error al obtener los pagos a coaches'
    })
  }
})

app.post('/api/coach-payments/calculate', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { period_start, period_end, coach_name } = req.body
    
    if (!period_start || !coach_name) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos para calcular los pagos'
      })
    }

    // Calcular el período (por defecto mensual)
    const startDate = new Date(period_start)
    const endDate = period_end ? new Date(period_end) : new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0)
    
    // Obtener estudiantes que asistieron a clases del coach en el período
    const students = await database.all(`
      SELECT a.clientId, a.clientName, COUNT(*) as classes_attended
      FROM attendance a
      JOIN classes c ON a.classId = c.id
      WHERE a.coach_name = ? 
        AND a.class_date >= ? 
        AND a.class_date <= ?
        AND a.status = 'attended'
      GROUP BY a.clientId, a.clientName
      ORDER BY classes_attended DESC
    `, [coach_name, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]])

    // Calcular pagos por persona
    let totalStudents = 0
    let firstThreeStudents = 0
    let additionalStudents = 0
    
    for (const student of students) {
      totalStudents++
      if (totalStudents <= 3) {
        firstThreeStudents++
      } else {
        additionalStudents++
      }
    }
    
    const firstThreeAmount = firstThreeStudents * 250
    const additionalAmount = additionalStudents * 40
    const totalAmount = firstThreeAmount + additionalAmount

    // Crear o actualizar el registro de pago
    const paymentId = uuidv4()
    
    await database.run(`
      INSERT OR REPLACE INTO coach_payments (
        id, coach_name, period_start, period_end, total_students, 
        first_three_students, additional_students, first_three_amount, 
        additional_amount, total_amount, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
      paymentId, coach_name, startDate.toISOString().split('T')[0], 
      endDate.toISOString().split('T')[0], totalStudents, firstThreeStudents, 
      additionalStudents, firstThreeAmount, additionalAmount, totalAmount, 'pending'
    ])

    res.json({
      success: true,
      message: 'Pagos calculados exitosamente',
      payment: {
        id: paymentId,
        coach_name,
        period_start: startDate.toISOString().split('T')[0],
        period_end: endDate.toISOString().split('T')[0],
        total_students: totalStudents,
        first_three_students: firstThreeStudents,
        additional_students: additionalStudents,
        first_three_amount: firstThreeAmount,
        additional_amount: additionalAmount,
        total_amount: totalAmount,
        status: 'pending'
      }
    })
  } catch (error) {
    console.error('Calculate coach payments error:', error)
    res.status(500).json({
      success: false,
      message: 'Error al calcular los pagos'
    })
  }
})

app.put('/api/coach-payments/:id/mark-paid', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params
    
    await database.run(`
      UPDATE coach_payments 
      SET status = 'paid', payment_date = datetime('now')
      WHERE id = ?
    `, [id])

    res.json({
      success: true,
      message: 'Pago marcado como realizado'
    })
  } catch (error) {
    console.error('Mark payment as paid error:', error)
    res.status(500).json({
      success: false,
      message: 'Error al marcar el pago'
    })
  }
})

// Send birthday notification
app.post('/api/email/send-birthday-notification', async (req, res) => {
  try {
    const { clientEmail, clientName } = req.body

    if (!clientEmail || !clientName) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos para enviar el email'
      })
    }

    const result = await emailService.sendBirthdayNotification(clientEmail, clientName)

    if (result.success) {
      res.json({
        success: true,
        message: 'Notificación de cumpleaños enviada exitosamente',
        messageId: result.messageId
      })
    } else {
      res.status(500).json({
        success: false,
        message: 'Error al enviar la notificación de cumpleaños'
      })
    }
  } catch (error) {
    console.error('Send birthday notification error:', error)
    res.status(500).json({
      success: false,
      message: 'Error al enviar la notificación de cumpleaños'
    })
  }
})

// Clean up expired blocked IPs periodically (every minute)
setInterval(() => {
  const now = Date.now()
  let cleaned = 0
  for (const [ip, blockedUntil] of SecurityService.blockedIPs.entries()) {
    if (now > blockedUntil) {
      SecurityService.blockedIPs.delete(ip)
      cleaned++
    }
  }
  if (cleaned > 0) {
    console.log(`Cleaned up ${cleaned} expired IP block(s)`)
  }
}, 60 * 1000) // Check every minute

// Clear all blocked IPs on server start (development mode only)
// In production, you might want to persist blocked IPs
if (process.env.NODE_ENV !== 'production') {
  SecurityService.clearBlockedIPs()
  console.log('Blocked IPs cleared on server start (development mode)')
}

// Serve Next.js frontend in production (after all API routes)
if (process.env.NODE_ENV === 'production') {
  const next = require('next')
  const nextApp = next({ 
    dev: false,
    dir: path.join(__dirname, '..')
  })
  const nextHandler = nextApp.getRequestHandler()
  
  nextApp.prepare().then(() => {
    // Serve Next.js pages for all non-API routes
    // API routes are already handled above, so this catches everything else
    app.all('*', (req, res) => {
      // Skip API routes (they're already handled by Express routes above)
      if (req.path.startsWith('/api')) {
        // This should not happen as API routes are handled before this
        return res.status(404).json({
          success: false,
          message: 'Endpoint no encontrado'
        })
      }
      // Handle all other routes with Next.js
      return nextHandler(req, res)
    })
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 PilatesMermaid server running on port ${PORT}`)
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`)
      console.log(`🌐 Frontend: http://localhost:${PORT}`)
    })
  }).catch((error) => {
    console.error('❌ Error preparing Next.js:', error)
    // Fallback: 404 handler for API routes only
    app.use('/api/*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'Endpoint no encontrado'
      })
    })
    // Start API server only
    app.listen(PORT, () => {
      console.log(`🚀 PilatesMermaid API server running on port ${PORT}`)
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`)
      console.log(`⚠️  Frontend not available - Next.js failed to load`)
    })
  })
} else {
  // Development: 404 handler for API routes only
  app.use('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      message: 'Endpoint no encontrado'
    })
  })
  
  // Development: Only start API server
  app.listen(PORT, () => {
    console.log(`🚀 PilatesMermaid API server running on port ${PORT}`)
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`)
  })
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...')
  database.close()
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...')
  database.close()
  process.exit(0)
})
