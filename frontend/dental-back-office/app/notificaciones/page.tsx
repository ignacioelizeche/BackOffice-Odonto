import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { NotificationsContent } from "@/components/notificaciones/notifications-content"

export default function NotificationsPage() {
  return (
    <DashboardShell
      title="Notificaciones"
      subtitle="Gestiona todas tus notificaciones"
    >
      <NotificationsContent />
    </DashboardShell>
  )
}
