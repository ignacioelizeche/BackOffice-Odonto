'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { authService, type AuthUser } from '@/services/auth.service'

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Verificar si hay usuario almacenado en localStorage
    const storedUser = authService.getStoredUser()
    const token = authService.getToken()

    if (storedUser && token) {
      setUser(storedUser)
    }

    setIsLoading(false)
  }, [])

  const logout = () => {
    authService.clearToken()
    setUser(null)
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user && !!authService.getToken(),
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider')
  }
  return context
}
