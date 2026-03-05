import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { SettingsContent } from "@/components/configuracion/settings-content"

export default function ConfiguracionPage() {
  return (
    <DashboardShell
      title="Configuracion"
      subtitle="Administra los ajustes de la clinica"
    >
      <SettingsContent />
    </DashboardShell>
  )
}
