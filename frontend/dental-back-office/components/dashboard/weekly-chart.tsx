"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Loader2 } from "lucide-react"
import { dashboardService } from "@/services/dashboard.service"

interface ChartData {
  day: string
  citas: number
  completadas: number
}

export function WeeklyChart() {
  const [data, setData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadChartData = async () => {
      try {
        setLoading(true)
        setError(null)
        const stats = await dashboardService.getStats()

        const chartData = stats.weeklyChart.labels.map((label, index) => ({
          day: label,
          citas: stats.weeklyChart.scheduled[index] || 0,
          completadas: stats.weeklyChart.completed[index] || 0,
        }))

        setData(chartData)
      } catch (err) {
        console.error("Error loading chart data:", err)
        setError("Error al cargar datos del gráfico")
      } finally {
        setLoading(false)
      }
    }

    loadChartData()
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
        <CardTitle className="text-lg font-semibold text-card-foreground">Citas de la Semana</CardTitle>
        <p className="text-sm text-muted-foreground">Programadas vs. completadas</p>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 18%, 89%)" vertical={false} />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(215, 12%, 50%)", fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(215, 12%, 50%)", fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(0, 0%, 100%)",
                  border: "1px solid hsl(214, 18%, 89%)",
                  borderRadius: "8px",
                  fontSize: "13px",
                  color: "hsl(215, 25%, 12%)",
                }}
                labelStyle={{ fontWeight: 600, marginBottom: 4 }}
              />
              <Bar
                dataKey="citas"
                name="Programadas"
                fill="hsl(199, 89%, 48%)"
                radius={[4, 4, 0, 0]}
                barSize={20}
              />
              <Bar
                dataKey="completadas"
                name="Completadas"
                fill="hsl(168, 72%, 42%)"
                radius={[4, 4, 0, 0]}
                barSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-primary" />
            <span className="text-xs text-muted-foreground">Programadas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-accent" />
            <span className="text-xs text-muted-foreground">Completadas</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
