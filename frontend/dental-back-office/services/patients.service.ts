/**
 * API Service para gestión de pacientes
 * Endpoints: GET/POST /api/pacientes, GET/PUT/DELETE /api/pacientes/:id
 */

import { apiClient } from '@/lib/api-client'

// ============= Tipos para Pacientes =============

export interface Tooth {
  number: number
  name: string
  status: "sano" | "tratado" | "en_tratamiento" | "extraccion" | "pendiente"
  records: TreatmentRecord[]
}

export interface TreatmentRecord {
  id: number
  date: string
  treatment: string
  doctor: string
  notes: string
  cost: number
  attachments?: Attachment[]
}

export interface Attachment {
  id: number
  name: string
  size: string
  type?: string
  downloadUrl?: string
}

export interface Patient {
  id: number
  name: string
  initials: string
  email: string
  phone: string
  age: number
  gender: "Masculino" | "Femenino"
  lastVisit: string
  nextAppt: string | null
  doctor: string
  status: "activo" | "inactivo" | "nuevo"
  treatments: string[]
  totalVisits: number
  balance: number
  teeth?: Tooth[]
}

export interface PatientListResponse {
  data: Patient[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface CreatePatientDTO {
  name: string
  email: string
  phone: string
  age: number
  gender: "Masculino" | "Femenino"
  doctor: string
}

export interface UpdatePatientDTO {
  name?: string
  email?: string
  phone?: string
  age?: number
  gender?: "Masculino" | "Femenino"
  doctor?: string
  status?: "activo" | "inactivo" | "nuevo"
}

export interface AddDentalRecordDTO {
  treatment: string
  doctor: string
  notes?: string
  cost: number
  files?: File[]
}

export interface AddDentalRecordResponse {
  id: number
  toothNumber: number
  date: string
  toothNewStatus: string
  attachments?: Attachment[]
  message: string
}

/**
 * Servicio para gestionar pacientes
 */
export const patientsService = {
  /**
   * Obtiene todos los pacientes con filtros opcionales
   * GET /api/pacientes?search=maria&status=activo&doctor=Dr. Carlos Mendez&page=1&limit=10
   */
  async getAll(filters?: {
    search?: string
    status?: string
    doctor?: string
    page?: number
    limit?: number
  }): Promise<PatientListResponse> {
    const params = new URLSearchParams()
    if (filters?.search) params.append('search', filters.search)
    if (filters?.status) params.append('status', filters.status)
    if (filters?.doctor) params.append('doctor', filters.doctor)
    if (filters?.page) params.append('page', filters.page.toString())
    if (filters?.limit) params.append('limit', filters.limit.toString())

    const queryString = params.toString()
    return apiClient.get<PatientListResponse>(`/pacientes${queryString ? '?' + queryString : ''}`)
  },

  /**
   * Obtiene el detalle completo de un paciente incluyendo odontograma
   * GET /api/pacientes/:id
   */
  async getById(id: number): Promise<Patient> {
    return apiClient.get<Patient>(`/pacientes/${id}`)
  },

  /**
   * Crea un nuevo paciente
   * POST /api/pacientes
   */
  async create(data: CreatePatientDTO): Promise<Patient & { message: string }> {
    return apiClient.post<Patient & { message: string }>('/pacientes', data)
  },

  /**
   * Actualiza datos de un paciente
   * PUT /api/pacientes/:id
   */
  async update(id: number, data: UpdatePatientDTO): Promise<{ id: number; message: string }> {
    return apiClient.put<{ id: number; message: string }>(`/pacientes/${id}`, data)
  },

  /**
   * Elimina un paciente
   * DELETE /api/pacientes/:id
   */
  async delete(id: number): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/pacientes/${id}`)
  },

  /**
   * Agrega un registro dental a un diente específico
   * POST /api/pacientes/:id/dientes/:toothNumber/registros
   */
  async addDentalRecord(
    patientId: number,
    toothNumber: number,
    data: AddDentalRecordDTO
  ): Promise<AddDentalRecordResponse> {
    const formData = new FormData()
    formData.append('treatment', data.treatment)
    formData.append('doctor', data.doctor)
    if (data.notes) formData.append('notes', data.notes)
    formData.append('cost', data.cost.toString())

    if (data.files && data.files.length > 0) {
      data.files.forEach((file) => {
        formData.append('files', file)
      })
    }

    return apiClient.post<AddDentalRecordResponse>(
      `/pacientes/${patientId}/dientes/${toothNumber}/registros`,
      formData
    )
  },
}
