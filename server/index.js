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

// Add unhandled error handlers to prevent silent crashes
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error)
  console.error('Stack:', error.stack)
  // Don't exit in development - allow debugging
  if (process.env.NODE_ENV === 'production') {
    process.exit(1)
  }
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
  // Don't exit in development - allow debugging
  if (process.env.NODE_ENV === 'production') {
    process.exit(1)
  }
})

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
      // Allow connections to same origin (includes custom domains when served from same port)
      // Allow connections to same origin (includes HTTPS same-origin requests)
      // 'self' includes the current origin (protocol, host, port)
      connectSrc: ["'self'", API_BASE_URL || "'self'", "http://localhost:3001", "http://127.0.0.1:3001"],
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

        // In production, if CORS_ORIGIN is not set, be more permissive
        // This allows custom domains to work without explicit configuration
        // Since Express serves both frontend and API on the same port, same-origin requests should always work
        if (process.env.NODE_ENV === 'production' && !allowedFromEnv) {
            console.warn('[CORS] Allowing origin in production (CORS_ORIGIN not set):', origin)
            return callback(null, true)
        }

        // In non-prod, be permissive so you don't lock yourself out while testing
        if (process.env.NODE_ENV !== 'production') {
            console.warn('[CORS] Temporarily allowing unknown origin in non-prod:', origin)
            return callback(null, true)
        }

        // Prod with explicit CORS_ORIGIN: log and reject
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

// Request logging middleware (development only)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    // Log all API requests in development
    if (req.path.startsWith('/api')) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
      console.log('  Headers:', {
        'content-type': req.get('content-type'),
        'origin': req.get('origin'),
        'referer': req.get('referer'),
        'user-agent': req.get('user-agent')?.substring(0, 50)
      })
      if (req.method === 'POST' || req.method === 'PUT') {
        console.log('  Body keys:', Object.keys(req.body || {}))
      }
    }
    next()
  })
}

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

// Helper: decode common HTML entities (escape inserts &#x27; for apostrophes)
const decodeHtmlEntities = (str) => {
  if (typeof str !== 'string') return str
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#96;/g, '`')
}

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

