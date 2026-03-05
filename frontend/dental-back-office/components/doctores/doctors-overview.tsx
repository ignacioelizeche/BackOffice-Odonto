'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { UserCog, Stethoscope, CalendarCheck, DollarSign } from "lucide-react"
import { apiClient } from '@/lib/api-client'

interface DoctorStats {
  totalDoctors: number
  specialties: number
  completedAppointments: number
  monthlyRevenue: number
}

export function DoctorsOverview() {
  const [stats, setStats] = useState<DoctorStats>({
    totalDoctors: 0,
    specialties: 0,
    completedAppointments: 0,
    monthlyRevenue: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true)
        // Cargar doctores
        const doctorsResponse = await apiClient.get<{ data: any[] }>('/doctores')
        const doctors = doctorsResponse.data || []

        // Cargar citas
        const citasResponse = await apiClient.get<{ data: any[] }>('/citas')
        const citas = citasResponse.data || []

        // Calcular estadísticas
        const totalDoctors = doctors.length
        const specialties = new Set(doctors.map(d => d.specialty)).size
        const completedAppointments = citas.filter(c => c.status === 'completada').length
        const monthlyRevenue = citas
          .filter(c => new Date(c.date).getMonth() === new Date().getMonth())
          .reduce((sum, c) => sum + (c.cost || 0), 0)

        setStats({
          totalDoctors,
          specialties: specialties || 0,
          completedAppointments,
          monthlyRevenue,
        })
      } catch (error) {
        console.error('Error loading doctor stats:', error)
        // Mantener valores por defecto en caso de error
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [])

  const statsConfig = [
    {
      label: "Total Doctores",
      value: stats.totalDoctors.toString(),
      subtitle: "Equipo activo",
      icon: UserCog,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      label: "Especialidades",
      value: stats.specialties.toString(),
      subtitle: "Areas de atencion",
      icon: Stethoscope,
      iconBg: "bg-accent/10",
      iconColor: "text-accent",
    },
    {
      label: "Citas Completadas",
      value: stats.completedAppointments.toString(),
      subtitle: "Este mes",
      icon: CalendarCheck,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      label: "Ingresos del Equipo",
      value: `$${stats.monthlyRevenue.toFixed(2)}`,
      subtitle: "Este mes",
      icon: DollarSign,
      iconBg: "bg-accent/10",
      iconColor: "text-accent",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {statsConfig.map((stat) => (
        <Card key={stat.label} className="border-border/50 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${stat.iconBg}`}>
              <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold text-card-foreground">
                {loading ? '-' : stat.value}
              </p>
              <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
