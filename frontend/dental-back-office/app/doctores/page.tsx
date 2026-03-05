"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { DoctorsContent } from "@/components/doctores/doctors-content"
import { DoctorDetailView } from "@/components/doctores/doctor-detail-view"
import { Button } from "@/components/ui/button"
import { Plus, ArrowLeft } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { doctorsService, type Doctor } from "@/services/doctors.service"
import { Skeleton } from "@/components/ui/skeleton"

export default function DoctoresPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [doctorData, setDoctorData] = useState<Doctor | null>(null)
  const [isLoadingDoctor, setIsLoadingDoctor] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Only load doctor data if the user is loaded and is a doctor
    if (!isLoading && user?.role === "Doctor") {
      const loadDoctorProfile = async () => {
        try {
          setIsLoadingDoctor(true)
          setError(null)
          // Get the doctors list - should only return the current doctor
          const response = await doctorsService.getAll()
          if (response.data && response.data.length > 0) {
            const doctor = response.data[0]
            // Fetch full doctor details
            const fullDoctor = await doctorsService.getById(doctor.id)
            setDoctorData(fullDoctor)
          } else {
            setError("No se encontró tu perfil de doctor")
          }
        } catch (err) {
          console.error("Error loading doctor profile:", err)
          setError("Error al cargar tu perfil")
        } finally {
          setIsLoadingDoctor(false)
        }
      }
      loadDoctorProfile()
    }
  }, [user?.role, isLoading])

  // Show loading skeleton while loading
  if (isLoading || isLoadingDoctor) {
    return (
      <DashboardShell title="Doctores" subtitle="Equipo medico de la clinica">
        <div className="space-y-4">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardShell>
    )
  }

  // If user is a doctor and we have their data, show their detail profile
  if (user?.role === "Doctor" && doctorData) {
    return (
      <DashboardShell title="Mi Perfil" subtitle="Tu información profesional">
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Atrás
          </Button>
        </div>
        <DoctorDetailView
          doctor={{...doctorData, schedule: doctorData.schedule || []}}
          onBack={() => router.back()}
        />
      </DashboardShell>
    )
  }

  // If there's an error loading doctor data
  if (user?.role === "Doctor" && error) {
    return (
      <DashboardShell title="Doctores" subtitle="Equipo medico de la clinica">
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
          {error}
        </div>
      </DashboardShell>
    )
  }

  // If user is not a doctor, show the doctors list
  if (user?.role !== "Doctor") {
    return (
      <DashboardShell title="Doctores" subtitle="Equipo medico de la clinica">
        <div className="flex justify-end mb-4">
          <Button onClick={() => router.push("/doctores/nuevo")}>
            <Plus className="mr-2 h-4 w-4" />
            Crear Doctor
          </Button>
        </div>
        <DoctorsContent />
      </DashboardShell>
    )
  }

  // Fallback while loading
  return null
}