// Root endpoint - API information (only in development). In production, let Next.js handle '/' so users see the frontend.
if (process.env.NODE_ENV !== 'production') {
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
}

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
    // Log request details for debugging (development only)
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Register] Request received:', {
        method: req.method,
        path: req.path,
        bodyKeys: Object.keys(req.body || {}),
        contentType: req.get('content-type'),
        origin: req.get('origin'),
        referer: req.get('referer')
      })
    }
    
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
    // Auto-promote certain emails to admin (configured via env ADMIN_EMAILS, comma-separated)
    let finalRole = role
    try {
      const adminEmailEnv = process.env.ADMIN_EMAILS || ''
      if (adminEmailEnv) {
        const adminEmails = adminEmailEnv.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
        if (adminEmails.includes(correo.toLowerCase())) {
          finalRole = 'admin'
          console.log(`[register] Promoting ${correo} to admin based on ADMIN_EMAILS`)
        }
      }
    } catch (e) {
      console.error('Error processing ADMIN_EMAILS env:', e)
    }

    const userData = {
      nombre,
      correo,
      numero_de_telefono,
      instagram: instagram || null,
      role: finalRole,
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
    console.error('[Register] Registration error:', error)
    console.error('[Register] Error stack:', error.stack)
    console.error('[Register] Request body:', JSON.stringify(req.body, null, 2))
    console.error('[Register] Request headers:', {
      'content-type': req.get('content-type'),
      'origin': req.get('origin'),
      'referer': req.get('referer'),
      'user-agent': req.get('user-agent')
    })
    
    const clientIP = SecurityService.getClientIP(req)
    SecurityService.logSecurityEvent('REGISTRATION_ERROR', {
      error: error.message,
      stack: error.stack,
      ip: clientIP,
      path: req.path,
      method: req.method
    })
    
    // In development, return more detailed error information
    const errorResponse = {
      success: false,
      message: 'Error interno del servidor al registrar el usuario'
    }
    
    if (process.env.NODE_ENV !== 'production') {
      errorResponse.error = error.message
      errorResponse.stack = error.stack?.split('\n').slice(0, 5).join('\n') // First 5 lines of stack
    }
    
    res.status(500).json(errorResponse)
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

    // Auto-promote certain emails to admin on login (case-insensitive)
    try {
      const adminEmailEnv = process.env.ADMIN_EMAILS || ''
      if (adminEmailEnv) {
        const adminEmails = adminEmailEnv.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
        if (adminEmails.includes(user.correo.toLowerCase()) && user.role !== 'admin') {
          await database.updateUserRole(user.id, 'admin')
          user.role = 'admin'
          console.log(`[login] Promoting ${user.correo} to admin based on ADMIN_EMAILS`)
        }
      }
    } catch (e) {
      console.error('Error processing ADMIN_EMAILS env on login:', e)
    }

    // Generate JWT token (after potential role change)
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

      // Send password reset email with timeout
    try {
      // Log email configuration status (without exposing sensitive data)
      const emailProvider = process.env.EMAIL_PROVIDER || 'gmail'
      const hasEmailUser = !!process.env.EMAIL_USER
      const hasEmailPassword = !!process.env.EMAIL_PASSWORD
      console.log('[Password Reset] Email configuration check:', {
        provider: emailProvider,
        hasEmailUser,
        hasEmailPassword: hasEmailPassword,
        emailUserLength: process.env.EMAIL_USER?.length || 0
      })

      // Add overall timeout for the email operation (25 seconds to be under the 30s frontend timeout)
      const emailPromise = emailService.sendPasswordReset(user.correo, user.nombre, resetToken)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email operation timeout')), 25000)
      )

      const emailResult = await Promise.race([emailPromise, timeoutPromise])
      
      if (!emailResult || !emailResult.success) {
        const errorMessage = emailResult?.error || 'Unknown error'
        console.error('[Password Reset] Email service returned failure:', errorMessage)
        console.error('[Password Reset] Full error details:', {
          success: emailResult?.success,
          error: errorMessage,
          hasResult: !!emailResult
        })
        
        // Delete token if email fails
        await database.run('DELETE FROM password_reset_tokens WHERE id = ?', [tokenId])
        
        // Log email failure
        SecurityService.logSecurityEvent('PASSWORD_RESET_EMAIL_FAILED', {
          userId: user.id,
          email: user.correo,
          error: errorMessage,
          ip: clientIP
        })
        
        // Return more specific error message
        let userFacingMessage = 'Error al enviar el email de recuperación.'
        if (errorMessage.includes('not configured') || errorMessage.includes('environment variables')) {
          userFacingMessage = 'El servicio de correo no está configurado correctamente. Por favor, contacta al administrador.'
        } else if (errorMessage.includes('timeout')) {
          userFacingMessage = 'El envío de email está tardando demasiado. Por favor, intenta más tarde.'
        } else if (errorMessage.includes('authentication') || errorMessage.includes('Invalid login')) {
          userFacingMessage = 'Error de autenticación con el servidor de correo. Verifica las credenciales configuradas.'
        } else if (errorMessage.includes('connection') || errorMessage.includes('ECONNREFUSED')) {
          userFacingMessage = 'No se pudo conectar al servidor de correo. Verifica la configuración de red.'
        }
        
        return res.status(500).json({
          success: false,
          message: userFacingMessage
        })
      }
      
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
      
      // Log email error
      SecurityService.logSecurityEvent('PASSWORD_RESET_EMAIL_ERROR', {
        userId: user.id,
        email: user.correo,
        error: emailError.message,
        ip: clientIP
      })
      
        // Check if it's a timeout or connection error
        const isTimeout = emailError.message && (emailError.message.includes('timeout') || emailError.message.includes('ETIMEDOUT') || emailError.message.includes('ECONNREFUSED'))
        const isConnectionError = emailError.code === 'ETIMEDOUT' || emailError.code === 'ECONNREFUSED' || emailError.code === 'ECONNRESET'
        
        console.error('[Password Reset] Connection error details:', {
          code: emailError.code,
          message: emailError.message,
          isTimeout,
          isConnectionError
        })
        
        res.status(500).json({
          success: false,
          message: isTimeout || isConnectionError
            ? 'No se pudo conectar al servidor de correo. Railway puede estar bloqueando conexiones SMTP. Considera usar SendGrid o Mailgun en su lugar.'
            : 'Error al enviar el email de recuperación. Por favor, intenta de nuevo más tarde.'
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
app.get('/api/users', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
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

// Get all clients (admin or coach)
app.get('/api/users/clients', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
  try {
    // Fetch all users with role 'cliente' (case-insensitive matching)
    const allUsers = await database.all('SELECT * FROM users ORDER BY created_at DESC', [])
    const clients = allUsers.filter(user => user.role && user.role.toLowerCase() === 'cliente')
    
    console.log(`📋 [GET /api/users/clients] Found ${clients.length} clients out of ${allUsers.length} total users`)
    
    // Fetch active packages for each client
    const clientsWithPackages = await Promise.all(clients.map(async (client) => {
      // Get active group package
      const activeGroupPackage = await database.getActivePackageByUser(client.id, 'Grupal')
      // Get active private package
      const activePrivatePackage = await database.getActivePackageByUser(client.id, 'Privada')
      
      // Remove sensitive data
      return {
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
        updated_at: client.updated_at,
        activeGroupPackage: activeGroupPackage ? {
          id: activeGroupPackage.id,
          package_name: activeGroupPackage.package_name,
          end_date: activeGroupPackage.end_date,
          status: activeGroupPackage.status
        } : null,
        activePrivatePackage: activePrivatePackage ? {
          id: activePrivatePackage.id,
          package_name: activePrivatePackage.package_name,
          end_date: activePrivatePackage.end_date,
          status: activePrivatePackage.status
        } : null
      }
    }))

    res.json({
      success: true,
      clients: clientsWithPackages
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
app.get('/api/users/coaches', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
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

// Delete user (hard delete with related data)
app.delete('/api/users/:id', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
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

    const userId = id

    // Attempt to delete all related records to fully remove the customer
    try {
      await database.run('DELETE FROM bookings WHERE user_id = ?', [userId])
      await database.run('DELETE FROM class_history WHERE user_id = ?', [userId])
      await database.run('DELETE FROM package_history WHERE user_id = ?', [userId])
      await database.run('DELETE FROM payment_history WHERE user_id = ?', [userId])
      await database.run('DELETE FROM notification_settings WHERE user_id = ?', [userId])
      // Optional tables – ignore errors if they don't exist
      await database.run('DELETE FROM notification_log WHERE user_id = ?', [userId]).catch(() => {})
      await database.run('DELETE FROM private_class_requests WHERE user_id = ?', [userId]).catch(() => {})
    } catch (cleanupError) {
      console.error('Error cleaning up user-related data:', cleanupError)
      // Continue with user deletion even if some cleanup fails
    }

    // Delete user record
    await database.run('DELETE FROM users WHERE id = ?', [userId])

    res.json({
      success: true,
      message: 'Usuario y todos sus registros han sido eliminados exitosamente'
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
app.get('/api/dashboard/stats', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
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
app.get('/api/admin/role-assignments', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
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

app.post('/api/admin/role-assignments', requireAuth, requireRole(['admin', 'coach']), preserveOriginalEmail, [
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

app.put('/api/admin/role-assignments/:email', requireAuth, requireRole(['admin', 'coach']), [
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

app.delete('/api/admin/role-assignments/:email', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
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

// List packages (returns all packages - filtering is done client-side based on user role)
app.get('/api/packages', requireAuth, async (req, res) => {
  try {
    const user = req.user
    const isAdmin = user.role === 'admin'
    
    // Return all packages - let the frontend filter based on is_active for clients
    let packages = await database.getPackages({
      includeInactive: true,   // Include all packages
      includeScheduled: true,  // Include scheduled packages
      onlyLive: false,         // Don't filter by is_live
    })
    
    // Process scheduled/expired packages: activate those past live_from, deactivate and clear dates for expired live_until
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

    const cleanedPackages = []
    for (const pkg of packages) {
      const updates = {}
      // Expiration: if live_until has passed, deactivate and clear dates
      if (pkg.live_until) {
        const [y, m, d] = pkg.live_until.split('-').map(Number)
        // Treat live_until as expiring at the START of that day (00:00 local)
        const liveUntilDate = new Date(y, m - 1, d, 0, 0, 0, 0)
        if (todayStart >= liveUntilDate) {
          updates.is_active = 0
          updates.is_live = 0
          updates.live_from = null
          updates.live_until = null
        }
      }

      // Activation: if live_from is set and now is past it, activate and clear start date
      if (!updates.is_active && pkg.live_from) {
        const [y, m, d] = pkg.live_from.split('-').map(Number)
        const liveFromDate = new Date(y, m - 1, d, 0, 0, 0, 0)
        if (todayEnd >= liveFromDate) {
          updates.is_active = 1
          updates.is_live = 1
          updates.live_from = null
        }
      }

      // Apply updates if needed
      if (Object.keys(updates).length > 0) {
        await database.updatePackage(pkg.id, updates)
        Object.assign(pkg, updates)
      }

      // Only include if still active after cleanup
      // Handle SQLite returning 0/1 as numbers, booleans, or strings ('1', 'true', 'false', etc.)
      const isActive = pkg.is_active === 1 || 
                       pkg.is_active === true || 
                       pkg.is_active === '1' || 
                       pkg.is_active === 'true' ||
                       (typeof pkg.is_active === 'string' && pkg.is_active.toLowerCase() === 'true') ||
                       Number(pkg.is_active) === 1
      if (isActive) {
        cleanedPackages.push(pkg)
      } else {
        console.log(`[GET /api/packages] Filtered out package (inactive): ${pkg.id} ${pkg.name} is_active=${pkg.is_active} (type: ${typeof pkg.is_active})`)
      }
    }

    // For clients, only return active packages; admins see all
    const totalPackagesBeforeCleanup = packages.length
    packages = isAdmin ? packages : cleanedPackages

    console.log(`[GET /api/packages] User ${user.correo} (${user.role}) - returning ${packages.length} packages (${totalPackagesBeforeCleanup} total before cleanup)`)
    if (!isAdmin && packages.length === 0 && totalPackagesBeforeCleanup > 0) {
      console.log(`[GET /api/packages] WARNING: No active packages found for client. Total packages before cleanup: ${totalPackagesBeforeCleanup}, cleanedPackages: ${cleanedPackages.length}`)
      // Log first few packages to debug - get fresh from DB
      const allPackagesForDebug = await database.getPackages({ includeInactive: true, includeScheduled: true, onlyLive: false })
      console.log(`[GET /api/packages] Sample packages from DB:`, allPackagesForDebug.slice(0, 3).map(p => ({
        id: p.id,
        name: p.name,
        is_active: p.is_active,
        is_live: p.is_live,
        live_from: p.live_from,
        live_until: p.live_until,
        category: p.category
      })))
    }
    
    res.json({ success: true, packages })
  } catch (error) {
    console.error('Get packages error:', error)
    res.status(500).json({ success: false, message: 'Error al obtener paquetes' })
  }
})

// Create package (admin)
app.post('/api/packages', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
  try {
    const { name, type, classes_included, price, validity_months, category, description, is_live, live_from, live_until, is_active, original_price, sale_price } = req.body

    // Decode any HTML entities introduced by sanitization
    const safeName = decodeHtmlEntities(name)
    const safeDescription = decodeHtmlEntities(description)
    const safeCategory = decodeHtmlEntities(category)
    const safeType = decodeHtmlEntities(type)

    // Sensible fallbacks to avoid empty required fields causing 400s in production
    const finalCategory = safeCategory || 'Grupal'
    const finalType = safeType || (finalCategory === 'Privada' ? 'private' : 'group')
    
    if (!safeName || !finalType || !classes_included || !price || !validity_months || !finalCategory) {
      console.error('[POST /api/packages] Missing required fields:', {
        name: !!safeName,
        type: !!finalType,
        classes_included,
        price,
        validity_months,
        category: !!finalCategory
      })
      return res.status(400).json({ success: false, message: 'Faltan datos del paquete' })
    }
    
    const pkg = await database.createPackage({
      name: safeName,
      type: finalType,
      classes_included,
      price,
      validity_months,
      validity_days: validity_months * 30, // backwards compatibility
      category: finalCategory,
      description: safeDescription,
      is_live,
      live_from: live_from || null,
      live_until: live_until || null,
      original_price: original_price || null,
      sale_price: sale_price || null,
      is_active
    })
    
    res.json({ success: true, package: pkg })
  } catch (error) {
    console.error('Create package error:', error)
    res.status(500).json({ success: false, message: 'Error al crear paquete' })
  }
})

// Update package (admin)
app.put('/api/packages/:id', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body || {}

    // Decode any HTML entities introduced by sanitization
    if (updates.name) updates.name = decodeHtmlEntities(updates.name)
    if (updates.description) updates.description = decodeHtmlEntities(updates.description)

    // Decode any HTML entities introduced by sanitization
    if (updates.name) updates.name = decodeHtmlEntities(updates.name)
    if (updates.description) updates.description = decodeHtmlEntities(updates.description)
    if (updates.category) updates.category = decodeHtmlEntities(updates.category)
    if (updates.type) updates.type = decodeHtmlEntities(updates.type)
    
    const pkg = await database.updatePackage(id, updates)
    res.json({ success: true, package: pkg })
  } catch (error) {
    console.error('Update package error:', error)
    res.status(500).json({ success: false, message: 'Error al actualizar paquete' })
  }
})

// Delete (soft) package (admin)
app.delete('/api/packages/:id', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
  try {
    const { id } = req.params
    const pkg = await database.deletePackage(id)
    res.json({ success: true, package: pkg })
  } catch (error) {
    console.error('Delete package error:', error)
    res.status(500).json({ success: false, message: 'Error al eliminar paquete' })
  }
})

// =====================
// PACKAGE BUNDLES
// =====================

// List package bundles
app.get('/api/package-bundles', requireAuth, async (req, res) => {
  try {
    const user = req.user
    const isAdmin = user.role === 'admin'
    
    console.log('[Get Bundles] User:', user.role, 'isAdmin:', isAdmin, 'includeInactive:', isAdmin, 'onlyLive:', !isAdmin)
    
    // For debugging: get all bundles first to see what exists
    const allBundles = await database.getAllPackageBundles({
      includeInactive: true,
      onlyLive: false
    })
    console.log('[Get Bundles] Total bundles in DB:', allBundles.length)
    if (allBundles.length > 0) {
      console.log('[Get Bundles] All bundles:', allBundles.map(b => ({
        id: b.id,
        name: b.name,
        is_active: b.is_active,
        is_live: b.is_live,
        live_from: b.live_from,
        live_until: b.live_until
      })))
    }
    
    // Get ALL bundles from database (no filtering at DB level)
    // We'll do all filtering in JavaScript so we can see what exists
    let bundles = await database.getAllPackageBundles({
      includeInactive: true, // Get all bundles
      onlyLive: false // Don't filter by is_live
    })
    
    // Process scheduled/expired bundles: activate those past live_from, deactivate and clear dates for expired live_until
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

    const cleanedBundles = []
    for (const b of bundles) {
      const updates = {}
      // Expiration
      if (b.live_until) {
        const [y, m, d] = b.live_until.split('-').map(Number)
        // Treat live_until as expiring at START of that day
        const liveUntilDate = new Date(y, m - 1, d, 0, 0, 0, 0)
        if (todayStart >= liveUntilDate) {
          updates.is_active = 0
          updates.is_live = 0
          updates.live_from = null
          updates.live_until = null
        }
      }

      // Activation
      if (!updates.is_active && b.live_from) {
        const [y, m, d] = b.live_from.split('-').map(Number)
        const liveFromDate = new Date(y, m - 1, d, 0, 0, 0, 0)
        if (todayEnd >= liveFromDate) {
          updates.is_active = 1
          updates.is_live = 1
          updates.live_from = null
        }
      }

      if (Object.keys(updates).length > 0) {
        await database.updatePackageBundle(b.id, updates)
        Object.assign(b, updates)
      }

      if (b.is_active === 1 || b.is_active === true) {
        cleanedBundles.push(b)
      }
    }

    // For clients, only return active bundles; admins see all
    bundles = isAdmin ? bundles : cleanedBundles

    console.log('[Get Bundles] Raw bundles from DB:', bundles.length)
    if (bundles.length > 0) {
      bundles.forEach(b => {
        console.log('[Get Bundles] Bundle:', {
          id: b.id,
          name: b.name,
          is_active: b.is_active,
          is_live: b.is_live,
          live_from: b.live_from,
          live_until: b.live_until,
          group_package_id: b.group_package_id,
          private_package_id: b.private_package_id
        })
      })
    }
    
    // For clients, filter by active status and date ranges
    let filteredBundles = bundles
    if (!isAdmin) {
      console.log('[Get Bundles] Before client filtering:', bundles.length, 'bundles')
      filteredBundles = bundles.filter(b => {
        // Must be active (SQLite stores as 0/1, so check both)
        const isActive = b.is_active === 1 || b.is_active === true || (b.is_active !== 0 && b.is_active !== false)
        if (!isActive) {
          console.log('[Get Bundles] Filtered out bundle (inactive):', b.id, b.name, 'is_active:', b.is_active)
          return false
        }
        
        // Check date ranges (only if set) - use local date parsing to avoid timezone issues
        const now = new Date()
        
        if (b.live_from) {
          // Parse as local date (YYYY-MM-DD format)
          const [year, month, day] = b.live_from.split('-').map(Number)
          const liveFrom = new Date(year, month - 1, day, 0, 0, 0, 0) // Start of day in local time
          if (now < liveFrom) {
            console.log('[Get Bundles] Filtered out bundle (future):', b.id, b.name, 'live_from:', b.live_from)
            return false
          }
        }
        if (b.live_until) {
          // Parse as local date (YYYY-MM-DD format)
          const [year, month, day] = b.live_until.split('-').map(Number)
          const liveUntil = new Date(year, month - 1, day, 23, 59, 59, 999) // End of day in local time
          if (now > liveUntil) {
            console.log('[Get Bundles] Filtered out bundle (expired):', b.id, b.name, 'live_until:', b.live_until)
            return false
          }
        }
        
        console.log('[Get Bundles] Keeping bundle:', b.id, b.name, 'is_active:', b.is_active)
        return true
      })
      console.log('[Get Bundles] After client filtering:', filteredBundles.length, 'bundles')
    }
    
    console.log('[Get Bundles] Found', bundles.length, 'total bundles,', filteredBundles.length, 'after filtering for', user.role)
    if (bundles.length > 0) {
      console.log('[Get Bundles] Bundle details:', bundles.map(b => ({
        id: b.id,
        name: b.name,
        is_active: b.is_active,
        is_live: b.is_live,
        category: b.category || 'unknown'
      })))
    }
    
    // Add calculated savings to each bundle
    const bundlesWithSavings = filteredBundles.map(bundle => {
      // Calculate regular total based on both packages with separate months
      const groupMonthlyPrice = bundle.group_package_price || 0
      const privateMonthlyPrice = bundle.private_package_price || 0
      
      // Use separate months if available, otherwise fall back to months_included
      const groupMonths = bundle.group_months_included !== null && bundle.group_months_included !== undefined 
        ? bundle.group_months_included 
        : (bundle.months_included || 0)
      const privateMonths = bundle.private_months_included !== null && bundle.private_months_included !== undefined 
        ? bundle.private_months_included 
        : (bundle.months_included || 0)
      
      // Calculate regular total: (group price * group months) + (private price * private months)
      const groupTotal = groupMonthlyPrice * groupMonths
      const privateTotal = privateMonthlyPrice * privateMonths
      const regularTotal = groupTotal + privateTotal
      
      // Combined monthly price for display (average if both exist)
      const combinedMonthlyPrice = (groupMonthlyPrice + privateMonthlyPrice) || groupMonthlyPrice || privateMonthlyPrice
      
      const savings = regularTotal - bundle.price
      const percentOff = regularTotal > 0 ? Math.round((savings / regularTotal) * 100) : 0
      
      return {
        ...bundle,
        regular_total: regularTotal,
        combined_monthly_price: combinedMonthlyPrice,
        group_months_included: groupMonths,
        private_months_included: privateMonths,
        savings,
        percent_off: percentOff,
        is_combo: !!(bundle.group_package_id && bundle.private_package_id)
      }
    })
    
    res.json({ success: true, bundles: bundlesWithSavings })
  } catch (error) {
    console.error('Get bundles error:', error)
    res.status(500).json({ success: false, message: 'Error al obtener paquetes de renovación' })
  }
})

// Create package bundle (admin)
app.post('/api/package-bundles', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
  try {
    const { name, description, package_id, group_package_id, private_package_id, months_included, group_months_included, private_months_included, price, is_live, live_from, live_until, is_active } = req.body

    // Decode any HTML entities introduced by sanitization
    const safeName = decodeHtmlEntities(name)
    const safeDescription = decodeHtmlEntities(description)
    
    // Need at least one package (group, private, or legacy package_id)
    if (!name || (!package_id && !group_package_id && !private_package_id) || price === undefined) {
      return res.status(400).json({ success: false, message: 'Faltan datos del bundle. Se requiere nombre, al menos un paquete y precio.' })
    }
    
    // Validate months: if group_package_id is set, group_months_included is required
    // If private_package_id is set, private_months_included is required
    // If only legacy package_id is set, months_included is required
    if (group_package_id && (group_months_included === undefined || group_months_included === null || group_months_included < 1)) {
      return res.status(400).json({ success: false, message: 'Se requiere especificar cuántos meses del paquete grupal están incluidos.' })
    }
    if (private_package_id && (private_months_included === undefined || private_months_included === null || private_months_included < 1)) {
      return res.status(400).json({ success: false, message: 'Se requiere especificar cuántos meses del paquete privado están incluidos.' })
    }
    if (package_id && !group_package_id && !private_package_id && (!months_included || months_included < 1)) {
      return res.status(400).json({ success: false, message: 'Se requiere especificar cuántos meses están incluidos.' })
    }
    
    // Set is_live to match is_active (they're now the same thing)
    const bundle = await database.createPackageBundle({
      name: safeName,
      description: safeDescription,
      package_id: package_id || null,
      group_package_id: group_package_id || null,
      private_package_id: private_package_id || null,
      months_included: months_included || null, // Legacy support
      group_months_included: group_months_included || null,
      private_months_included: private_months_included || null,
      price,
      is_live: is_active !== undefined ? is_active : true, // Match is_active
      live_from: live_from || null,
      live_until: live_until || null,
      is_active: is_active !== undefined ? is_active : true
    })
    
    res.json({ success: true, bundle })
  } catch (error) {
    console.error('Create bundle error:', error)
    res.status(500).json({ success: false, message: 'Error al crear bundle' })
  }
})

// Update package bundle (admin)
app.put('/api/package-bundles/:id', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body || {}
    
    // Sync is_live with is_active (they're now the same thing)
    if (updates.is_active !== undefined) {
      updates.is_live = updates.is_active
    }
    
    console.log('[Update Bundle] ID:', id, 'Updates:', JSON.stringify(updates))
    
    const bundle = await database.updatePackageBundle(id, updates)
    res.json({ success: true, bundle })
  } catch (error) {
    console.error('Update bundle error:', error)
    console.error('Update bundle error stack:', error.stack)
    res.status(500).json({ success: false, message: 'Error al actualizar bundle: ' + error.message })
  }
})

// Delete package bundle (admin) - hard delete
app.delete('/api/package-bundles/:id', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
  try {
    const { id } = req.params
    const bundle = await database.deletePackageBundle(id)
    res.json({ success: true, bundle })
  } catch (error) {
    console.error('Delete bundle error:', error)
    res.status(500).json({ success: false, message: 'Error al eliminar bundle: ' + error.message })
  }
})

// =====================
// ATTENDANCE TRACKING
// =====================

// Get attendance sheet for a class (admin/coach)
app.get('/api/classes/:id/attendance', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
  try {
    const { id } = req.params
    const { occurrence_date } = req.query
    
    console.log('[Get Attendance] Class:', id, 'Occurrence query:', occurrence_date)
    
    const cls = await database.getClassById(id)
    if (!cls) {
      return res.status(404).json({ success: false, message: 'Clase no encontrada' })
    }
    
    // Use occurrence_date if provided.
    // For non-recurring classes, keep it null so bookings with NULL occurrence_date match.
    const effectiveDate = occurrence_date || (cls.is_recurring ? cls.date : null)
    console.log('[Get Attendance] Effective date:', effectiveDate)
    
    const attendanceSheet = await database.getClassAttendanceSheet(id, effectiveDate)
    const attendanceRecords = await database.getClassAttendance(id, effectiveDate)
    
    console.log('[Get Attendance] Found', attendanceSheet?.length || 0, 'attendees,', attendanceRecords?.length || 0, 'records')
    
    res.json({ 
      success: true, 
      class: cls,
      attendanceSheet,
      attendanceRecords
    })
  } catch (error) {
    console.error('Get attendance error:', error)
    res.status(500).json({ success: false, message: 'Error al obtener asistencia' })
  }
})

// Set attendance for a user in a class (admin/coach)
app.post('/api/classes/:id/attendance', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
  try {
    const { id } = req.params
    const { occurrence_date, user_id, status, notes } = req.body
    
    if (!user_id || !status) {
      return res.status(400).json({ success: false, message: 'Usuario y estado son requeridos' })
    }
    
    const validStatuses = ['present', 'absent', 'late_cancel', 'excused']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Estado de asistencia inválido' })
    }
    
    const cls = await database.getClassById(id)
    if (!cls) {
      return res.status(404).json({ success: false, message: 'Clase no encontrada' })
    }
    
    const user = await database.getUserById(user_id)
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' })
    }
    
    const record = await database.setAttendance({
      classId: id,
      occurrenceDate: occurrence_date || cls.date,
      userId: user_id,
      userName: user.nombre,
      status,
      markedBy: req.user.nombre || req.user.correo,
      notes
    })
    
    // Also update booking status if applicable
    const bookingStatus = status === 'present' ? 'attended' : status === 'absent' ? 'no_show' : 'cancelled'
    await database.run(`
      UPDATE bookings 
      SET status = ?, updated_at = datetime('now')
      WHERE class_id = ? AND user_id = ? 
        AND (occurrence_date = ? OR (occurrence_date IS NULL AND ? IS NULL))
    `, [bookingStatus, id, user_id, occurrence_date, occurrence_date])
    
    res.json({ success: true, record })
  } catch (error) {
    console.error('Set attendance error:', error)
    res.status(500).json({ success: false, message: 'Error al registrar asistencia' })
  }
})

// Bulk set attendance for a class (admin/coach)
app.post('/api/classes/:id/attendance/bulk', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
  try {
    const { id } = req.params
    const { occurrence_date, attendances } = req.body
    
    console.log('[Bulk Attendance] Class:', id, 'Occurrence:', occurrence_date, 'Attendances:', JSON.stringify(attendances))
    
    if (!Array.isArray(attendances)) {
      return res.status(400).json({ success: false, message: 'Lista de asistencias requerida' })
    }
    
    const cls = await database.getClassById(id)
    if (!cls) {
      return res.status(404).json({ success: false, message: 'Clase no encontrada' })
    }
    
    const results = []
    for (const att of attendances) {
      try {
        const user = await database.getUserById(att.user_id)
        if (!user) {
          console.log('[Bulk Attendance] User not found:', att.user_id)
          continue
        }
        
        const markedBy = req.user.nombre || req.user.correo || req.user.email || 'Admin'
        console.log('[Bulk Attendance] Setting attendance for:', user.nombre, 'status:', att.status, 'markedBy:', markedBy)
        
        const record = await database.setAttendance({
          classId: id,
          occurrenceDate: occurrence_date || cls.date,
          userId: att.user_id,
          userName: user.nombre,
          status: att.status,
          markedBy: markedBy,
          notes: att.notes
        })
        
        // Update booking status
        const bookingStatus = att.status === 'present' ? 'attended' : att.status === 'absent' ? 'no_show' : 'cancelled'
        await database.run(`
          UPDATE bookings 
          SET status = ?, updated_at = datetime('now')
          WHERE class_id = ? AND user_id = ? 
            AND (occurrence_date = ? OR (occurrence_date IS NULL AND ? IS NULL))
        `, [bookingStatus, id, att.user_id, occurrence_date, occurrence_date])
        
        results.push(record)
      } catch (attErr) {
        console.error('[Bulk Attendance] Error for user', att.user_id, ':', attErr)
      }
    }
    
    res.json({ success: true, records: results })
  } catch (error) {
    console.error('Bulk attendance error:', error)
    console.error('Bulk attendance error stack:', error.stack)
    res.status(500).json({ success: false, message: 'Error al registrar asistencias: ' + error.message })
  }
})

// Remove user from class attendance (admin/coach) - always refunds if credit was deducted
app.post('/api/classes/:id/attendance/remove', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
  try {
    const { id } = req.params
    const { occurrence_date, user_id } = req.body
    
    if (!user_id) {
      return res.status(400).json({ success: false, message: 'ID de usuario requerido' })
    }
    
    console.log('[Remove from Attendance] Class:', id, 'Occurrence:', occurrence_date, 'User:', user_id)
    
    // Get the booking to check if credit was deducted
    const booking = await database.get(`
      SELECT * FROM bookings 
      WHERE class_id = ? AND user_id = ? 
        AND (occurrence_date = ? OR (occurrence_date IS NULL AND ? IS NULL))
        AND status IN ('confirmed', 'attended')
    `, [id, user_id, occurrence_date, occurrence_date])
    
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Reserva no encontrada' })
    }
    
    // Cancel the booking
    await database.run(`
      UPDATE bookings SET status = 'cancelled', updated_at = datetime('now')
      WHERE id = ?
    `, [booking.id])
    
    // Delete any attendance record for this user/class/occurrence
    await database.run(`
      DELETE FROM attendance_records 
      WHERE class_id = ? AND user_id = ? AND occurrence_date = ?
    `, [id, user_id, occurrence_date])
    
    // Refund if credit was deducted
    const shouldRefund = booking.credit_deducted === 1 || booking.credit_deducted === '1' || booking.credit_deducted === true
    let refunded = false
    
    if (shouldRefund) {
      const cls = await database.getClassById(id)
      const classType = cls?.type === 'private' ? 'private' : 'group'
      await database.addClassToUser(user_id, classType)
      refunded = true
      console.log(`[Remove from Attendance] Refunded ${classType} class to user ${user_id}`)
    } else {
      console.log(`[Remove from Attendance] No credit to refund for user ${user_id}`)
    }

    // Recompute current_bookings for this class (respect occurrence_date for recurring)
    let remainingCount = 0
    let remainingIds = []
    if (occurrence_date) {
      const row = await database.get(`
        SELECT COUNT(*) as count
        FROM bookings
        WHERE class_id = ?
          AND occurrence_date = ?
          AND status IN ('confirmed', 'attended')
      `, [id, occurrence_date])
      remainingCount = row?.count || 0
    } else {
      const rows = await database.all(`
        SELECT user_id
        FROM bookings
        WHERE class_id = ?
          AND (occurrence_date IS NULL OR occurrence_date = '')
          AND status IN ('confirmed', 'attended')
      `, [id])
      remainingCount = rows?.length || 0
      remainingIds = rows ? rows.map(r => r.user_id) : []
    }

    await database.run(`UPDATE classes SET current_bookings = ? WHERE id = ?`, [remainingCount, id])
    console.log(`[Remove from Attendance] Updated current_bookings to ${remainingCount}`)

    // If non-recurring group class, also update assigned_client_ids to match remaining bookings
    const cls = await database.getClassById(id)
    if (cls && cls.type === 'group' && !(cls.is_recurring === 1 || cls.is_recurring === '1')) {
      const assignedJson = JSON.stringify(remainingIds)
      await database.run(`UPDATE classes SET assigned_client_ids = ? WHERE id = ?`, [assignedJson, id])
      console.log(`[Remove from Attendance] Updated assigned_client_ids to`, assignedJson)
    }
    
    res.json({ 
      success: true, 
      message: refunded ? 'Usuario removido y clase reembolsada' : 'Usuario removido (sin crédito para reembolsar)',
      refunded 
    })
  } catch (error) {
    console.error('Remove from attendance error:', error)
    res.status(500).json({ success: false, message: 'Error al remover usuario' })
  }
})

// Get user attendance record (admin only)
app.get('/api/users/:id/attendance-record', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
  try {
    const { id } = req.params
    
    const user = await database.getUserById(id)
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' })
    }
    
    const record = await database.getUserAttendanceRecord(id)
    
    res.json({ 
      success: true, 
      user: { id: user.id, nombre: user.nombre, correo: user.correo },
      ...record
    })
  } catch (error) {
    console.error('Get user attendance record error:', error)
    res.status(500).json({ success: false, message: 'Error al obtener historial de asistencia' })
  }
})

// Get attendance status for current user's bookings (for color coding on client calendar)
app.get('/api/my-attendance', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    
    const attendance = await database.all(`
      SELECT ar.class_id, ar.occurrence_date, ar.attendance_status
      FROM attendance_records ar
      WHERE ar.user_id = ?
    `, [userId])
    
    res.json({ success: true, attendance })
  } catch (error) {
    console.error('Get my attendance error:', error)
    res.status(500).json({ success: false, message: 'Error al obtener asistencia' })
  }
})

