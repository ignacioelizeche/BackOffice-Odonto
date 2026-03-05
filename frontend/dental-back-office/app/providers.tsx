'use client'

import { AuthProvider } from '@/contexts/auth-context'
import { NotificationsProvider } from '@/contexts/notifications-context'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NotificationsProvider>{children}</NotificationsProvider>
    </AuthProvider>
  )
}
