"use client"

import { Loader, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { AvailableSlot } from "@/services/appointments.service"

interface TimeSlotSelectorProps {
  slots: AvailableSlot[]
  selectedTime: string | null
  onTimeSelect: (time: string) => void
  loading?: boolean
  initialTime?: string
  initialDate?: string
  currentDate?: string
}

export function TimeSlotSelector({
  slots,
  selectedTime,
  onTimeSelect,
  loading = false,
  initialTime,
  initialDate,
  currentDate,
}: TimeSlotSelectorProps) {
  // Solo mostrar initialTime con estilo especial si estamos en la misma fecha original
  const showInitialTimeStyle = initialDate && currentDate && initialDate === currentDate
  // Si no hay slots, significa que el doctor no atiende ese día
  // No agregar initialTime en este caso
  if (!slots || slots.length === 0) {
    let allSlots: AvailableSlot[] = []
    
    // Solo agregar selectedTime si es diferente a initialTime (usuario seleccionó una hora)
    if (selectedTime && selectedTime !== initialTime) {
      allSlots.push({ time: selectedTime, available: true })
    }
    
    if (allSlots.length === 0) {
      return (
        <Card className="border-border/50 shadow-sm h-full">
          <CardHeader className="pb-3 pt-5">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
              <Clock className="h-5 w-5 text-primary flex-shrink-0" />
              <span>Seleccionar Hora</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center min-h-[300px]">
            <div className="flex flex-col items-center gap-3 text-center">
              <Clock className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-medium text-muted-foreground">
                {loading ? "Cargando horarios..." : "No hay horarios disponibles.\nSelecciona un doctor y una fecha."}
              </p>
            </div>
          </CardContent>
        </Card>
      )
    }
  }

  // Si hay slots, agregar selectedTime e initialTime si no están en la lista
  let allSlots = [...slots]
  if (selectedTime && !slots.some(s => s.time === selectedTime)) {
    allSlots.push({ time: selectedTime, available: true })
  }
  
  // Solo agregar initialTime si hay slots disponibles (doctor atiende ese día)
  if (initialTime && initialTime !== selectedTime && slots.length > 0 && !slots.some(s => s.time === initialTime)) {
    allSlots.push({ time: initialTime, available: true })
  }

  // Ordenar los slots por hora
  allSlots.sort((a, b) => a.time.localeCompare(b.time))

  if (!allSlots || allSlots.length === 0) {
    return (
      <Card className="border-border/50 shadow-sm h-full">
        <CardHeader className="pb-3 pt-5">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
            <Clock className="h-5 w-5 text-primary flex-shrink-0" />
            <span>Seleccionar Hora</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center min-h-[300px]">
          <div className="flex flex-col items-center gap-3 text-center">
            <Clock className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium text-muted-foreground">
              {loading ? "Cargando horarios..." : "No hay horarios disponibles.\nSelecciona un doctor y una fecha."}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Group slots by hour
  const groupedSlots: Record<string, AvailableSlot[]> = {}
  allSlots.forEach((slot) => {
    const hour = slot.time.split(":")[0]
    if (!groupedSlots[hour]) {
      groupedSlots[hour] = []
    }
    groupedSlots[hour].push(slot)
  })

  const hours = Object.keys(groupedSlots).sort()

  return (
    <Card className="border-border/50 shadow-sm h-full">
      <CardHeader className="pb-3 pt-5">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
          <Clock className="h-5 w-5 text-primary flex-shrink-0" />
          <span>Seleccionar Hora</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 px-4">
            <Loader className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Cargando horarios disponibles...</span>
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-2 lg:grid-cols-4">
            {allSlots.map((slot) => {
              const isSelected = selectedTime === slot.time
              const isInitial = showInitialTimeStyle && initialTime === slot.time && initialTime !== selectedTime
              
              return (
                <Button
                  key={slot.time}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => onTimeSelect(slot.time)}
                  disabled={!slot.available || loading}
                  className={`font-semibold text-xs h-10 transition-all relative ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                      : isInitial
                      ? "border-2 border-accent bg-accent/5 hover:bg-accent/10"
                      : slot.available
                      ? "border-border/50 hover:bg-accent/10 hover:text-accent"
                      : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                  }`}
                  title={isInitial ? "Hora original de la cita" : undefined}
                >
                  {slot.time}
                  {isInitial && <span className="absolute -top-1 -right-1 text-xs">●</span>}
                </Button>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
