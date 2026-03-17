"use client"

import { useEffect } from 'react'
import { useAppRouter } from '@/hooks/useAppRouter'
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { StatCards } from "@/components/dashboard/stat-cards"
import { AppointmentsTable } from "@/components/dashboard/appointments-table"
import { DoctorCards } from "@/components/dashboard/doctor-cards"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { WeeklyChart } from "@/components/dashboard/weekly-chart"
import { useAuth } from "@/contexts/auth-context"

export default function Page() {
  const router = useAppRouter()
  const { isLoading, isAuthenticated, user } = useAuth()

  useEffect(() => {
    // Si está cargando, esperar
    if (isLoading) return

    // Si no está autenticado, redirigir a login
    if (!isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isLoading, isAuthenticated, router])

  // Mostrar nada mientras se verifica la autenticación
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>
  }

  // Si no está autenticado, no renderizar nada (el useEffect lo redirigirá)
  if (!isAuthenticated) {
    return null
  }

  return (
    <DashboardShell title="Panel Principal" subtitle={`Bienvenido de vuelta, ${user?.name || 'Usuario'}`}>
      <StatCards />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <AppointmentsTable />
        </div>
        <div>
          <DoctorCards />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <WeeklyChart />
        <ActivityFeed />
      </div>
    </DashboardShell>
  )
}
