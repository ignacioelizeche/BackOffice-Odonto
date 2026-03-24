/**
 * API Service para gestión de doctores
 * Endpoints: GET /api/doctores, GET /api/doctores/:id, PUT /api/doctores/:id/horario
 */

import { apiClient } from '@/lib/api-client'

// ============= Tipos para Doctores =============

export interface WorkDay {
  day: string
  active: boolean
  startTime: string
  endTime: string
  breakStart: string
  breakEnd: string
}

export interface ScheduleSlot {
  time: string
  patient: string | null
  treatment: string | null
  status: "ocupado" | "libre" | "descanso"
}

export interface Appointment {
  time: string
  patient: string
  treatment: string
}

export interface Doctor {
  id: number
  name: string
  initials: string
  email: string
  phone: string
  specialty: string
  licenseNumber: string
  status: "disponible" | "en-consulta" | "no-disponible"
  color?: string
  patientsToday: number
  patientsTotal: number
  rating: number
  reviewCount: number
  yearsExperience: number
  schedule?: ScheduleSlot[]
  nextAppointments?: Appointment[]
  workSchedule?: WorkDay[]
  preferredSlotDuration?: number  // Duración preferida en minutos
  minimumSlotDuration?: number    // Duración mínima en minutos
  monthlyStats?: {
    completed: number
    cancelled: number
    revenue: number
  }
}

export interface DoctorListResponse {
  data: Doctor[]
}

export interface CreateDoctorDTO {
  name: string
  email: string
  phone: string
  specialty: string
  licenseNumber: string
  yearsExperience: number
  workSchedule: WorkDay[]
  preferredSlotDuration?: number  // Duración preferida en minutos
  minimumSlotDuration?: number    // Duración mínima en minutos
}

export interface UpdateDoctorScheduleDTO {
  workSchedule: WorkDay[]
}

export interface UpdateDoctorStatusDTO {
  status: "disponible" | "en-consulta" | "no-disponible"
}

export interface UpdateDoctorStatusResponse {
  id: number
  status: string
  message: string
}

// ============= Tipos para Slot Duration =============

export interface UpdateSlotDurationDTO {
  preferredSlotDuration: number
  minimumSlotDuration: number
}

export interface SlotDurationResponse {
  id: number
  preferredSlotDuration: number
  minimumSlotDuration: number
  message: string
}

// ============= Tipos para Custom Availability =============

export interface CustomAvailability {
  id?: number
  doctorId: number
  date: string  // YYYY-MM-DD format
  available: boolean
  startTime?: string  // HH:MM format
  endTime?: string    // HH:MM format
  breakStart?: string // HH:MM format
  breakEnd?: string   // HH:MM format
  notes?: string
}

export interface CustomAvailabilityResponse {
  data: CustomAvailability[]
}

export interface CreateCustomAvailabilityDTO {
  date: string
  available: boolean
  start_time?: string
  end_time?: string
  break_start?: string
  break_end?: string
  notes?: string
}

/**
 * Servicio para gestionar doctores
 */
export const doctorsService = {
  /**
   * Obtiene todos los doctores
   * GET /api/doctores
   */
  async getAll(): Promise<DoctorListResponse> {
    return apiClient.get<DoctorListResponse>('/doctores')
  },

  /**
   * Obtiene un doctor por ID con agenda, horario y estadísticas
   * GET /api/doctores/:id
   */
  async getById(id: number): Promise<Doctor> {
    return apiClient.get<Doctor>(`/doctores/${id}`)
  },

  /**
   * Crea un nuevo doctor
   * POST /api/doctores
   */
  async create(data: CreateDoctorDTO): Promise<Doctor> {
    return apiClient.post<Doctor>('/doctores', data)
  },

  /**
   * Actualiza el horario de trabajo de un doctor
   * PUT /api/doctores/:id/horario
   */
  async updateWorkSchedule(
    id: number,
    schedule: WorkDay[]
  ): Promise<{ id: number; message: string }> {
    return apiClient.put<{ id: number; message: string }>(`/doctores/${id}/horario`, {
      workSchedule: schedule,
    })
  },

  /**
   * Actualiza el estado del doctor (disponible, en-consulta, no-disponible)
   * PUT /api/doctores/:id/status
   */
  async updateStatus(
    id: number,
    status: "disponible" | "en-consulta" | "no-disponible"
  ): Promise<UpdateDoctorStatusResponse> {
    return apiClient.put<UpdateDoctorStatusResponse>(`/doctores/${id}/status`, {
      status,
    })
  },

  // ============= Métodos para Slot Duration =============

  /**
   * Actualiza la duración preferida y mínima de turnos de un doctor
   * PUT /api/doctores/:id/slot-duration
   */
  async updateSlotDuration(
    id: number,
    preferredSlotDuration: number,
    minimumSlotDuration: number
  ): Promise<SlotDurationResponse> {
    return apiClient.put<SlotDurationResponse>(`/doctores/${id}/slot-duration`, {
      preferred_slot_duration: preferredSlotDuration,
      minimum_slot_duration: minimumSlotDuration,
    })
  },

  // ============= Métodos para Custom Availability =============

  /**
   * Obtiene la disponibilidad personalizada de un doctor para un rango de fechas
   * GET /api/doctores/:id/availability/custom?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
   */
  async getCustomAvailability(
    id: number,
    startDate?: string,
    endDate?: string
  ): Promise<CustomAvailabilityResponse> {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)

    const query = params.toString() ? `?${params.toString()}` : ''
    return apiClient.get<CustomAvailabilityResponse>(`/doctores/${id}/availability/custom${query}`)
  },

  /**
   * Crea nueva disponibilidad personalizada para una fecha específica
   * POST /api/doctores/:id/availability/custom
   */
  async createCustomAvailability(
    id: number,
    availability: CreateCustomAvailabilityDTO
  ): Promise<CustomAvailability> {
    return apiClient.post<CustomAvailability>(`/doctores/${id}/availability/custom`, availability)
  },

  /**
   * Actualiza disponibilidad personalizada para una fecha específica
   * PUT /api/doctores/:id/availability/custom/:date
   */
  async updateCustomAvailability(
    id: number,
    date: string,
    availability: Omit<CreateCustomAvailabilityDTO, 'date'>
  ): Promise<CustomAvailability> {
    return apiClient.put<CustomAvailability>(`/doctores/${id}/availability/custom/${date}`, availability)
  },

  /**
   * Elimina disponibilidad personalizada para una fecha específica
   * DELETE /api/doctores/:id/availability/custom/:date
   */
  async deleteCustomAvailability(
    id: number,
    date: string
  ): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/doctores/${id}/availability/custom/${date}`)
  },
}
