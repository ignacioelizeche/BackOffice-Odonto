/**
 * API Service para gestión del dashboard
 * Endpoints: GET /api/dashboard/stats
 */

import { apiClient } from '@/lib/api-client'

// ============= Tipos para Dashboard =============

export interface WeeklyChartData {
  labels: string[]
  scheduled: number[]
  completed: number[]
}

export interface RecentActivity {
  type: "appointment" | "patient" | "treatment" | "system"
  message: string
  time: string
}

export interface DashboardStats {
  todayAppointments: number
  activePatients: number
  monthlyRevenue: number
  returnRate: number
  weeklyChart: WeeklyChartData
  recentActivity: RecentActivity[]
}

/**
 * Servicio para obtener estadísticas del dashboard
 */
export const dashboardService = {
  /**
   * Obtiene las estadísticas generales para el panel principal
   * GET /api/dashboard/stats
   */
  async getStats(): Promise<DashboardStats> {
    return apiClient.get<DashboardStats>('/dashboard/stats')
  },
}
