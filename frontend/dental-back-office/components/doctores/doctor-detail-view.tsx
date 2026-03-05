"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  ArrowLeft,
  Mail,
  Phone,
  Star,
  Users,
  Calendar,
  Clock,
  DollarSign,
  CalendarCheck,
  XCircle,
  AlertCircle,
  Check,
  Loader2,
} from "lucide-react"
import type { Doctor, WorkDay } from "./doctors-data"
import { cn } from "@/lib/utils"
import { WorkScheduleEditor } from "./work-schedule-editor"
import { doctorsService } from "@/services/doctors.service"
import { useAuth } from "@/contexts/auth-context"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

function getDoctorStatusBadge(status: string) {
  switch (status) {
    case "disponible":
      return <Badge className="bg-accent/15 text-accent border-transparent font-medium">Disponible</Badge>
    case "en-consulta":
      return <Badge className="bg-primary/15 text-primary border-transparent font-medium">En Consulta</Badge>
    case "no-disponible":
      return <Badge className="bg-muted text-muted-foreground border-transparent font-medium">No Disponible</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function getDefaultDoctorColor(): string {
  return "bg-primary"
}

interface DoctorDetailViewProps {
  doctor: Doctor
  onBack: () => void
}

export function DoctorDetailView({ doctor: initialDoctor, onBack }: DoctorDetailViewProps) {
  const { user } = useAuth()
  const route = useRouter()
  const [doctor, setDoctor] = useState(initialDoctor)
  const [savingSchedule, setSavingSchedule] = useState(false)
  const [saveScheduleError, setSaveScheduleError] = useState<string | null>(null)
  const [saveScheduleSuccess, setSaveScheduleSuccess] = useState(false)

  // Status change states
  const [isChangingStatus, setIsChangingStatus] = useState(false)
  const [statusChangeError, setStatusChangeError] = useState<string | null>(null)
  const [statusChangeSuccess, setStatusChangeSuccess] = useState(false)
  const [statusEditMode, setStatusEditMode] = useState(false)

  // Check if current user is this doctor
  const isOwnProfile = user?.role === "Doctor" && user?.name === doctor.name

  // Default schedule if not provided
  const schedule = doctor.schedule || []

  const occupancyRate = schedule.length > 0
    ? Math.round(
        (schedule.filter((s) => s.status === "ocupado").length /
          schedule.filter((s) => s.status !== "descanso").length) *
          100
      )
    : 0

  async function handleSaveSchedule(newSchedule: WorkDay[]) {
    try {
      setSavingSchedule(true)
      setSaveScheduleError(null)
      setSaveScheduleSuccess(false)

      console.log("[Doctor Detail] Guardando horario del doctor ID:", doctor.id)
      console.log("[Doctor Detail] Nuevo horario:", newSchedule)

      // Call backend API to update doctor schedule
      const response = await doctorsService.updateWorkSchedule(doctor.id, newSchedule)

      console.log("[Doctor Detail] Respuesta del servidor:", response)

      // Reload doctor data from backend to verify persistence
      console.log("[Doctor Detail] Recargando datos del doctor desde el backend...")
      const updatedDoctor = await doctorsService.getById(doctor.id)

      console.log("[Doctor Detail] Datos actualizados del backend:", updatedDoctor)

      // Update local state with fresh data from backend, preserving the color
      setDoctor((prevDoctor) => ({
        ...updatedDoctor,
        schedule: updatedDoctor.schedule ?? prevDoctor.schedule ?? [],
        workSchedule: updatedDoctor.workSchedule ?? prevDoctor.workSchedule ?? [],
        color: prevDoctor.color ?? updatedDoctor.color ?? getDefaultDoctorColor(),
      }))

      // Show success message
      setSaveScheduleSuccess(true)
      setTimeout(() => {
        setSaveScheduleSuccess(false)
      }, 3000)
    } catch (err) {
      console.error("[Doctor Detail] Error al guardar horario:", err)
      setSaveScheduleError(
        err instanceof Error
          ? err.message
          : "Error al guardar el horario. Por favor intenta de nuevo."
      )
    } finally {
      setSavingSchedule(false)
    }
  }

  async function handleChangeStatus(newStatus: "disponible" | "en-consulta" | "no-disponible") {
    try {
      setIsChangingStatus(true)
      setStatusChangeError(null)
      setStatusChangeSuccess(false)

      console.log("[Doctor Detail] Cambiando estado del doctor ID:", doctor.id, "a:", newStatus)

      // Call backend API to update doctor status
      const response = await doctorsService.updateStatus(doctor.id, newStatus)

      console.log("[Doctor Detail] Respuesta del servidor:", response)

      // Reload doctor data from backend to verify persistence
      console.log("[Doctor Detail] Recargando datos del doctor desde el backend...")
      const updatedDoctor = await doctorsService.getById(doctor.id)

      console.log("[Doctor Detail] Datos actualizados del backend:", updatedDoctor)

      // Update local state with fresh data from backend, preserving the color
      setDoctor((prevDoctor) => ({
        ...updatedDoctor,
        schedule: updatedDoctor.schedule ?? prevDoctor.schedule ?? [],
        workSchedule: updatedDoctor.workSchedule ?? prevDoctor.workSchedule ?? [],
        color: prevDoctor.color ?? updatedDoctor.color ?? getDefaultDoctorColor(),
      }))

      // Show success message
      setStatusChangeSuccess(true)
      setStatusEditMode(false)
      setTimeout(() => {
        setStatusChangeSuccess(false)
      }, 3000)
    } catch (err) {
      console.error("[Doctor Detail] Error al cambiar estado:", err)
      setStatusChangeError(
        err instanceof Error
          ? err.message
          : "Error al cambiar el estado. Por favor intenta de nuevo."
      )
    } finally {
      setIsChangingStatus(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        className="self-start text-muted-foreground hover:text-foreground"
        onClick={onBack}
      >
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Volver al listado
      </Button>

      {/* Success message */}
      {saveScheduleSuccess && (
        <div className="rounded-xl border border-accent/30 bg-accent/10 p-4 text-sm font-medium text-accent">
          Horario guardado exitosamente
        </div>
      )}

      {/* Error message */}
      {saveScheduleError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-medium text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {saveScheduleError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Left column: Profile + Contact */}
        <div className="flex flex-col gap-6">
          {/* Profile card */}
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <div className={`h-2 ${doctor.color ?? getDefaultDoctorColor()}`} />
            <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
              <Avatar className="h-20 w-20">
                <AvatarFallback className={`${doctor.color ?? getDefaultDoctorColor()} text-primary-foreground text-2xl font-semibold`}>
                  {doctor.initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-bold text-card-foreground">{doctor.name}</h2>
                <p className="text-sm text-primary font-medium">{doctor.specialty}</p>
                <p className="text-xs text-muted-foreground mt-1">Lic. {doctor.licenseNumber}</p>
                <div className="mt-3 flex flex-col gap-2">
                  {/* Status Display / Editor */}
                  {!statusEditMode ? (
                    <div className="flex items-center gap-2">
                      {getDoctorStatusBadge(doctor.status)}
                      {isOwnProfile && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setStatusEditMode(true)}
                          className="h-6 px-2 text-xs"
                        >
                          Cambiar
                        </Button>
                      )}
                    </div>
                  ) : (
                    // Status selector
                    <div className="flex gap-2 items-center">
                      <Select value={doctor.status} onValueChange={(value) => handleChangeStatus(value as "disponible" | "en-consulta" | "no-disponible")}>
                        <SelectTrigger className="w-[150px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="disponible">Disponible</SelectItem>
                          <SelectItem value="en-consulta">En Consulta</SelectItem>
                          <SelectItem value="no-disponible">No Disponible</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setStatusEditMode(false)}
                        className="h-8 px-2 text-xs"
                        disabled={isChangingStatus}
                      >
                        Cancelar
                      </Button>
                    </div>
                  )}

                  {/* Status change error message */}
                  {statusChangeError && (
                    <div className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {statusChangeError}
                    </div>
                  )}

                  {/* Status change success message */}
                  {statusChangeSuccess && (
                    <div className="text-xs text-accent flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Estado actualizado exitosamente
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 text-sm">
                <Star className="h-4 w-4 text-[hsl(43,74%,66%)]" />
                <span className="font-semibold text-card-foreground">{doctor.rating}</span>
                <span className="text-muted-foreground">({doctor.reviewCount} resenas)</span>
              </div>

              <div className="w-full flex flex-col gap-2 rounded-xl border border-border/50 p-4 text-left">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-card-foreground">{doctor.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-card-foreground">{doctor.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-card-foreground">{doctor.yearsExperience} anos de experiencia</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Monthly stats */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-card-foreground">
                Rendimiento Mensual
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <CalendarCheck className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-card-foreground">Citas Completadas</p>
                    <p className="text-sm font-semibold text-card-foreground">{doctor.monthlyStats?.completed || 0}</p>
                  </div>
                  <Progress value={((doctor.monthlyStats?.completed || 0) / 100) * 100} className="mt-1.5 h-1.5" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-card-foreground">Canceladas</p>
                    <p className="text-sm font-semibold text-card-foreground">{doctor.monthlyStats?.cancelled || 0}</p>
                  </div>
                  <Progress value={((doctor.monthlyStats?.cancelled || 0) / 10) * 100} className="mt-1.5 h-1.5 [&>div]:bg-destructive" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-card-foreground">Ingresos Generados</p>
                    <p className="text-sm font-semibold text-card-foreground">${doctor.monthlyStats?.revenue || 0}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Schedule + Work Schedule Editor */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          {/* Schedule header stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="border-border/50 shadow-sm">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pacientes Hoy</p>
                  <p className="text-xl font-bold text-card-foreground">{doctor.patientsToday}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 shadow-sm">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <Calendar className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ocupacion</p>
                  <p className="text-xl font-bold text-card-foreground">{occupancyRate}%</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 shadow-sm">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Pacientes</p>
                  <p className="text-xl font-bold text-card-foreground">{doctor.patientsTotal}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Work Schedule Editor */}
          <WorkScheduleEditor
            workSchedule={doctor.workSchedule}
            doctorColor={doctor.color ?? getDefaultDoctorColor()}
            onSave={handleSaveSchedule}
            saving={savingSchedule}
          />

          {/* Full schedule */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-card-foreground">
                    Agenda de Hoy
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">12 de febrero, 2026</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                    Ocupado
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                    Libre
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                    Descanso
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {schedule.length > 0 ? (
                schedule.map((slot, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-4 rounded-xl border px-4 py-3 transition-colors",
                      slot.status === "ocupado" && "border-primary/20 bg-primary/5",
                      slot.status === "libre" && "border-accent/20 bg-accent/5",
                      slot.status === "descanso" && "border-border/50 bg-muted/50"
                    )}
                  >
                    <span className="w-14 text-sm font-semibold text-card-foreground">{slot.time}</span>
                    <div
                      className={cn(
                        "h-8 w-1 rounded-full",
                        slot.status === "ocupado" && "bg-primary",
                        slot.status === "libre" && "bg-accent",
                        slot.status === "descanso" && "bg-muted-foreground/30"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      {slot.status === "ocupado" && (
                        <div>
                          <p className="text-sm font-medium text-card-foreground">{slot.patient}</p>
                          <p className="text-xs text-muted-foreground">{slot.treatment}</p>
                        </div>
                      )}
                      {slot.status === "libre" && (
                        <p className="text-sm text-accent font-medium">Horario disponible</p>
                      )}
                      {slot.status === "descanso" && (
                        <p className="text-sm text-muted-foreground italic">Hora de descanso</p>
                      )}
                    </div>
                    {slot.status === "libre" && (
                      <Button size="sm" variant="outline" className="border-accent/30 text-accent hover:bg-accent/10 hover:text-accent text-xs">
                        Agendar
                      </Button>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground py-4">No hay citas programadas para hoy</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
