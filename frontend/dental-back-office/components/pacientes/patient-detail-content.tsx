"use client"

import { useState, useCallback, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  Stethoscope,
  Activity,
  Plus,
  Pencil,
} from "lucide-react"
import Link from "next/link"
import { DentalChart } from "./dental-chart"
import { ToothDetailPanel } from "./tooth-detail-panel"
import type { Patient, ToothData, ToothRecord } from "./patients-data"
import { patientsService } from "@/services/patients.service"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

function getStatusBadge(status: string) {
  switch (status) {
    case "activo":
      return <Badge className="bg-accent/15 text-accent border-transparent text-xs font-medium">Activo</Badge>
    case "inactivo":
      return <Badge className="bg-muted text-muted-foreground border-transparent text-xs font-medium">Inactivo</Badge>
    case "nuevo":
      return <Badge className="bg-primary/15 text-primary border-transparent text-xs font-medium">Nuevo</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

interface PatientDetailContentProps {
  patient: Patient
  onPatientUpdated?: (patient: Patient) => void
}

export function PatientDetailContent({ patient: initialPatient, onPatientUpdated }: PatientDetailContentProps) {
  const [patient, setPatient] = useState<Patient>(initialPatient)
  const [teeth, setTeeth] = useState<ToothData[]>(initialPatient.teeth ?? [])
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [editForm, setEditForm] = useState({
    name: initialPatient.name,
    email: initialPatient.email || "",
    phone: initialPatient.phone,
    age: initialPatient.age,
    gender: initialPatient.gender,
    doctor: initialPatient.doctor,
    status: initialPatient.status,
  })

  useEffect(() => {
    setPatient(initialPatient)
    setTeeth(initialPatient.teeth ?? [])
    setEditForm({
      name: initialPatient.name,
      email: initialPatient.email || "",
      phone: initialPatient.phone,
      age: initialPatient.age,
      gender: initialPatient.gender,
      doctor: initialPatient.doctor,
      status: initialPatient.status,
    })
  }, [initialPatient])

  const selectedToothData = selectedTooth !== null
    ? teeth.find((t) => t.number === selectedTooth)
    : null

  const handleAddRecord = useCallback(async (toothNumber: number, record: ToothRecord) => {
    try {
      // Parse cost from currency format (e.g., "$1,200" -> 1200) or use numeric value directly
      const costValue = typeof record.cost === "number"
        ? record.cost
        : parseFloat(String(record.cost).replace(/[$,]/g, "")) || 0

      // Call API to save the record
      await patientsService.addDentalRecord(patient.id, toothNumber, {
        treatment: record.treatment,
        doctor: record.doctor,
        notes: record.notes,
        cost: costValue,
        files: record.files,
      })

      // Update local state after successful API call
      setTeeth((prev) =>
        prev.map((t) => {
          if (t.number !== toothNumber) return t
          return {
            ...t,
            status: t.status === "sano" ? "tratado" : t.status,
            records: [record, ...t.records],
          }
        })
      )
    } catch (error) {
      console.error("Error adding dental record:", error)
      // Optionally, you can show an error toast here
    }
  }, [patient.id])

  const handleSaveEdit = useCallback(async () => {
    try {
      setIsSavingEdit(true)

      await patientsService.update(patient.id, {
        name: editForm.name.trim(),
        email: editForm.email.trim() || undefined,
        phone: editForm.phone.trim(),
        age: Number(editForm.age),
        gender: editForm.gender as "Masculino" | "Femenino",
        doctor: editForm.doctor.trim(),
        status: editForm.status as "activo" | "inactivo" | "nuevo",
      })

      const updated = await patientsService.getById(patient.id)
      setPatient(updated)
      setTeeth(updated.teeth ?? [])
      onPatientUpdated?.(updated)
      setIsEditOpen(false)

      toast.success("Paciente actualizado correctamente")
    } catch (error) {
      console.error("Error updating patient:", error)
      toast.error("No se pudo actualizar el paciente")
    } finally {
      setIsSavingEdit(false)
    }
  }, [editForm, patient.id, onPatientUpdated])

  const handleUpdateToothStatus = useCallback((toothNumber: number, status: string) => {
    setTeeth((prev) =>
      prev.map((t) => {
        if (t.number !== toothNumber) return t
        return { ...t, status: status as "pendiente" | "sano" | "tratado" | "en_tratamiento" | "extraccion" }
      })
    )
  }, [])

  // Computed stats from teeth
  const treatedCount = teeth.filter((t) => t.status === "tratado").length
  const inTreatmentCount = teeth.filter((t) => t.status === "en_tratamiento").length
  const pendingCount = teeth.filter((t) => t.status === "pendiente").length
  const extractionCount = teeth.filter((t) => t.status === "extraccion").length
  const totalRecords = teeth.reduce((sum, t) => sum + t.records.length, 0)

  return (
    <div className="flex flex-col gap-6">
      {/* Back link */}
      <Link
        href="/pacientes"
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Pacientes
      </Link>

      {/* Patient header card */}
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
                  {patient.initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-card-foreground">{patient.name}</h1>
                  {getStatusBadge(patient.status)}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {patient.age} anos - {patient.gender}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {patient.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" />
                      {patient.email}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    {patient.phone}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Stethoscope className="h-3.5 w-3.5" />
                    {patient.doctor}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick stats row + Actions */}
            <div className="flex flex-col gap-3">
              {/* Quick stats row */}
              <div className="flex flex-wrap gap-3">
                <div className="flex flex-col items-center gap-1 rounded-xl border border-border/50 px-5 py-3">
                  <Calendar className="h-4 w-4 text-primary" />
                  <p className="text-lg font-bold text-card-foreground">{patient.totalVisits}</p>
                  <p className="text-xs text-muted-foreground">Visitas</p>
                </div>
                <div className="flex flex-col items-center gap-1 rounded-xl border border-border/50 px-5 py-3">
                  <CreditCard className="h-4 w-4 text-accent" />
                  <p className="text-lg font-bold text-card-foreground">{patient.balance}</p>
                  <p className="text-xs text-muted-foreground">Saldo</p>
                </div>
                <div className="flex flex-col items-center gap-1 rounded-xl border border-border/50 px-5 py-3">
                  <Activity className="h-4 w-4 text-primary" />
                  <p className="text-lg font-bold text-card-foreground">{totalRecords}</p>
                  <p className="text-xs text-muted-foreground">Registros</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setIsEditOpen(true)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar datos
                </Button>

                <Link
                  href={`/citas/nueva?patientId=${patient.id}`}
                  className="w-full"
                >
                  <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva Cita
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Appointment info */}
          <div className="mt-5 flex flex-wrap items-center gap-6 rounded-xl border border-border/50 bg-muted/30 px-5 py-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Ultima visita:</span>
              <span className="font-medium text-card-foreground">{patient.lastVisit}</span>
            </div>
            {patient.nextAppt && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Proxima cita:</span>
                <span className="font-medium text-primary">{patient.nextAppt}</span>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {patient.treatments.map((t) => (
                <Badge key={t} variant="secondary" className="bg-secondary text-secondary-foreground border-transparent text-xs">
                  {t}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dental summary row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <span className="text-sm font-bold text-primary">{treatedCount}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-card-foreground">Tratados</p>
            <p className="text-xs text-muted-foreground">Dientes con tratamiento</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
            <span className="text-sm font-bold text-amber-700">{inTreatmentCount}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-card-foreground">En Tratamiento</p>
            <p className="text-xs text-muted-foreground">Procedimientos activos</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
            <span className="text-sm font-bold text-orange-700">{pendingCount}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-card-foreground">Pendientes</p>
            <p className="text-xs text-muted-foreground">Requieren atencion</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
            <span className="text-sm font-bold text-destructive">{extractionCount}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-card-foreground">Extracciones</p>
            <p className="text-xs text-muted-foreground">Dientes extraidos</p>
          </div>
        </div>
      </div>

      {/* Main content: chart + detail panel */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Dental chart */}
        <div className={cn(selectedToothData ? "xl:col-span-2" : "xl:col-span-3")}>
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold text-card-foreground">
                Odontograma
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Selecciona un diente para ver su historial o agregar un nuevo registro
              </p>
            </CardHeader>
            <CardContent className="pb-6">
              <DentalChart
                teeth={teeth}
                selectedTooth={selectedTooth}
                onSelectTooth={(num) =>
                  setSelectedTooth(num === selectedTooth ? null : num)
                }
              />
            </CardContent>
          </Card>
        </div>

        {/* Tooth detail panel */}
        {selectedToothData && (
          <div>
            <ToothDetailPanel
              toothData={selectedToothData}
              onAddRecord={handleAddRecord}
              onUpdateToothStatus={handleUpdateToothStatus}
              onClose={() => setSelectedTooth(null)}
            />
          </div>
        )}
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar paciente</DialogTitle>
            <DialogDescription>
              Actualiza los datos de la ficha del paciente.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              placeholder="Nombre"
              value={editForm.name}
              onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <Input
              placeholder="Email"
              value={editForm.email}
              onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
            />
            <Input
              placeholder="Telefono"
              value={editForm.phone}
              onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
            />
            <Input
              type="number"
              min={0}
              placeholder="Edad"
              value={editForm.age}
              onChange={(e) => setEditForm((prev) => ({ ...prev, age: Number(e.target.value) || 0 }))}
            />

            <Select
              value={editForm.gender}
              onValueChange={(value) => setEditForm((prev) => ({ ...prev, gender: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Genero" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Masculino">Masculino</SelectItem>
                <SelectItem value="Femenino">Femenino</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={editForm.status}
              onValueChange={(value) => setEditForm((prev) => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nuevo">Nuevo</SelectItem>
                <SelectItem value="activo">Activo</SelectItem>
                <SelectItem value="inactivo">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Input
            placeholder="Doctor asignado"
            value={editForm.doctor}
            onChange={(e) => setEditForm((prev) => ({ ...prev, doctor: e.target.value }))}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSavingEdit}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSavingEdit}>
              {isSavingEdit ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
