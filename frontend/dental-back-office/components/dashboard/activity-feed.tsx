"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarCheck, UserPlus, FileText, CreditCard, Loader2 } from "lucide-react"
import { dashboardService, type RecentActivity } from "@/services/dashboard.service"

interface Activity extends RecentActivity {
  icon: typeof CalendarCheck
  iconBg: string
  iconColor: string
}

export function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadActivities = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await dashboardService.getStats()

        const iconMap: Record<string, typeof CalendarCheck> = {
          appointment: CalendarCheck,
          patient: UserPlus,
          treatment: FileText,
          system: CreditCard,
        }

        const bgMap: Record<string, string> = {
          appointment: "bg-primary/10",
          patient: "bg-accent/10",
          treatment: "bg-[hsl(215,25%,20%)]/10",
          system: "bg-accent/10",
        }

        const colorMap: Record<string, string> = {
          appointment: "text-primary",
          patient: "text-accent",
          treatment: "text-foreground",
          system: "text-accent",
        }

        const activitiesWithIcons = data.recentActivity.map((activity) => ({
          ...activity,
          icon: iconMap[activity.type] || CalendarCheck,
          iconBg: bgMap[activity.type] || "bg-primary/10",
          iconColor: colorMap[activity.type] || "text-primary",
        }))

        setActivities(activitiesWithIcons)
      } catch (err) {
        console.error("Error loading activities:", err)
        setError("Error al cargar actividades")
      } finally {
        setLoading(false)
      }
    }

    loadActivities()
  }, [])

  if (loading) {
    return (
      <Card className="border-border/50 shadow-sm">
        <CardContent className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-border/50 shadow-sm">
        <CardContent className="py-12 text-center text-red-500">
          <p>{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-card-foreground">Actividad Reciente</CardTitle>
        <p className="text-sm text-muted-foreground">Ultimas actualizaciones</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {activities.length === 0 ? (
          <div className="text-center text-muted-foreground py-6">
            <p>Sin actividad reciente</p>
          </div>
        ) : (
          activities.map((activity, index) => (
            <div key={index} className="flex items-start gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-muted/50">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${activity.iconBg}`}>
                <activity.icon className={`h-4 w-4 ${activity.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-card-foreground">{activity.message}</p>
                <p className="text-xs text-muted-foreground">{activity.time}</p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
