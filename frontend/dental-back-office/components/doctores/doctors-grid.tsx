"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Clock,
  Star,
  Users,
  Calendar,
  ChevronRight,
  Mail,
  Phone,
  Loader2,
} from "lucide-react"
import { doctorsService, type Doctor } from "@/services/doctors.service"

const colorMap: Record<number, string> = {
  0: "bg-blue-500",
  1: "bg-green-500",
  2: "bg-purple-500",
  3: "bg-orange-500",
  4: "bg-red-500",
  5: "bg-pink-500",
}

function getDoctorStatusBadge(status: string) {
  switch (status) {
    case "disponible":
      return <Badge className="bg-accent/15 text-accent border-transparent text-xs font-medium">Disponible</Badge>
    case "en-consulta":
      return <Badge className="bg-primary/15 text-primary border-transparent text-xs font-medium">En Consulta</Badge>
    case "no-disponible":
      return <Badge className="bg-muted text-muted-foreground border-transparent text-xs font-medium">No Disponible</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

interface DoctorsGridProps {
  onSelectDoctor: (doctor: Doctor) => void
}

export function DoctorsGrid({ onSelectDoctor }: DoctorsGridProps) {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadDoctors = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await doctorsService.getAll()
        setDoctors(response.data)
      } catch (err) {
        console.error("Error loading doctors:", err)
        setError("Error al cargar doctores")
      } finally {
        setLoading(false)
      }
    }

    loadDoctors()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-12 text-center text-red-500">
        <p>{error}</p>
      </div>
    )
  }

  if (doctors.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p>No hay doctores registrados</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {doctors.map((doctor, index) => (
        <Card
          key={doctor.id}
          className="border-border/50 shadow-sm overflow-hidden transition-shadow hover:shadow-md"
        >
          <CardContent className="p-0">
            {/* Top color bar */}
            <div className={`h-1.5 ${colorMap[index % 6]}`} />

            <div className="p-6 flex flex-col gap-5">
              {/* Header row */}
              <div className="flex items-start gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className={`${colorMap[index % 6]} text-white text-lg font-semibold`}>
                    {doctor.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-card-foreground">{doctor.name}</h3>
                    {getDoctorStatusBadge(doctor.status)}
                  </div>
                  <p className="text-sm text-primary font-medium">{doctor.specialty}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Lic. {doctor.licenseNumber}</p>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center rounded-xl border border-border/50 py-3">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span className="text-xs">Pacientes</span>
                  </div>
                  <p className="text-lg font-bold text-card-foreground mt-0.5">{doctor.patientsTotal}</p>
                </div>
                <div className="flex flex-col items-center rounded-xl border border-border/50 py-3">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Star className="h-3.5 w-3.5" />
                    <span className="text-xs">Rating</span>
                  </div>
                  <p className="text-lg font-bold text-card-foreground mt-0.5">{doctor.rating.toFixed(1)}</p>
                </div>
                <div className="flex flex-col items-center rounded-xl border border-border/50 py-3">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="text-xs">Exp.</span>
                  </div>
                  <p className="text-lg font-bold text-card-foreground mt-0.5">{doctor.yearsExperience}a</p>
                </div>
              </div>

              {/* Contact row */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  <span>{doctor.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  <span>{doctor.phone}</span>
                </div>
              </div>

              {/* Today's schedule preview */}
              <div className="rounded-xl border border-border/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Pacientes Hoy
                  </p>
                  <span className="text-xs text-primary font-medium">
                    <Calendar className="h-3 w-3 inline mr-1" />
                    {doctor.patientsToday || 0} pacientes
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  <p>Estado: {doctor.status}</p>
                </div>
              </div>

              {/* Footer actions */}
              <div className="flex items-center justify-between pt-1">
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-card-foreground">{doctor.reviewCount || 0}</span> opiniones
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary hover:text-primary/80 hover:bg-primary/5"
                  onClick={() => onSelectDoctor(doctor)}
                >
                  Ver Perfil
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
