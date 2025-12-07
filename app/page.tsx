'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useTranslation } from '@/hooks/useTranslation'

export default function HomePage() {
  const router = useRouter()
  const { t } = useTranslation()
  
  useEffect(() => {
    // Redirect logic
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token')
      const target = token ? '/dashboard' : '/login'
      
      // Use Next.js router for reliable redirects in production
      // Redirect after short delay to show loading state
      const timer = setTimeout(() => {
        router.push(target)
      }, 300)

      return () => clearTimeout(timer)
    }
  }, [router])

  // Render visible content with logo and animated spinner
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f9fafb',
      margin: 0,
      padding: 0,
      fontFamily: 'system-ui, -apple-system, Arial, sans-serif'
    }}>
      <div style={{
        textAlign: 'center',
        padding: '60px 40px',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        minWidth: '360px',
        maxWidth: '420px'
      }}>
        {/* Logo */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: '32px'
        }}>
          <div style={{
            position: 'relative',
            width: '160px',
            height: '160px'
          }}>
            <Image 
              src="/Logo.png" 
              alt="Pilates Mermaid Logo" 
              fill
              className="object-contain"
              priority
              unoptimized
            />
          </div>
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: '28px',
          fontWeight: 'bold',
          color: '#111827',
          margin: '0 0 12px 0',
          padding: 0,
          lineHeight: '1.2'
        }}>
          Pilates Mermaid
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: '16px',
          color: '#6b7280',
          margin: '0 0 32px 0',
          padding: 0
        }}>
          {t('home.redirecting')}
        </p>

        {/* Animated Spinner */}
        <div 
          className="spinner"
          style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #111827',
            borderRadius: '50%',
            margin: '0 auto',
            display: 'block',
            animation: 'spin 1s linear infinite'
          }}
        ></div>
      </div>
    </div>
  )
}
