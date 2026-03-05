"use client"

import { useState } from "react"
import { DoctorsGrid } from "./doctors-grid"
import { DoctorDetailView } from "./doctor-detail-view"
import { DoctorsOverview } from "./doctors-overview"
import { doctorsService, type Doctor } from "@/services/doctors.service"
import { Loader2 } from "lucide-react"

export function DoctorsContent() {
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [loadingDoctor, setLoadingDoctor] = useState(false)

  const handleSelectDoctor = async (doctor: Doctor) => {
    try {
      setLoadingDoctor(true)
      // Cargar los datos completos del doctor incluyendo el workSchedule
      const fullDoctor = await doctorsService.getById(doctor.id)
      setSelectedDoctor(fullDoctor)
    } catch (error) {
      console.error("Error loading doctor details:", error)
      // Si hay error, use los datos básicos
      setSelectedDoctor(doctor)
    } finally {
      setLoadingDoctor(false)
    }
  }

  if (loadingDoctor) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <>
      <DoctorsOverview />
      {selectedDoctor ? (
        <DoctorDetailView
          doctor={selectedDoctor}
          onBack={() => setSelectedDoctor(null)}
        />
      ) : (
        <DoctorsGrid onSelectDoctor={handleSelectDoctor} />
      )}
    </>
  )
}
