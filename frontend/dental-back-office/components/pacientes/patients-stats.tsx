"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Users, UserPlus, UserCheck, UserX, Loader2 } from "lucide-react"
import { patientsService } from "@/services/patients.service"

interface StatData {
  label: string
  value: string | number
  change: string
  icon: any
  iconBg: string
  iconColor: string
}

export function PatientsStats() {
  const [stats, setStats] = useState<StatData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true)
        const response = await patientsService.getAll()
        const patients = response.data

        const total = patients.length
        const active = patients.filter(p => p.status === "activo").length
        const inactive = patients.filter(p => p.status === "inactivo").length
        const newPatients = patients.filter(p => p.status === "nuevo").length
        const activePercentage = total > 0 ? ((active / total) * 100).toFixed(1) : 0

        setStats([
          {
            label: "Total Pacientes",
            value: total,
            change: `${newPatients} nuevos`,
            icon: Users,
            iconBg: "bg-primary/10",
            iconColor: "text-primary",
          },
          {
            label: "Pacientes Nuevos",
            value: newPatients,
            change: `${total > 0 ? ((newPatients / total) * 100).toFixed(1) : 0}% del total`,
            icon: UserPlus,
            iconBg: "bg-accent/10",
            iconColor: "text-accent",
          },
          {
            label: "Pacientes Activos",
            value: active,
            change: `${activePercentage}% del total`,
            icon: UserCheck,
            iconBg: "bg-primary/10",
            iconColor: "text-primary",
          },
          {
            label: "Pacientes Inactivos",
            value: inactive,
            change: `${total > 0 ? ((inactive / total) * 100).toFixed(1) : 0}% del total`,
            icon: UserX,
            iconBg: "bg-muted",
            iconColor: "text-muted-foreground",
          },
        ])
      } catch (err) {
        console.error("Error loading stats:", err)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array(4).fill(0).map((_, i) => (
          <Card key={i} className="border-border/50 shadow-sm">
            <CardContent className="flex items-center justify-center gap-4 p-5">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </CardContent>
          </Card>
        ))}
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
