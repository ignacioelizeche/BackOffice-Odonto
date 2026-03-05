"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  X,
  Phone,
  Calendar,
  Clock,
  Stethoscope,
  DollarSign,
  FileText,
  CheckCircle,
  XCircle,
  Pencil,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { Appointment, appointmentsService } from "@/services/appointments.service"

function getStatusBadge(status: string) {
  switch (status) {
    case "confirmada":
      return <Badge className="bg-accent/15 text-accent border-transparent font-medium">Confirmada</Badge>
    case "pendiente":
      return <Badge className="bg-[hsl(43,74%,66%)]/15 text-[hsl(35,80%,40%)] border-transparent font-medium">Pendiente</Badge>
    case "en-curso":
      return <Badge className="bg-primary/15 text-primary border-transparent font-medium">En Curso</Badge>
    case "completada":
      return <Badge className="bg-secondary text-secondary-foreground border-transparent font-medium">Completada</Badge>
    case "cancelada":
      return <Badge className="bg-destructive/15 text-destructive border-transparent font-medium">Cancelada</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

interface CitaDetailPanelProps {
  cita: Appointment & { cost: string }
  onClose: () => void
  onStatusChanged?: () => void
}

export function CitaDetailPanel({ cita, onClose, onStatusChanged }: CitaDetailPanelProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentStatus, setCurrentStatus] = useState(cita.status)

  // Sincronizar el estado cuando cambia la cita seleccionada
  useEffect(() => {
    setCurrentStatus(cita.status)
    setError(null)
  }, [cita.id])

  const handleStatusChange = async (newStatus: "pendiente" | "confirmada" | "completada" | "cancelada") => {
    try {
      setLoading(true)
      setError(null)
      await appointmentsService.updateStatus(cita.id, newStatus)
      setCurrentStatus(newStatus)
      onStatusChanged?.()
      // Cerrar el panel después de cambiar el estado
      setTimeout(() => {
        onClose()
      }, 800)
    } catch (err) {
      console.error("Error al cambiar estado:", err)
      setError(err instanceof Error ? err.message : "Error al cambiar el estado de la cita")
    } finally {
      setLoading(false)
    }
  }
  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg font-semibold text-card-foreground">
            Detalle de la Cita
          </CardTitle>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Cerrar panel</span>
          </button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {/* Patient identity */}
        <div className="flex flex-col items-center gap-3 text-center">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
              {cita.patientInitials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-lg font-semibold text-card-foreground">{cita.patient}</p>
            <p className="text-sm text-muted-foreground">{cita.patientAge} anos</p>
            <div className="mt-2">{getStatusBadge(currentStatus)}</div>
          </div>
        </div>

        {/* Appointment details */}
        <div className="flex flex-col gap-3 rounded-xl border border-border/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Informacion de la Cita
          </p>
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-card-foreground font-medium">{cita.date}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-card-foreground">{cita.time} - Duracion: {cita.duration}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-card-foreground font-medium">{cita.treatment}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <p className="text-card-foreground font-medium">{cita.cost}</p>
          </div>
        </div>

        {/* Doctor info */}
        <div className="flex flex-col gap-3 rounded-xl border border-border/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Doctor Asignado
          </p>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-accent text-accent-foreground text-xs font-semibold">
                {cita.doctor.split(" ").filter((_,i)=> i > 0).map(n => n[0]).join("").slice(0,2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-card-foreground">{cita.doctor}</p>
              <p className="text-xs text-muted-foreground">{cita.doctorSpecialty}</p>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="flex items-center gap-3 rounded-xl border border-border/50 p-4 text-sm">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span className="text-card-foreground">{cita.patientPhone}</span>
        </div>

        {/* Notes */}
        <div className="flex flex-col gap-2 rounded-xl border border-border/50 p-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Notas
            </p>
          </div>
          <p className="text-sm text-card-foreground leading-relaxed">{cita.notes}</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {(currentStatus === "pendiente" || currentStatus === "confirmada") && (
            <Button
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              size="sm"
              onClick={() => handleStatusChange("completada")}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-1.5 h-4 w-4" />
              )}
              {loading ? "Procesando..." : "Marcar Completada"}
            </Button>
          )}
          {currentStatus === "pendiente" && (
            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              size="sm"
              onClick={() => handleStatusChange("confirmada")}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-1.5 h-4 w-4" />
              )}
              {loading ? "Procesando..." : "Confirmar Cita"}
            </Button>
          )}
          <Button variant="outline" className="w-full border-border/50" size="sm" asChild>
            <Link href={`/citas/editar/${cita.id}`}>
              <Pencil className="mr-1.5 h-4 w-4" />
              Editar Cita
            </Link>
          </Button>
          {currentStatus !== "cancelada" && currentStatus !== "completada" && (
            <Button
              variant="outline"
              className="w-full border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
              size="sm"
              onClick={() => handleStatusChange("cancelada")}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-1.5 h-4 w-4" />
              )}
              {loading ? "Procesando..." : "Cancelar Cita"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
