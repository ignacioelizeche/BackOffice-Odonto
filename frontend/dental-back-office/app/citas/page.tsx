import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { CitasContent } from "@/components/citas/citas-content"

export default function CitasPage() {
  return (
    <DashboardShell
      title="Citas"
      subtitle="Gestiona las citas de la clinica"
    >
      <CitasContent />
    </DashboardShell>
  )
}
