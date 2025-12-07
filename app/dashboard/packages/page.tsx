'use client';

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package,
  Plus,
  Edit,
  Trash2,
  DollarSign,
  Calendar,
  X,
  Clock,
  CheckCircle,
  Users,
  User,
  AlertTriangle,
  AlertCircle,
  Info,
  Gift,
  Percent,
  Tag,
  Sparkles
} from 'lucide-react'
import DashboardLayout from '@/components/DashboardLayout'
import WhatsAppButton, { WhatsAppTemplates } from '@/components/WhatsAppButton'

interface PackageType {
    id: string
    name: string
    type: string
    classes_included: number
    price: number
    validity_days: number
  validity_months: number
    is_active: boolean
  is_live: boolean
  live_from: string
  live_until: string
  description: string
    category: 'Grupal' | 'Privada'
  original_price?: number
  sale_price?: number
}

interface PackageBundle {
  id: string
  name: string
  description: string
  package_id: string
  group_package_id?: string
  private_package_id?: string
  package_name: string
  package_price: number
  group_package_name?: string
  group_package_price?: number
  group_classes_included?: number
  private_package_name?: string
  private_package_price?: number
  private_classes_included?: number
  classes_included: number
  category: 'Grupal' | 'Privada' | 'Combo'
  validity_months: number
  months_included: number // Legacy support
  group_months_included?: number
  private_months_included?: number
  price: number
  regular_total: number
  combined_monthly_price?: number
  savings: number
  percent_off: number
  is_live: boolean
  live_from: string
  live_until: string
  is_active: boolean
  is_combo?: boolean
}

const defaultFormState = {
  name: '',
  type: '',
  classes_included: 1,
  price: 0,
  validity_months: 1,
  category: 'Grupal' as 'Grupal' | 'Privada',
  description: '',
  is_live: true,
  live_from: '',
  live_until: '',
  is_active: true,
  original_price: '' as number | string,
  sale_price: '' as number | string,
}

const defaultBundleFormState = {
  name: '',
  description: '',
  package_id: '',
  group_package_id: '',
  private_package_id: '',
  months_included: 3, // Legacy support
  group_months_included: 3,
  private_months_included: 3,
  price: 0,
  live_from: '',
  live_until: '',
  is_active: true,
}

// Countdown hook for expiration dates
const useCountdown = (targetDate: string | null | undefined) => {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null)

  useEffect(() => {
    if (!targetDate) {
      setTimeLeft(null)
      return
    }

    const updateCountdown = () => {
      // Parse date string as local date (YYYY-MM-DD format) and set to end of day
      const [year, month, day] = targetDate.split('-').map(Number)
      const targetDateObj = new Date(year, month - 1, day, 23, 59, 59, 999) // End of day in local time
      // Subtract 24 hours (1 day) from the target date
      const target = targetDateObj.getTime() - (24 * 60 * 60 * 1000)
      const now = new Date().getTime()
      const difference = target - now

      if (difference <= 0) {
        setTimeLeft(null)
        return
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24))
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)

      setTimeLeft({ days, hours, minutes, seconds })
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [targetDate])

  return timeLeft
}

