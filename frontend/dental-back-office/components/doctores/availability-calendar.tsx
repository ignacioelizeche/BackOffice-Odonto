"use client"

import { useState, useEffect } from "react"
import { Calendar, ChevronLeft, ChevronRight, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { doctorsService, type CustomAvailability, type Doctor } from "@/services/doctors.service"

interface AvailabilityCalendarProps {
  doctor: Doctor
  onDateClick: (date: string, existing?: CustomAvailability) => void
  selectedDate?: string
  refreshKey?: number
}

interface CalendarDay {
  date: string
  isCurrentMonth: boolean
  isToday: boolean
  isPast: boolean
  customAvailability?: CustomAvailability
  dayOfWeek: number
  hasWeeklySchedule: boolean
}

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
]

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

export function AvailabilityCalendar({ doctor, onDateClick, selectedDate, refreshKey }: AvailabilityCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [customAvailability, setCustomAvailability] = useState<CustomAvailability[]>([])
  const [loading, setLoading] = useState(false)

  // Get start and end of month for API calls
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

  // Load custom availability for current month
  useEffect(() => {
    const loadCustomAvailability = async () => {
      try {
        setLoading(true)
        const startDate = formatDate(startOfMonth)
        const endDate = formatDate(endOfMonth)

        const response = await doctorsService.getCustomAvailability(doctor.id, startDate, endDate)
        setCustomAvailability(response.data || [])
      } catch (err) {
        console.error("Error loading custom availability:", err)
        setCustomAvailability([])
      } finally {
        setLoading(false)
      }
    }

    loadCustomAvailability()
  }, [doctor.id, currentDate, refreshKey])

  // Helper function to format date as YYYY-MM-DD (local timezone)
  function formatDate(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Check if doctor works on this day of week (based on weekly schedule)
  function hasWeeklySchedule(dayOfWeek: number): boolean {
    if (!doctor.workSchedule) return false

    const dayNames = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"]
    const dayName = dayNames[dayOfWeek]
    const schedule = doctor.workSchedule.find(ws => ws.day === dayName)

    return schedule?.active || false
  }

  // Generate calendar days
  function generateCalendarDays(): CalendarDay[] {
    const days: CalendarDay[] = []

    // Create today date in local timezone (not UTC)
    const today = new Date()
    const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate())

    // Get first day of month and adjust to start on Sunday
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const startDate = new Date(firstDayOfMonth)
    startDate.setDate(startDate.getDate() - firstDayOfMonth.getDay())

    // Generate 42 days (6 weeks) to fill calendar grid
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)

      const dateStr = formatDate(date)
      const dayOfWeek = date.getDay()
      const isCurrentMonth = date.getMonth() === currentDate.getMonth()
      const dateLocal = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const isToday = dateLocal.getTime() === todayLocal.getTime()
      const isPast = dateLocal.getTime() < todayLocal.getTime()

      // Find custom availability for this date
      const customAvail = customAvailability.find(ca => ca.date === dateStr)

      days.push({
        date: dateStr,
        isCurrentMonth,
        isToday,
        isPast,
        customAvailability: customAvail,
        dayOfWeek,
        hasWeeklySchedule: hasWeeklySchedule(dayOfWeek),
      })
    }

    return days
  }

  // Get status for a calendar day
  function getDayStatus(day: CalendarDay) {
    if (!day.isCurrentMonth) {
      return { status: "disabled", label: "", color: "bg-muted/30 text-muted-foreground/50" }
    }

    // Custom availability overrides everything
    if (day.customAvailability) {
      if (day.customAvailability.available) {
        const hasCustomHours = day.customAvailability.startTime && day.customAvailability.endTime
        return {
          status: "custom-available",
          label: hasCustomHours ? "Horario personalizado" : "Disponible (horario normal)",
          color: "bg-blue-500 text-white border-none hover:bg-blue-600",
        }
      } else {
        return {
          status: "custom-unavailable",
          label: "No disponible",
          color: "bg-red-500 text-white border-none hover:bg-red-600",
        }
      }
    }

    // Default to weekly schedule
    if (day.hasWeeklySchedule) {
      return {
        status: "weekly-available",
        label: "Horario semanal normal",
        color: "bg-green-500 text-white border-none hover:bg-green-600",
      }
    }

    return {
      status: "weekly-unavailable",
      label: "No trabaja este día",
      color: "bg-muted text-muted-foreground hover:bg-muted/80",
    }
  }

  // Navigate months
  function goToPreviousMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  function goToNextMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  function goToCurrentMonth() {
    setCurrentDate(new Date())
  }

  const calendarDays = generateCalendarDays()
  const today = new Date()
  const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const isCurrentMonth = currentDate.getMonth() === todayLocal.getMonth() && currentDate.getFullYear() === todayLocal.getFullYear()

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
            <Calendar className="h-5 w-5 text-primary" />
            Disponibilidad Personalizada
          </CardTitle>
          <div className="flex items-center gap-2">
            {!isCurrentMonth && (
              <Button
                variant="outline"
                size="sm"
                onClick={goToCurrentMonth}
                className="text-xs"
              >
                Hoy
              </Button>
            )}
          </div>
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-between mt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPreviousMonth}
            className="p-2"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <h3 className="text-base font-medium text-card-foreground">
            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>

          <Button
            variant="ghost"
            size="sm"
            onClick={goToNextMonth}
            className="p-2"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 mt-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-green-200 border border-green-300" />
            <span className="text-muted-foreground">Horario semanal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-blue-200 border border-blue-300" />
            <span className="text-muted-foreground">Personalizado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-gray-200 border border-gray-300" />
            <span className="text-muted-foreground">No disponible</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-muted border border-border" />
            <span className="text-muted-foreground">No trabaja</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-2">
              <Clock className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Cargando calendario...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS.map(day => (
                <div
                  key={day}
                  className="h-8 flex items-center justify-center text-xs font-medium text-muted-foreground"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const dayStatus = getDayStatus(day)
                const isSelected = selectedDate === day.date
                const [year, month, dayStr] = day.date.split('-')
                const dayNumber = parseInt(dayStr)

                return (
                  <Button
                    key={day.date}
                    variant="ghost"
                    size="sm"
                    onClick={() => day.isCurrentMonth && !day.isPast && onDateClick(day.date, day.customAvailability)}
                    disabled={!day.isCurrentMonth || day.isPast}
                    className={cn(
                      "h-10 w-full p-1 flex flex-col items-center justify-center relative text-xs font-medium transition-all",
                      dayStatus.color,
                      isSelected && "ring-2 ring-primary ring-offset-1",
                      day.isToday && "border-2 border-primary font-bold",
                      day.isPast && day.isCurrentMonth && "opacity-50",
                      !day.isCurrentMonth && "opacity-30"
                    )}
                    title={day.isCurrentMonth ? dayStatus.label : ""}
                  >
                    <span>{dayNumber}</span>
                  </Button>
                )
              })}
            </div>
          </div>
        )}

        {/* Selected date info */}
        {selectedDate && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium text-card-foreground">
              Fecha seleccionada: {(() => {
                const [year, month, day] = selectedDate.split('-')
                const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
                return date.toLocaleDateString('es-AR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })
              })()}
            </p>
            {(() => {
              const day = calendarDays.find(d => d.date === selectedDate)
              if (!day) return null
              const status = getDayStatus(day)
              return (
                <p className="text-xs text-muted-foreground mt-1">
                  {status.label}
                </p>
              )
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
