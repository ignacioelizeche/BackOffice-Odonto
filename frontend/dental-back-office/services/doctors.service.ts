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

export interface Doctor {
  id: number
  name: string
  initials: string
  email: string
  phone: string
  specialty: string
  licenseNumber: string
  status: "disponible" | "en-consulta" | "no-disponible"
  patientsToday: number
  patientsTotal: number
  rating: number
  reviewCount: number
  yearsExperience: number
  schedule?: ScheduleSlot[]
  workSchedule?: WorkDay[]
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
}
