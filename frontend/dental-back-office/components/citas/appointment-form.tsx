"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Save, CalendarDays, Clock, User, Stethoscope, DollarSign, FileText, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { appointmentsService, type Appointment } from "@/services/appointments.service"
import { patientsService, type Patient } from "@/services/patients.service"
import { doctorsService, type Doctor } from "@/services/doctors.service"
import { AppointmentCalendar } from "./appointment-calendar"
import { TimeSlotSelector } from "./time-slot-selector"
import type { AvailableSlot } from "@/services/appointments.service"

const treatments = [
  "Limpieza dental",
  "Resina dental",
  "Endodoncia",
  "Extraccion molar",
  "Extraccion quirurgica",
  "Corona dental",
  "Corona temporal",
  "Implante dental",
  "Ortodoncia - Colocacion",
  "Ortodoncia - Ajuste",
  "Ortodoncia - Revision",
  "Blanqueamiento",
  "Consulta valoracion",
  "Protesis parcial",
  "Radiografia",
  "Cirugia menor",
]

const durations = [
  "15 min",
  "20 min",
  "30 min",
  "40 min",
  "45 min",
  "60 min",
  "90 min",
  "120 min",
]

interface AppointmentFormProps {
  mode: "crear" | "editar"
  initialData?: Appointment
}