export default function PackagesPage() {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''
  const [availablePackages, setAvailablePackages] = useState<PackageType[]>([])
  const [adminPackages, setAdminPackages] = useState<PackageType[]>([])
  const [bundles, setBundles] = useState<PackageBundle[]>([])
  const [isSavingPackage, setIsSavingPackage] = useState(false)
  const [isSavingBundle, setIsSavingBundle] = useState(false)
  const [editingPackage, setEditingPackage] = useState<PackageType | null>(null)
  const [editingBundle, setEditingBundle] = useState<PackageBundle | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isBundleModalOpen, setIsBundleModalOpen] = useState(false)
  const [modalCategory, setModalCategory] = useState<'Grupal' | 'Privada'>('Grupal')
  const [packageForm, setPackageForm] = useState(defaultFormState)
  const [bundleForm, setBundleForm] = useState(defaultBundleFormState)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [classCounts, setClassCounts] = useState<{private: number, group: number}>({private: 0, group: 0})

  // Helper functions for date logic (defined early so they can be used in loadPackages)
  const isDateInFuture = (dateString: string | null | undefined): boolean => {
    if (!dateString) return false
    // Parse date string as local date (YYYY-MM-DD format)
    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day, 0, 0, 0, 0) // Start of day in local time
    const now = new Date()
    // Compare dates (not times) - get today's date at start of day
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    return date > today
  }

  const isDateInPast = (dateString: string | null | undefined): boolean => {
    if (!dateString) return false
    // Parse date string as local date (YYYY-MM-DD format)
    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day, 23, 59, 59, 999) // End of day in local time
    const now = new Date()
    return date < now
  }

  const shouldDisableActiveCheckbox = (liveFrom: string, liveUntil: string): boolean => {
    // Disable if live_from is set (will activate automatically when date arrives)
    if (liveFrom && liveFrom.trim() !== '') return true
    // Disable if live_until is set (will expire automatically when date arrives)
    if (liveUntil && liveUntil.trim() !== '') return true
    return false
  }
  const [activeGroupPackage, setActiveGroupPackage] = useState<any>(null)
  const [activePrivatePackage, setActivePrivatePackage] = useState<any>(null)
  const [packageHistory, setPackageHistory] = useState<any[]>([])

  const loadUserPackageInfo = async (userId: string) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const countsResponse = await fetch(`${API_BASE_URL}/api/users/${userId}/class-counts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (countsResponse.ok) {
        const countsData = await countsResponse.json()
        setClassCounts({
          private: countsData.private_classes_remaining || 0,
          group: countsData.group_classes_remaining || 0
        })
      }

      const packageResponse = await fetch(`${API_BASE_URL}/api/users/${userId}/package-history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (packageResponse.ok) {
        const packageData = await packageResponse.json()
        setActiveGroupPackage(packageData.activeGroupPackage)
        setActivePrivatePackage(packageData.activePrivatePackage)
        setPackageHistory(packageData.packageHistory || [])
      }
    } catch (error) {
      console.error('Error loading user package info:', error)
    }
  }

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
      if (parsedUser?.role === 'cliente' && parsedUser?.id) {
        loadUserPackageInfo(parsedUser.id)
      }
    }
  }, [])

  const loadPackages = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setIsLoading(false)
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/packages?includeInactive=1&includeScheduled=1`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        const list = Array.isArray(data.packages) ? data.packages : []
        const sorted = [...list].sort((a, b) => a.price - b.price)
        const validPackages = sorted.filter(p => p.category === 'Grupal' || p.category === 'Privada')
        
        if (user?.role === 'admin') {
          setAvailablePackages(validPackages)
          setAdminPackages(validPackages)
        } else {
          // Filter out inactive, expired, and future packages for clients
          const filtered = validPackages.filter(p => {
            // Must be active
            if (p.is_active === false) {
              console.log('[Packages] Filtered out package (inactive):', p.id, p.name)
              return false
            }
            
            // If live_from is set and in the future, don't show (not activated yet)
            if (p.live_from && isDateInFuture(p.live_from)) {
              console.log('[Packages] Filtered out package (future):', p.id, p.name, 'live_from:', p.live_from)
              return false
            }
            
            // If expired (live_until has passed), don't show
            if (p.live_until && isDateInPast(p.live_until)) {
              console.log('[Packages] Filtered out package (expired):', p.id, p.name, 'live_until:', p.live_until)
              return false
            }
            
            return true
          })
          console.log('[Packages] Filtered packages for client:', filtered.length, 'out of', validPackages.length)
          setAvailablePackages(filtered)
        }
      }
    } catch (error) {
      console.error('Error loading packages:', error)
    } finally {
    setIsLoading(false)
    }
  }

  const loadBundles = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`${API_BASE_URL}/api/package-bundles`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        const bundlesList = Array.isArray(data.bundles) ? data.bundles : []
        console.log('[Packages] Loaded bundles:', bundlesList.length, bundlesList)
        setBundles(bundlesList)
      } else {
        console.error('[Packages] Failed to load bundles:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error loading bundles:', error)
    }
  }

  useEffect(() => {
    loadPackages()
    loadBundles()
  }, [user])

  const openCreateModal = (category: 'Grupal' | 'Privada') => {
    setEditingPackage(null)
    setModalCategory(category)
    setPackageForm({ ...defaultFormState, category })
    setIsModalOpen(true)
  }

  const openEditModal = (pkg: PackageType) => {
    setEditingPackage(pkg)
    setModalCategory(pkg.category)
    
    // Clear expired dates
    let liveFrom = pkg.live_from || ''
    let liveUntil = pkg.live_until || ''
    
    // If live_from has passed, clear it
    if (liveFrom && isDateInPast(liveFrom)) {
      liveFrom = ''
    }
    
    // If live_until has passed, clear it
    if (liveUntil && isDateInPast(liveUntil)) {
      liveUntil = ''
    }
    
    // Sync is_live with is_active (they're now the same thing)
    const isActive = pkg.is_active === 1 || pkg.is_active === true
    
    setPackageForm({
      name: pkg.name,
      type: pkg.type || '',
      classes_included: pkg.classes_included,
      price: pkg.price,
      validity_months: pkg.validity_months || Math.ceil(pkg.validity_days / 30) || 1,
      category: pkg.category,
      description: pkg.description || '',
      is_live: isActive, // Sync with is_active
      live_from: liveFrom,
      live_until: liveUntil,
      is_active: isActive,
      original_price: pkg.original_price || '',
      sale_price: pkg.sale_price || '',
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingPackage(null)
    setPackageForm(defaultFormState)
  }

  const openCreateBundleModal = () => {
    setEditingBundle(null)
    setBundleForm(defaultBundleFormState)
    setIsBundleModalOpen(true)
  }

  const openEditBundleModal = (bundle: PackageBundle) => {
    setEditingBundle(bundle)
    
    // Clear expired dates
    let liveFrom = bundle.live_from || ''
    let liveUntil = bundle.live_until || ''
    
    // If live_from has passed, clear it
    if (liveFrom && isDateInPast(liveFrom)) {
      liveFrom = ''
    }
    
    // If live_until has passed, clear it
    if (liveUntil && isDateInPast(liveUntil)) {
      liveUntil = ''
    }
    
    setBundleForm({
      name: bundle.name,
      description: bundle.description || '',
      package_id: bundle.package_id || '',
      group_package_id: bundle.group_package_id || '',
      private_package_id: bundle.private_package_id || '',
      months_included: bundle.months_included || 3, // Legacy support
      group_months_included: bundle.group_months_included !== undefined && bundle.group_months_included !== null 
        ? bundle.group_months_included 
        : (bundle.months_included || 3),
      private_months_included: bundle.private_months_included !== undefined && bundle.private_months_included !== null 
        ? bundle.private_months_included 
        : (bundle.months_included || 3),
      price: bundle.price,
      live_from: liveFrom,
      live_until: liveUntil,
      is_active: bundle.is_active === 1 || bundle.is_active === true,
    })
    setIsBundleModalOpen(true)
  }

  const closeBundleModal = () => {
    setIsBundleModalOpen(false)
    setEditingBundle(null)
    setBundleForm(defaultBundleFormState)
  }

  const savePackage = async () => {
    if (isSavingPackage) return
    if (!packageForm.name || !packageForm.classes_included || !packageForm.price || !packageForm.validity_months) {
      alert('Por favor completa todos los campos requeridos')
      return
    }

    setIsSavingPackage(true)
    try {
      const token = localStorage.getItem('token')
      const url = editingPackage 
        ? `${API_BASE_URL}/api/packages/${editingPackage.id}`
        : `${API_BASE_URL}/api/packages`
      
      // Sync is_live with is_active (they're now the same thing)
      const body = {
        ...packageForm,
        is_live: packageForm.is_active, // Sync with is_active
        validity_days: packageForm.validity_months * 30,
        original_price: packageForm.original_price || null,
        sale_price: packageForm.sale_price || null,
      }
      
      const response = await fetch(url, {
        method: editingPackage ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        closeModal()
        loadPackages()
      } else {
        const data = await response.json()
        alert(data.message || 'Error al guardar paquete')
      }
    } catch (err) {
      console.error('savePackage error', err)
      alert('Error al guardar paquete')
    } finally {
      setIsSavingPackage(false)
    }
  }

  const deletePackage = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar el paquete "${name}"?`)) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/api/packages/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        loadPackages()
      } else {
        alert('Error al eliminar paquete')
      }
    } catch (err) {
      console.error('deletePackage error', err)
      alert('Error al eliminar paquete')
    }
  }

  const saveBundle = async () => {
    if (isSavingBundle) return
    // Need at least one package selected (group or private or both)
    const hasPackage = bundleForm.group_package_id || bundleForm.private_package_id || bundleForm.package_id
    if (!bundleForm.name || !hasPackage || bundleForm.price === undefined) {
      alert('Por favor completa todos los campos requeridos (nombre, al menos un paquete y precio)')
      return
    }

    // Validate months based on selected packages
    if (bundleForm.group_package_id && (!bundleForm.group_months_included || bundleForm.group_months_included < 1)) {
      alert('Por favor especifica cuántos meses del paquete grupal están incluidos')
      return
    }
    if (bundleForm.private_package_id && (!bundleForm.private_months_included || bundleForm.private_months_included < 1)) {
      alert('Por favor especifica cuántos meses del paquete privado están incluidos')
      return
    }
    if (bundleForm.package_id && !bundleForm.group_package_id && !bundleForm.private_package_id && (!bundleForm.months_included || bundleForm.months_included < 1)) {
      alert('Por favor especifica cuántos meses están incluidos')
      return
    }

    setIsSavingBundle(true)
    try {
      const token = localStorage.getItem('token')
      const url = editingBundle 
        ? `${API_BASE_URL}/api/package-bundles/${editingBundle.id}`
        : `${API_BASE_URL}/api/package-bundles`
      
      // Ensure is_active is always included (even if false)
      const payload = {
        ...bundleForm,
        is_active: bundleForm.is_active !== undefined ? bundleForm.is_active : true,
        // Clear legacy package_id if using new fields
        package_id: (!bundleForm.group_package_id && !bundleForm.private_package_id) ? bundleForm.package_id : null
      }
      
      console.log('[Packages] Saving bundle with payload:', JSON.stringify(payload, null, 2))
      
      const response = await fetch(url, {
        method: editingBundle ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        closeBundleModal()
        loadBundles()
      } else {
        const data = await response.json()
        alert(data.message || 'Error al guardar bundle')
      }
    } catch (err) {
      console.error('saveBundle error', err)
      alert('Error al guardar bundle')
    } finally {
      setIsSavingBundle(false)
    }
  }

  const deleteBundle = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar el bundle "${name}"? Esta acción no se puede deshacer.`)) return
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/api/package-bundles/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        console.log('[Packages] Bundle deleted:', data)
        // Remove from local state immediately
        setBundles(prev => prev.filter(b => b.id !== id))
        // Reload to ensure sync
        loadBundles()
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }))
        console.error('[Packages] Delete bundle error:', response.status, errorData)
        alert(`Error al eliminar bundle: ${errorData.message || 'Error desconocido'}`)
      }
    } catch (err) {
      console.error('deleteBundle error', err)
      alert(`Error al eliminar bundle: ${err instanceof Error ? err.message : 'Error desconocido'}`)
    }
  }

  // Calculate bundle preview pricing
  const bundlePreview = useMemo(() => {
    // Get selected packages
    const groupPkg = bundleForm.group_package_id ? adminPackages.find(p => p.id === bundleForm.group_package_id) : null
    const privatePkg = bundleForm.private_package_id ? adminPackages.find(p => p.id === bundleForm.private_package_id) : null
    const legacyPkg = bundleForm.package_id && !bundleForm.group_package_id && !bundleForm.private_package_id 
      ? adminPackages.find(p => p.id === bundleForm.package_id) 
      : null
    
    // If no packages selected, return null
    if (!groupPkg && !privatePkg && !legacyPkg) return null
    
    // Calculate regular total using separate months for each package type
    const groupMonthly = groupPkg?.price || 0
    const privateMonthly = privatePkg?.price || 0
    const legacyMonthly = legacyPkg?.price || 0
    
    // Use separate months if available, otherwise fall back to months_included
    const groupMonths = bundleForm.group_months_included || bundleForm.months_included || 0
    const privateMonths = bundleForm.private_months_included || bundleForm.months_included || 0
    const legacyMonths = bundleForm.months_included || 0
    
    // Calculate: (group price * group months) + (private price * private months) + (legacy price * legacy months)
    const groupTotal = groupMonthly * groupMonths
    const privateTotal = privateMonthly * privateMonths
    const legacyTotal = legacyMonthly * legacyMonths
    const regularTotal = groupTotal + privateTotal + legacyTotal
    
    const combinedMonthly = groupMonthly + privateMonthly + legacyMonthly
    const savings = regularTotal - bundleForm.price
    const percentOff = regularTotal > 0 ? Math.round((savings / regularTotal) * 100) : 0
    
    const packageNames = [
      groupPkg?.name,
      privatePkg?.name,
      legacyPkg?.name
    ].filter(Boolean).join(' + ')
    
    return { 
      regularTotal, 
      savings, 
      percentOff, 
      packageName: packageNames, 
      combinedMonthly,
      groupPkg,
      privatePkg,
      groupMonths,
      privateMonths,
      legacyMonths,
      isCombo: !!(groupPkg && privatePkg)
    }
  }, [bundleForm.group_package_id, bundleForm.private_package_id, bundleForm.package_id, bundleForm.months_included, bundleForm.group_months_included, bundleForm.private_months_included, bundleForm.price, adminPackages])

  // Compute package data for client cards
  const groupPackageData = useMemo(() => {
    const allGroupPackages = packageHistory && packageHistory.length > 0
      ? packageHistory
          .filter((pkg: any) => pkg.package_category === 'Grupal')
          .sort((a: any, b: any) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
      : []
    
    const groupPkg = activeGroupPackage || (allGroupPackages.length > 0 ? allGroupPackages[0] : null)
    const isExpired = !activeGroupPackage && groupPkg && (groupPkg.status === 'expired' || groupPkg.renewal_months === 0)
    const hasNoHistory = allGroupPackages.length === 0
    const outOfClasses = classCounts.group === 0
    const hasRenewalMonths = groupPkg && groupPkg.renewal_months && groupPkg.renewal_months > 0
    const isActiveButNoMonths = activeGroupPackage && (!groupPkg?.renewal_months || groupPkg.renewal_months === 0)
    const renewalMonths = groupPkg?.renewal_months || 0
    
    // Calculate next renewal date
    let nextRenewalDate = null
    if (groupPkg && groupPkg.end_date && hasRenewalMonths) {
      nextRenewalDate = new Date(groupPkg.end_date)
    }
    
    return { allGroupPackages, groupPkg, isExpired, hasNoHistory, outOfClasses, hasRenewalMonths, isActiveButNoMonths, renewalMonths, nextRenewalDate }
  }, [packageHistory, activeGroupPackage, classCounts.group])

  const privatePackageData = useMemo(() => {
    const allPrivatePackages = packageHistory && packageHistory.length > 0
      ? packageHistory
          .filter((pkg: any) => pkg.package_category === 'Privada')
          .sort((a: any, b: any) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
      : []
    
    const privatePkg = activePrivatePackage || (allPrivatePackages.length > 0 ? allPrivatePackages[0] : null)
    const isExpired = !activePrivatePackage && privatePkg && (privatePkg.status === 'expired' || privatePkg.renewal_months === 0)
    const hasNoHistory = allPrivatePackages.length === 0
    const outOfClasses = classCounts.private === 0
    const hasRenewalMonths = privatePkg && privatePkg.renewal_months && privatePkg.renewal_months > 0
    const isActiveButNoMonths = activePrivatePackage && (!privatePkg?.renewal_months || privatePkg.renewal_months === 0)
    const renewalMonths = privatePkg?.renewal_months || 0
    
    // Calculate next renewal date
    let nextRenewalDate = null
    if (privatePkg && privatePkg.end_date && hasRenewalMonths) {
      nextRenewalDate = new Date(privatePkg.end_date)
    }
    
    return { allPrivatePackages, privatePkg, isExpired, hasNoHistory, outOfClasses, hasRenewalMonths, isActiveButNoMonths, renewalMonths, nextRenewalDate }
  }, [packageHistory, activePrivatePackage, classCounts.private])

  const groupPackages = adminPackages.filter(p => p.category === 'Grupal').sort((a, b) => a.price - b.price)
  const privatePackages = adminPackages.filter(p => p.category === 'Privada').sort((a, b) => a.price - b.price)
  
  // Filter bundles - for clients, show active bundles and check date ranges
  const filteredBundles = user?.role === 'admin' 
    ? bundles 
    : bundles.filter(b => {
        // Must be active
        if (b.is_active === false) return false
        
        // Check live date range if set (use local date parsing)
        const now = new Date()
        
        if (b.live_from) {
          // Parse as local date (YYYY-MM-DD format)
          const [year, month, day] = b.live_from.split('-').map(Number)
          const liveFrom = new Date(year, month - 1, day, 0, 0, 0, 0) // Start of day in local time
          if (now < liveFrom) {
            console.log('[Packages] Filtered out bundle (future):', b.id, b.name, 'live_from:', b.live_from)
            return false
          }
        }
        if (b.live_until) {
          // If expired, don't show it
          if (isDateInPast(b.live_until)) return false
        }
        
        return true
      })
  
  const groupBundles = filteredBundles.filter(b => b.category === 'Grupal')
  const privateBundles = filteredBundles.filter(b => b.category === 'Privada')
  const comboBundles = filteredBundles.filter(b => b.category === 'Combo' || b.is_combo)
  
  // Debug logging
  if (user?.role === 'cliente') {
    console.log('[Packages] Client bundles:', {
      total: bundles.length,
      filtered: filteredBundles.length,
      group: groupBundles.length,
      private: privateBundles.length,
      combo: comboBundles.length,
      bundles: filteredBundles.map(b => ({ id: b.id, name: b.name, category: b.category, is_active: b.is_active }))
    })
  }

  // Helper to render notification for a package card
  const renderPackageNotifications = (data: any, classCount: number, type: 'group' | 'private') => {
    const notifications: JSX.Element[] = []
    
    // No history - prompt to get first package
    if (data.hasNoHistory) {
      notifications.push(
        <div key="no-history" className="p-3 bg-blue-500/30 rounded-lg flex items-start gap-2">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>Contacta a un instructor o dueño para agregar tu primer paquete a tu cuenta.</span>
        </div>
      )
      return notifications
    }
    
    // Expired package
    if (data.isExpired) {
      notifications.push(
        <div key="expired" className="p-3 bg-red-500/40 rounded-lg flex items-start gap-2 font-semibold">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>Tu paquete se ha agotado. Contacta a un instructor o dueño para renovar.</span>
        </div>
      )
      return notifications
    }
    
    // Out of classes but has renewal months - suggest waiting
    if (data.outOfClasses && data.hasRenewalMonths && !data.isExpired) {
      notifications.push(
        <div key="out-of-classes" className="p-3 bg-amber-500/30 rounded-lg flex items-start gap-2">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>
            Has usado todas tus clases este mes. Más clases llegarán 
            {data.nextRenewalDate && ` el ${data.nextRenewalDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}`}.
            ¿Necesitas más? Contacta al equipo para mejorar tu paquete.
          </span>
        </div>
      )
    }
    
    // Out of classes AND no more renewal months (but still "active" technically)
    if (data.outOfClasses && data.isActiveButNoMonths) {
      notifications.push(
        <div key="out-no-renewal" className="p-3 bg-red-500/40 rounded-lg flex items-start gap-2 font-semibold">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>Te quedaste sin clases y sin meses de renovación. Contacta a un instructor o dueño para renovar.</span>
        </div>
      )
    }
    
    // Only 1 month left - warning
    if (!data.isExpired && !data.outOfClasses && data.renewalMonths === 1) {
      notifications.push(
        <div key="one-month" className="p-3 bg-amber-500/30 rounded-lg flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>¡Solo te queda 1 mes de renovación! Contacta a un instructor o dueño para extender tu membresía.</span>
        </div>
      )
    }
    
    return notifications
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="spinner"></div>
        </div>
      </DashboardLayout>
    )
  }

  // Package Card Component for Admin
  const PackageCard = ({ pkg }: { pkg: PackageType }) => {
    const isOnSale = pkg.original_price && pkg.sale_price && pkg.sale_price < pkg.original_price
    const percentOff = isOnSale ? Math.round(((pkg.original_price! - pkg.sale_price!) / pkg.original_price!) * 100) : 0

  return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 text-lg">{pkg.name}</h4>
            <p className="text-sm text-gray-500">{pkg.type}</p>
          </div>
          <div className="flex items-center gap-2">
            {isOnSale && (
              <span className="px-2 py-1 text-xs font-bold bg-red-100 text-red-600 rounded-full flex items-center gap-1">
                <Tag className="h-3 w-3" />
                -{percentOff}%
              </span>
            )}
            {pkg.is_active ? (
              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                Activo
              </span>
            ) : (
              <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                Inactivo
              </span>
            )}
          </div>
          </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <Package className="h-5 w-5 mx-auto mb-1 text-gray-400" />
            <div className="text-lg font-bold text-gray-900">{pkg.classes_included}</div>
            <div className="text-xs text-gray-500">clases</div>
            </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <DollarSign className="h-5 w-5 mx-auto mb-1 text-gray-400" />
            {isOnSale ? (
              <>
                <div className="text-sm text-gray-400 line-through">${pkg.original_price!.toLocaleString()}</div>
                <div className="text-lg font-bold text-red-600">${pkg.sale_price!.toLocaleString()}</div>
              </>
            ) : (
              <div className="text-lg font-bold text-gray-900">${pkg.price.toLocaleString()}</div>
            )}
            <div className="text-xs text-gray-500">MXN</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <Calendar className="h-5 w-5 mx-auto mb-1 text-gray-400" />
            <div className="text-lg font-bold text-gray-900">{pkg.validity_months || Math.ceil(pkg.validity_days / 30)}</div>
            <div className="text-xs text-gray-500">{(pkg.validity_months || Math.ceil(pkg.validity_days / 30)) === 1 ? 'mes' : 'meses'}</div>
          </div>
        </div>

        {pkg.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">{pkg.description}</p>
        )}

        {(pkg.live_from || pkg.live_until) && (
          <div className="text-xs text-gray-500 mb-4 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {pkg.live_from && <span>Desde: {pkg.live_from}</span>}
            {pkg.live_from && pkg.live_until && <span>·</span>}
            {pkg.live_until && <span>Hasta: {pkg.live_until}</span>}
          </div>
        )}

        <div className="flex gap-2 pt-3 border-t border-gray-100">
          <button
            onClick={() => openEditModal(pkg)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Edit className="h-4 w-4" />
            Editar
          </button>
          <button
            onClick={() => deletePackage(pkg.id, pkg.name)}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    )
  }

  // Client Package Card for purchasing
  const ClientPackageCard = ({ pkg, index }: { pkg: PackageType, index: number }) => {
    const isOnSale = pkg.original_price && pkg.sale_price && pkg.sale_price < pkg.original_price
    const percentOff = isOnSale ? Math.round(((pkg.original_price! - pkg.sale_price!) / pkg.original_price!) * 100) : 0
    const displayPrice = isOnSale ? pkg.sale_price! : pkg.price
    const countdown = useCountdown(pkg.live_until)
    // Only show expiration if live_until is set and not expired
    const hasExpiration = pkg.live_until && !isDateInPast(pkg.live_until)
    
    // Don't render if expired (shouldn't happen due to filtering, but double-check)
    if (pkg.live_until && isDateInPast(pkg.live_until)) return null
    
    return (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
        className={`bg-white border rounded-xl p-5 hover:shadow-lg transition-all relative ${isOnSale ? 'border-red-200 ring-2 ring-red-100' : 'border-gray-200'}`}
      >
        {isOnSale && (
          <div className="absolute -top-3 -right-3 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 shadow-lg">
            <Percent className="h-3 w-3" />
            -{percentOff}%
          </div>
        )}
        
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{pkg.name}</h3>
            <p className="text-sm text-gray-500">{pkg.type}</p>
                </div>
              </div>

        <div className="space-y-3 mb-4">
                <div className="flex items-center text-sm text-gray-600">
            <Package className="h-4 w-4 mr-2 text-gray-400" />
                  {pkg.classes_included} clases incluidas
                </div>
          <div className="flex items-center text-sm">
            <DollarSign className="h-4 w-4 mr-2 text-gray-400" />
            {isOnSale ? (
              <span className="flex items-center gap-2">
                <span className="text-gray-400 line-through">${pkg.original_price!.toLocaleString()}</span>
                <span className="text-red-600 font-bold">${displayPrice.toLocaleString()} MXN</span>
              </span>
            ) : (
              <span className="text-gray-600">${displayPrice.toLocaleString()} MXN</span>
            )}
                </div>
                <div className="flex items-center text-sm text-gray-600">
            <Calendar className="h-4 w-4 mr-2 text-gray-400" />
            Válido por {pkg.validity_months || Math.ceil(pkg.validity_days / 30)} {(pkg.validity_months || Math.ceil(pkg.validity_days / 30)) === 1 ? 'mes' : 'meses'}
                </div>
                {hasExpiration && (() => {
                  // Parse date as local date to avoid timezone issues
                  const [year, month, day] = pkg.live_until!.split('-').map(Number)
                  const expirationDate = new Date(year, month - 1, day)
                  const formattedDate = expirationDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
                  
                  return (
                    <div className="p-3 bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 rounded-lg shadow-sm">
                      <div className="flex items-center gap-2 text-sm text-red-700 font-semibold mb-2">
                        <Clock className="h-4 w-4" />
                        Expira: {formattedDate}
                </div>
                      {countdown ? (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="bg-red-100 text-red-700 px-2 py-1 rounded font-bold text-sm min-w-[2.5rem] text-center">
                              {countdown.days}
                            </span>
                            <span className="text-xs text-red-600 font-medium">d</span>
              </div>
                          <div className="flex items-center gap-1.5">
                            <span className="bg-red-100 text-red-700 px-2 py-1 rounded font-bold text-sm min-w-[2rem] text-center">
                              {String(countdown.hours).padStart(2, '0')}
                            </span>
                            <span className="text-xs text-red-600 font-medium">h</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="bg-red-100 text-red-700 px-2 py-1 rounded font-bold text-sm min-w-[2rem] text-center">
                              {String(countdown.minutes).padStart(2, '0')}
                            </span>
                            <span className="text-xs text-red-600 font-medium">m</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="bg-red-100 text-red-700 px-2 py-1 rounded font-bold text-sm min-w-[2rem] text-center">
                              {String(countdown.seconds).padStart(2, '0')}
                            </span>
                            <span className="text-xs text-red-600 font-medium">s</span>
                          </div>
                  </div>
                ) : (
                        <div className="text-sm text-red-600 font-semibold">Expirado</div>
                      )}
                    </div>
                  )
                })()}
              </div>

        <div className="pt-4 border-t border-gray-100">
                  <WhatsAppButton
                    message={WhatsAppTemplates.packagePurchase(
                      user?.nombre || 'Cliente',
              pkg.type,
                      pkg.name,
              displayPrice
                    )}
                    variant="primary"
                    className="w-full"
                  >
                    Comprar Paquete
                  </WhatsAppButton>
              </div>

        <p className="mt-3 text-[11px] text-gray-400 italic text-center">
          Solo con cita previa · Disponibilidad limitada
              </p>
            </motion.div>
    )
  }

  // Client Bundle Card
  const ClientBundleCard = ({ bundle, index }: { bundle: PackageBundle, index: number }) => {
    const isCombo = bundle.is_combo || bundle.category === 'Combo'
    const countdown = useCountdown(bundle.live_until)
    // Only show expiration if live_until is set and not expired
    const hasExpiration = bundle.live_until && !isDateInPast(bundle.live_until)
    
    // Don't render if expired
    if (bundle.live_until && isDateInPast(bundle.live_until)) return null
    
    return (
      <motion.div
        key={bundle.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className={`${isCombo 
          ? 'bg-gradient-to-br from-purple-50 via-blue-50 to-purple-50 border-2 border-purple-200' 
          : 'bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200'
        } rounded-xl p-5 hover:shadow-lg transition-all relative`}
      >
        {/* Discount badge */}
        <div className={`absolute -top-3 -right-3 ${isCombo 
          ? 'bg-gradient-to-r from-purple-500 to-blue-500' 
          : 'bg-gradient-to-r from-amber-500 to-orange-500'
        } text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 shadow-lg`}>
          <Gift className="h-3 w-3" />
          -{bundle.percent_off}%
          </div>

        {/* Combo badge */}
        {isCombo && (
          <div className="absolute -top-3 left-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
            <Sparkles className="h-3 w-3" />
            COMBO
        </div>
        )}
        
        <div className="mb-4 mt-1">
          <h3 className="text-lg font-bold text-gray-900">{bundle.name}</h3>
          {isCombo ? (
            <div className="space-y-1 mt-2">
              {bundle.group_package_name && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-3 w-3 text-blue-500" />
                  <span className="text-blue-700">{bundle.group_package_name}</span>
                  {bundle.group_classes_included && (
                    <span className="text-gray-500">({bundle.group_classes_included} clases)</span>
                  )}
                  {bundle.group_months_included && (
                    <span className="text-blue-600 font-medium">· {bundle.group_months_included} {bundle.group_months_included === 1 ? 'mes' : 'meses'}</span>
                  )}
                </div>
              )}
              {bundle.private_package_name && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-3 w-3 text-purple-500" />
                  <span className="text-purple-700">{bundle.private_package_name}</span>
                  {bundle.private_classes_included && (
                    <span className="text-gray-500">({bundle.private_classes_included} clases)</span>
                  )}
                  {bundle.private_months_included && (
                    <span className="text-purple-600 font-medium">· {bundle.private_months_included} {bundle.private_months_included === 1 ? 'mes' : 'meses'}</span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-amber-700">Basado en: {bundle.package_name}</p>
          )}
        </div>

        {bundle.description && (
          <p className="text-sm text-gray-600 mb-4">{bundle.description}</p>
        )}
        
        <div className="space-y-2 mb-4 p-3 bg-white/50 rounded-lg">
          {/* Duration - show separate months if available */}
          {bundle.group_months_included !== undefined && bundle.group_months_included !== null && bundle.group_package_id && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Duración (Grupal):</span>
              <span className="font-semibold text-blue-700">{bundle.group_months_included} {bundle.group_months_included === 1 ? 'mes' : 'meses'}</span>
            </div>
          )}
          {bundle.private_months_included !== undefined && bundle.private_months_included !== null && bundle.private_package_id && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Duración (Privado):</span>
              <span className="font-semibold text-purple-700">{bundle.private_months_included} {bundle.private_months_included === 1 ? 'mes' : 'meses'}</span>
            </div>
          )}
          {/* Fallback to months_included if separate months not set */}
          {(!bundle.group_months_included || !bundle.private_months_included) && (!bundle.group_package_id || !bundle.private_package_id) && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Duración:</span>
              <span className="font-semibold">{bundle.months_included || bundle.group_months_included || bundle.private_months_included || 0} {((bundle.months_included || bundle.group_months_included || bundle.private_months_included || 0) === 1) ? 'mes' : 'meses'}</span>
            </div>
          )}
          {isCombo && bundle.combined_monthly_price && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Precio mensual (combinado):</span>
              <span className="text-gray-500">${bundle.combined_monthly_price.toLocaleString()}/mes</span>
            </div>
          )}
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Precio normal:</span>
            <span className="text-gray-400 line-through">${bundle.regular_total.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Tu precio:</span>
            <span className={`text-xl font-bold ${isCombo ? 'text-purple-600' : 'text-amber-600'}`}>
              ${bundle.price.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Ahorras:</span>
            <span className="text-green-600 font-semibold">${bundle.savings.toLocaleString()} MXN</span>
          </div>
          {hasExpiration && (() => {
            // Parse date as local date to avoid timezone issues
            const [year, month, day] = bundle.live_until!.split('-').map(Number)
            const expirationDate = new Date(year, month - 1, day)
            const formattedDate = expirationDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
            
            return (
              <div className="pt-3 mt-3 border-t-2 border-red-200">
                <div className="p-3 bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 rounded-lg shadow-sm">
                  <div className="flex items-center gap-2 text-sm text-red-700 font-semibold mb-2">
                    <Clock className="h-4 w-4" />
                    Expira: {formattedDate}
                  </div>
                  {countdown ? (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded font-bold text-sm min-w-[2.5rem] text-center">
                          {countdown.days}
                        </span>
                        <span className="text-xs text-red-600 font-medium">d</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded font-bold text-sm min-w-[2rem] text-center">
                          {String(countdown.hours).padStart(2, '0')}
                        </span>
                        <span className="text-xs text-red-600 font-medium">h</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded font-bold text-sm min-w-[2rem] text-center">
                          {String(countdown.minutes).padStart(2, '0')}
                        </span>
                        <span className="text-xs text-red-600 font-medium">m</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded font-bold text-sm min-w-[2rem] text-center">
                          {String(countdown.seconds).padStart(2, '0')}
                        </span>
                        <span className="text-xs text-red-600 font-medium">s</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-red-600 font-semibold">Expirado</div>
                  )}
                </div>
              </div>
            )
          })()}
        </div>
        
        <div className={`pt-4 border-t ${isCombo ? 'border-purple-200' : 'border-amber-200'}`}>
          <WhatsAppButton
            message={WhatsAppTemplates.packagePurchase(
              user?.nombre || 'Cliente',
              (() => {
                if (isCombo && bundle.group_months_included && bundle.private_months_included) {
                  return `Bundle Combo (${bundle.group_months_included} meses grupal + ${bundle.private_months_included} meses privado)`
                } else if (bundle.group_months_included && bundle.group_package_id) {
                  return `Bundle ${bundle.group_months_included} meses (Grupal)`
                } else if (bundle.private_months_included && bundle.private_package_id) {
                  return `Bundle ${bundle.private_months_included} meses (Privado)`
                } else {
                  return `Bundle ${bundle.months_included || 0} meses${isCombo ? ' (Combo)' : ''}`
                }
              })(),
              bundle.name,
              bundle.price
            )}
            variant="primary"
            className={`w-full ${isCombo 
              ? 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600' 
              : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
            }`}
          >
            Comprar Bundle
          </WhatsAppButton>
        </div>
      </motion.div>
    )
  }

  // Admin Bundle Card
  const AdminBundleCard = ({ bundle }: { bundle: PackageBundle }) => {
    const isCombo = bundle.is_combo || bundle.category === 'Combo'
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${isCombo 
          ? 'bg-gradient-to-br from-purple-50 via-blue-50 to-purple-50 border border-purple-200' 
          : 'bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200'
        } rounded-xl p-5 hover:shadow-md transition-shadow`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-gray-900 text-lg">{bundle.name}</h4>
              {isCombo && (
                <span className="px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-full flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  COMBO
                </span>
              )}
            </div>
            {isCombo ? (
              <div className="space-y-1">
                {bundle.group_package_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-3 w-3 text-blue-500" />
                    <span className="text-blue-700">{bundle.group_package_name}</span>
                    <span className="text-gray-400">
                      ${bundle.group_package_price?.toLocaleString()}/mes
                      {bundle.group_months_included && ` × ${bundle.group_months_included} meses`}
                    </span>
                  </div>
                )}
                {bundle.private_package_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-3 w-3 text-purple-500" />
                    <span className="text-purple-700">{bundle.private_package_name}</span>
                    <span className="text-gray-400">
                      ${bundle.private_package_price?.toLocaleString()}/mes
                      {bundle.private_months_included && ` × ${bundle.private_months_included} meses`}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-amber-700">Basado en: {bundle.package_name}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 text-xs font-bold ${isCombo ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'} rounded-full flex items-center gap-1`}>
              <Percent className="h-3 w-3" />
              -{bundle.percent_off}%
            </span>
            {bundle.is_active ? (
              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                Activo
              </span>
            ) : (
              <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                Inactivo
              </span>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-white/60 rounded-lg">
            <Calendar className={`h-5 w-5 mx-auto mb-1 ${isCombo ? 'text-purple-500' : 'text-amber-500'}`} />
            {isCombo && bundle.group_months_included && bundle.private_months_included ? (
              <div className="space-y-1">
                <div className="text-sm font-bold text-blue-700">{bundle.group_months_included}G</div>
                <div className="text-sm font-bold text-purple-700">{bundle.private_months_included}P</div>
                <div className="text-xs text-gray-500">meses</div>
              </div>
            ) : bundle.group_months_included !== undefined && bundle.group_months_included !== null && bundle.group_package_id ? (
              <>
                <div className="text-lg font-bold text-gray-900">{bundle.group_months_included}</div>
                <div className="text-xs text-gray-500">meses (Grupal)</div>
              </>
            ) : bundle.private_months_included !== undefined && bundle.private_months_included !== null && bundle.private_package_id ? (
              <>
                <div className="text-lg font-bold text-gray-900">{bundle.private_months_included}</div>
                <div className="text-xs text-gray-500">meses (Privado)</div>
              </>
            ) : (
              <>
                <div className="text-lg font-bold text-gray-900">{bundle.months_included || 0}</div>
                <div className="text-xs text-gray-500">meses</div>
              </>
            )}
          </div>
          <div className="text-center p-3 bg-white/60 rounded-lg">
            <DollarSign className={`h-5 w-5 mx-auto mb-1 ${isCombo ? 'text-purple-500' : 'text-amber-500'}`} />
            <div className="text-sm text-gray-400 line-through">${bundle.regular_total.toLocaleString()}</div>
            <div className={`text-lg font-bold ${isCombo ? 'text-purple-600' : 'text-amber-600'}`}>${bundle.price.toLocaleString()}</div>
          </div>
          <div className="text-center p-3 bg-white/60 rounded-lg">
            <Gift className={`h-5 w-5 mx-auto mb-1 ${isCombo ? 'text-purple-500' : 'text-amber-500'}`} />
            <div className="text-lg font-bold text-green-600">${bundle.savings.toLocaleString()}</div>
            <div className="text-xs text-gray-500">ahorro</div>
          </div>
        </div>

        {bundle.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">{bundle.description}</p>
        )}

        <div className={`flex gap-2 pt-3 border-t ${isCombo ? 'border-purple-200' : 'border-amber-200'}`}>
          <button
            onClick={() => openEditBundleModal(bundle)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium ${isCombo ? 'text-purple-700 bg-purple-100 hover:bg-purple-200' : 'text-amber-700 bg-amber-100 hover:bg-amber-200'} rounded-lg transition-colors`}
          >
            <Edit className="h-4 w-4" />
            Editar
          </button>
          <button
            onClick={() => deleteBundle(bundle.id, bundle.name)}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
          <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {user?.role === 'cliente' ? 'Mi Paquete' : 'Gestión de Paquetes'}
          </h1>
          <p className="text-gray-600 mt-1">
            {user?.role === 'cliente' 
              ? 'Ve tu paquete actual y clases restantes'
              : 'Administra los tipos de paquetes disponibles en el estudio'
            }
          </p>
          </div>

        {/* Client View: Class Count Cards */}
        {user?.role === 'cliente' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Group Classes Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={`${groupPackageData.isExpired ? 'bg-gradient-to-br from-gray-400 to-gray-500' : 'bg-gradient-to-br from-blue-500 to-blue-600'} rounded-2xl p-6 text-white shadow-lg`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Clases Grupales</h3>
                <Users className="h-8 w-8 opacity-80" />
                </div>
              <div className="mb-4">
                <div className="flex items-baseline gap-2 mb-2">
                  <div className="text-4xl font-bold">{groupPackageData.isExpired ? 0 : classCounts.group}</div>
                  {groupPackageData.groupPkg?.classes_included && (
                    <div className="text-xl opacity-70">/{groupPackageData.groupPkg.classes_included}</div>
                  )}
              </div>
                <div className="text-sm opacity-90">clases restantes este mes</div>
              </div>
              {groupPackageData.groupPkg && (
                <div className="mb-4 pb-4 border-b border-white/20">
                  <div className="text-sm font-semibold">{groupPackageData.groupPkg.package_name || 'Paquete Grupal'}</div>
                </div>
              )}
              
              {/* Months remaining and renewal info */}
              {!groupPackageData.hasNoHistory && groupPackageData.groupPkg && (
                <div className="mb-4 text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {groupPackageData.isExpired ? (
                      <span>0 meses restantes</span>
                    ) : groupPackageData.renewalMonths > 0 ? (
                      <span>{groupPackageData.renewalMonths} {groupPackageData.renewalMonths === 1 ? 'mes' : 'meses'} de renovación restantes</span>
                    ) : (
                      <span>Sin meses de renovación</span>
                    )}
                </div>
                  {groupPackageData.nextRenewalDate && groupPackageData.hasRenewalMonths && !groupPackageData.isExpired && (
                    <div className="text-xs opacity-75">
                      Próxima renovación: {groupPackageData.nextRenewalDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  )}
                </div>
              )}
              
              {/* Notifications */}
              <div className="text-xs space-y-2">
                {renderPackageNotifications(groupPackageData, classCounts.group, 'group')}
                </div>
            </motion.div>

            {/* Private Classes Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`${privatePackageData.isExpired ? 'bg-gradient-to-br from-gray-400 to-gray-500' : 'bg-gradient-to-br from-purple-500 to-purple-600'} rounded-2xl p-6 text-white shadow-lg`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Clases Privadas</h3>
                <User className="h-8 w-8 opacity-80" />
                </div>
              <div className="mb-4">
                <div className="flex items-baseline gap-2 mb-2">
                  <div className="text-4xl font-bold">{privatePackageData.isExpired ? 0 : classCounts.private}</div>
                  {privatePackageData.privatePkg?.classes_included && (
                    <div className="text-xl opacity-70">/{privatePackageData.privatePkg.classes_included}</div>
                  )}
              </div>
                <div className="text-sm opacity-90">clases restantes este mes</div>
              </div>
              {privatePackageData.privatePkg && (
                <div className="mb-4 pb-4 border-b border-white/20">
                  <div className="text-sm font-semibold">{privatePackageData.privatePkg.package_name || 'Paquete Privado'}</div>
                </div>
              )}
              
              {/* Months remaining and renewal info */}
              {!privatePackageData.hasNoHistory && privatePackageData.privatePkg && (
                <div className="mb-4 text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {privatePackageData.isExpired ? (
                      <span>0 meses restantes</span>
                    ) : privatePackageData.renewalMonths > 0 ? (
                      <span>{privatePackageData.renewalMonths} {privatePackageData.renewalMonths === 1 ? 'mes' : 'meses'} de renovación restantes</span>
                    ) : (
                      <span>Sin meses de renovación</span>
                    )}
                  </div>
                  {privatePackageData.nextRenewalDate && privatePackageData.hasRenewalMonths && !privatePackageData.isExpired && (
                    <div className="text-xs opacity-75">
                      Próxima renovación: {privatePackageData.nextRenewalDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  )}
                </div>
              )}
              
              {/* Notifications */}
              <div className="text-xs space-y-2">
                {renderPackageNotifications(privatePackageData, classCounts.private, 'private')}
              </div>
            </motion.div>
          </div>
        )}

        {/* Admin View: Package Management */}
                {user?.role === 'admin' ? (
          <>
            {/* Group Packages Section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Paquetes Grupales</h2>
                    <p className="text-sm text-gray-500">{groupPackages.length} paquetes disponibles</p>
                  </div>
                </div>
                <button
                  onClick={() => openCreateModal('Grupal')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <Plus className="h-5 w-5" />
                  Agregar Paquete
                    </button>
              </div>
              
              {groupPackages.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupPackages.map(pkg => (
                    <PackageCard key={pkg.id} pkg={pkg} />
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
                  <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">No hay paquetes grupales creados</p>
                  <button
                    onClick={() => openCreateModal('Grupal')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <Plus className="h-5 w-5" />
                    Crear primer paquete
                    </button>
                  </div>
              )}
            </section>

            {/* Private Packages Section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <User className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Paquetes Privados</h2>
                    <p className="text-sm text-gray-500">{privatePackages.length} paquetes disponibles</p>
                  </div>
                </div>
                <button
                  onClick={() => openCreateModal('Privada')}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  <Plus className="h-5 w-5" />
                  Agregar Paquete
                </button>
              </div>
              
              {privatePackages.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {privatePackages.map(pkg => (
                    <PackageCard key={pkg.id} pkg={pkg} />
                  ))}
                  </div>
                ) : (
                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
                  <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">No hay paquetes privados creados</p>
                  <button
                    onClick={() => openCreateModal('Privada')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                  >
                    <Plus className="h-5 w-5" />
                    Crear primer paquete
                  </button>
                </div>
              )}
            </section>

            {/* Bundles Section - Admin */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg">
                    <Gift className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Bundles de Renovación</h2>
                    <p className="text-sm text-gray-500">{bundles.length} bundles disponibles · Paquetes multi-mes con descuento</p>
                  </div>
                </div>
                <button
                  onClick={openCreateBundleModal}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-colors font-medium"
                >
                  <Plus className="h-5 w-5" />
                  Agregar Bundle
                </button>
              </div>
              
              {bundles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bundles.map(bundle => (
                    <AdminBundleCard key={bundle.id} bundle={bundle} />
                  ))}
                </div>
              ) : (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-dashed border-amber-200 rounded-xl p-8 text-center">
                  <Gift className="h-12 w-12 text-amber-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">No hay bundles de renovación creados</p>
                  <button
                    onClick={openCreateBundleModal}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-colors font-medium"
                  >
                    <Plus className="h-5 w-5" />
                    Crear primer bundle
                  </button>
                </div>
              )}
            </section>
          </>
        ) : null}

        {/* Available Packages for Purchase - shown to clients */}
        {user?.role === 'cliente' && (
          <>
            {/* Bundles Section - Client */}
            {filteredBundles.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg">
                    <Gift className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Bundles de Renovación</h2>
                    <p className="text-sm text-gray-500">
                      Paquetes multi-mes con descuentos especiales
                    </p>
                  </div>
              </div>

                {/* Combo Bundles */}
                {comboBundles.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-purple-500" />
                      Bundles Combo (Grupal + Privado)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {comboBundles.map((bundle, index) => (
                        <ClientBundleCard key={bundle.id} bundle={bundle} index={index} />
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Group Bundles */}
                {groupBundles.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-500" />
                      Bundles Grupales
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {groupBundles.map((bundle, index) => (
                        <ClientBundleCard key={bundle.id} bundle={bundle} index={index} />
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Private Bundles */}
                {privateBundles.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <User className="h-5 w-5 text-purple-500" />
                      Bundles Privados
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {privateBundles.map((bundle, index) => (
                        <ClientBundleCard key={bundle.id} bundle={bundle} index={index} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Fallback: Show bundles without category or with unknown category */}
                {filteredBundles.filter(b => {
                  const cat = b.category || b.is_combo ? 'Combo' : null
                  return !cat || (cat !== 'Combo' && cat !== 'Grupal' && cat !== 'Privada')
                }).length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Gift className="h-5 w-5 text-amber-500" />
                      Otros Bundles
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredBundles
                        .filter(b => {
                          const cat = b.category || (b.is_combo ? 'Combo' : null)
                          return !cat || (cat !== 'Combo' && cat !== 'Grupal' && cat !== 'Privada')
                        })
                        .map((bundle, index) => (
                          <ClientBundleCard key={bundle.id} bundle={bundle} index={index} />
                        ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Group Packages Section */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
              </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Paquetes Grupales</h2>
                  <p className="text-sm text-gray-500">
                    {availablePackages.filter(p => p.category === 'Grupal').length} paquetes disponibles
                  </p>
                </div>
              </div>
              {availablePackages.filter(p => p.category === 'Grupal').length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {availablePackages
                    .filter(p => p.category === 'Grupal')
                    .sort((a, b) => a.price - b.price)
                    .map((pkg, index) => (
                      <ClientPackageCard key={pkg.id} pkg={pkg} index={index} />
          ))}
          </div>
              ) : (
                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
                  <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No hay paquetes grupales disponibles en este momento</p>
        </div>
              )}
            </section>

            {/* Private Packages Section */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <User className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Paquetes Privados</h2>
                  <p className="text-sm text-gray-500">
                    {availablePackages.filter(p => p.category === 'Privada').length} paquetes disponibles
                  </p>
                </div>
              </div>
              {availablePackages.filter(p => p.category === 'Privada').length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {availablePackages
                    .filter(p => p.category === 'Privada')
                    .sort((a, b) => a.price - b.price)
                    .map((pkg, index) => (
                      <ClientPackageCard key={pkg.id} pkg={pkg} index={index} />
          ))}
          </div>
              ) : (
                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
                  <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No hay paquetes privados disponibles en este momento</p>
        </div>
              )}
            </section>

          </>
        )}

        {/* Modal for Create/Edit Package */}
        <AnimatePresence>
          {isModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={(e) => e.target === e.currentTarget && closeModal()}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              >
                {/* Modal Header */}
                <div className={`p-6 border-b border-gray-100 ${modalCategory === 'Grupal' ? 'bg-blue-50' : 'bg-purple-50'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${modalCategory === 'Grupal' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                        {modalCategory === 'Grupal' ? (
                          <Users className={`h-6 w-6 text-blue-600`} />
                        ) : (
                          <User className={`h-6 w-6 text-purple-600`} />
                        )}
                          </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">
                          {editingPackage ? 'Editar Paquete' : 'Nuevo Paquete'}
                        </h2>
                        <p className="text-sm text-gray-500">
                          {modalCategory === 'Grupal' ? 'Paquete Grupal' : 'Paquete Privado'}
                        </p>
                            </div>
                            </div>
                    <button
                      onClick={closeModal}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                          </div>
                        </div>

                {/* Modal Body */}
                <div className="p-6 space-y-5">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre del Paquete *
                    </label>
                    <input
                      type="text"
                      value={packageForm.name}
                      onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })}
                      placeholder="Ej: Paquete Básico"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>

                  {/* Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo / Etiqueta
                    </label>
                    <input
                      type="text"
                      value={packageForm.type}
                      onChange={(e) => setPackageForm({ ...packageForm, type: e.target.value })}
                      placeholder="Ej: 4 clases, Individual, Ilimitado"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>

                  {/* Classes and Validity */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Clases Incluidas *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={packageForm.classes_included}
                        onChange={(e) => setPackageForm({ ...packageForm, classes_included: Number(e.target.value) || 1 })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Duración (meses) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={packageForm.validity_months}
                        onChange={(e) => setPackageForm({ ...packageForm, validity_months: Number(e.target.value) || 1 })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Precio (MXN) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        min="0"
                        value={packageForm.price}
                        onChange={(e) => setPackageForm({ ...packageForm, price: Number(e.target.value) || 0 })}
                        className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Sale Price Section */}
                  <div className="p-4 bg-red-50 rounded-lg border border-red-100 space-y-4">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-red-500" />
                      <h4 className="font-medium text-red-700">Precio de Oferta (Opcional)</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Precio Original</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                          <input
                            type="number"
                            min="0"
                            value={packageForm.original_price}
                            onChange={(e) => setPackageForm({ ...packageForm, original_price: e.target.value ? Number(e.target.value) : '' })}
                            placeholder="0"
                            className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Precio de Oferta</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                          <input
                            type="number"
                            min="0"
                            value={packageForm.sale_price}
                            onChange={(e) => setPackageForm({ ...packageForm, sale_price: e.target.value ? Number(e.target.value) : '' })}
                            placeholder="0"
                            className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          />
                        </div>
                      </div>
                    </div>
                    {packageForm.original_price && packageForm.sale_price && Number(packageForm.sale_price) < Number(packageForm.original_price) && (
                      <div className="text-sm text-red-600 font-medium flex items-center gap-2">
                        <Percent className="h-4 w-4" />
                        {Math.round(((Number(packageForm.original_price) - Number(packageForm.sale_price)) / Number(packageForm.original_price)) * 100)}% de descuento
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descripción
                    </label>
                    <textarea
                      value={packageForm.description}
                      onChange={(e) => setPackageForm({ ...packageForm, description: e.target.value })}
                      placeholder="Descripción opcional del paquete..."
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                    />
                  </div>

                  {/* Scheduling */}
                  <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                    <h4 className="font-medium text-gray-700">Programación (Opcional)</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Disponible desde</label>
                        <input
                          type="date"
                          value={packageForm.live_from}
                          onChange={(e) => {
                            const newLiveFrom = e.target.value
                            // If setting live_from, and live_until is set but no live_from, force active
                            let updates: any = { live_from: newLiveFrom }
                            if (newLiveFrom && packageForm.live_until && !packageForm.live_from) {
                              updates.is_active = true
                            }
                            setPackageForm({ ...packageForm, ...updates })
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Disponible hasta</label>
                        <input
                          type="date"
                          value={packageForm.live_until}
                          onChange={(e) => {
                            const newLiveUntil = e.target.value
                            let updates: any = { live_until: newLiveUntil }
                            
                            // If setting live_until without live_from, force active
                            if (newLiveUntil && !packageForm.live_from) {
                              updates.is_active = true
                            }
                            
                            setPackageForm({ ...packageForm, ...updates })
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {packageForm.live_until && !packageForm.live_from && (
                          <p className="text-xs text-amber-600 mt-1">⚠️ Se activará automáticamente hasta esta fecha</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status toggle */}
                  <div>
                    <label className={`flex items-center gap-2 ${shouldDisableActiveCheckbox(packageForm.live_from, packageForm.live_until) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                      <input
                        type="checkbox"
                        checked={packageForm.is_active}
                        disabled={shouldDisableActiveCheckbox(packageForm.live_from, packageForm.live_until)}
                        onChange={(e) => {
                          const newIsActive = e.target.checked
                          let updates: any = { is_active: newIsActive }
                          
                          // If setting active and live_from has passed, clear live_from
                          if (newIsActive && packageForm.live_from && isDateInPast(packageForm.live_from)) {
                            updates.live_from = ''
                          }
                          
                          setPackageForm({ ...packageForm, ...updates })
                        }}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                      />
                      <span className="text-sm text-gray-700">
                        Paquete activo (visible para clientes)
                        {shouldDisableActiveCheckbox(packageForm.live_from, packageForm.live_until) && (
                          <span className="text-xs text-amber-600 ml-1">
                            {packageForm.live_from && isDateInFuture(packageForm.live_from) 
                              ? '(se activará automáticamente)' 
                              : packageForm.live_until && isDateInPast(packageForm.live_until)
                              ? '(expirado)'
                              : packageForm.live_from || packageForm.live_until
                              ? '(controlado por fechas)'
                              : ''}
                        </span>
                        )}
                        </span>
                    </label>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex gap-3">
                  <button
                    onClick={closeModal}
                    className="flex-1 px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancelar
                        </button>
                  <button
                    onClick={savePackage}
                    disabled={isSavingPackage}
                    className={`flex-1 px-4 py-2.5 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2 ${
                      modalCategory === 'Grupal' 
                        ? 'bg-blue-600 hover:bg-blue-700' 
                        : 'bg-purple-600 hover:bg-purple-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isSavingPackage ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-5 w-5" />
                        {editingPackage ? 'Guardar Cambios' : 'Crear Paquete'}
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal for Create/Edit Bundle */}
        <AnimatePresence>
          {isBundleModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={(e) => e.target === e.currentTarget && closeBundleModal()}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              >
                {/* Modal Header */}
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100">
                        <Gift className="h-6 w-6 text-amber-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">
                          {editingBundle ? 'Editar Bundle' : 'Nuevo Bundle'}
                        </h2>
                        <p className="text-sm text-gray-500">
                          Paquete multi-mes con descuento
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={closeBundleModal}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-5">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre del Bundle *
                    </label>
                    <input
                      type="text"
                      value={bundleForm.name}
                      onChange={(e) => setBundleForm({ ...bundleForm, name: e.target.value })}
                      placeholder="Ej: Bundle Trimestral"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    />
                  </div>

                  {/* Package Selection - Dual selectors for combo bundles */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Info className="h-4 w-4" />
                      <span>Selecciona uno o ambos tipos de paquete para crear un bundle combo</span>
                    </div>
                    
                    {/* Group Package */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <span className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-blue-500" />
                          Paquete Grupal (Opcional)
                        </span>
                      </label>
                      <select
                        value={bundleForm.group_package_id}
                        onChange={(e) => {
                          const newGroupId = e.target.value
                          const groupPkg = adminPackages.find(p => p.id === newGroupId)
                          const privatePkg = adminPackages.find(p => p.id === bundleForm.private_package_id)
                          
                          // Calculate price using separate months
                          const groupMonths = bundleForm.group_months_included || 3
                          const privateMonths = bundleForm.private_months_included || 3
                          const groupTotal = (groupPkg?.price || 0) * groupMonths
                          const privateTotal = (privatePkg?.price || 0) * privateMonths
                          const combinedPrice = groupTotal + privateTotal
                          
                          setBundleForm({ 
                            ...bundleForm, 
                            group_package_id: newGroupId,
                            package_id: '', // Clear legacy field
                            price: combinedPrice
                          })
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      >
                        <option value="">Sin paquete grupal</option>
                        {adminPackages.filter(p => p.category === 'Grupal').map(pkg => (
                          <option key={pkg.id} value={pkg.id}>
                            {pkg.name} - ${pkg.price.toLocaleString()}/mes ({pkg.classes_included} clases)
                            {!pkg.is_live && ' [NO PÚBLICO]'}
                            {!pkg.is_active && ' [INACTIVO]'}
                          </option>
                        ))}
                      </select>
            </div>
                    
                    {/* Private Package */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <span className="flex items-center gap-2">
                          <User className="h-4 w-4 text-purple-500" />
                          Paquete Privado (Opcional)
                        </span>
                      </label>
                      <select
                        value={bundleForm.private_package_id}
                        onChange={(e) => {
                          const newPrivateId = e.target.value
                          const groupPkg = adminPackages.find(p => p.id === bundleForm.group_package_id)
                          const privatePkg = adminPackages.find(p => p.id === newPrivateId)
                          
                          // Calculate price using separate months
                          const groupMonths = bundleForm.group_months_included || 3
                          const privateMonths = bundleForm.private_months_included || 3
                          const groupTotal = (groupPkg?.price || 0) * groupMonths
                          const privateTotal = (privatePkg?.price || 0) * privateMonths
                          const combinedPrice = groupTotal + privateTotal
                          
                          setBundleForm({ 
                            ...bundleForm, 
                            private_package_id: newPrivateId,
                            package_id: '', // Clear legacy field
                            price: combinedPrice
                          })
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                      >
                        <option value="">Sin paquete privado</option>
                        {adminPackages.filter(p => p.category === 'Privada').map(pkg => (
                          <option key={pkg.id} value={pkg.id}>
                            {pkg.name} - ${pkg.price.toLocaleString()}/mes ({pkg.classes_included} clases)
                            {!pkg.is_live && ' [NO PÚBLICO]'}
                            {!pkg.is_active && ' [INACTIVO]'}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Show combo indicator */}
                    {bundleForm.group_package_id && bundleForm.private_package_id && (
                      <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                        <Sparkles className="h-5 w-5 text-purple-500" />
                        <span className="text-sm font-medium text-purple-700">
                          ¡Bundle Combo! Incluye clases grupales y privadas
                        </span>
          </div>
        )}

                    {/* Show warning if no package selected */}
                    {!bundleForm.group_package_id && !bundleForm.private_package_id && (
                      <div className="text-sm text-amber-600 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Selecciona al menos un tipo de paquete
                      </div>
                    )}
                  </div>

                  {/* Months - Show separate inputs for group and private */}
                  {(bundleForm.group_package_id || bundleForm.private_package_id) ? (
                    <div className="grid grid-cols-2 gap-4">
                      {bundleForm.group_package_id && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Meses Paquete Grupal *
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={bundleForm.group_months_included}
                            onChange={(e) => {
                              const months = Number(e.target.value) || 1
                              setBundleForm({ 
                                ...bundleForm, 
                                group_months_included: months
                              })
                            }}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          />
                        </div>
                      )}
                      {bundleForm.private_package_id && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Meses Paquete Privado *
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={bundleForm.private_months_included}
                            onChange={(e) => {
                              const months = Number(e.target.value) || 1
                              setBundleForm({ 
                                ...bundleForm, 
                                private_months_included: months
                              })
                            }}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    // Legacy: single months input if only using package_id
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Meses Incluidos *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={bundleForm.months_included}
                        onChange={(e) => {
                          const months = Number(e.target.value) || 1
                          setBundleForm({ 
                            ...bundleForm, 
                            months_included: months
                          })
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                      />
                    </div>
                  )}

                  {/* Price */}
                  <div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Precio del Bundle (MXN) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          min="0"
                          value={bundleForm.price}
                          onChange={(e) => setBundleForm({ ...bundleForm, price: Number(e.target.value) || 0 })}
                          className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Price Preview */}
                  {bundlePreview && (
                    <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-amber-800 flex items-center gap-2">
                          <Percent className="h-4 w-4" />
                          Vista Previa de Descuento
                          {bundlePreview.isCombo && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Combo</span>
                          )}
                        </h4>
                        <button
                          type="button"
                          onClick={() => setBundleForm({ ...bundleForm, price: bundlePreview.regularTotal })}
                          className="text-xs text-amber-600 hover:text-amber-800 underline"
                        >
                          Usar precio normal
                        </button>
                      </div>
                      
                      {/* Breakdown by package type */}
                      <div className="text-sm space-y-2">
                        <div className="text-gray-600">Precio normal:</div>
                        {bundlePreview.groupPkg && (
                          <div className="flex justify-between items-center pl-2 border-l-2 border-blue-300">
                            <span className="text-blue-700">{bundlePreview.groupPkg.name}</span>
                            <span className="text-gray-700">
                              ${bundlePreview.groupPkg.price.toLocaleString()} × {bundlePreview.groupMonths} {bundlePreview.groupMonths === 1 ? 'mes' : 'meses'} = ${(bundlePreview.groupPkg.price * bundlePreview.groupMonths).toLocaleString()}
                            </span>
                          </div>
                        )}
                        {bundlePreview.privatePkg && (
                          <div className="flex justify-between items-center pl-2 border-l-2 border-purple-300">
                            <span className="text-purple-700">{bundlePreview.privatePkg.name}</span>
                            <span className="text-gray-700">
                              ${bundlePreview.privatePkg.price.toLocaleString()} × {bundlePreview.privateMonths} {bundlePreview.privateMonths === 1 ? 'mes' : 'meses'} = ${(bundlePreview.privatePkg.price * bundlePreview.privateMonths).toLocaleString()}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center font-semibold text-gray-900 pt-1 border-t border-amber-200">
                          <span>Total normal:</span>
                          <span>${bundlePreview.regularTotal.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t border-amber-200">
                        <div>
                          <span className="text-gray-600">Precio mensual combinado:</span>
                          <div className="font-semibold text-gray-900">${bundlePreview.combinedMonthly.toLocaleString()}/mes</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Tu precio bundle:</span>
                          <div className="font-semibold text-amber-600">${bundleForm.price.toLocaleString()}</div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-amber-200">
                        <span className="text-gray-600">Ahorro para cliente:</span>
                        <span className={`font-bold text-lg ${bundlePreview.percentOff > 0 ? 'text-green-600' : bundlePreview.percentOff < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                          {bundlePreview.percentOff > 0 ? (
                            <>-{bundlePreview.percentOff}% (${bundlePreview.savings.toLocaleString()})</>
                          ) : bundlePreview.percentOff < 0 ? (
                            <>+{Math.abs(bundlePreview.percentOff)}% (más caro)</>
                          ) : (
                            'Sin descuento'
                          )}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descripción
                    </label>
                    <textarea
                      value={bundleForm.description}
                      onChange={(e) => setBundleForm({ ...bundleForm, description: e.target.value })}
                      placeholder="Descripción opcional del bundle..."
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors resize-none"
                    />
                  </div>

                  {/* Scheduling */}
                  <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                    <h4 className="font-medium text-gray-700">Programación (Opcional)</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Disponible desde</label>
                        <input
                          type="date"
                          value={bundleForm.live_from}
                          onChange={(e) => {
                            const newLiveFrom = e.target.value
                            // If setting live_from, and live_until is set but no live_from, force active
                            let updates: any = { live_from: newLiveFrom }
                            if (newLiveFrom && bundleForm.live_until && !bundleForm.live_from) {
                              updates.is_active = true
                            }
                            setBundleForm({ ...bundleForm, ...updates })
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Disponible hasta</label>
                        <input
                          type="date"
                          value={bundleForm.live_until}
                          onChange={(e) => {
                            const newLiveUntil = e.target.value
                            let updates: any = { live_until: newLiveUntil }
                            
                            // If setting live_until without live_from, force active
                            if (newLiveUntil && !bundleForm.live_from) {
                              updates.is_active = true
                            }
                            
                            setBundleForm({ ...bundleForm, ...updates })
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        />
                        {bundleForm.live_until && !bundleForm.live_from && (
                          <p className="text-xs text-amber-600 mt-1">⚠️ Se activará automáticamente hasta esta fecha</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status toggle */}
                  <div>
                    <label className={`flex items-center gap-2 ${shouldDisableActiveCheckbox(bundleForm.live_from, bundleForm.live_until) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                      <input
                        type="checkbox"
                        checked={bundleForm.is_active}
                        disabled={shouldDisableActiveCheckbox(bundleForm.live_from, bundleForm.live_until)}
                        onChange={(e) => {
                          const newIsActive = e.target.checked
                          let updates: any = { is_active: newIsActive }
                          
                          // If setting active and live_from has passed, clear live_from
                          if (newIsActive && bundleForm.live_from && isDateInPast(bundleForm.live_from)) {
                            updates.live_from = ''
                          }
                          
                          setBundleForm({ ...bundleForm, ...updates })
                        }}
                        className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 disabled:opacity-50"
                      />
                      <span className="text-sm text-gray-700">
                        Bundle activo (visible para clientes)
                        {shouldDisableActiveCheckbox(bundleForm.live_from, bundleForm.live_until) && (
                          <span className="text-xs text-amber-600 ml-1">
                            {bundleForm.live_from && isDateInFuture(bundleForm.live_from) 
                              ? '(se activará automáticamente)' 
                              : bundleForm.live_until && isDateInPast(bundleForm.live_until)
                              ? '(expirado)'
                              : bundleForm.live_from || bundleForm.live_until
                              ? '(controlado por fechas)'
                              : ''}
                          </span>
                        )}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex gap-3">
                  <button
                    onClick={closeBundleModal}
                    className="flex-1 px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={saveBundle}
                    disabled={isSavingBundle}
                    className="flex-1 px-4 py-2.5 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingBundle ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-5 w-5" />
                        {editingBundle ? 'Guardar Cambios' : 'Crear Bundle'}
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  )
}
