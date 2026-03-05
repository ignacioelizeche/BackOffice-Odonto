/**
 * API Service para gestión de citas
 * Endpoints: GET/POST /api/citas, GET/PUT/PATCH/DELETE /api/citas/:id
 */

import { apiClient } from '@/lib/api-client'

// ============= Tipos para Citas =============

export interface Appointment {
  id: number
  patient: string
  patientInitials: string
  patientAge: number
  patientPhone: string
  doctor: string
  doctorSpecialty: string
  treatment: string
  date: string
  time: string
  duration: string
  status: "pendiente" | "confirmada" | "completada" | "cancelada"
  notes: string
  cost: number
}

export interface AppointmentListResponse {
  data: Appointment[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface CreateAppointmentDTO {
  patientId: number
  doctorId: number
  treatment: string
  date: string
  time: string
  duration: string
  cost: number
  notes?: string
}

export interface UpdateAppointmentDTO {
  patientId?: number
  doctorId?: number
  treatment?: string
  date?: string
  time?: string
  duration?: string
  cost?: number
  status?: "pendiente" | "confirmada" | "completada" | "cancelada"
  notes?: string
}

export interface UpdateAppointmentStatusDTO {
  status: "pendiente" | "confirmada" | "completada" | "cancelada"
}

// ============= Tipos para Disponibilidad =============

export interface AvailableSlot {
  time: string
  available: boolean
  reason?: string
}

export interface DoctorAvailability {
  date: string
  day: string
  availableSlots: AvailableSlot[]
  doctorSchedule?: {
    day: string
    active: boolean
    startTime: string
    endTime: string
    breakStart?: string
    breakEnd?: string
  }
}

export interface ValidateAvailabilityRequest {
  doctorId: number
  date: string
  time: string
  duration: string
}

export interface ValidateAvailabilityResponse {
  available: boolean
  reason?: string
}

/**
 * Servicio para gestionar citas
 */
export const appointmentsService = {
  /**
   * Obtiene lista de citas con filtros
   * GET /api/citas?date=2026-02-12&status=confirmada&doctor=Dr. Carlos Mendez&search=maria&page=1&limit=10
   */
  async getAll(filters?: {
    date?: string
    status?: string
    doctor?: string
    search?: string
    page?: number
    limit?: number
  }): Promise<AppointmentListResponse> {
    const params = new URLSearchParams()
    if (filters?.date) params.append('date', filters.date)
    if (filters?.status) params.append('status', filters.status)
    if (filters?.doctor) params.append('doctor', filters.doctor)
    if (filters?.search) params.append('search', filters.search)
    if (filters?.page) params.append('page', filters.page.toString())
    if (filters?.limit) params.append('limit', filters.limit.toString())

    const queryString = params.toString()
    return apiClient.get<AppointmentListResponse>(`/citas${queryString ? '?' + queryString : ''}`)
  },

  /**
   * Obtiene el detalle de una cita
   * GET /api/citas/:id
   */
  async getById(id: number): Promise<Appointment> {
    return apiClient.get<Appointment>(`/citas/${id}`)
  },

  /**
   * Crea una nueva cita
   * POST /api/citas
   */
  async create(data: CreateAppointmentDTO): Promise<{ id: number; status: string; message: string }> {
    return apiClient.post<{ id: number; status: string; message: string }>('/citas', data)
  },

  /**
   * Edita una cita existente
   * PUT /api/citas/:id
   */
  async update(id: number, data: UpdateAppointmentDTO): Promise<{ id: number; message: string }> {
    return apiClient.put<{ id: number; message: string }>(`/citas/${id}`, data)
  },

  /**
   * Cambia solo el estado de una cita
   * PATCH /api/citas/:id/estado
   */
  async updateStatus(
    id: number,
    status: "pendiente" | "confirmada" | "completada" | "cancelada"
  ): Promise<{ id: number; status: string; message: string }> {
    return apiClient.patch<{ id: number; status: string; message: string }>(`/citas/${id}/estado`, {
      status,
    })
  },

  /**
   * Elimina una cita
   * DELETE /api/citas/:id
   */
  async delete(id: number): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/citas/${id}`)
  },

  // ============= Métodos de Disponibilidad =============

  /**
   * Obtiene los horarios disponibles para un doctor en una fecha específica
   * GET /api/citas/disponibilidad/:doctorId?date=YYYY-MM-DD
   */
  async getAvailableSlots(doctorId: number, date: string): Promise<DoctorAvailability> {
    return apiClient.get<DoctorAvailability>(`/citas/disponibilidad/${doctorId}?date=${date}`)
  },

  /**
   * Valida si un horario está disponible para un doctor
   * POST /api/citas/validar-disponibilidad
   */
  async validateAvailability(request: ValidateAvailabilityRequest): Promise<ValidateAvailabilityResponse> {
    return apiClient.post<ValidateAvailabilityResponse>('/citas/validar-disponibilidad', request)
  },

  /**
   * Obtiene el horario semanal completo de un doctor
   * GET /api/citas/doctores/:doctorId/horario-semana
   */
  async getDoctorWeeklySchedule(doctorId: number): Promise<any> {
    return apiClient.get(`/citas/doctores/${doctorId}/horario-semana`)
  },
}
