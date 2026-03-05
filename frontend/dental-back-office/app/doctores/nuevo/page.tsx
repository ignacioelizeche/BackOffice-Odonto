import { Suspense } from "react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { CreateDoctorForm } from "@/components/doctores/create-doctor-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function NewDoctorPage() {
  return (
    <DashboardShell title="Nuevo Doctor" subtitle="Registrar un nuevo doctor en el sistema">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Crear Nuevo Doctor</h1>
          <p className="text-muted-foreground mt-2">
            Complete el formulario para registrar un nuevo doctor en el sistema
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Información del Doctor</CardTitle>
            <CardDescription>
              Ingrese los datos personales y profesionales del doctor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div>Cargando formulario...</div>}>
              <CreateDoctorForm />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
