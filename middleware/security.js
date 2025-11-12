// Security middleware for route protection
const { SecurityService } = require('../lib/security.js')

// Middleware to validate user permissions for resource access
const validateResourceAccess = (resourceType = 'user') => {
  return async (req, res, next) => {
    try {
      const clientIP = SecurityService.getClientIP(req)
      const user = req.user
      const resourceId = req.params.id

      // Validate UUID
      if (resourceId && !SecurityService.validateUUID(resourceId)) {
        SecurityService.logSecurityEvent('INVALID_RESOURCE_ID', {
          userId: user.id,
          resourceId: resourceId,
          resourceType: resourceType,
          ip: clientIP
        })
        return res.status(400).json({
          success: false,
          message: 'ID de recurso inválido'
        })
      }

      // Admin can access all resources
      if (user.role === 'admin') {
        return next()
      }

      // Coach can access their own resources and client resources
      if (user.role === 'coach') {
        // Coaches can access client resources but not other coaches or admin
        if (resourceType === 'user') {
          const targetUser = await database.getUserById(resourceId)
          if (!targetUser) {
            return res.status(404).json({
              success: false,
              message: 'Usuario no encontrado'
            })
          }
          
          // Coaches can only access client data, not other coaches or admin
          if (targetUser.role !== 'cliente') {
            SecurityService.logSecurityEvent('COACH_ACCESS_NON_CLIENT', {
              coachId: user.id,
              targetUserId: resourceId,
              targetUserRole: targetUser.role,
              ip: clientIP
            })
            return res.status(403).json({
              success: false,
              message: 'No tienes permisos para acceder a este recurso'
            })
          }
        }
        return next()
      }

      // Clients can only access their own resources
      if (user.role === 'cliente') {
        if (user.id !== resourceId) {
          SecurityService.logSecurityEvent('CLIENT_ACCESS_OTHER_RESOURCE', {
            clientId: user.id,
            targetResourceId: resourceId,
            resourceType: resourceType,
            ip: clientIP
          })
          return res.status(403).json({
            success: false,
            message: 'No tienes permisos para acceder a este recurso'
          })
        }
        return next()
      }

      // Default: deny access
      SecurityService.logSecurityEvent('UNAUTHORIZED_RESOURCE_ACCESS', {
        userId: user.id,
        userRole: user.role,
        resourceId: resourceId,
        resourceType: resourceType,
        ip: clientIP
      })
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a este recurso'
      })
    } catch (error) {
      console.error('Resource access validation error:', error)
      const clientIP = SecurityService.getClientIP(req)
      SecurityService.logSecurityEvent('RESOURCE_ACCESS_VALIDATION_ERROR', {
        error: error.message,
        userId: req.user.id,
        ip: clientIP
      })
      return res.status(500).json({
        success: false,
        message: 'Error al validar permisos'
      })
    }
  }
}

// Middleware to prevent role escalation
const preventRoleEscalation = (req, res, next) => {
  try {
    const user = req.user
    const updates = req.body

    // Only admin can change roles
    if (updates.role && user.role !== 'admin') {
      const clientIP = SecurityService.getClientIP(req)
      SecurityService.logSecurityEvent('ROLE_ESCALATION_ATTEMPT', {
        userId: user.id,
        userRole: user.role,
        attemptedRole: updates.role,
        ip: clientIP
      })
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para cambiar roles'
      })
    }

    // Validate role if being changed
    if (updates.role && !SecurityService.validateRole(updates.role)) {
      const clientIP = SecurityService.getClientIP(req)
      SecurityService.logSecurityEvent('INVALID_ROLE_ATTEMPT', {
        userId: user.id,
        attemptedRole: updates.role,
        ip: clientIP
      })
      return res.status(400).json({
        success: false,
        message: 'Rol inválido'
      })
    }

    next()
  } catch (error) {
    console.error('Role escalation prevention error:', error)
    return res.status(500).json({
      success: false,
      message: 'Error al validar permisos'
    })
  }
}

// Middleware to validate and sanitize request body
const validateAndSanitizeBody = (schema) => {
  return (req, res, next) => {
    try {
      const clientIP = SecurityService.getClientIP(req)
      
      // Sanitize body
      req.body = SecurityService.sanitizeObject(req.body)

      // Validate against schema if provided
      if (schema) {
        for (const [key, rules] of Object.entries(schema)) {
          if (req.body[key] !== undefined) {
            try {
              req.body[key] = SecurityService.validateAndSanitize(
                req.body[key],
                rules.type || 'string',
                rules.options || {}
              )
            } catch (error) {
              SecurityService.logSecurityEvent('BODY_VALIDATION_ERROR', {
                field: key,
                error: error.message,
                ip: clientIP
              })
              return res.status(400).json({
                success: false,
                message: `Campo ${key} inválido: ${error.message}`
              })
            }
          } else if (rules.required) {
            return res.status(400).json({
              success: false,
              message: `Campo ${key} es requerido`
            })
          }
        }
      }

      next()
    } catch (error) {
      console.error('Body validation error:', error)
      const clientIP = SecurityService.getClientIP(req)
      SecurityService.logSecurityEvent('BODY_VALIDATION_ERROR', {
        error: error.message,
        ip: clientIP
      })
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos'
      })
    }
  }
}

module.exports = {
  validateResourceAccess,
  preventRoleEscalation,
  validateAndSanitizeBody
}