// Assign package to client (admin only)
app.post('/api/packages/assign', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
  try {
    const { clientId, packageId, renewalMonths, overrideNegativeBalance } = req.body

    if (!clientId || !packageId) {
      return res.status(400).json({
        success: false,
        message: 'Cliente y paquete son requeridos'
      })
    }

    if (renewalMonths === undefined || renewalMonths === null || renewalMonths < 1 || renewalMonths > 999) {
      return res.status(400).json({
        success: false,
        message: 'Los meses restantes deben estar entre 1 y 999'
      })
    }

    const selectedPackage = await database.getPackageById(packageId)
    if (!selectedPackage || selectedPackage.is_active === 0) {
      return res.status(400).json({ success: false, message: 'Paquete no válido o inactivo' })
    }
    
    // Validate schedule if live
    const todayStr = new Date().toISOString().split('T')[0]
    if (selectedPackage.is_live === 0) {
      return res.status(400).json({ success: false, message: 'Paquete no está activo en este momento' })
    }
    if (selectedPackage.live_from && selectedPackage.live_from > todayStr) {
      return res.status(400).json({ success: false, message: 'Paquete aún no está disponible' })
    }
    if (selectedPackage.live_until && selectedPackage.live_until < todayStr) {
      return res.status(400).json({ success: false, message: 'Paquete ya no está disponible' })
    }

    // Check for negative balance if adding package
    const user = await database.get('SELECT * FROM users WHERE id = ?', [clientId])
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      })
    }

    const currentCount = selectedPackage.category === 'Grupal' 
      ? (user.group_classes_remaining || 0)
      : (user.private_classes_remaining || 0)

    // Calculate dates
    const startDate = new Date()
    const expirationDate = new Date()
    expirationDate.setDate(expirationDate.getDate() + selectedPackage.validity_days)
    const startDateString = startDate.toISOString().split('T')[0]
    const expirationDateString = expirationDate.toISOString().split('T')[0]

    // Desactivar TODOS los paquetes anteriores del mismo tipo que estén activos
    // This ensures no duplicate active packages exist
    const activePackages = await database.all(`
      SELECT * FROM package_history 
      WHERE user_id = ? 
      AND package_category = ?
      AND status = 'active'
    `, [clientId, selectedPackage.category])
    
    // Expire all active packages of this category
    for (const pkg of activePackages) {
      await database.updatePackageStatus(pkg.id, 'expired')
    }

    // Determine new class count
    let newCount = selectedPackage.classes_included
    if (currentCount < 0 && !overrideNegativeBalance) {
      // Deduct negative balance
      newCount = selectedPackage.classes_included + currentCount
    }

    // Update client class counts
    if (selectedPackage.category === 'Grupal') {
      await database.run(
        `UPDATE users SET 
          group_classes_remaining = ?,
          updated_at = datetime('now')
         WHERE id = ?`,
        [newCount, clientId]
      )
    } else {
      await database.run(
        `UPDATE users SET 
          private_classes_remaining = ?,
          updated_at = datetime('now')
         WHERE id = ?`,
        [newCount, clientId]
      )
    }

    // Crear registro en package_history
    await database.addPackageHistory({
      user_id: clientId,
      package_name: selectedPackage.name,
      package_type: selectedPackage.type,
      package_category: selectedPackage.category,
      classes_included: selectedPackage.classes_included,
      start_date: startDateString,
      end_date: expirationDateString,
      payment_method: 'N/A',
      amount_paid: 0,
      status: 'active',
      auto_renew: true,
      last_renewal_date: null,
      renewal_months: renewalMonths || 1
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

// Get user class counts
app.get('/api/users/:id/class-counts', requireAuth, requireRole(['admin', 'coach', 'cliente']), async (req, res) => {
  try {
    const { id } = req.params
    const user = req.user

    // Only the user themselves, admin, or coach can view class counts
    if (user.id !== id && user.role !== 'admin' && user.role !== 'coach') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver estos datos'
      })
    }

    // Ensure packages are up to date (auto-renewal check)
    // Will read default behavior from admin settings
    await database.ensureUserPackagesUpToDate(id)

    const client = await database.get('SELECT * FROM users WHERE id = ?', [id])
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      })
    }

    res.json({
      success: true,
      private_classes_remaining: client.private_classes_remaining || 0,
      group_classes_remaining: client.group_classes_remaining || 0
    })
  } catch (error) {
    console.error('Get class counts error:', error)
    res.status(500).json({
      success: false,
      message: 'Error al obtener conteo de clases'
    })
  }
})

