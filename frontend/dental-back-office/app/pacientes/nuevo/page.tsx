import { Suspense } from "react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { CreatePatientForm } from "@/components/pacientes/create-patient-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function NewPatientPage() {
  return (
    <DashboardShell>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Crear Nuevo Paciente</h1>
          <p className="text-muted-foreground mt-2">
            Complete el formulario para registrar un nuevo paciente en el sistema
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Información del Paciente</CardTitle>
            <CardDescription>
              Ingrese los datos personales y médicos del paciente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div>Cargando formulario...</div>}>
              <CreatePatientForm />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
