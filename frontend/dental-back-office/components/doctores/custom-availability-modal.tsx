"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Clock, AlertCircle, Trash2 } from "lucide-react"
import { doctorsService, type CustomAvailability } from "@/services/doctors.service"
import { toast } from "sonner"

interface CustomAvailabilityModalProps {
  isOpen: boolean
  onClose: () => void
  date: string
  doctorId: number
  existingAvailability?: CustomAvailability
  onSave: (availability: CustomAvailability) => void
}

export function CustomAvailabilityModal({
  isOpen,
  onClose,
  date,
  doctorId,
  existingAvailability,
  onSave,
}: CustomAvailabilityModalProps) {
  const [available, setAvailable] = useState(true)
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("18:00")
  const [hasBreak, setHasBreak] = useState(true)
  const [breakStart, setBreakStart] = useState("13:00")
  const [breakEnd, setBreakEnd] = useState("14:00")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cargar datos existentes cuando el modal se abre
  useEffect(() => {
    if (isOpen) {
      if (existingAvailability) {
        setAvailable(existingAvailability.available)
        setStartTime(existingAvailability.startTime || "09:00")
        setEndTime(existingAvailability.endTime || "18:00")
        setHasBreak(!!existingAvailability.breakStart && !!existingAvailability.breakEnd)
        setBreakStart(existingAvailability.breakStart || "13:00")
        setBreakEnd(existingAvailability.breakEnd || "14:00")
        setNotes(existingAvailability.notes || "")
      } else {
        // Resetear a valores por defecto
        setAvailable(true)
        setStartTime("09:00")
        setEndTime("18:00")
        setHasBreak(true)
        setBreakStart("13:00")
        setBreakEnd("14:00")
        setNotes("")
      }
      setError(null)
    }
  }, [isOpen, existingAvailability])

  async function handleSave() {
    try {
      setError(null)
      setSaving(true)

      // Validación básica
      if (available && !startTime) {
        throw new Error("Ingrese la hora de inicio")
      }
      if (available && !endTime) {
        throw new Error("Ingrese la hora de fin")
      }

      // Validación de horarios
      if (available) {
        if (startTime >= endTime) {
          throw new Error("La hora de inicio debe ser anterior a la hora de fin")
        }

        if (hasBreak) {
          if (breakStart >= breakEnd) {
            throw new Error("La hora de inicio del descanso debe ser anterior a la hora de fin")
          }
          if (breakStart < startTime || breakEnd > endTime) {
            throw new Error("El descanso debe estar dentro del horario de trabajo")
          }
        }
      }

      let savedAvailability: CustomAvailability

      if (existingAvailability) {
        // Actualizar disponibilidad existente
        savedAvailability = await doctorsService.updateCustomAvailability(doctorId, date, {
          available,
          start_time: available ? startTime : undefined,
          end_time: available ? endTime : undefined,
          break_start: available && hasBreak ? breakStart : undefined,
          break_end: available && hasBreak ? breakEnd : undefined,
          notes,
        })

        toast.success("Disponibilidad actualizada", {
          description: `Se actualizó la disponibilidad para ${new Date(date + 'T00:00:00').toLocaleDateString('es-AR')}`,
        })
      } else {
        // Crear nueva disponibilidad
        savedAvailability = await doctorsService.createCustomAvailability(doctorId, {
          date,
          available,
          start_time: available ? startTime : undefined,
          end_time: available ? endTime : undefined,
          break_start: available && hasBreak ? breakStart : undefined,
          break_end: available && hasBreak ? breakEnd : undefined,
          notes,
        })

        toast.success("Disponibilidad creada", {
          description: `Se configuró la disponibilidad para ${new Date(date + 'T00:00:00').toLocaleDateString('es-AR')}`,
        })
      }

      onSave(savedAvailability)
      onClose()
    } catch (err) {
      console.error("Error guardando disponibilidad:", err)
      const errorMessage = err instanceof Error ? err.message : "Error al guardar disponibilidad"
      setError(errorMessage)
      toast.error("Error al guardar", { description: errorMessage })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    try {
      if (!existingAvailability) return

      setSaving(true)
      setError(null)

      await doctorsService.deleteCustomAvailability(doctorId, date)

      toast.success("Disponibilidad eliminada", {
        description: `Se eliminó la disponibilidad personalizada para ${new Date(date + 'T00:00:00').toLocaleDateString('es-AR')}`,
      })

      onSave(undefined as any) // Notificar eliminación
      onClose()
    } catch (err) {
      console.error("Error eliminando disponibilidad:", err)
      const errorMessage = err instanceof Error ? err.message : "Error al eliminar disponibilidad"
      setError(errorMessage)
      toast.error("Error al eliminar", { description: errorMessage })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {existingAvailability ? "Editar Disponibilidad" : "Nueva Disponibilidad"}
          </DialogTitle>
          <DialogDescription className="space-y-1">
            <p>{new Date(date + 'T00:00:00').toLocaleDateString('es-AR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}</p>
            {existingAvailability && existingAvailability.available && (
              <p className="text-xs text-muted-foreground">
                Horario actual: {existingAvailability.startTime} - {existingAvailability.endTime}
              </p>
            )}
            {existingAvailability && !existingAvailability.available && (
              <p className="text-xs text-amber-600">
                Este día está marcado como no disponible
              </p>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive flex gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Disponibilidad Toggle */}
          <div className="space-y-2">
            <Label>Disponibilidad</Label>
            <Select value={available ? "available" : "unavailable"} onValueChange={(value) => setAvailable(value === "available")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    Disponible
                  </span>
                </SelectItem>
                <SelectItem value="unavailable">
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-500" />
                    No disponible
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Horarios (solo si está disponible) */}
          {available && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="start-time" className="text-sm">
                    Hora Inicio
                  </Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-time" className="text-sm">
                    Hora Fin
                  </Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>

              {/* Descanso */}
              <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-medium text-muted-foreground">Descanso (Opcional)</h4>
                  <button
                    type="button"
                    onClick={() => setHasBreak(!hasBreak)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      hasBreak
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted border border-border text-muted-foreground"
                    }`}
                  >
                    {hasBreak ? "Activo" : "Inactivo"}
                  </button>
                </div>
                {hasBreak && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="break-start" className="text-xs">
                        Inicio
                      </Label>
                      <Input
                        id="break-start"
                        type="time"
                        value={breakStart}
                        onChange={(e) => setBreakStart(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="break-end" className="text-xs">
                        Fin
                      </Label>
                      <Input
                        id="break-end"
                        type="time"
                        value={breakEnd}
                        onChange={(e) => setBreakEnd(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm">
              Notas (Opcional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Ej: Congreso, vacaciones, horario especial..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="text-xs"
            />
          </div>
        </div>

        <DialogFooter className="flex justify-between gap-2 sm:justify-between">
          <div className="flex gap-2">
            {existingAvailability && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={saving}
                className="text-xs"
              >
                <Trash2 className="mr-1.5 h-3 w-3" />
                Eliminar
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="text-xs"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}