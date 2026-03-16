import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { ChangePasswordCard } from "@/components/mi-perfil/change-password-card"

export default function MiPerfilPage() {
  return (
    <DashboardShell
      title="Mi Perfil"
      subtitle="Administra tu compte y contraseña"
    >
      <ChangePasswordCard />
    </DashboardShell>
  )
}
