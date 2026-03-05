"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import {
  CalendarCheck,
  Users,
  DollarSign,
  TrendingUp,
  Loader2,
} from "lucide-react"
import { dashboardService } from "@/services/dashboard.service"

export function StatCards() {
  const [stats, setStats] = useState<Array<{
    label: string
    value: string
    change: string
    icon: typeof CalendarCheck
    iconBg: string
    iconColor: string
  }> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await dashboardService.getStats()

        const stats = [
          {
            label: "Citas Hoy",
            value: data.todayAppointments.toString(),
            change: "+0%",
            icon: CalendarCheck,
            iconBg: "bg-primary/10",
            iconColor: "text-primary",
          },
          {
            label: "Pacientes Activos",
            value: data.activePatients.toString(),
            change: "+0%",
            icon: Users,
            iconBg: "bg-accent/10",
            iconColor: "text-accent",
          },
          {
            label: "Ingresos del Mes",
            value: `$${(data.monthlyRevenue / 1000).toFixed(0)}k`,
            change: "+0%",
            icon: DollarSign,
            iconBg: "bg-[hsl(168,72%,42%)]/10",
            iconColor: "text-accent",
          },
          {
            label: "Tasa de Retorno",
            value: `${data.returnRate}%`,
            change: "+0%",
            icon: TrendingUp,
            iconBg: "bg-primary/10",
            iconColor: "text-primary",
          },
        ]

        setStats(stats)
      } catch (err) {
        console.error("Error loading dashboard stats:", err)
        setError("Error al cargar estadísticas del dashboard")
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="text-center text-red-500 py-8">
        <p>{error || "Error al cargar estadísticas"}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-border/50 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${stat.iconBg}`}>
              <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-card-foreground">{stat.value}</p>
                <span className="text-xs font-medium text-accent">{stat.change}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
