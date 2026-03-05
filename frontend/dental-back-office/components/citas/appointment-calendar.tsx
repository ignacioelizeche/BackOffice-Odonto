"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CalendarDays, Loader, ChevronLeft, ChevronRight } from "lucide-react"
import { appointmentsService, type AvailableSlot } from "@/services/appointments.service"

interface AppointmentCalendarProps {
  doctorId: number
  onDateSelect: (date: string) => void
  selectedDate?: string
}

export function AppointmentCalendar({
  doctorId,
  onDateSelect,
  selectedDate,
}: AppointmentCalendarProps) {
  const [displayDate, setDisplayDate] = useState<Date>(new Date())
  const [selectedDateObj, setSelectedDateObj] = useState<Date | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availability, setAvailability] = useState<AvailableSlot[]>([])

  // Get today's date
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Helper function to parse date string avoiding timezone issues
  const parseDateString = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split("-").map(Number)
    return new Date(year, month - 1, day)
  }

  // Helper function to format date to YYYY-MM-DD
  const formatDateToString = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  // Sync selectedDate from parent
  useEffect(() => {
    if (selectedDate) {
      const newDate = parseDateString(selectedDate)
      setSelectedDateObj(newDate)
      setDisplayDate(newDate)
    }
  }, [selectedDate])

  // Generate calendar grid
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(displayDate)
    const firstDay = getFirstDayOfMonth(displayDate)
    // Adjust for Monday start (0 = Sunday in JS, we want Monday = 0)
    const startDay = firstDay === 0 ? 6 : firstDay - 1

    const days: (number | null)[] = []
    // Add empty cells for days before month starts
    for (let i = 0; i < startDay; i++) {
      days.push(null)
    }
    // Add all days of month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }
    return days
  }

  const dayNames = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"]
  const monthNames = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
  ]

  const handleDateClick = (day: number) => {
    const newDate = new Date(displayDate.getFullYear(), displayDate.getMonth(), day)
    const dateToCheck = new Date(newDate)
    dateToCheck.setHours(0, 0, 0, 0)

    if (dateToCheck < today) {
      setError("No se pueden seleccionar fechas pasadas")
      return
    }

    setSelectedDateObj(newDate)
    setError(null)

    const dateString = formatDateToString(newDate)

    // Notify parent
    onDateSelect(dateString)

    // Load availability for this date if doctorId is valid
    if (doctorId > 0) {
      loadAvailability(doctorId, dateString)
    } else {
      setError("Selecciona un doctor primero")
    }
  }

  const loadAvailability = async (docId: number, dateStr: string) => {
    try {
      setLoading(true)
      setError(null)

      const response = await appointmentsService.getAvailableSlots(docId, dateStr)
      setAvailability(response.availableSlots || [])

      if (!response.availableSlots || response.availableSlots.length === 0) {
        setError("No hay horarios disponibles para este día")
      }
    } catch (err) {
      console.error("Error loading availability:", err)
      setError("Error al cargar disponibilidad")
    } finally {
      setLoading(false)
    }
  }

  const previousMonth = () => {
    setDisplayDate(new Date(displayDate.getFullYear(), displayDate.getMonth() - 1))
  }

  const nextMonth = () => {
    setDisplayDate(new Date(displayDate.getFullYear(), displayDate.getMonth() + 1))
  }

  const isDateDisabled = (day: number) => {
    const dateToCheck = new Date(displayDate.getFullYear(), displayDate.getMonth(), day)
    dateToCheck.setHours(0, 0, 0, 0)
    return dateToCheck < today
  }

  const isDateSelected = (day: number) => {
    if (!selectedDateObj) return false
    return (
      selectedDateObj.getDate() === day &&
      selectedDateObj.getMonth() === displayDate.getMonth() &&
      selectedDateObj.getFullYear() === displayDate.getFullYear()
    )
  }

  const calendarDays = generateCalendarDays()

  return (
    <Card className="border-border/50 shadow-sm h-full">
      <CardHeader className="pb-3 pt-5">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
          <CalendarDays className="h-5 w-5 text-primary flex-shrink-0" />
          <span>Seleccionar Fecha</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 pb-6">
        {!doctorId || doctorId === 0 ? (
          <div className="flex items-center justify-center py-12 px-4 min-h-[300px] text-sm text-muted-foreground text-center">
            <div className="flex flex-col items-center gap-2">
              <CalendarDays className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <span>Selecciona un doctor para ver disponibilidad</span>
            </div>
          </div>
        ) : (
          <>
            {/* Custom Calendar */}
            <div className="rounded-lg border border-border/30 bg-background p-3 sm:p-6 space-y-4">
              {/* Navigation */}
              <div className="flex items-center justify-between gap-1 sm:gap-4">
                <button
                  onClick={previousMonth}
                  className="p-2 hover:bg-muted rounded-md transition-colors flex-shrink-0"
                  aria-label="Mes anterior"
                >
                  <ChevronLeft className="h-5 w-5 text-foreground" />
                </button>
                <div className="text-center flex-1 min-w-0 px-2">
                  <h3 className="text-sm sm:text-lg font-semibold text-foreground truncate">
                    {monthNames[displayDate.getMonth()]} {displayDate.getFullYear().toString().slice(-2)}
                  </h3>
                </div>
                <button
                  onClick={nextMonth}
                  className="p-2 hover:bg-muted rounded-md transition-colors flex-shrink-0"
                  aria-label="Próximo mes"
                >
                  <ChevronRight className="h-5 w-5 text-foreground" />
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {dayNames.map((day) => (
                  <div
                    key={day}
                    className="text-xs font-semibold text-muted-foreground py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Divider */}
              <div className="border-t border-border/30"></div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => {
                  const disabled = day ? isDateDisabled(day) : true
                  const selected = day ? isDateSelected(day) : false

                  return (
                    <div
                      key={index}
                      className={`aspect-square flex items-center justify-center rounded-md text-xs sm:text-sm font-medium transition-all ${
                        day === null
                          ? ""
                          : disabled
                          ? "text-muted-foreground/50 cursor-not-allowed"
                          : selected
                          ? "bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-sm"
                          : "text-foreground hover:bg-muted cursor-pointer"
                      }`}
                      onClick={() => {
                        if (day && !disabled) {
                          handleDateClick(day)
                        }
                      }}
                    >
                      {day}
                    </div>
                  )
                })}
              </div>
            </div>
{/* 
            {loading && (
              <div className="flex flex-col items-center justify-center gap-2 py-6 px-4">
                <Loader className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Cargando disponibilidad...</span>
              </div>
            )}

            {error && !loading && (
              <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-destructive mt-0.5" />
                <span className="text-sm text-destructive font-medium">{error}</span>
              </div>
            )}

            {!loading && availability.length > 0 && (
              <div className="rounded-lg border border-border/50 bg-muted/50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-accent"></div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Horarios disponibles
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {availability.slice(0, 6).map((slot) => (
                    <div
                      key={slot.time}
                      className="bg-accent/15 border border-accent/30 rounded-md px-2.5 py-2 text-center text-xs font-semibold text-accent hover:bg-accent/20 transition-colors"
                    >
                      {slot.time}
                    </div>
                  ))}
                </div>
                {availability.length > 6 && (
                  <p className="text-xs text-muted-foreground pt-1">
                    <span className="font-semibold text-accent">+{availability.length - 6}</span> horarios más disponibles
                  </p>
                )}
              </div>
            )}

            {!loading && availability.length === 0 && !error && (
              <div className="rounded-lg border border-border/50 bg-muted/30 p-4 text-center">
                <p className="text-sm text-muted-foreground">Selecciona una fecha para ver disponibilidad</p>
              </div>
            )}*/}
          </> 
        )}
      </CardContent>
    </Card>
  )
}
