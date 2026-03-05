import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { AppointmentForm } from "@/components/citas/appointment-form"

export default function NuevaCitaPage() {
  return (
    <DashboardShell
      title="Nueva Cita"
      subtitle="Programar una nueva cita para un paciente"
    >
      <AppointmentForm mode="crear" />
    </DashboardShell>
  )
}
