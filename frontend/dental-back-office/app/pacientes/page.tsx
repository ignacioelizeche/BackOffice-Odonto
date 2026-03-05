"use client"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { PatientsContent } from "@/components/pacientes/patients-content"

export default function PacientesPage() {
  return (
    <DashboardShell title="Pacientes" subtitle="Gestion de pacientes de la clinica">
      <PatientsContent />
    </DashboardShell>
  )
}
