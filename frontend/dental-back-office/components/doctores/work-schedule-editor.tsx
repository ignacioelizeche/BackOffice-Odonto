"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Clock,
  Pencil,
  Save,
  X,
  Coffee,
  CalendarClock,
  CheckCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { WorkDay } from "./doctors-data"

// Default work schedule for a new doctor (Mon-Fri 9am-6pm, Sat-Sun off)
const DEFAULT_WORK_SCHEDULE: WorkDay[] = [
  { day: "Lunes", active: true, startTime: "09:00", endTime: "18:00", breakStart: "13:00", breakEnd: "14:00" },
  { day: "Martes", active: true, startTime: "09:00", endTime: "18:00", breakStart: "13:00", breakEnd: "14:00" },
  { day: "Miercoles", active: true, startTime: "09:00", endTime: "18:00", breakStart: "13:00", breakEnd: "14:00" },
  { day: "Jueves", active: true, startTime: "09:00", endTime: "18:00", breakStart: "13:00", breakEnd: "14:00" },
  { day: "Viernes", active: true, startTime: "09:00", endTime: "18:00", breakStart: "13:00", breakEnd: "14:00" },
  { day: "Sabado", active: false, startTime: "", endTime: "", breakStart: "", breakEnd: "" },
  { day: "Domingo", active: false, startTime: "", endTime: "", breakStart: "", breakEnd: "" },
]

interface WorkScheduleEditorProps {
  workSchedule?: WorkDay[] | null
  doctorColor: string
  onSave: (schedule: WorkDay[]) => void
  saving?: boolean
}