// Update user class counts (admin only)
app.post('/api/users/:id/update-class-counts', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
  try {
    const { id } = req.params
    const { private_classes_remaining, group_classes_remaining } = req.body

    if (private_classes_remaining === undefined && group_classes_remaining === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar al menos un conteo de clases'
      })
    }

    const updates = []
    const params = []

    if (private_classes_remaining !== undefined) {
      updates.push('private_classes_remaining = ?')
      params.push(private_classes_remaining)
    }

    if (group_classes_remaining !== undefined) {
      updates.push('group_classes_remaining = ?')
      params.push(group_classes_remaining)
    }

    params.push(id)

    await database.run(`
      UPDATE users 
      SET ${updates.join(', ')}, updated_at = datetime('now')
      WHERE id = ?
    `, params)

    res.json({
      success: true,
      message: 'Conteo de clases actualizado exitosamente'
    })
  } catch (error) {
    console.error('Update class counts error:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

// Update package auto-renew (admin only)
app.put('/api/packages/:id/auto-renew', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
  try {
    const { id } = req.params
    const { auto_renew } = req.body

    await database.run(`
      UPDATE package_history 
      SET auto_renew = ?, updated_at = datetime('now')
      WHERE id = ?
    `, [auto_renew ? 1 : 0, id])

    res.json({
      success: true,
      message: 'Auto-renovación actualizada exitosamente'
    })
  } catch (error) {
    console.error('Update package auto-renew error:', error)
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

app.post('/api/payments', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
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

app.put('/api/payments/:id', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
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

    // Ensure packages are up to date (auto-renewal check)
    // Will read default behavior from admin settings
    await database.ensureUserPackagesUpToDate(id)

    const packageHistory = await database.getPackageHistoryByUser(id)
    const activeGroupPackage = await database.getActivePackageByUser(id, 'Grupal')
    const activePrivatePackage = await database.getActivePackageByUser(id, 'Privada')
    let activePackage = activeGroupPackage || activePrivatePackage // For backward compatibility
    
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
      activePackage: activePackage || null,
      activeGroupPackage: activeGroupPackage || null,
      activePrivatePackage: activePrivatePackage || null
    }
    
    console.log(`  - Response JSON:`, JSON.stringify(response, null, 2))
    
    res.json(response)
  } catch (error) {
    console.error('Get package history error:', error)
    res.status(500).json({ success: false, message: 'Error al obtener historial de paquetes' })
  }
})

app.post('/api/users/:id/package-history', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
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

// Deactivate an active package (optionally purging remaining classes)
app.post('/api/package-history/:id/deactivate', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
  try {
    const { id } = req.params
    const { behavior } = req.body

    const pkg = await database.get('SELECT * FROM package_history WHERE id = ?', [id])
    if (!pkg) {
      return res.status(404).json({ success: false, message: 'Paquete no encontrado' })
    }

    const userId = pkg.user_id

    if (behavior === 'purge') {
      if (pkg.package_category === 'Grupal') {
        await database.run(
          'UPDATE users SET group_classes_remaining = 0, updated_at = datetime("now") WHERE id = ?',
          [userId]
        )
      } else if (pkg.package_category === 'Privada') {
        await database.run(
          'UPDATE users SET private_classes_remaining = 0, updated_at = datetime("now") WHERE id = ?',
          [userId]
        )
      }
    }

    await database.run(
      'UPDATE package_history SET status = "expired", updated_at = datetime("now") WHERE id = ?',
      [id]
    )

    res.json({ success: true, message: 'Paquete desactivado exitosamente' })
  } catch (error) {
    console.error('Deactivate package error:', error)
    res.status(500).json({ success: false, message: 'Error al desactivar paquete' })
  }
})


// Update renewal months for a package
app.post('/api/package-history/:id/update-renewal', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
  try {
    const { id } = req.params
    const { renewal_months } = req.body
    
    console.log(`[Update Renewal] Package ID: ${id}, Renewal months: ${renewal_months}`)
    
    if (renewal_months === undefined || renewal_months === null) {
      return res.status(400).json({
        success: false,
        message: 'Meses restantes requeridos'
      })
    }
    
    if (renewal_months < 1 || renewal_months > 999) {
      return res.status(400).json({
        success: false,
        message: 'Los meses restantes deben estar entre 1 y 999'
      })
    }
    
    // Get the package
    const pkg = await database.getPackageHistoryById(id)
    if (!pkg) {
      console.log(`[Update Renewal] Package not found: ${id}`)
      return res.status(404).json({
        success: false,
        message: 'Paquete no encontrado'
      })
    }
    
    console.log(`[Update Renewal] Package found:`, {
      id: pkg.id,
      status: pkg.status,
      package_category: pkg.package_category,
      user_id: pkg.user_id
    })
    
    // If this is an active package, cancel all other active packages of the same category
    if (pkg.status === 'active' && pkg.package_category) {
      try {
        const otherActivePackages = await database.all(`
          SELECT * FROM package_history 
          WHERE user_id = ? 
          AND package_category = ?
          AND status = 'active'
          AND id != ?
        `, [pkg.user_id, pkg.package_category, id])
        
        console.log(`[Update Renewal] Found ${otherActivePackages.length} other active packages to expire`)
        
        // Expire all other active packages of this category
        for (const otherPkg of otherActivePackages) {
          await database.updatePackageStatus(otherPkg.id, 'expired')
        }
      } catch (err) {
        console.error('[Update Renewal] Error expiring other packages:', err)
        // Continue with the update even if this fails
      }
    }
    
    // Update renewal_months
    await database.run(`
      UPDATE package_history 
      SET renewal_months = ?
      WHERE id = ?
    `, [renewal_months, id])
    
    console.log(`[Update Renewal] Successfully updated package ${id}`)
    
    res.json({
      success: true,
      message: 'Meses restantes actualizados exitosamente'
    })
  } catch (error) {
    console.error('[Update Renewal] Error:', error)
    console.error('[Update Renewal] Error stack:', error.stack)
    res.status(500).json({
      success: false,
      message: 'Error al actualizar meses restantes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// Renew an expired package
app.post('/api/package-history/:id/renew', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
  try {
    const { id } = req.params
    const { months = 1 } = req.body

    // Check if package exists and is expired
    const pkg = await database.getPackageHistoryById(id)
    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: 'Paquete no encontrado'
      })
    }

    if (pkg.status !== 'expired') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden renovar paquetes expirados'
      })
    }

    // First, cancel any other active packages of the same category for this user
    const category = pkg.package_category
    const activePackages = await database.all(`
      SELECT id FROM package_history 
      WHERE user_id = ? AND package_category = ? AND status = 'active' AND id != ?
    `, [pkg.user_id, category, id])

    for (const activePkg of activePackages) {
      await database.updatePackageStatus(activePkg.id, 'expired')
    }
    
    // Calculate new end date (from today + validity days from original package)
    const originalPackage = await database.getPackageById(pkg.package_id)
    const validityDays = originalPackage ? originalPackage.validity_days : 30
    const newEndDate = new Date()
    newEndDate.setDate(newEndDate.getDate() + validityDays)

    // Update the package: set to active, set new dates, set renewal months
    const startDateStr = new Date().toISOString().split('T')[0]
    await database.run(`
      UPDATE package_history 
      SET status = 'active', 
          start_date = ?,
          end_date = ?,
          renewal_months = ?
      WHERE id = ?
    `, [startDateStr, newEndDate.toISOString().split('T')[0], months, id])

    // Also add back the classes to the user
    const classesIncluded = pkg.classes_included || 0
    if (category === 'Grupal') {
      await database.run(`
        UPDATE users SET group_classes_remaining = group_classes_remaining + ? WHERE id = ?
      `, [classesIncluded, pkg.user_id])
    } else {
      await database.run(`
        UPDATE users SET private_classes_remaining = private_classes_remaining + ? WHERE id = ?
      `, [classesIncluded, pkg.user_id])
    }

    res.json({
      success: true,
      message: 'Paquete renovado exitosamente'
    })
  } catch (error) {
    console.error('Renew package error:', error)
    res.status(500).json({
      success: false,
      message: 'Error al renovar el paquete'
    })
  }
})

