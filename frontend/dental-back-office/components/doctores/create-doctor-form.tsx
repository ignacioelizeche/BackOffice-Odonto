"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, ArrowLeft, Check } from "lucide-react"

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
import { doctorsService, CreateDoctorDTO, WorkDay } from "@/services/doctors.service"

// Esquema de validación con Zod
const createDoctorSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(10, "El teléfono debe tener al menos 10 caracteres"),
  specialty: z.string().min(2, "Seleccione una especialidad"),
  licenseNumber: z.string().min(5, "El número de licencia debe tener al menos 5 caracteres"),
  yearsExperience: z.coerce.number().min(0, "Debe ser un número positivo").max(50, "Valor máximo 50 años"),
})

type CreateDoctorFormValues = z.infer<typeof createDoctorSchema>

const specialties = [
  "Odontologia General",
  "Cirugia Oral",
  "Ortodoncia",
  "Endodoncia",
  "Periodoncia",
  "Prostodoncia",
  "Odontopediatria",
  "Implantologia",
  "Estetica Dental",
]

// Horario por defecto (Lunes a Viernes 9am-6pm)
const defaultWorkSchedule: WorkDay[] = [
  { day: "Lunes", active: true, startTime: "09:00", endTime: "18:00", breakStart: "13:00", breakEnd: "14:00" },
  { day: "Martes", active: true, startTime: "09:00", endTime: "18:00", breakStart: "13:00", breakEnd: "14:00" },
  { day: "Miercoles", active: true, startTime: "09:00", endTime: "18:00", breakStart: "13:00", breakEnd: "14:00" },
  { day: "Jueves", active: true, startTime: "09:00", endTime: "18:00", breakStart: "13:00", breakEnd: "14:00" },
  { day: "Viernes", active: true, startTime: "09:00", endTime: "18:00", breakStart: "13:00", breakEnd: "14:00" },
  { day: "Sabado", active: false, startTime: "", endTime: "", breakStart: "", breakEnd: "" },
  { day: "Domingo", active: false, startTime: "", endTime: "", breakStart: "", breakEnd: "" },
]

export function CreateDoctorForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<CreateDoctorFormValues>({
    resolver: zodResolver(createDoctorSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      specialty: "",
      licenseNumber: "",
      yearsExperience: 0,
    },
  })

  async function onSubmit(values: CreateDoctorFormValues) {
    setIsSubmitting(true)

    try {
      // Preparar datos para enviar al backend
      const doctorData: CreateDoctorDTO = {
        ...values,
        workSchedule: defaultWorkSchedule,
      }

      // Llamar al servicio API
      const newDoctor = await doctorsService.create(doctorData)

      toast.success("Doctor creado exitosamente", {
        description: `${newDoctor.name} ha sido registrado en el sistema`,
      })

      // Redirigir a la lista de doctores después de 1 segundo
      setTimeout(() => {
        router.push("/doctores")
      }, 1000)

    } catch (error: any) {
      console.error("Error al crear doctor:", error)

      toast.error("Error al crear doctor", {
        description: error.message || "No se pudo conectar con el servidor. Intente nuevamente.",
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
              Datos básicos del doctor
            </p>
          </div>

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre Completo</FormLabel>
                <FormControl>
                  <Input placeholder="Dr. Juan Pérez" {...field} />
                </FormControl>
                <FormDescription>
                  Nombre completo del doctor incluyendo título
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
                    <Input type="email" placeholder="doctor@ejemplo.com" {...field} />
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
        </div>

        {/* Información Profesional */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Información Profesional</h3>
            <p className="text-sm text-muted-foreground">
              Credenciales y experiencia
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="specialty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Especialidad</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione especialidad" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {specialties.map((specialty) => (
                        <SelectItem key={specialty} value={specialty}>
                          {specialty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="licenseNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de Licencia</FormLabel>
                  <FormControl>
                    <Input placeholder="CDO-2024-1234" {...field} />
                  </FormControl>
                  <FormDescription>
                    Cédula profesional
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="yearsExperience"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Años de Experiencia</FormLabel>
                <FormControl>
                  <Input type="number" min="0" max="50" placeholder="5" {...field} />
                </FormControl>
                <FormDescription>
                  Años de experiencia práctica en la especialidad
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Información del Horario */}
        <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
          <h3 className="text-sm font-medium">Horario de Trabajo</h3>
          <p className="text-sm text-muted-foreground">
            Se asignará un horario predeterminado (Lunes a Viernes, 9:00 - 18:00).
            Puede modificarlo después desde el perfil del doctor.
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
                Crear Doctor
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
