import { Suspense } from "react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { AppointmentForm } from "@/components/citas/appointment-form"

export default function NuevaCitaPage() {
  return (
    <DashboardShell
      title="Nueva Cita"
      subtitle="Programar una nueva cita para un paciente"
    >
      <Suspense fallback={<div>Cargando...</div>}>
        <AppointmentForm mode="crear" />
      </Suspense>
    </DashboardShell>
  )
}
