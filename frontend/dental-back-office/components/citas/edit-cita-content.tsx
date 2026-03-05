"use client"

import { useState, useEffect } from "react"
import { AppointmentForm } from "./appointment-form"
import { appointmentsService } from "@/services/appointments.service"
import Link from "next/link"
import { ArrowLeft, AlertTriangle, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface EditCitaContentProps {
  id: string
}

export function EditCitaContent({ id }: EditCitaContentProps) {
  const [cita, setCita] = useState(null as any)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadCita = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await appointmentsService.getById(Number(id))
        setCita(data)
      } catch (err) {
        console.error("Error cargando cita:", err)
        setError("Error al cargar la cita. Verifica que el ID es válido.")
      } finally {
        setLoading(false)
      }
    }

    loadCita()
  }, [id])

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Link
          href="/citas"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Citas
        </Link>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !cita) {
    return (
      <div className="flex flex-col gap-4">
        <Link
          href="/citas"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Citas
        </Link>
        <Card className="border-destructive/30 shadow-sm">
          <CardContent className="flex items-center gap-3 p-6">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium text-card-foreground">Cita no encontrada</p>
              <p className="text-sm text-muted-foreground">
                {error || `No se encontro una cita con el ID #${id}. Es posible que haya sido eliminada.`}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <AppointmentForm mode="editar" initialData={cita} />
}
