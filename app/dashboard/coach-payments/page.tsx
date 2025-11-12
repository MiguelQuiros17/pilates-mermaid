'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CoachPaymentsRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/payments')
  }, [router])

  return null
}
