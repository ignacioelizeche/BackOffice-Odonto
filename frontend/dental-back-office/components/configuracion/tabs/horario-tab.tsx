"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Loader } from "lucide-react"
import { configService, type WorkDay } from "@/services/config.service"
import { scheduleConfigSchema, type ScheduleConfigFormValues } from "@/lib/validations/config"

export function HorarioTab() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const form = useForm<ScheduleConfigFormValues>({
    resolver: zodResolver(scheduleConfigSchema),
    mode: "onChange",
    defaultValues: {
      workDays: [
        { day: "Lunes", active: true, startTime: "09:00", endTime: "18:00", breakStart: "13:00", breakEnd: "14:00" },
        { day: "Martes", active: true, startTime: "09:00", endTime: "18:00", breakStart: "13:00", breakEnd: "14:00" },
        { day: "Miércoles", active: true, startTime: "09:00", endTime: "18:00", breakStart: "13:00", breakEnd: "14:00" },
        { day: "Jueves", active: true, startTime: "09:00", endTime: "18:00", breakStart: "13:00", breakEnd: "14:00" },
        { day: "Viernes", active: true, startTime: "09:00", endTime: "17:00", breakStart: "13:00", breakEnd: "14:00" },
        { day: "Sábado", active: true, startTime: "09:00", endTime: "14:00", breakStart: "", breakEnd: "" },
        { day: "Domingo", active: false, startTime: "", endTime: "", breakStart: "", breakEnd: "" },
      ],
      appointmentDuration: 15,
      timeBetweenAppointments: 5,
      maxAppointmentsPerDoctorPerDay: 12,
      minAdvanceBookingDays: 2,
    },
  })

  // 1. Cargar datos de la API al montar
  useEffect(() => {
    const loadScheduleConfig = async () => {
      try {
        setIsLoading(true)
        const data = await configService.getScheduleConfig()
        form.reset({
          workDays: data.workDays,
          appointmentDuration: data.appointmentDuration,
          timeBetweenAppointments: data.timeBetweenAppointments,
          maxAppointmentsPerDoctorPerDay: data.maxAppointmentsPerDoctorPerDay,
          minAdvanceBookingDays: data.minAdvanceBookingDays,
        })
      } catch (error) {
        toast.error("Error al cargar configuración de horarios")
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    loadScheduleConfig()
  }, [form])

  // 2. Detectar cambios
  const watchedValues = form.watch()
  useEffect(() => {
    const hasChanges = JSON.stringify(watchedValues) !==
      JSON.stringify(form.formState.defaultValues)
    setHasChanges(hasChanges && form.formState.isDirty)
  }, [watchedValues, form.formState])

  // 3. Advertencia al salir con cambios no guardados
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault()
        e.returnValue = ""
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [hasChanges])

  // 4. Manejar guardado
  const onSubmit = async (values: ScheduleConfigFormValues) => {
    setIsSaving(true)
    try {
      await configService.updateScheduleConfig({
        workDays: values.workDays,
        appointmentDuration: values.appointmentDuration,
        timeBetweenAppointments: values.timeBetweenAppointments,
        maxAppointmentsPerDoctorPerDay: values.maxAppointmentsPerDoctorPerDay,
        minAdvanceBookingDays: values.minAdvanceBookingDays,
      })
      form.reset(values)
      setHasChanges(false)
      toast.success("Horarios y configuración de citas guardados exitosamente")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido"
      toast.error(`Error al guardar: ${message}`)
      console.error("Error saving schedule config:", error)
    } finally {
      setIsSaving(false)
    }
  }

  // 5. Manejar cambio de día activo/inactivo
  const handleToggleDay = (index: number) => {
    const currentDays = form.getValues("workDays")
    const newDays = [...currentDays]
    newDays[index].active = !newDays[index].active
    if (!newDays[index].active) {
      newDays[index].startTime = ""
      newDays[index].endTime = ""
      newDays[index].breakStart = ""
      newDays[index].breakEnd = ""
    }
    form.setValue("workDays", newDays, { shouldDirty: true })
  }

  // Mostrar skeleton mientras carga
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="py-6">
            <div className="space-y-4">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <div className="flex flex-col gap-6">
        {/* Alert de cambios no guardados */}
        {hasChanges && (
          <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-900">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Cambios sin guardar</AlertTitle>
            <AlertDescription>
              Tienes cambios pendientes. Haz clic en "Guardar Cambios" para guardarlos.
            </AlertDescription>
          </Alert>
        )}

        {/* Operating hours */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-card-foreground">
              Horario de Atención
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Configura los horarios de apertura y cierre de la clínica por día de la semana
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {form.watch("workDays").map((day, index) => (
              <div
                key={day.day}
                className="flex flex-col gap-3 rounded-xl border border-border/50 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <Switch
                    checked={day.active}
                    onCheckedChange={() => handleToggleDay(index)}
                    disabled={isSaving}
                  />
                  <span className="text-sm font-medium text-card-foreground w-24">
                    {day.day}
                  </span>
                  {!day.active && (
                    <Badge className="bg-muted text-muted-foreground border-transparent text-xs">
                      Cerrado
                    </Badge>
                  )}
                </div>
                {day.active && (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground whitespace-nowrap">Apertura</Label>
                      <Input
                        type="time"
                        disabled={isSaving}
                        value={day.startTime}
                        onChange={(e) => {
                          const newDays = form.getValues("workDays")
                          newDays[index].startTime = e.target.value
                          form.setValue("workDays", newDays, { shouldDirty: true })
                        }}
                        className="w-32 border-border/50 text-sm"
                      />
                    </div>
                    <span className="text-muted-foreground hidden sm:inline">-</span>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground whitespace-nowrap">Cierre</Label>
                      <Input
                        type="time"
                        disabled={isSaving}
                        value={day.endTime}
                        onChange={(e) => {
                          const newDays = form.getValues("workDays")
                          newDays[index].endTime = e.target.value
                          form.setValue("workDays", newDays, { shouldDirty: true })
                        }}
                        className="w-32 border-border/50 text-sm"
                      />
                    </div>
                    <span className="text-muted-foreground hidden sm:inline">|</span>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground whitespace-nowrap">Descanso</Label>
                      <Input
                        type="time"
                        disabled={isSaving}
                        value={day.breakStart}
                        placeholder="Inicio"
                        onChange={(e) => {
                          const newDays = form.getValues("workDays")
                          newDays[index].breakStart = e.target.value
                          form.setValue("workDays", newDays, { shouldDirty: true })
                        }}
                        className="w-24 border-border/50 text-sm"
                      />
                      <span className="text-muted-foreground text-xs">-</span>
                      <Input
                        type="time"
                        disabled={isSaving}
                        value={day.breakEnd}
                        placeholder="Fin"
                        onChange={(e) => {
                          const newDays = form.getValues("workDays")
                          newDays[index].breakEnd = e.target.value
                          form.setValue("workDays", newDays, { shouldDirty: true })
                        }}
                        className="w-24 border-border/50 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Appointment settings */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-card-foreground">
              Configuración de Citas
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Appointment Duration */}
            <div className="flex flex-col gap-2">
              <Label className="text-card-foreground">
                Duración mínima de cita {form.formState.errors.appointmentDuration && <span className="text-destructive">*</span>}
              </Label>
              <Input
                disabled={isSaving}
                type="number"
                {...form.register("appointmentDuration", { valueAsNumber: true })}
                className={`border-border/50 ${form.formState.errors.appointmentDuration ? "border-destructive" : ""}`}
              />
              <p className="text-xs text-muted-foreground">En minutos</p>
              {form.formState.errors.appointmentDuration && (
                <p className="text-xs text-destructive">{form.formState.errors.appointmentDuration.message}</p>
              )}
            </div>

            {/* Time Between Appointments */}
            <div className="flex flex-col gap-2">
              <Label className="text-card-foreground">
                Tiempo entre citas {form.formState.errors.timeBetweenAppointments && <span className="text-destructive">*</span>}
              </Label>
              <Input
                disabled={isSaving}
                type="number"
                {...form.register("timeBetweenAppointments", { valueAsNumber: true })}
                className={`border-border/50 ${form.formState.errors.timeBetweenAppointments ? "border-destructive" : ""}`}
              />
              <p className="text-xs text-muted-foreground">Buffer en minutos</p>
              {form.formState.errors.timeBetweenAppointments && (
                <p className="text-xs text-destructive">{form.formState.errors.timeBetweenAppointments.message}</p>
              )}
            </div>

            {/* Max Appointments Per Doctor */}
            <div className="flex flex-col gap-2">
              <Label className="text-card-foreground">
                Máx. citas por doctor/día {form.formState.errors.maxAppointmentsPerDoctorPerDay && <span className="text-destructive">*</span>}
              </Label>
              <Input
                disabled={isSaving}
                type="number"
                {...form.register("maxAppointmentsPerDoctorPerDay", { valueAsNumber: true })}
                className={`border-border/50 ${form.formState.errors.maxAppointmentsPerDoctorPerDay ? "border-destructive" : ""}`}
              />
              {form.formState.errors.maxAppointmentsPerDoctorPerDay && (
                <p className="text-xs text-destructive">{form.formState.errors.maxAppointmentsPerDoctorPerDay.message}</p>
              )}
            </div>

            {/* Min Advance Booking */}
            <div className="flex flex-col gap-2">
              <Label className="text-card-foreground">
                Anticipación mínima para agendar {form.formState.errors.minAdvanceBookingDays && <span className="text-destructive">*</span>}
              </Label>
              <Input
                disabled={isSaving}
                type="number"
                {...form.register("minAdvanceBookingDays", { valueAsNumber: true })}
                className={`border-border/50 ${form.formState.errors.minAdvanceBookingDays ? "border-destructive" : ""}`}
              />
              <p className="text-xs text-muted-foreground">En horas</p>
              {form.formState.errors.minAdvanceBookingDays && (
                <p className="text-xs text-destructive">{form.formState.errors.minAdvanceBookingDays.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Save button */}
        <div className="flex justify-end gap-2">
          <Button
            type="submit"
            disabled={isSaving || !hasChanges}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isSaving ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar Cambios"
            )}
          </Button>
        </div>
      </div>
    </form>
  )
}
