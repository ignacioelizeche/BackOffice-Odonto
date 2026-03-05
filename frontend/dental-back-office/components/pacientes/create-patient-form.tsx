"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, ArrowLeft, Check } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { patientsService, CreatePatientDTO } from "@/services/patients.service"

// Esquema de validación con Zod
const createPatientSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(10, "El teléfono debe tener al menos 10 caracteres"),
  age: z.coerce.number().min(1, "Debe ser un número positivo").max(120, "Edad inválida"),
  gender: z.string().min(1, "Seleccione un género"),
  doctor: z.string().min(3, "Seleccione un doctor"),
  status: z.enum(["activo", "inactivo", "nuevo"]).optional(),
})

type CreatePatientFormValues = z.infer<typeof createPatientSchema>

const genders = [
  "Masculino",
  "Femenino",
  "Otro",
]

const doctors = [
  "Dr. Carlos Mendez",
  "Dra. Ana Torres",
  "Dr. Luis Herrera",
  "Dra. Elena Rios",
]

export function CreatePatientForm() {
  const router = useRouter()
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isDoctor = user?.role === "Doctor"

  const form = useForm<CreatePatientFormValues>({
    resolver: zodResolver(createPatientSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      age: 0,
      gender: "",
      doctor: isDoctor ? user?.name || "" : "",
      status: "nuevo",
    },
  })

  // Auto-fill doctor field if user is a doctor
  useEffect(() => {
    if (isDoctor && user?.name) {
      form.setValue("doctor", user.name)
    }
  }, [isDoctor, user?.name, form])

  async function onSubmit(values: CreatePatientFormValues) {
    setIsSubmitting(true)

    try {
      // Preparar datos para enviar al backend
      const patientData: CreatePatientDTO = {
        ...values,
      }

      console.log("[Create Patient] Enviando datos del paciente:", patientData)
      console.log("[Create Patient] Usuario actual:", user)

      // Llamar al servicio API
      const newPatient = await patientsService.create(patientData)

      console.log("[Create Patient] Paciente creado exitosamente:", newPatient)

      toast.success("Paciente creado exitosamente", {
        description: `${newPatient.name} ha sido registrado en el sistema`,
      })

      // Redirigir a la lista de pacientes después de 1 segundo
      setTimeout(() => {
        router.push("/pacientes")
      }, 1000)

    } catch (error: any) {
      console.error("[Create Patient] Error durante la creación:", error)

      // Extract detailed error information
      let errorMessage = "No se pudo conectar con el servidor. Intente nuevamente."
      let errorDetails = ""

      if (error.response) {
        // API returned an error response
        console.error("[Create Patient] API Error Response:", {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers,
        })

        if (error.response.data?.detail) {
          errorMessage = error.response.data.detail
          errorDetails = JSON.stringify(error.response.data.detail)
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message
          errorDetails = JSON.stringify(error.response.data.message)
        } else if (typeof error.response.data === "string") {
          errorMessage = error.response.data
          errorDetails = error.response.data
        }
      } else if (error.message) {
        errorMessage = error.message
        errorDetails = error.message
      }

      console.error("[Create Patient] Final error message:", errorMessage)
      console.error("[Create Patient] Error details:", errorDetails)

      toast.error("Error al crear paciente", {
        description: errorMessage,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleCancel() {
    router.back()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Información Personal */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Información Personal</h3>
            <p className="text-sm text-muted-foreground">
              Datos básicos del paciente
            </p>
          </div>

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre Completo</FormLabel>
                <FormControl>
                  <Input placeholder="Maria Garcia Lopez" {...field} />
                </FormControl>
                <FormDescription>
                  Nombre completo del paciente
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="paciente@ejemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input placeholder="+52 55 1234 5678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="age"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Edad</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" max="120" placeholder="30" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Género</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione género" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {genders.map((gender) => (
                        <SelectItem key={gender} value={gender}>
                          {gender}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Información Médica */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Información Médica</h3>
            <p className="text-sm text-muted-foreground">
              Doctor asignado y estado del paciente
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="doctor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Doctor Asignado
                    {isDoctor && <span className="text-xs text-muted-foreground ml-2">(Tu perfil)</span>}
                  </FormLabel>
                  {isDoctor ? (
                    // If user is a doctor, show disabled input
                    <div className="flex items-center gap-2 p-3 rounded-md border border-input bg-muted/50">
                      <p className="text-sm font-medium">{user?.name}</p>
                      <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">Automático</span>
                    </div>
                  ) : (
                    // If user is not a doctor, show dropdown
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione doctor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {doctors.map((doctor) => (
                          <SelectItem key={doctor} value={doctor}>
                            {doctor}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <FormDescription>
                    {isDoctor ? "Los pacientes se asignan automáticamente a tu perfil" : "Doctor responsable del tratamiento"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione estado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="nuevo">Nuevo</SelectItem>
                      <SelectItem value="activo">Activo</SelectItem>
                      <SelectItem value="inactivo">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Estado actual del paciente
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Información adicional */}
        <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
          <h3 className="text-sm font-medium">Información del Odontograma</h3>
          <p className="text-sm text-muted-foreground">
            El odontograma se inicializará automáticamente con todos los dientes en estado "sano".
            Puede modificarlo después desde el perfil del paciente.
          </p>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Crear Paciente
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