// Cancel (expire) an active package
app.post('/api/package-history/:id/cancel', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
  try {
    const { id } = req.params
    
    // Check if package exists and is active
    const pkg = await database.getPackageHistoryById(id)
    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: 'Paquete no encontrado'
      })
    }
    
    if (pkg.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden cancelar paquetes activos'
      })
    }
    
    // Mark as expired
    await database.updatePackageStatus(id, 'expired')
    
    res.json({
      success: true,
      message: 'Paquete cancelado exitosamente'
    })
  } catch (error) {
    console.error('Cancel package error:', error)
    res.status(500).json({
      success: false,
      message: 'Error al cancelar el paquete'
    })
  }
})

// Delete a package history entry (only expired packages)
app.delete('/api/package-history/:id', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
  try {
    const { id } = req.params

    const pkg = await database.getPackageHistoryById(id)
    if (!pkg) {
      return res.status(404).json({ 
        success: false, 
        message: 'Paquete no encontrado' 
      })
    }
    
    if (pkg.status === 'active') {
      return res.status(400).json({
        success: false,
        message: 'No se pueden eliminar paquetes activos. Cancélalos primero.'
      })
    }

    await database.run('DELETE FROM package_history WHERE id = ?', [id])

    res.json({ 
      success: true, 
      message: 'Registro de paquete eliminado exitosamente' 
    })
  } catch (error) {
    console.error('Delete package history error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error al eliminar registro de paquete' 
    })
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
app.post('/api/admin/security/unblock-ip', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
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

app.post('/api/admin/security/clear-blocked-ips', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
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

app.get('/api/admin/security/blocked-ips', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
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

app.get('/api/admin/expiring-packages', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
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
app.post('/api/admin/send-expiration-notifications', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
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
    const { class_id, occurrence_date, payment_method, notes, confirm_overdraft } = req.body
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

    // Fetch class information
    const classInfo = await database.getClassById(class_id)
    if (!classInfo) {
      return res.status(404).json({
        success: false,
        message: 'Clase no encontrada'
      })
    }

    const classType = classInfo.type

    // Get user's current class counts
    const user = await database.getUserById(userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      })
    }

    const currentRemaining = classType === 'private' 
      ? (user.private_classes_remaining || 0)
      : (user.group_classes_remaining || 0)
    
    const newRemaining = currentRemaining - 1

    // Check if user is at maximum overdraft limit (-2)
    if (newRemaining < -2) {
      return res.status(400).json({
        success: false,
        message: 'MAX_OVERDRAFT_REACHED',
        currentBalance: currentRemaining,
        wouldBeBalance: newRemaining,
        maxOverdraft: -2
      })
    }

    // Check if user has 0 or negative classes - they need to confirm overdraft
    if (currentRemaining <= 0 && !confirm_overdraft) {
      return res.status(400).json({
        success: false,
        message: 'OVERDRAFT_WARNING',
        currentBalance: currentRemaining,
        wouldBeBalance: newRemaining,
        classType: classType
      })
    }

    // For recurring classes, check capacity per occurrence; for regular classes, use current_bookings
    const isRecurring = classInfo.is_recurring === 1 || classInfo.is_recurring === '1' || classInfo.is_recurring === true
    if (isRecurring && occurrence_date) {
      // Check booking count for this specific occurrence
      const occurrenceBookings = await database.get(
        'SELECT COUNT(*) as count FROM bookings WHERE class_id = ? AND occurrence_date = ? AND status = "confirmed"',
        [class_id, occurrence_date]
      )
      if ((occurrenceBookings?.count || 0) >= classInfo.max_capacity) {
        return res.status(400).json({
          success: false,
          message: 'Esta clase ya está llena'
        })
      }
    } else if (!isRecurring && classInfo.current_bookings >= classInfo.max_capacity) {
      return res.status(400).json({
        success: false,
        message: 'Esta clase ya está llena'
      })
    }

    // Check if class is public (for group classes)
    if (classType === 'group' && classInfo.is_public === 0) {
      return res.status(400).json({
        success: false,
        message: 'Esta clase no está disponible para unirse públicamente'
      })
    }

    // Verificar que el usuario no está ya registrado en esta clase
    // For recurring classes, check by occurrence_date; for regular classes, check by class_id only (no occurrence_date)
    // Note: isRecurring was already declared above, so we reuse it
    let existingBooking
    
    if (isRecurring && occurrence_date) {
      // Recurring class with occurrence_date - check for that specific occurrence
      existingBooking = await database.get(
        'SELECT * FROM bookings WHERE user_id = ? AND class_id = ? AND occurrence_date = ? AND status != "cancelled"',
        [userId, class_id, occurrence_date]
      )
    } else if (!isRecurring) {
      // Non-recurring class - check for any booking without occurrence_date
      // IMPORTANT: For non-recurring classes, we ONLY want bookings where occurrence_date is NULL or empty
      // We should NOT match bookings with occurrence_date set (those are for recurring classes)
      // Also verify the class itself is not recurring to avoid false matches
      existingBooking = await database.get(
        'SELECT b.* FROM bookings b INNER JOIN classes c ON b.class_id = c.id WHERE b.user_id = ? AND b.class_id = ? AND (b.occurrence_date IS NULL OR b.occurrence_date = "") AND b.status != "cancelled" AND (c.is_recurring = 0 OR c.is_recurring IS NULL)',
        [userId, class_id]
      )
    } else {
      // Recurring class but no occurrence_date provided - this shouldn't happen, but check anyway
      existingBooking = await database.get(
        'SELECT * FROM bookings WHERE user_id = ? AND class_id = ? AND (occurrence_date IS NULL OR occurrence_date = "") AND status != "cancelled"',
        [userId, class_id]
      )
    }
    
    if (existingBooking) {
      console.log(`[BOOKING] User ${userId} already has booking for class ${class_id}, isRecurring: ${isRecurring}, occurrence_date: ${occurrence_date || 'none'}, existing booking:`, existingBooking)
      return res.status(400).json({
        success: false,
        message: 'Ya estás registrado en esta clase'
      })
    }

    // Determine the booking date - use occurrence_date if provided, otherwise use class date
    const bookingDate = occurrence_date || classInfo.date

    // Crear la reserva
    const booking = await database.createBooking({
      user_id: userId,
      class_id: class_id,
      booking_date: bookingDate,
      occurrence_date: occurrence_date || null,
      status: 'confirmed',
      payment_method: payment_method || 'package',
      notes: notes
    })

    // Actualizar el conteo de la clase (solo para clases no recurrentes)
    // Para clases recurrentes, el conteo se calcula dinámicamente por occurrence_date
    // Note: isRecurring was already declared above, so we reuse it
    if (!isRecurring) {
    await database.run(`
      UPDATE classes 
      SET current_bookings = current_bookings + 1, updated_at = datetime('now')
      WHERE id = ?
    `, [class_id])
    }

    // Descontar una clase del paquete del usuario según el tipo (allow overdraft)
    await database.deductClassFromUser(userId, classType, true)
    
    // Get updated user to return current balance
    const updatedUser = await database.getUserById(userId)
    const updatedRemaining = classType === 'private'
      ? (updatedUser.private_classes_remaining || 0)
      : (updatedUser.group_classes_remaining || 0)

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
      remainingClasses: updatedRemaining,
      currentBalance: updatedRemaining
    })
  } catch (error) {
    console.error('Create booking error:', error)
    res.status(500).json({
      success: false,
      message: 'Error al reservar la clase'
    })
  }
})