export function WorkScheduleEditor({
  workSchedule,
  doctorColor,
  onSave,
  saving = false,
}: WorkScheduleEditorProps) {
  const [editing, setEditing] = useState(false)
  const [schedule, setSchedule] = useState<WorkDay[]>(
    workSchedule && workSchedule.length > 0 ? workSchedule : DEFAULT_WORK_SCHEDULE
  )
  const [saved, setSaved] = useState(false)

  function handleToggleDay(index: number) {
    setSchedule((prev) =>
      prev.map((d, i) =>
        i === index
          ? {
              ...d,
              active: !d.active,
              startTime: !d.active ? "09:00" : "",
              endTime: !d.active ? "18:00" : "",
              breakStart: !d.active ? "13:00" : "",
              breakEnd: !d.active ? "14:00" : "",
            }
          : d
      )
    )
  }

  function handleTimeChange(
    index: number,
    field: "startTime" | "endTime" | "breakStart" | "breakEnd",
    value: string
  ) {
    setSchedule((prev) =>
      prev.map((d, i) => (i === index ? { ...d, [field]: value } : d))
    )
  }

  function handleSave() {
    onSave(schedule)
    setSaved(true)
    setTimeout(() => {
      setSaved(false)
      setEditing(false)
    }, 1500)
  }

  function handleCancel() {
    setSchedule(
      workSchedule && workSchedule.length > 0 ? workSchedule : DEFAULT_WORK_SCHEDULE
    )
    setEditing(false)
  }

  const activeDays = schedule.filter((d) => d.active).length
  const totalHours = schedule
    .filter((d) => d.active)
    .reduce((acc, d) => {
      if (!d.startTime || !d.endTime) return acc
      const [sh, sm] = d.startTime.split(":").map(Number)
      const [eh, em] = d.endTime.split(":").map(Number)
      let hours = eh + em / 60 - (sh + sm / 60)
      if (d.breakStart && d.breakEnd) {
        const [bsh, bsm] = d.breakStart.split(":").map(Number)
        const [beh, bem] = d.breakEnd.split(":").map(Number)
        hours -= beh + bem / 60 - (bsh + bsm / 60)
      }
      return acc + Math.max(0, hours)
    }, 0)

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${doctorColor}/10`}>
              <CalendarClock className={`h-5 w-5 text-primary`} />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-card-foreground">
                Horario de Trabajo
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {activeDays} dias activos &middot; {totalHours.toFixed(1)} hrs/semana
              </p>
            </div>
          </div>
          {!editing ? (
            <Button
              variant="outline"
              size="sm"
              className="border-primary/30 text-primary hover:bg-primary/5 hover:text-primary"
              onClick={() => setEditing(true)}
            >
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Editar Horario
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                onClick={handleCancel}
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Cancelar
              </Button>
              <Button
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleSave}
                disabled={saved || saving}
              >
                {saved ? (
                  <>
                    <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                    Guardado
                  </>
                ) : saving ? (
                  <>
                    <Save className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="mr-1.5 h-3.5 w-3.5" />
                    Guardar Cambios
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {/* Column headers - only in edit mode */}
          {editing && (
            <div className="hidden sm:grid sm:grid-cols-[180px_1fr_1fr_1fr_1fr] gap-3 pb-2 px-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Dia
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
                Hora Inicio
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
                Hora Fin
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
                Inicio Descanso
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
                Fin Descanso
              </span>
            </div>
          )}

          {schedule.map((day, index) => (
            <div
              key={day.day}
              className={cn(
                "rounded-xl border px-4 py-3 transition-all",
                day.active
                  ? "border-border/50 bg-card"
                  : "border-border/30 bg-muted/40",
                editing && "border-border"
              )}
            >
              {editing ? (
                /* EDIT MODE */
                <div className="flex flex-col gap-3 sm:grid sm:grid-cols-[180px_1fr_1fr_1fr_1fr] sm:items-center sm:gap-3">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={day.active}
                      onCheckedChange={() => handleToggleDay(index)}
                      className="data-[state=checked]:bg-primary"
                    />
                    <Label
                      className={cn(
                        "text-sm font-medium",
                        day.active
                          ? "text-card-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {day.day}
                    </Label>
                    {!day.active && (
                      <Badge
                        variant="secondary"
                        className="text-xs bg-muted text-muted-foreground border-transparent"
                      >
                        Libre
                      </Badge>
                    )}
                  </div>

                  {day.active ? (
                    <>
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs text-muted-foreground sm:hidden">
                          Hora Inicio
                        </Label>
                        <Input
                          type="time"
                          value={day.startTime}
                          onChange={(e) =>
                            handleTimeChange(index, "startTime", e.target.value)
                          }
                          className="h-9 text-sm text-center border-border/60"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs text-muted-foreground sm:hidden">
                          Hora Fin
                        </Label>
                        <Input
                          type="time"
                          value={day.endTime}
                          onChange={(e) =>
                            handleTimeChange(index, "endTime", e.target.value)
                          }
                          className="h-9 text-sm text-center border-border/60"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs text-muted-foreground sm:hidden">
                          Inicio Descanso
                        </Label>
                        <Input
                          type="time"
                          value={day.breakStart}
                          onChange={(e) =>
                            handleTimeChange(
                              index,
                              "breakStart",
                              e.target.value
                            )
                          }
                          className="h-9 text-sm text-center border-border/60"
                          placeholder="--:--"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs text-muted-foreground sm:hidden">
                          Fin Descanso
                        </Label>
                        <Input
                          type="time"
                          value={day.breakEnd}
                          onChange={(e) =>
                            handleTimeChange(index, "breakEnd", e.target.value)
                          }
                          className="h-9 text-sm text-center border-border/60"
                          placeholder="--:--"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="sm:col-span-4 text-sm text-muted-foreground italic py-1">
                      Sin horario asignado
                    </div>
                  )}
                </div>
              ) : (
                /* VIEW MODE */
                <div className="flex items-center gap-4">
                  <div className="w-24">
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        day.active
                          ? "text-card-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {day.day}
                    </p>
                  </div>

                  {day.active ? (
                    <div className="flex flex-1 flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        <span className="text-sm text-card-foreground font-medium">
                          {day.startTime} - {day.endTime}
                        </span>
                      </div>
                      {day.breakStart && day.breakEnd && (
                        <div className="flex items-center gap-1.5">
                          <Coffee className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {day.breakStart} - {day.breakEnd}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1">
                      <Badge
                        variant="secondary"
                        className="text-xs bg-muted text-muted-foreground border-transparent"
                      >
                        Dia libre
                      </Badge>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
