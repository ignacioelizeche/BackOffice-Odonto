import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { EditCitaContent } from "@/components/citas/edit-cita-content"

interface EditCitaPageProps {
  params: Promise<{ id: string }>
}

export default async function EditCitaPage({ params }: EditCitaPageProps) {
  const { id } = await params

  return (
    <DashboardShell
      title="Editar Cita"
      subtitle="Modificar los detalles de la cita"
    >
      <EditCitaContent id={id} />
    </DashboardShell>
  )
}