app.post('/api/bookings/cancel', requireAuth, async (req, res) => {
  console.log('[Cancel Booking] Endpoint hit')
  console.log('[Cancel Booking] User:', req.user)
  console.log('[Cancel Booking] Body:', req.body)
  
  try {
    // Check role manually to avoid any middleware issues
    if (req.user.role !== 'cliente' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para cancelar reservas'
      })
    }

    const { class_id, occurrence_date } = req.body
    const userId = req.user.id

    console.log(`[Cancel Booking] User ${userId} cancelling class ${class_id}, occurrence: ${occurrence_date || 'none'}`)

    if (!class_id) {
      return res.status(400).json({
        success: false,
        message: 'ID de clase requerido'
      })
    }

    // Get class info to determine type
    console.log('[Cancel Booking] Getting class info...')
    const classInfo = await database.getClassById(class_id)
    console.log('[Cancel Booking] Class info:', classInfo)
    
    if (!classInfo) {
      return res.status(404).json({
        success: false,
        message: 'Clase no encontrada'
      })
    }

    const classType = classInfo.type || 'group'

    // Buscar la reserva del usuario
    console.log('[Cancel Booking] Looking for booking...')
    let booking
    if (occurrence_date) {
      booking = await database.get(
        `SELECT * FROM bookings WHERE user_id = ? AND class_id = ? AND occurrence_date = ? AND status = 'confirmed'`,
        [userId, class_id, occurrence_date]
      )
    } else {
      booking = await database.get(
        `SELECT * FROM bookings WHERE user_id = ? AND class_id = ? AND (occurrence_date IS NULL OR occurrence_date = '') AND status = 'confirmed'`,
      [userId, class_id]
    )
    }

    console.log('[Cancel Booking] Found booking:', booking)

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró una reserva activa para esta clase'
      })
    }

    // Check if cancellation is within 15 minutes of class start
    const classDate = occurrence_date || classInfo.date
    const classDateTime = new Date(`${classDate}T${classInfo.time}`)
    const now = new Date()
    const minutesUntilClass = (classDateTime.getTime() - now.getTime()) / (1000 * 60)
    const within15Minutes = minutesUntilClass <= 15

    console.log(`[Cancel Booking] Minutes until class: ${minutesUntilClass}`)

    // Actualizar el estado de la reserva a cancelada
    console.log('[Cancel Booking] Updating booking status...')
    await database.run(
      `UPDATE bookings SET status = 'cancelled' WHERE id = ?`,
      [booking.id]
    )
    console.log('[Cancel Booking] Booking cancelled')

    // Actualizar el conteo de la clase (solo para clases no recurrentes)
    const isRecurring = classInfo.is_recurring === 1 || classInfo.is_recurring === '1' || classInfo.is_recurring === true
    if (!isRecurring) {
      console.log('[Cancel Booking] Decrementing class count...')
      await database.run(
        `UPDATE classes SET current_bookings = current_bookings - 1, updated_at = datetime('now') WHERE id = ?`,
        [class_id]
      )
    }

    // For private classes, mark the entire class as cancelled since it depends on this one client
    if (classType === 'private') {
      console.log('[Cancel Booking] Marking private class as cancelled...')
      await database.run(
        `UPDATE classes SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?`,
        [class_id]
      )
      console.log('[Cancel Booking] Private class marked as cancelled')
    }

    // Handle late cancellation (within 15 minutes)
    if (within15Minutes) {
      console.log('[Cancel Booking] Late cancellation - marking as no-show')
      
      // Mark booking as late cancellation
      await database.run(
        `UPDATE bookings SET late_cancellation = 1 WHERE id = ?`,
        [booking.id]
      )
      
      // Create attendance record for late cancellation
      const user = await database.getUserById(userId)
      await database.setAttendance({
        classId: class_id,
        occurrenceDate: classDate,
        userId: userId,
        userName: user?.nombre || 'Unknown',
        status: 'late_cancel',
        markedBy: 'Sistema (cancelación tardía)',
        notes: 'Cancelado menos de 15 minutos antes de la clase'
      })
      
      return res.json({
        success: true,
        message: 'Reserva cancelada exitosamente. Nota: No se reembolsó la clase automáticamente debido a la cancelación de último momento.',
        refunded: false,
        lateCancellation: true
      })
    } else {
      console.log('[Cancel Booking] Refunding class...')
      try {
      await database.addClassToUser(userId, classType)
        console.log('[Cancel Booking] Class refunded')
      } catch (refundErr) {
        console.error('[Cancel Booking] Refund error:', refundErr)
        // Still return success since booking was cancelled
      }
      return res.json({
        success: true,
        message: 'Reserva cancelada exitosamente. Se ha reembolsado una clase a tu paquete.',
        refunded: true,
        lateCancellation: false
      })
    }
  } catch (error) {
    console.error('[Cancel Booking] ERROR:', error.message)
    console.error('[Cancel Booking] Stack:', error.stack)
    res.status(500).json({
      success: false,
      message: 'Error al cancelar la reserva: ' + error.message
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
      instructors,
      is_recurring,
      recurrence_end_date,
      recurrence_days_of_week,
      is_public,
      walk_ins_welcome,
      assigned_client_ids,
      override_insufficient_classes,
      override_type
    } = req.body

    if (!title || !type || !coach_id || !date || !time || !duration) {
      return res.status(400).json({
        success: false,
        message: 'Campos obligatorios: título, tipo, coach, fecha, hora y duración'
      })
    }

    const id = require('uuid').v4()
    const requestedMax = parseInt(req.body.max_capacity, 10)
    const maxCapacity = type === 'private'
      ? 1
      : (Number.isFinite(requestedMax) && requestedMax >= 1
        ? Math.min(Math.max(requestedMax, 1), 9999)
        : 10)
    
    // Properly parse is_recurring (could be boolean, string "true"/"false", or number 1/0)
    const isRecurringBool = is_recurring === true || is_recurring === 1 || is_recurring === '1' || is_recurring === 'true'
    
    // For private classes with a client, start with 1 booking; otherwise 0
    const currentBookings = (type === 'private' && client_id) ? 1 : 0
    
    console.log(`[Create Class] type=${type}, is_recurring=${is_recurring}, isRecurringBool=${isRecurringBool}, client_id=${client_id}, currentBookings=${currentBookings}`)
    
    const normalizedInstructors = Array.isArray(instructors)
      ? JSON.stringify(instructors.slice(0, 10))
      : instructors
        ? JSON.stringify([instructors])
        : null

    // Parse recurrence_days_of_week if provided
    let recurrenceDaysArray = []
    if (recurrence_days_of_week) {
      try {
        recurrenceDaysArray = typeof recurrence_days_of_week === 'string' 
          ? JSON.parse(recurrence_days_of_week) 
          : recurrence_days_of_week
      } catch (e) {
        console.error('Error parsing recurrence_days_of_week:', e)
      }
    }

    // For recurring classes, create only ONE entry (not individual occurrences)
    // The date field stores the start date of the recurrence period
    
    // Calculate is_public value (matching edit endpoint logic)
    let isPublicValue = 1 // default
    if (is_public !== undefined) {
      const publicValue = (is_public === true || is_public === 1 || is_public === '1' || is_public === 'true')
      isPublicValue = publicValue ? 1 : 0
    } else {
      isPublicValue = type === 'group' ? 1 : 1
    }
    
    // Calculate walk_ins_welcome value (matching edit endpoint logic)
    let walkInsValue = type === 'group' ? 1 : 0 // default
    if (walk_ins_welcome !== undefined) {
      const walkInsBool = (walk_ins_welcome === true || walk_ins_welcome === 1 || walk_ins_welcome === '1')
      walkInsValue = walkInsBool ? 1 : 0
    }
    
    console.log('[Create Class] is_public received:', is_public, 'type:', typeof is_public, 'converted to:', isPublicValue)
    console.log('[Create Class] walk_ins_welcome received:', walk_ins_welcome, 'type:', typeof walk_ins_welcome, 'converted to:', walkInsValue)

    await database.run(`
      INSERT INTO classes (
        id, title, type, coach_id, date, time, end_time, duration, max_capacity,
        current_bookings, status, description, instructors, is_recurring, 
        recurrence_end_date, recurrence_days_of_week, is_public, walk_ins_welcome, assigned_client_ids, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
      id,
      title,
      type,
      coach_id,
      date, // For recurring classes, this is the start date
      time,
      end_time || null,
      duration,
      maxCapacity,
      isRecurringBool ? 0 : currentBookings, // Recurring classes start with 0 bookings; private with client starts with 1
      status || 'scheduled',
      description,
      normalizedInstructors,
      isRecurringBool ? 1 : 0,
      recurrence_end_date || null,
      recurrence_days_of_week ? JSON.stringify(recurrenceDaysArray) : null,
      isPublicValue,
      walkInsValue,
      isRecurringBool ? null : assigned_client_ids || null // No assigned clients for recurring classes
    ])

    // Si es una clase privada, agregar al historial de clases del cliente, crear booking, y deducir clase
    if (type === 'private' && client_id) {
      // Check if client has enough classes (unless override)
      if (!override_insufficient_classes) {
        const user = await database.get('SELECT * FROM users WHERE id = ?', [client_id])
        if (user && (user.private_classes_remaining || 0) < 1) {
          return res.status(400).json({
            success: false,
            message: 'El cliente no tiene suficientes clases privadas disponibles'
          })
        }
      }

      // Deduct private class (or set to negative if override)
      if (override_insufficient_classes && override_type === 'negative') {
        const user = await database.get('SELECT * FROM users WHERE id = ?', [client_id])
        const newCount = (user.private_classes_remaining || 0) - 1
        await database.run(`
          UPDATE users 
          SET private_classes_remaining = ?, updated_at = datetime('now')
          WHERE id = ?
        `, [newCount, client_id])
      } else if (!override_insufficient_classes) {
        await database.deductClassFromUser(client_id, 'private')
      }
      // If override_type === 'free', don't deduct

      // Create a booking so the client can cancel the class
      await database.createBooking({
        user_id: client_id,
        class_id: id,
        booking_date: date,
        status: 'confirmed',
        payment_method: 'package',
        occurrence_date: null // Private classes are not recurring
      })
      console.log(`[Create Class] Created booking for private class ${id}, client ${client_id}`)

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

    // Si es una clase grupal con clientes asignados, deducir clases grupales
    if (type === 'group' && assigned_client_ids) {
      try {
        const clientIds = JSON.parse(assigned_client_ids)
        for (const assignedClientId of clientIds) {
          // Check if client has enough classes (unless override)
          if (!override_insufficient_classes) {
            const user = await database.get('SELECT * FROM users WHERE id = ?', [assignedClientId])
            if (user && (user.group_classes_remaining || 0) < 1) {
              continue // Skip this client
            }
          }

          // Deduct group class (or set to negative if override)
          if (override_insufficient_classes && override_type === 'negative') {
            const user = await database.get('SELECT * FROM users WHERE id = ?', [assignedClientId])
            const newCount = (user.group_classes_remaining || 0) - 1
            await database.run(`
              UPDATE users 
              SET group_classes_remaining = ?, updated_at = datetime('now')
              WHERE id = ?
            `, [newCount, assignedClientId])
          } else if (!override_insufficient_classes) {
            await database.deductClassFromUser(assignedClientId, 'group')
          }
          // If override_type === 'free', don't deduct

          // Create booking for assigned client
          await database.createBooking({
            user_id: assignedClientId,
            class_id: id,
            booking_date: date,
            status: 'confirmed',
            payment_method: 'package',
            notes: 'Asignado automáticamente por coach'
          })
        }
      } catch (e) {
        console.error('Error processing assigned clients:', e)
      }
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
    
    // Show ALL classes regardless of date (including past classes)
    // Past classes will be marked as non-bookable on the frontend
    query += ` ORDER BY c.date ASC, c.time ASC LIMIT 5000`
    
    const rawClasses = await database.all(query)
    
    // Log class counts for debugging
    const recurringCount = rawClasses.filter(c => c.is_recurring === 1 || c.is_recurring === '1' || c.is_recurring === true).length
    const nonRecurringCount = rawClasses.length - recurringCount
    console.log(`[GET /api/classes] Loaded ${rawClasses.length} classes (${recurringCount} recurring, ${nonRecurringCount} non-recurring)`)

    // Normalizar campo instructors a arreglo y calculate booking counts for recurring classes
    const classes = await Promise.all(rawClasses.map(async cls => {
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
      
      // For recurring classes, current_bookings is not accurate (it's for the template)
      // We'll keep it as-is and calculate per-occurrence counts on the frontend
      // The frontend will calculate it dynamically based on bookings with occurrence_date
      
      return { ...cls, instructors }
    }))
    
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

// Get booking counts per occurrence for a recurring class
app.get('/api/recurring-classes/:id/booking-counts', requireAuth, requireRole(['admin', 'coach', 'cliente']), async (req, res) => {
  try {
    const { id } = req.params
    
    // Get all confirmed bookings for this recurring class with occurrence_date
    const bookings = await database.all(`
      SELECT occurrence_date, COUNT(*) as count
      FROM bookings
      WHERE class_id = ? AND occurrence_date IS NOT NULL AND occurrence_date != '' AND status = 'confirmed'
      GROUP BY occurrence_date
    `, [id])
    
    // Convert to object for easy lookup
    const counts = {}
    bookings.forEach((b) => {
      counts[b.occurrence_date] = b.count
    })
    
    res.json({
      success: true,
      booking_counts: counts
    })
  } catch (error) {
    console.error('Get booking counts error:', error)
    res.status(500).json({
      success: false,
      message: 'Error al obtener conteos de reservas'
    })
  }
})

// Get bookings for a specific class (optionally for a specific occurrence date)
app.get('/api/classes/:id/bookings', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
  try {
    const { id } = req.params
    const { occurrence_date } = req.query
    
    let query = `
      SELECT b.*, u.nombre as user_name, u.correo as user_email
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      WHERE b.class_id = ? AND b.status != 'cancelled'
    `
    const params = [id]
    
    // If occurrence_date is provided, filter by it (for recurring class occurrences)
    if (occurrence_date) {
      query += ` AND b.occurrence_date = ?`
      params.push(occurrence_date)
    }
    
    query += ` ORDER BY u.nombre ASC`
    
    const bookings = await database.all(query, params)
    
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

// Update bookings for a specific occurrence of a recurring class (admin only)
app.post('/api/classes/:id/occurrence-bookings', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
  try {
    const { id } = req.params
    const { occurrence_date, client_ids } = req.body
    
    if (!occurrence_date) {
      return res.status(400).json({ success: false, message: 'Fecha de ocurrencia requerida' })
    }
    
    const clientIds = Array.isArray(client_ids) ? client_ids : []
    
    console.log(`[Occurrence Bookings] Class: ${id}, Date: ${occurrence_date}, Clients: ${clientIds.join(', ')}`)
    
    // Get existing bookings for this occurrence
    const existingBookings = await database.all(`
      SELECT b.*, u.nombre as user_name
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      WHERE b.class_id = ? AND b.occurrence_date = ? AND b.status IN ('confirmed', 'attended')
    `, [id, occurrence_date])
    
    console.log('[Occurrence Bookings] Existing bookings:', existingBookings.map(b => ({ user_id: b.user_id, credit_deducted: b.credit_deducted })))
    
    const existingClientIds = existingBookings.map(b => b.user_id)
    
    // Find clients to add and clients to remove
    const clientsToAdd = clientIds.filter(cid => !existingClientIds.includes(cid))
    const clientsToRemove = existingClientIds.filter(cid => !clientIds.includes(cid))
    
    console.log(`[Occurrence Bookings] Adding: ${clientsToAdd.length}, Removing: ${clientsToRemove.length}`)
    
    // Remove bookings for clients no longer in the list (refund them only if credit was deducted)
    for (const clientId of clientsToRemove) {
      // Check if credit was deducted for this booking
      const booking = existingBookings.find(b => b.user_id === clientId)
      const shouldRefund = booking && (booking.credit_deducted === 1 || booking.credit_deducted === '1' || booking.credit_deducted === true)
      
      await database.run(`
        UPDATE bookings SET status = 'cancelled' WHERE class_id = ? AND occurrence_date = ? AND user_id = ?
      `, [id, occurrence_date, clientId])
      
      if (shouldRefund) {
        await database.addClassToUser(clientId, 'group')
        console.log(`[Occurrence Bookings] Removed and refunded client ${clientId}`)
      } else {
        console.log(`[Occurrence Bookings] Removed client ${clientId} (no credit to refund)`)
      }
    }
    
    // Add bookings for new clients
    const errors = []
    for (const clientId of clientsToAdd) {
      try {
        // Check if user has available classes
        const userClasses = await database.checkUserAvailableClasses(clientId, 'group')
        if (!userClasses || !userClasses.hasClasses) {
          // Log warning but still add them
          console.log(`[Occurrence Bookings] Warning: Client ${clientId} has no group classes remaining (${userClasses?.groupRemaining || 0})`)
        }
        
        // Create booking
        const bookingId = require('uuid').v4()
        const today = new Date().toISOString().split('T')[0]
        
        // Try to deduct class from user
        let creditDeducted = 0
        try {
          await database.deductClassFromUser(clientId, 'group')
          creditDeducted = 1
          console.log(`[Occurrence Bookings] Deducted class from client ${clientId}`)
        } catch (deductErr) {
          console.log(`[Occurrence Bookings] Could not deduct class from ${clientId}: ${deductErr.message}`)
          // Still add them but mark that no credit was deducted
          creditDeducted = 0
        }
        
        await database.run(`
          INSERT INTO bookings (id, class_id, user_id, booking_date, status, occurrence_date, credit_deducted, created_at)
          VALUES (?, ?, ?, ?, 'confirmed', ?, ?, CURRENT_TIMESTAMP)
        `, [bookingId, id, clientId, today, occurrence_date, creditDeducted])
        
        console.log(`[Occurrence Bookings] Added client ${clientId}, creditDeducted: ${creditDeducted}`)
      } catch (err) {
        console.error(`[Occurrence Bookings] Error adding client ${clientId}:`, err)
        errors.push(`Error al agregar cliente: ${err.message}`)
      }
    }
    
    res.json({
      success: true,
      message: `Asistentes actualizados: ${clientsToAdd.length} agregados, ${clientsToRemove.length} removidos`,
      added: clientsToAdd.length,
      removed: clientsToRemove.length,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error) {
    console.error('Update occurrence bookings error:', error)
    res.status(500).json({
      success: false,
      message: 'Error al actualizar los asistentes de la clase'
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
      instructors,
      coach_id,
      coach_name,
      is_recurring,
      recurrence_end_date,
      is_public,
      walk_ins_welcome,
      assigned_client_ids,
      max_capacity
    } = req.body

    // Get the existing class to check its type
    const existingClass = await database.getClassById(id)
    if (!existingClass) {
      return res.status(404).json({
        success: false,
        message: 'Clase no encontrada'
      })
    }

    const updates = {}
    if (title !== undefined) updates.title = title
    if (date !== undefined) updates.date = date
    if (time !== undefined) updates.time = time
    if (end_time !== undefined) updates.end_time = end_time
    if (duration !== undefined) updates.duration = duration
    if (status !== undefined) updates.status = status
    if (description !== undefined) updates.description = description
    if (instructors !== undefined) updates.instructors = instructors
    if (coach_id !== undefined) updates.coach_id = coach_id
    // Note: coach_name is not a column in the classes table, it's computed from a JOIN
    // So we don't update it directly - it will be derived from coach_id
    
    // Group class specific fields - only update if it's a group class
    if (existingClass.type === 'group') {
      // Always set these fields for group classes (even if 0/false)
      // Explicitly handle boolean/number conversion - 0 and false should become 0
      if (is_recurring !== undefined) {
        // Convert: true/1/'1' -> 1, false/0/'0'/null/undefined -> 0
        const recurringValue = (is_recurring === true || is_recurring === 1 || is_recurring === '1')
        updates.is_recurring = recurringValue ? 1 : 0
      }
    if (recurrence_end_date !== undefined) updates.recurrence_end_date = recurrence_end_date
      // Always update is_public if provided (even if 0/false)
      if (is_public !== undefined) {
        // Explicitly handle all possible values: true/1/'1'/'true' -> 1, everything else -> 0
        const publicValue = (is_public === true || is_public === 1 || is_public === '1' || is_public === 'true')
        updates.is_public = publicValue ? 1 : 0
        console.log('[Update Class] is_public received:', is_public, 'type:', typeof is_public, 'converted to:', updates.is_public)
      }
      if (walk_ins_welcome !== undefined) {
        const walkInsValue = (walk_ins_welcome === true || walk_ins_welcome === 1 || walk_ins_welcome === '1')
        updates.walk_ins_welcome = walkInsValue ? 1 : 0
      }
      if (assigned_client_ids !== undefined) {
        // For recurring classes, always set to null
        if (existingClass.type === 'group' && (existingClass.is_recurring === 1 || existingClass.is_recurring === '1')) {
          updates.assigned_client_ids = null
        } else {
          // Sanitize assigned_client_ids (handle HTML-encoded quotes)
          let cleaned = assigned_client_ids
          if (typeof cleaned === 'string') {
            let str = cleaned.replace(/&quot;/g, '"')
            try {
              const arr = JSON.parse(str)
              cleaned = JSON.stringify(Array.isArray(arr) ? arr : [])
            } catch {
              cleaned = '[]'
            }
          } else if (Array.isArray(cleaned)) {
            cleaned = JSON.stringify(cleaned)
          } else {
            cleaned = '[]'
          }
          updates.assigned_client_ids = cleaned
        }
      }
    if (max_capacity !== undefined) updates.max_capacity = max_capacity
      if (req.body.recurrence_days_of_week !== undefined) {
        // Parse and store recurrence days
        let recurrenceDaysArray = []
        if (req.body.recurrence_days_of_week) {
          try {
            recurrenceDaysArray = typeof req.body.recurrence_days_of_week === 'string'
              ? JSON.parse(req.body.recurrence_days_of_week)
              : req.body.recurrence_days_of_week
          } catch (e) {
            console.error('Error parsing recurrence_days_of_week:', e)
          }
        }
        updates.recurrence_days_of_week = recurrenceDaysArray.length > 0 ? JSON.stringify(recurrenceDaysArray) : null
      }
    } else {
      // For private classes, ensure these fields are not set (they don't apply)
      // Clear group-specific fields if they exist
      updates.is_recurring = 0
      updates.recurrence_end_date = null
      updates.is_public = 1
      updates.walk_ins_welcome = 0
      updates.assigned_client_ids = null
      updates.max_capacity = 1
    }

    console.log('Updating class:', id, 'type:', existingClass.type)
    console.log('Request body is_recurring:', is_recurring, 'type:', typeof is_recurring)
    console.log('Updates object:', JSON.stringify(updates, null, 2))

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

    // If it's a non-recurring group class and assigned_client_ids was provided, sync bookings
    if (existingClass.type === 'group' && (existingClass.is_recurring !== 1 && existingClass.is_recurring !== '1')) {
      if (assigned_client_ids !== undefined) {
        try {
          // Sanitize assigned_client_ids (handle HTML-encoded quotes)
          let parsedIds = []
          if (assigned_client_ids) {
            if (typeof assigned_client_ids === 'string') {
              const str = assigned_client_ids.replace(/&quot;/g, '"')
              try {
                const arr = JSON.parse(str)
                parsedIds = Array.isArray(arr) ? arr : []
              } catch (parseErr) {
                console.error('Error parsing assigned_client_ids:', parseErr, 'value:', assigned_client_ids)
                parsedIds = []
              }
            } else if (Array.isArray(assigned_client_ids)) {
              parsedIds = assigned_client_ids
            }
          }
          const desiredClientIds = Array.isArray(parsedIds) ? parsedIds : []

          console.log('[Sync Assigned Clients] desiredClientIds:', desiredClientIds)

          // Fetch existing active bookings for this non-recurring class (no occurrence_date)
          const existingBookings = await database.all(`
            SELECT * FROM bookings
            WHERE class_id = ?
              AND (occurrence_date IS NULL OR occurrence_date = '')
              AND status IN ('confirmed', 'attended')
          `, [id])

          const existingIds = existingBookings.map(b => b.user_id)

          const toAdd = desiredClientIds.filter(cid => !existingIds.includes(cid))
          const toRemove = existingIds.filter(cid => !desiredClientIds.includes(cid))

          console.log('[Sync Assigned Clients] existingIds:', existingIds, 'toAdd:', toAdd, 'toRemove:', toRemove)

          // Remove bookings not in the list (refund only if credit_deducted)
          for (const clientId of toRemove) {
            const booking = existingBookings.find(b => b.user_id === clientId)
            const shouldRefund = booking && (booking.credit_deducted === 1 || booking.credit_deducted === '1' || booking.credit_deducted === true)

            await database.run(`
              UPDATE bookings
              SET status = 'cancelled', updated_at = datetime('now')
              WHERE class_id = ? AND user_id = ? AND (occurrence_date IS NULL OR occurrence_date = '')
            `, [id, clientId])

            if (shouldRefund) {
              await database.addClassToUser(clientId, 'group')
            }
          }

          // Add bookings for new clients
          for (const clientId of toAdd) {
            const bookingId = uuidv4()
            const today = new Date().toISOString().split('T')[0]
            let creditDeducted = 0
            // Try to deduct a class; if not possible, still add booking with credit_deducted = 0
            try {
              await database.deductClassFromUser(clientId, 'group')
              creditDeducted = 1
            } catch (e) {
              creditDeducted = 0
            }

            await database.run(`
              INSERT INTO bookings (id, class_id, user_id, booking_date, status, credit_deducted, created_at)
              VALUES (?, ?, ?, ?, 'confirmed', ?, CURRENT_TIMESTAMP)
            `, [bookingId, id, clientId, today, creditDeducted])

            console.log('[Sync Assigned Clients] Added booking for client', clientId, 'creditDeducted:', creditDeducted)
          }

          // Update current_bookings to match desired clients
          const newCount = desiredClientIds.length
          await database.run(`UPDATE classes SET current_bookings = ? WHERE id = ?`, [newCount, id])
          console.log('[Sync Assigned Clients] Updated current_bookings to', newCount)
        } catch (syncErr) {
          console.error('Error syncing assigned clients to bookings:', syncErr)
        }
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

// Get client for a private class
app.get('/api/classes/:id/client', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
  try {
    const { id } = req.params

    // Verify class exists
    const cls = await database.getClassById(id)
    if (!cls) {
      return res.status(404).json({
        success: false,
        message: 'Clase no encontrada'
      })
    }

    if (cls.type !== 'private') {
      return res.status(400).json({
        success: false,
        message: 'Esta clase no es privada'
      })
    }

    // Get client from class_history
    const classHistory = await database.get(
      'SELECT user_id FROM class_history WHERE class_id = ? AND status = ? LIMIT 1',
      [id, 'scheduled']
    )

    res.json({
      success: true,
      client_id: classHistory?.user_id || null
    })
  } catch (error) {
    console.error('Get client for class error:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

// Assign/change client for a private class (admin or coach)
app.post('/api/classes/:id/assign-client', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
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

// Reinstate a cancelled class
app.post('/api/classes/:id/reinstate', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
  try {
    const { id } = req.params
    const { skipUsers = [] } = req.body // Users to skip charging (already confirmed by admin)

    // Get the class
    const cls = await database.getClassById(id)
    if (!cls) {
      return res.status(404).json({
        success: false,
        message: 'Clase no encontrada'
      })
    }

    if (cls.status !== 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Esta clase no está cancelada'
      })
    }

    const classType = cls.type === 'group' ? 'group' : 'private'
    const usersWithInsufficientClasses = []
    const usersCharged = []
    const usersSkipped = []
    const usersToReinstateBookings = [] // Track which users need bookings reinstated/created

    // For private classes, check assigned_client_ids first
    if (cls.type === 'private' && cls.assigned_client_ids) {
      console.log(`[Reinstate] Private class with assigned_client_ids: ${cls.assigned_client_ids}`)
      
      try {
        // assigned_client_ids can be a single ID or JSON array
        let clientIds = []
        if (cls.assigned_client_ids.startsWith('[')) {
          clientIds = JSON.parse(cls.assigned_client_ids)
        } else {
          clientIds = [cls.assigned_client_ids]
        }

        for (const clientId of clientIds) {
          // Get user info
          const user = await database.get('SELECT id, nombre, correo FROM users WHERE id = ?', [clientId])
          if (!user) {
            console.log(`[Reinstate] User ${clientId} not found, skipping`)
            continue
          }

          // Skip users that admin already confirmed to skip
          if (skipUsers.includes(clientId)) {
            usersSkipped.push({
              userId: clientId,
              userName: user.nombre,
              userEmail: user.correo
            })
            usersToReinstateBookings.push({ userId: clientId, skipCharge: true })
            continue
          }

          // Check if user has available classes
          const availableClasses = await database.checkUserAvailableClasses(clientId)
          const availableCount = availableClasses.privateClasses

          if (availableCount <= 0) {
            usersWithInsufficientClasses.push({
              userId: clientId,
              userName: user.nombre,
              userEmail: user.correo,
              available: availableCount,
              required: 1,
              type: 'private'
            })
          } else {
            usersCharged.push({
              userId: clientId,
              userName: user.nombre,
              available: availableCount
            })
            usersToReinstateBookings.push({ userId: clientId, skipCharge: false })
          }
        }
      } catch (parseErr) {
        console.error('[Reinstate] Error parsing assigned_client_ids:', parseErr)
      }
    } else {
      // For group classes (or private without assigned_client_ids), check bookings table
      const bookings = await database.all(`
        SELECT b.*, u.nombre as user_name, u.correo as user_email
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        WHERE b.class_id = ?
      `, [id])

      console.log(`[Reinstate] Found ${bookings.length} bookings for class ${id}`)

      // Check each booking
      for (const booking of bookings) {
        // Skip users that admin already confirmed
        if (skipUsers.includes(booking.user_id)) {
          usersSkipped.push({
            userId: booking.user_id,
            userName: booking.user_name,
            userEmail: booking.user_email
          })
          usersToReinstateBookings.push({ userId: booking.user_id, skipCharge: true })
          continue
        }

        // Check if user has available classes
        const availableClasses = await database.checkUserAvailableClasses(booking.user_id)
        const availableCount = classType === 'group' ? availableClasses.groupClasses : availableClasses.privateClasses

        if (availableCount <= 0) {
          usersWithInsufficientClasses.push({
            userId: booking.user_id,
            userName: booking.user_name,
            userEmail: booking.user_email,
            available: availableCount,
            required: 1,
            type: classType
          })
        } else {
          usersCharged.push({
            userId: booking.user_id,
            userName: booking.user_name,
            available: availableCount
          })
          usersToReinstateBookings.push({ userId: booking.user_id, skipCharge: false })
        }
      }
    }

    // If there are users with insufficient classes and we haven't skipped them, return for confirmation
    if (usersWithInsufficientClasses.length > 0) {
      return res.status(200).json({
        success: false,
        needsConfirmation: true,
        message: 'Algunos usuarios no tienen clases suficientes',
        usersWithInsufficientClasses,
        usersToCharge: usersCharged.length
      })
    }

    // All good - reinstate the class
    // 1. Update class status
    await database.run(
      `UPDATE classes SET status = 'scheduled', updated_at = datetime('now') WHERE id = ?`,
      [id]
    )

    // 2. For private classes with assigned clients, ensure booking exists and is confirmed
    if (cls.type === 'private' && cls.assigned_client_ids) {
      for (const reinstateInfo of usersToReinstateBookings) {
        // Check if booking exists
        const existingBooking = await database.get(
          'SELECT id FROM bookings WHERE class_id = ? AND user_id = ?',
          [id, reinstateInfo.userId]
        )

        if (existingBooking) {
          // Update existing booking to confirmed
          await database.run(
            `UPDATE bookings SET status = 'confirmed' WHERE id = ?`,
            [existingBooking.id]
          )
          console.log(`[Reinstate] Reactivated booking for user ${reinstateInfo.userId}`)
        } else {
          // Create new booking for this user
          const bookingId = require('uuid').v4()
          await database.run(`
            INSERT INTO bookings (id, class_id, user_id, status, created_at)
            VALUES (?, ?, ?, 'confirmed', datetime('now'))
          `, [bookingId, id, reinstateInfo.userId])
          console.log(`[Reinstate] Created new booking for user ${reinstateInfo.userId}`)
        }

        // Deduct class from user if not skipped
        if (!reinstateInfo.skipCharge) {
          try {
            await database.deductClassFromUser(reinstateInfo.userId, 'private')
            console.log(`[Reinstate] Deducted private class from user ${reinstateInfo.userId}`)
          } catch (err) {
            console.error(`[Reinstate] Error deducting class from user ${reinstateInfo.userId}:`, err)
          }
        }
      }

      // Update current_bookings count
      await database.run(
        `UPDATE classes SET current_bookings = ? WHERE id = ?`,
        [usersToReinstateBookings.length, id]
      )
    } else {
      // 2. Reactivate all bookings for group classes
      await database.run(
        `UPDATE bookings SET status = 'confirmed' WHERE class_id = ?`,
        [id]
      )

      // 3. Deduct classes from users who weren't skipped
      for (const user of usersCharged) {
        try {
          await database.deductClassFromUser(user.userId, classType)
          console.log(`[Reinstate] Deducted ${classType} class from user ${user.userId}`)
        } catch (err) {
          console.error(`[Reinstate] Error deducting class from user ${user.userId}:`, err)
        }
      }
    }

    // For skipped users, still reactivate their booking but don't charge them
    console.log(`[Reinstate] Skipped users (not charged): ${usersSkipped.map(u => u.userName).join(', ')}`)

    res.json({
      success: true,
      message: `Clase reinstalada exitosamente. ${usersCharged.length} usuario(s) fueron cobrados.${usersSkipped.length > 0 ? ` ${usersSkipped.length} usuario(s) fueron omitidos.` : ''}`,
      usersCharged: usersCharged.length,
      usersSkipped: usersSkipped.length
    })
  } catch (error) {
    console.error('Reinstate class error:', error)
    res.status(500).json({
      success: false,
      message: 'Error al reinstalar la clase'
    })
  }
})

// Cancel specific occurrence of a recurring class
app.post('/api/recurring-classes/:id/cancel-occurrence', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
  try {
    const { id } = req.params
    const { occurrence_date } = req.body

    if (!occurrence_date) {
      return res.status(400).json({
        success: false,
        message: 'Fecha de ocurrencia requerida'
      })
    }

    // Verify class exists and is recurring
    const cls = await database.getClassById(id)
    if (!cls) {
      return res.status(404).json({
        success: false,
        message: 'Clase no encontrada'
      })
    }

    const isRecurring = cls.type === 'group' && (cls.is_recurring === 1 || cls.is_recurring === '1' || cls.is_recurring === true)
    if (!isRecurring) {
      return res.status(400).json({
        success: false,
        message: 'Esta clase no es recurrente'
      })
    }

    // Check if already canceled
    const existing = await database.get(
      'SELECT * FROM recurring_class_cancellations WHERE class_id = ? AND occurrence_date = ?',
      [id, occurrence_date]
    )

    if (existing) {
      return res.json({
        success: true,
        message: 'Esta ocurrencia ya estaba cancelada'
      })
    }

    // Add cancellation record
    const cancellationId = require('uuid').v4()
    await database.run(
      'INSERT INTO recurring_class_cancellations (id, class_id, occurrence_date) VALUES (?, ?, ?)',
      [cancellationId, id, occurrence_date]
    )

    res.json({
      success: true,
      message: 'Ocurrencia cancelada exitosamente'
    })
  } catch (error) {
    console.error('Cancel occurrence error:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

// Get all canceled occurrences
app.get('/api/recurring-classes/canceled-occurrences', requireAuth, requireRole(['admin', 'coach', 'cliente']), async (req, res) => {
  try {
    const canceled = await database.all(
      'SELECT class_id, occurrence_date FROM recurring_class_cancellations'
    )

    res.json({
      success: true,
      canceled_occurrences: canceled || []
    })
  } catch (error) {
    console.error('Get canceled occurrences error:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

// Delete class (admin only)
app.delete('/api/classes/:id', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
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

    const classType = cls.type === 'group' ? 'group' : 'private'
    const isRecurring = cls.type === 'group' && (cls.is_recurring === 1 || cls.is_recurring === '1' || cls.is_recurring === true)

    // Get all active bookings for this class and refund them
    const bookings = await database.all(`
      SELECT b.*, u.nombre as user_name
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      WHERE b.class_id = ? AND b.status IN ('confirmed', 'attended')
    `, [id])

    console.log(`[Delete Class] Found ${bookings.length} active bookings to refund`)

    let refundedCount = 0
    for (const booking of bookings) {
      try {
        // Refund the class to the user
        await database.addClassToUser(booking.user_id, classType)
        refundedCount++
        console.log(`[Delete Class] Refunded ${classType} class to user ${booking.user_id} (${booking.user_name})`)
      } catch (refundErr) {
        console.error(`[Delete Class] Error refunding user ${booking.user_id}:`, refundErr)
        // Continue with other refunds even if one fails
      }
    }

    // Delete all related records first, then the class
    await database.run('DELETE FROM attendance_records WHERE class_id = ?', [id])
    await database.run('DELETE FROM class_history WHERE class_id = ?', [id])
    await database.run('DELETE FROM bookings WHERE class_id = ?', [id])
    await database.run('DELETE FROM recurring_class_cancellations WHERE class_id = ?', [id])
    await database.run('DELETE FROM classes WHERE id = ?', [id])

    const message = isRecurring 
      ? `Clase recurrente eliminada. ${refundedCount} estudiante(s) reembolsados.`
      : `Clase eliminada. ${refundedCount} estudiante(s) reembolsados.`

    res.json({
      success: true,
      message: message,
      refundedCount
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

// DEPRECATED: Initialize endpoint removed
// This endpoint was deprecated because it:
// 1. Created thousands of individual class instances instead of using recurring classes
// 2. Was hardcoded to a specific coach and schedule
// 3. Conflicted with the modern recurring class system
// Use recurring classes instead - they are more flexible and maintainable

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
app.get('/api/reports', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
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
app.get('/api/coach-payments', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
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

app.post('/api/coach-payments/calculate', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
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

app.put('/api/coach-payments/:id/mark-paid', requireAuth, requireRole(['admin', 'coach']), async (req, res) => {
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
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 PilatesMermaid API server running on port ${PORT}`)
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`)
    console.log(`✅ Server is ready to accept connections`)
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use. Please kill the process using that port.`)
      console.error(`   On Windows, run: netstat -ano | findstr :${PORT}`)
      console.error(`   Then kill the process with: taskkill /F /PID <PID>`)
    } else {
      console.error(`❌ Error starting server:`, err)
    }
    process.exit(1)
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
