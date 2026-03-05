"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Clock, Loader2 } from "lucide-react"
import { doctorsService, type Doctor } from "@/services/doctors.service"

const colorMap: Record<number, string> = {
  0: "bg-blue-500",
  1: "bg-green-500",
  2: "bg-purple-500",
  3: "bg-orange-500",
  4: "bg-red-500",
  5: "bg-pink-500",
}

function getDoctorStatus(status: string) {
  if (status === "disponible") {
    return <Badge className="bg-accent/15 text-accent border-transparent text-xs">Disponible</Badge>
  }
  return <Badge className="bg-primary/15 text-primary border-transparent text-xs">En Consulta</Badge>
}

export function DoctorCards() {
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
      <Card className="border-border/50 shadow-sm">
        <CardContent className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-border/50 shadow-sm">
        <CardContent className="py-12 text-center text-red-500">
          <p>{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-card-foreground">Equipo Medico</CardTitle>
        <p className="text-sm text-muted-foreground">Estado actual de los doctores</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {doctors.map((doctor, index) => (
          <div
            key={doctor.id}
            className="flex items-center gap-4 rounded-xl border border-border/50 p-4 transition-colors hover:bg-muted/50"
          >
            <Avatar className="h-11 w-11">
              <AvatarFallback className={`${colorMap[index % 6]} text-primary-foreground text-sm font-semibold`}>
                {doctor.initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-card-foreground truncate">{doctor.name}</p>
                {getDoctorStatus(doctor.status)}
              </div>
              <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
              <div className="mt-1.5 flex items-center gap-4 text-xs text-muted-foreground">
                <span>{doctor.patientsToday || 0} pacientes hoy</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {doctor.yearsExperience}+ años
                </span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
