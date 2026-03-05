/**
 * API Service para gestión de notificaciones
 * Endpoints: GET /api/notificaciones, PUT /api/notificaciones/:id/read, DELETE /api/notificaciones/:id
 */

import { apiClient } from '@/lib/api-client'

// ============= Tipos para Notificaciones =============

export type NotificationType =
  | 'appointment_scheduled'
  | 'new_patient_assigned'
  | 'appointment_reminder_30m'
  | 'appointment_started'
  | 'appointment_completed'
  | 'appointment_cancelled'

export interface Notificacion {
  id: number
  type: NotificationType
  title: string
  message: string
  read: boolean
  read_at?: string | null
  created_at: string
  patient_id?: number | null
  appointment_id?: number | null
  doctor_id?: number | null
}

export interface NotificacionesListResponse {
  data: Notificacion[]
  unread_count: number
}

export interface DesdeTime {
  value: number
  unit: 'minutos' | 'horas' | 'días'
  label: string
}

/**
 * Servicio para gestionar notificaciones
 */
export const notificationsService = {
  /**
   * Obtiene todas las notificaciones del usuario
   * GET /api/notificaciones
   */
  async getNotifications(): Promise<NotificacionesListResponse> {
    return apiClient.get<NotificacionesListResponse>('/notificaciones')
  },

  /**
   * Obtiene una notificación específica
   * GET /api/notificaciones/:id
   */
  async getById(id: number): Promise<Notificacion> {
    return apiClient.get<Notificacion>(`/notificaciones/${id}`)
  },

  /**
   * Marca una notificación como leída
   * PUT /api/notificaciones/:id/read
   */
  async markAsRead(id: number): Promise<{ id: number; read: boolean }> {
    return apiClient.put<{ id: number; read: boolean }>(`/notificaciones/${id}/read`, {})
  },

  /**
   * Marca todas las notificaciones como leídas
   * PUT /api/notificaciones/mark-all-read
   */
  async markAllAsRead(): Promise<{ message: string }> {
    return apiClient.put<{ message: string }>('/notificaciones/mark-all-read', {})
  },

  /**
   * Elimina una notificación
   * DELETE /api/notificaciones/:id
   */
  async delete(id: number): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/notificaciones/${id}`)
  },

  /**
   * Calcula tiempo relativo desde un timestamp
   */
  getRelativeTime(createdAt: string): DesdeTime {
    const now = new Date()
    // Ensure we parse as UTC
    const created = new Date(createdAt)

    // If the timestamp doesn't have timezone info, treat as UTC
    if (!createdAt.includes('Z') && !createdAt.includes('+') && !createdAt.includes('-')) {
      created.setTime(created.getTime() + created.getTimezoneOffset() * 60000)
    }

    const diffMs = now.getTime() - created.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMinutes < 1) {
      return { value: 0, unit: 'minutos', label: 'hace un momento' }
    } else if (diffMinutes < 60) {
      return {
        value: diffMinutes,
        unit: 'minutos',
        label: `hace ${diffMinutes} ${diffMinutes === 1 ? 'minuto' : 'minutos'}`,
      }
    } else if (diffHours < 24) {
      return {
        value: diffHours,
        unit: 'horas',
        label: `hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`,
      }
    } else {
      return {
        value: diffDays,
        unit: 'días',
        label: `hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`,
      }
    }
  },

  /**
   * Obtiene el icono según el tipo de notificación
   */
  getIconForType(type: NotificationType): string {
    const icons: Record<NotificationType, string> = {
      appointment_scheduled: '📅',
      new_patient_assigned: '👤',
      appointment_reminder_30m: '⏰',
      appointment_started: '▶️',
      appointment_completed: '✅',
      appointment_cancelled: '❌',
    }
    return icons[type] || '📢'
  },

  /**
   * Obtiene el color según el tipo de notificación
   */
  getColorForType(type: NotificationType): string {
    const colors: Record<NotificationType, string> = {
      appointment_scheduled: 'bg-blue-50 border-blue-200',
      new_patient_assigned: 'bg-purple-50 border-purple-200',
      appointment_reminder_30m: 'bg-yellow-50 border-yellow-200',
      appointment_started: 'bg-green-50 border-green-200',
      appointment_completed: 'bg-teal-50 border-teal-200',
      appointment_cancelled: 'bg-red-50 border-red-200',
    }
    return colors[type] || 'bg-gray-50 border-gray-200'
  },

  /**
   * Obtiene el color del texto según el tipo de notificación
   */
  getTextColorForType(type: NotificationType): string {
    const colors: Record<NotificationType, string> = {
      appointment_scheduled: 'text-blue-900',
      new_patient_assigned: 'text-purple-900',
      appointment_reminder_30m: 'text-yellow-900',
      appointment_started: 'text-green-900',
      appointment_completed: 'text-teal-900',
      appointment_cancelled: 'text-red-900',
    }
    return colors[type] || 'text-gray-900'
  },
}
