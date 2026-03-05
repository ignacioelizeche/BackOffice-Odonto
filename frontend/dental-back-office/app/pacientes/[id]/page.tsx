"use client"

import { use, useEffect, useState } from "react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { PatientDetailContent } from "@/components/pacientes/patient-detail-content"
import { patientsService } from "@/services/patients.service"
import { notFound } from "next/navigation"
import { Loader2 } from "lucide-react"
import type { Patient } from "@/services/patients.service"

export default function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadPatient = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await patientsService.getById(parseInt(id))
        setPatient(data)
      } catch (err) {
        console.error("Error loading patient:", err)
        setError("Error al cargar los datos del paciente")
      } finally {
        setLoading(false)
      }
    }

    loadPatient()
  }, [id])

  if (loading) {
    return (
      <DashboardShell title="Cargando..." subtitle="Ficha dental del paciente">
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardShell>
    )
  }

  if (error || !patient) {
    notFound()
  }

  return (
    <DashboardShell
      title={patient.name}
      subtitle="Ficha dental del paciente"
    >
      <PatientDetailContent patient={patient} />
    </DashboardShell>
  )
}
