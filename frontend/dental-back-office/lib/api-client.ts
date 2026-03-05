/**
 * API Client - Cliente base para hacer peticiones HTTP al backend
 */

// Obtener la URL de la API desde variables de entorno o construirla
function getApiUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  
  if (apiUrl) {
    console.log('[API Client] Using NEXT_PUBLIC_API_URL:', apiUrl)
    return apiUrl
  }
  
  // Fallback: construir desde la ubicación actual en el navegador
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol
    const host = window.location.hostname
    const fallbackUrl = `${protocol}//${host}:8000/api`
    console.log('[API Client] Using fallback URL:', fallbackUrl)
    return fallbackUrl
  }
  
  // Fallback final para server-side
  console.log('[API Client] Using localhost fallback')
  return 'http://localhost:8000/api'
}

// No se define como constante - se resolverá en tiempo de ejecución

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Cliente HTTP base con manejo de errores y autenticación
 */
export const apiClient = {
  /**
   * Realiza una petición GET
   */
  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  },

  /**
   * Realiza una petición POST
   */
  async post<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data
        ? (data instanceof FormData ? data : JSON.stringify(data))
        : undefined,
    })
  },

  /**
   * Realiza una petición PUT
   */
  async put<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data
        ? (data instanceof FormData ? data : JSON.stringify(data))
        : undefined,
    })
  },

  /**
   * Realiza una petición DELETE
   */
  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  },

  /**
   * Realiza una petición PATCH
   */
  async patch<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data
        ? (data instanceof FormData ? data : JSON.stringify(data))
        : undefined,
    })
  },

  /**
   * Método base para realizar peticiones HTTP
   */
  async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    // Obtener la URL del API en tiempo de ejecución
    const API_URL = getApiUrl()
    const url = `${API_URL}${endpoint}`

    console.log(`[API Client] ${options?.method || 'GET'} ${url}`)

    // Headers por defecto - No establecer Content-Type si el body es FormData
    const headers = new Headers(options?.headers)

    // Solo agregar Content-Type si no es FormData
    if (!(options?.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json')
    }

    // Agregar token de autenticación si está disponible
    if (typeof window !== 'undefined') {
      const token = sessionStorage.getItem('authToken')
      if (token) {
        headers.set('Authorization', `Bearer ${token}`)
        console.log('[API Client] Token found, adding Authorization header')
      } else {
        console.log('[API Client] No token found in sessionStorage')
      }
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      // Si la respuesta no es OK, lanzar error
      if (!response.ok) {
        let errorMessage = `Error ${response.status}: ${response.statusText}`
        let errorData = null

        try {
          errorData = await response.json()
          errorMessage = errorData.message || errorData.error || errorMessage
        } catch {
          // Si no se puede parsear JSON, usar el mensaje por defecto
        }

        throw new ApiError(errorMessage, response.status, errorData)
      }

      // Si no hay contenido, retornar objeto vacío
      if (response.status === 204) {
        return {} as T
      }

      // Parsear respuesta JSON
      const data = await response.json()
      return data as T
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }

      // Error de red o timeout
      throw new ApiError(
        error instanceof Error ? error.message : 'Error de conexión con el servidor'
      )
    }
  },
}
