'use client'

import { useEffect } from 'react'
import { useAppRouter } from '@/hooks/useAppRouter'

export default function RegisterPage() {
  const router = useAppRouter()

  useEffect(() => {
    router.replace('/auth/login')
  }, [router])

  return null
}
