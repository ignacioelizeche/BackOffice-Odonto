/**
 * API Service para gestión de configuración
 */

import { apiClient } from '@/lib/api-client'

// ============= Tipos para Clínica =============
export interface Specialty {
  name: string
}

export interface ClinicConfig {
  name: string
  rfc: string
  phone: string
  email: string
  website?: string
  licenseNumber: string
  address: string
  specialties: string[]
}

export interface UpdateClinicDTO {
  name?: string
  rfc?: string
  phone?: string
  email?: string
  website?: string
  licenseNumber?: string
  address?: string
  specialties?: string[]
}

// ============= Tipos para Horarios =============
export interface WorkDay {
  day: string
  active: boolean
  startTime: string
  endTime: string
  breakStart: string
  breakEnd: string
}

export interface ScheduleConfig {
  appointmentDuration: number
  timeBetweenAppointments: number
  maxAppointmentsPerDoctorPerDay: number
  minAdvanceBookingDays: number
  workDays: WorkDay[]
}

export interface UpdateScheduleDTO {
  appointmentDuration?: number
  timeBetweenAppointments?: number
  maxAppointmentsPerDoctorPerDay?: number
  minAdvanceBookingDays?: number
  workDays?: WorkDay[]
}

// ============= Tipos para Seguridad =============
export interface SecurityConfig {
  twoFactor: boolean
  autoLogout: boolean
  activityLog: boolean
  dataEncryption: boolean
}

export interface UpdateSecurityDTO {
  twoFactor?: boolean
  autoLogout?: boolean
  activityLog?: boolean
  dataEncryption?: boolean
}

export interface ChangePasswordDTO {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

// ============= Tipos para Facturación =============
export interface BillingConfig {
  currency: string
  taxRate: number
  invoicePrefix: string
  nextNumber: number
  autoInvoice: boolean
  paymentReminder: boolean
  summary: {
    monthlyRevenue: number
    pendingBalance: number
    overdueInvoices: number
  }
}

export interface UpdateBillingDTO {
  currency?: string
  taxRate?: number
  invoicePrefix?: string
  nextNumber?: number
  autoInvoice?: boolean
  paymentReminder?: boolean
}

// ============= Tipos para Notificaciones =============
export interface NotificationItem {
  id: string
  name: string
  description: string
  enabled: boolean
  type: 'email' | 'sms'
}

export interface EmailServer {
  smtpServer: string
  smtpPort: number
  senderEmail: string
  senderName: string
  useSSL: boolean
}

export interface NotificationsConfig {
  notifications: NotificationItem[]
  emailServer: EmailServer
}

export interface UpdateNotificationsDTO {
  notifications?: Array<{ id: string; enabled: boolean }>
  emailServer?: EmailServer
}

// ============= Tipos para Usuarios =============
export interface User {
  id: number
  name: string
  initials: string
  email: string
  role: string
  lastAccess: string
}

export interface CreateUserDTO {
  name: string
  email: string
  role: string
  password: string
}

export interface UpdateUserDTO {
  name?: string
  email?: string
  role?: string
}

/**
 * Servicio para gestionar configuraciones de la clínica
 */
export const configService = {
  // ============= Clínica =============
  /**
   * Obtiene la configuración de la clínica
   */
  async getClinicConfig(): Promise<ClinicConfig> {
    return apiClient.get<ClinicConfig>('/configuracion/clinica')
  },

  /**
   * Actualiza la configuración de la clínica
   */
  async updateClinicConfig(data: UpdateClinicDTO): Promise<{ message: string }> {
    return apiClient.put<{ message: string }>('/configuracion/clinica', data)
  },

  // ============= Horarios =============
  /**
   * Obtiene la configuración de horarios
   */
  async getScheduleConfig(): Promise<ScheduleConfig> {
    return apiClient.get<ScheduleConfig>('/configuracion/horario')
  },

  /**
   * Actualiza la configuración de horarios
   */
  async updateScheduleConfig(data: UpdateScheduleDTO): Promise<{ message: string }> {
    return apiClient.put<{ message: string }>('/configuracion/horario', data)
  },

  // ============= Seguridad =============
  /**
   * Obtiene la configuración de seguridad
   */
  async getSecurityConfig(): Promise<SecurityConfig> {
    return apiClient.get<SecurityConfig>('/configuracion/seguridad')
  },

  /**
   * Actualiza la configuración de seguridad
   */
  async updateSecurityConfig(data: UpdateSecurityDTO): Promise<{ message: string }> {
    return apiClient.put<{ message: string }>('/configuracion/seguridad', data)
  },

  /**
   * Cambia la contraseña del usuario
   */
  async changePassword(data: ChangePasswordDTO): Promise<{ message: string }> {
    return apiClient.put<{ message: string }>('/configuracion/contrasena', data)
  },

  // ============= Facturación =============
  /**
   * Obtiene la configuración de facturación
   */
  async getBillingConfig(): Promise<BillingConfig> {
    return apiClient.get<BillingConfig>('/configuracion/facturacion')
  },

  /**
   * Actualiza la configuración de facturación
   */
  async updateBillingConfig(data: UpdateBillingDTO): Promise<{ message: string }> {
    return apiClient.put<{ message: string }>('/configuracion/facturacion', data)
  },

  // ============= Notificaciones =============
  /**
   * Obtiene la configuración de notificaciones
   */
  async getNotificationsConfig(): Promise<NotificationsConfig> {
    return apiClient.get<NotificationsConfig>('/configuracion/notificaciones')
  },

  /**
   * Actualiza la configuración de notificaciones
   */
  async updateNotificationsConfig(data: UpdateNotificationsDTO): Promise<{ message: string }> {
    return apiClient.put<{ message: string }>('/configuracion/notificaciones', data)
  },

  // ============= Usuarios =============
  /**
   * Obtiene la lista de usuarios
   */
  async getUsers(): Promise<User[]> {
    const response = await apiClient.get<{ data: User[] }>('/configuracion/usuarios')
    return response.data
  },

  /**
   * Crea un nuevo usuario
   */
  async createUser(data: CreateUserDTO): Promise<User> {
    return apiClient.post<User>('/configuracion/usuarios', data)
  },

  /**
   * Actualiza un usuario existente
   */
  async updateUser(id: number, data: UpdateUserDTO): Promise<{ message: string }> {
    return apiClient.put<{ message: string }>(`/configuracion/usuarios/${id}`, data)
  },

  /**
   * Elimina un usuario
   */
  async deleteUser(id: number): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/configuracion/usuarios/${id}`)
  },

  /**
   * Sube el logo de la clínica
   */
  async uploadClinicLogo(file: File): Promise<{ logoUrl: string; message: string }> {
    const formData = new FormData()
    formData.append('file', file)
    // Don't set Content-Type header - let browser set it automatically with boundary
    return apiClient.post<{ logoUrl: string; message: string }>('/configuracion/clinica/logo', formData)
  },
}
