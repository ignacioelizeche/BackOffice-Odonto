/**
 * API Service para autenticación
 * Endpoints: POST /api/auth/login, POST /api/auth/register
 */

import { apiClient } from '@/lib/api-client'

// ============= Tipos para Autenticación =============

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: {
    id: number
    email: string
    name: string
    role: string
  }
}

export interface RegisterRequest {
  email: string
  name: string
  password: string
  role: string
}

export interface RegisterResponse {
  id: number
  email: string
  name: string
  role: string
}

export interface AuthUser {
  id: number
  email: string
  name: string
  role: string
}

export interface AuthState {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
}

/**
 * Servicio para autenticación
 */
export const authService = {
  /**
   * Login user
   * POST /api/auth/login
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>('/auth/login', credentials)
  },

  /**
   * Register new user
   * POST /api/auth/register
   */
  async register(credentials: RegisterRequest): Promise<RegisterResponse> {
    return apiClient.post<RegisterResponse>('/auth/register', credentials)
  },

  /**
   * Get stored token from sessionStorage
   */
  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('authToken')
    }
    return null
  },

  /**
   * Save token to sessionStorage and cookies
   */
  saveToken(token: string): void {
    if (typeof window !== 'undefined') {
      // Guardar en sessionStorage (para el cliente)
      sessionStorage.setItem('authToken', token)
      // Guardar en cookies (para el middleware del servidor)
      const secure = window.location.protocol === 'https:' ? '; Secure' : ''
      document.cookie = `authToken=${token}; path=/; SameSite=Lax${secure}`
    }
  },

  /**
   * Remove token from sessionStorage and cookies
   */
  clearToken(): void {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('authToken')
      sessionStorage.removeItem('authUser')
      // Limpiar cookies también
      document.cookie = 'authToken=; path=/; max-age=0'
    }
  },

  /**
   * Get stored user from sessionStorage
   */
  getStoredUser(): AuthUser | null {
    if (typeof window !== 'undefined') {
      const userStr = sessionStorage.getItem('authUser')
      if (userStr) {
        try {
          return JSON.parse(userStr)
        } catch {
          return null
        }
      }
    }
    return null
  },

  /**
   * Save user to sessionStorage
   */
  saveUser(user: AuthUser): void {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('authUser', JSON.stringify(user))
    }
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.getToken() !== null
  },
}
