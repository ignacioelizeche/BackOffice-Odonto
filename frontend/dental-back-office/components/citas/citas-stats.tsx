"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { CalendarDays, CalendarCheck, Clock, CalendarX, Loader2 } from "lucide-react"
import { appointmentsService, type Appointment } from "@/services/appointments.service"

export function CitasStats() {
  const [stats, setStats] = useState<Array<{
    label: string
    value: string
    change: string
    icon: typeof CalendarDays
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
        const response = await appointmentsService.getAll()
        const appointments = response.data

        const today = new Date().toISOString().split("T")[0]
        const citasHoy = appointments.filter(a => a.date.startsWith(today))
        const completadas = appointments.filter(a => a.status === "completada")
        const enCurso = appointments.filter(a => a.status === "en-curso")
        const canceladas = appointments.filter(a => a.status === "cancelada")

        const pendientesDeConfirmar = citasHoy.filter(a => a.status === "pendiente").length

        const stats = [
          {
            label: "Citas Hoy",
            value: citasHoy.length.toString(),
            change: `${pendientesDeConfirmar} pendientes de confirmar`,
            icon: CalendarDays,
            iconBg: "bg-primary/10",
            iconColor: "text-primary",
          },
          {
            label: "Completadas",
            value: completadas.length.toString(),
            change: `${completadas.length > 0 ? Math.round((completadas.length / appointments.length) * 100) : 0}% del total`,
            icon: CalendarCheck,
            iconBg: "bg-accent/10",
            iconColor: "text-accent",
          },
          {
            label: "En Curso",
            value: enCurso.length.toString(),
            change: enCurso.length > 0 ? enCurso[0].doctor : "Ninguna",
            icon: Clock,
            iconBg: "bg-[hsl(43,74%,66%)]/15",
            iconColor: "text-[hsl(35,80%,40%)]",
          },
          {
            label: "Canceladas",
            value: canceladas.length.toString(),
            change: `${canceladas.length > 0 ? Math.round((canceladas.length / appointments.length) * 100) : 0}% del total`,
            icon: CalendarX,
            iconBg: "bg-destructive/10",
            iconColor: "text-destructive",
          },
        ]

        setStats(stats)
      } catch (err) {
        console.error("Error loading appointments stats:", err)
        setError("Error al cargar estadísticas de citas")
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
              <p className="text-2xl font-bold text-card-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.change}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
