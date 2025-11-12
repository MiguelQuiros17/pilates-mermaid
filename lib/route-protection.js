// Route protection utilities for frontend
export const hasPermission = (userRole, requiredRoles) => {
  if (!userRole || !requiredRoles) return false
  if (!Array.isArray(requiredRoles)) return false
  return requiredRoles.includes(userRole)
}

export const canAccessRoute = (userRole, routeRoles) => {
  if (!userRole || !routeRoles) return false
  if (!Array.isArray(routeRoles)) return false
  return routeRoles.includes(userRole)
}

export const canAccessResource = (user, resourceUserId) => {
  if (!user || !resourceUserId) return false
  
  // Admin can access all resources
  if (user.role === 'admin') return true
  
  // Coach can access client resources only
  if (user.role === 'coach') {
    // This would need to be checked on the backend
    // For now, we assume coach can only access client resources
    return false // Will be validated on backend
  }
  
  // Client can only access their own resources
  if (user.role === 'cliente') {
    return user.id === resourceUserId
  }
  
  return false
}

export const validateToken = async () => {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''
    const token = localStorage.getItem('token')
    if (!token) return null

    const response = await fetch('${API_BASE_URL}/api/auth/verify', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      return data.user
    }

    // Token invalid, clear storage
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    return null
  } catch (error) {
    console.error('Token validation error:', error)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    return null
  }
}

export const requireAuth = (user, router) => {
  if (!user) {
    router.push('/login')
    return false
  }
  return true
}

export const requireRole = (user, roles, router) => {
  if (!user) {
    router.push('/login')
    return false
  }
  
  if (!roles.includes(user.role)) {
    router.push('/dashboard')
    return false
  }
  
  return true
}