export function AppointmentForm({ mode, initialData }: AppointmentFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialPatientId = searchParams.get('patientId')
  const { user } = useAuth()
  const isDoctor = user?.role === "Doctor"

  // Estados para datos de las listas
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Estados del formulario - usar IDs
  const [patientId, setPatientId] = useState(initialPatientId || "")
  const [doctorId, setDoctorId] = useState("")
  const [treatment, setTreatment] = useState(initialData?.treatment ?? "")
  const [date, setDate] = useState(initialData ? formatDateForInput(initialData.date) : "")
  const [time, setTime] = useState(initialData?.time ?? "")
  const [duration, setDuration] = useState(initialData?.duration ?? "")
  const [cost, setCost] = useState(initialData ? String(initialData.cost) : "")
  const [notes, setNotes] = useState(initialData?.notes ?? "")
  const [status, setStatus] = useState((initialData?.status ?? "pendiente") as any)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Nuevos estados para disponibilidad
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([])
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)

  // Cargar pacientes y doctores
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingData(true)
        setLoadError(null)
        const patientsResponse = await patientsService.getAll()
        const doctorsResponse = await doctorsService.getAll()
        setPatients(patientsResponse.data)
        setDoctors(doctorsResponse.data)

        // Si el usuario es doctor, auto-seleccionar su doctor_id
        if (isDoctor && doctorsResponse.data.length > 0) {
          // Encontrar el doctor que coincida con el nombre del usuario
          const userDoctor = doctorsResponse.data.find(d => d.name === user?.name)
          if (userDoctor) {
            setDoctorId(String(userDoctor.id))
          }
        }

        // Si hay datos iniciales (modo editar), buscar el paciente y doctor correctos
        if (initialData) {
          const patient = patientsResponse.data.find(p => p.name === initialData.patient)
          const doctor = doctorsResponse.data.find(d => d.name === initialData.doctor)

          if (patient) setPatientId(String(patient.id))
          if (doctor) setDoctorId(String(doctor.id))
        }
      } catch (err) {
        console.error("Error cargando datos:", err)
        setLoadError("Error al cargar pacientes y doctores")
      } finally {
        setLoadingData(false)
      }
    }
    loadData()
  }, [isDoctor, user?.name])

  // Pre-seleccionar paciente si viene de URL
  useEffect(() => {
    if (initialPatientId && patients.length > 0 && !patientId) {
      const patient = patients.find(p => p.id.toString() === initialPatientId)
      if (patient) {
        setPatientId(String(patient.id))
      }
    }
  }, [initialPatientId, patients])

  // Cargar slots disponibles cuando cambian doctor y fecha
  useEffect(() => {
    const loadAvailability = async () => {
      if (!doctorId || !date) {
        setAvailableSlots([])
        setAvailabilityError(null)
        setTime("")
        return
      }

      try {
        setLoadingAvailability(true)
        setAvailabilityError(null)

        const response = await appointmentsService.getAvailableSlots(
          Number(doctorId),
          date
        )

        setAvailableSlots(response.availableSlots || [])

        // Si el time actual no está en los slots disponibles, limpiarlo
        // (a menos que sea la hora original en modo editar)
        if (time && !response.availableSlots?.some(s => s.time === time)) {
          // Solo limpiar si no es la hora original de la cita
          if (mode === "crear" || time !== initialData?.time) {
            setTime("")
          }
        }
      } catch (err) {
        console.error("Error cargando disponibilidad:", err)
        setAvailabilityError("Error al cargar horarios disponibles")
      } finally {
        setLoadingAvailability(false)
      }
    }

    loadAvailability()
  }, [doctorId, date, mode, initialData?.time])

  function formatDateForInput(d: string): string {
    if (d.includes("-")) return d // Ya está en formato YYYY-MM-DD
    const months: Record<string, string> = {
      Ene: "01", Feb: "02", Mar: "03", Abr: "04", May: "05", Jun: "06",
      Jul: "07", Ago: "08", Sep: "09", Oct: "10", Nov: "11", Dic: "12",
    }
    const parts = d.split(" ")
    if (parts.length === 3) {
      const day = parts[0].padStart(2, "0")
      const month = months[parts[1]] ?? "01"
      const year = parts[2]
      return `${year}-${month}-${day}`
    }
    return ""
  }

  const selectedDoctor = doctors.find((d) => d.id === Number(doctorId))

  async function handleSave() {
    try {
      setSaving(true)
      setSaveError(null)

      const costNum = Number(cost) || 0

      if (mode === "crear") {
        await appointmentsService.create({
          patientId: Number(patientId),
          doctorId: Number(doctorId),
          treatment,
          date,
          time,
          duration,
          cost: costNum,
          notes,
        })
      } else if (initialData) {
        await appointmentsService.update(initialData.id, {
          patientId: Number(patientId),
          doctorId: Number(doctorId),
          treatment,
          date,
          time,
          duration,
          cost: costNum,
          notes,
          status,
        })
      }

      setSaved(true)
      setTimeout(() => {
        router.push("/citas")
      }, 1200)
    } catch (err) {
      console.error("Error al guardar cita:", err)
      setSaveError("Error al guardar la cita. Por favor intenta de nuevo.")
    } finally {
      setSaving(false)
    }
  }

  const isValid = patientId && doctorId && treatment && date && time && duration

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link
          href="/citas"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Citas
        </Link>
      </div>

      {/* Success */}
      {saved && (
        <div className="rounded-xl border border-accent/30 bg-accent/10 p-4 text-sm font-medium text-accent">
          {mode === "crear" ? "Cita creada exitosamente." : "Cita actualizada exitosamente."} Redirigiendo...
        </div>
      )}

      {/* Error */}
      {saveError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-medium text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {saveError}
        </div>
      )}

      {/* Loading */}
      {loadingData && (
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Cargando datos...</p>
          </CardContent>
        </Card>
      )}

      {!loadingData && (
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Left: Main form */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          {/* Patient + Doctor */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
                <User className="h-5 w-5 text-primary" />
                Paciente y Doctor
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="patient" className="text-sm font-medium text-foreground">
                    Paciente <span className="text-destructive">*</span>
                  </Label>
                  <Select value={patientId} onValueChange={setPatientId}>
                    <SelectTrigger id="patient" className="border-border/50 bg-background">
                      <SelectValue placeholder="Seleccionar paciente" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name} - {p.age} años
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="doctor" className="text-sm font-medium text-foreground">
                    Doctor <span className="text-destructive">*</span>
                    {isDoctor && <span className="text-xs text-muted-foreground ml-2">(Tu perfil)</span>}
                  </Label>
                  {isDoctor ? (
                    // If user is a doctor, show a display-only box
                    <div className="flex items-center gap-2 p-3 rounded-md border border-input bg-muted/50">
                      <p className="text-sm font-medium">{doctors.find(d => d.id === Number(doctorId))?.name || "Cargando..."}</p>
                      <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">Automático</span>
                    </div>
                  ) : (
                    // If user is not a doctor, show the dropdown
                    <Select value={doctorId} onValueChange={setDoctorId}>
                      <SelectTrigger id="doctor" className="border-border/50 bg-background">
                        <SelectValue placeholder="Seleccionar doctor" />
                      </SelectTrigger>
                      <SelectContent>
                        {doctors.map((d) => (
                          <SelectItem key={d.id} value={String(d.id)}>
                            {d.name} - {d.specialty}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {selectedDoctor && (
                <div className="rounded-xl border border-border/50 bg-muted/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Doctor Seleccionado
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                      {selectedDoctor.initials}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-card-foreground">{selectedDoctor.name}</p>
                      <p className="text-xs text-muted-foreground">{selectedDoctor.specialty} - Lic. {selectedDoctor.licenseNumber}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Treatment + Schedule */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
                <Stethoscope className="h-5 w-5 text-primary" />
                Tratamiento y Horario
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="treatment" className="text-sm font-medium text-foreground">
                  Tratamiento <span className="text-destructive">*</span>
                </Label>
                <Select value={treatment} onValueChange={setTreatment}>
                  <SelectTrigger id="treatment" className="border-border/50 bg-background">
                    <SelectValue placeholder="Seleccionar tratamiento" />
                  </SelectTrigger>
                  <SelectContent>
                    {treatments.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator className="bg-border/50" />

              {availabilityError && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {availabilityError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <div>
                  <AppointmentCalendar
                    doctorId={Number(doctorId)}
                    onDateSelect={setDate}
                    selectedDate={date}
                  />
                </div>
                <div>
                  <TimeSlotSelector
                    slots={availableSlots}
                    selectedTime={time}
                    onTimeSelect={setTime}
                    loading={loadingAvailability}
                    initialTime={mode === "editar" ? initialData?.time : undefined}
                    initialDate={mode === "editar" ? formatDateForInput(initialData?.date ?? "") : undefined}
                    currentDate={date}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="duration" className="text-sm font-medium text-foreground">
                  Duracion <span className="text-destructive">*</span>
                </Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger id="duration" className="border-border/50 bg-background">
                    <SelectValue placeholder="Seleccionar duración" />
                  </SelectTrigger>
                  <SelectContent>
                    {durations.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
                <FileText className="h-5 w-5 text-primary" />
                Notas Clinicas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Escribir notas sobre la cita, indicaciones especiales, antecedentes relevantes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                className="border-border/50 bg-background resize-none"
              />
            </CardContent>
          </Card>
        </div>

        {/* Right: Summary + status */}
        <div className="flex flex-col gap-6">
          {/* Status (edit only) */}
          {mode === "editar" && (
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-card-foreground">
                  Estado de la Cita
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                  <SelectTrigger className="border-border/50 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="confirmada">Confirmada</SelectItem>
                    <SelectItem value="en-curso">En Curso</SelectItem>
                    <SelectItem value="completada">Completada</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {/* Cost */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
                <DollarSign className="h-5 w-5 text-primary" />
                Costo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <Label htmlFor="cost" className="text-sm font-medium text-foreground">
                  Costo del tratamiento (MXN)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <Input
                    id="cost"
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={cost}
                    onChange={(e) => setCost(e.target.value.replace(/[^0-9.]/g, ""))}
                    className="border-border/50 bg-background pl-7"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-card-foreground">
                Resumen
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <SummaryRow 
                label="Paciente" 
                value={patients.find(p => p.id === Number(patientId))?.name || "---"} 
              />
              <SummaryRow 
                label="Doctor" 
                value={doctors.find(d => d.id === Number(doctorId))?.name || "---"} 
              />
              <SummaryRow label="Tratamiento" value={treatment || "---"} />
              <SummaryRow label="Fecha" value={date ? formatDisplayDate(date) : "---"} />
              <SummaryRow label="Hora" value={time || "---"} />
              <SummaryRow label="Duracion" value={duration || "---"} />
              <Separator className="bg-border/50" />
              <SummaryRow label="Costo" value={cost ? `$${Number(cost).toLocaleString("es-MX")}` : "---"} bold />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              size="lg"
              disabled={!isValid || saved || saving}
              onClick={handleSave}
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Guardando..." : (mode === "crear" ? "Crear Cita" : "Guardar Cambios")}
            </Button>
            <Button
              variant="outline"
              className="w-full border-border/50"
              size="lg"
              asChild
            >
              <Link href="/citas">Cancelar</Link>
            </Button>
          </div>
        </div>
      </div>
      )}
    </div>
  )
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? "font-bold text-card-foreground text-base" : "font-medium text-card-foreground"}>
        {value}
      </span>
    </div>
  )
}

function formatDisplayDate(iso: string): string {
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
  const [y, m, d] = iso.split("-")
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`
}
