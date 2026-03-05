"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader } from "lucide-react"
import { configService } from "@/services/config.service"
import { createUserSchema, type CreateUserFormValues } from "@/lib/validations/config"

interface AddUserDialogProps {
  isOpen: boolean
  onClose: () => void
  onUserAdded: () => void
}

export function AddUserDialog({ isOpen, onClose, onUserAdded }: AddUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "Recepcionista",
      password: "",
      confirmPassword: "",
    },
  })

  const onSubmit = async (values: CreateUserFormValues) => {
    setIsSubmitting(true)
    try {
      await configService.createUser({
        name: values.name,
        email: values.email,
        role: values.role,
        password: values.password,
      })
      toast.success("Usuario creado exitosamente")
      form.reset()
      onClose()
      onUserAdded()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido"
      toast.error(`Error al crear usuario: ${message}`)
      console.error("Error creating user:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDialogClose = () => {
    if (!isSubmitting) {
      form.reset()
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar Nuevo Usuario</DialogTitle>
          <DialogDescription>
            Completa los datos para crear un nuevo usuario en el sistema.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* Name field */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="name" className="text-card-foreground">
              Nombre {form.formState.errors.name && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id="name"
              disabled={isSubmitting}
              {...form.register("name")}
              className={`border-border/50 ${form.formState.errors.name ? "border-destructive" : ""}`}
              placeholder="Ej: Juan Pérez"
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          {/* Email field */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="email" className="text-card-foreground">
              Email {form.formState.errors.email && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id="email"
              type="email"
              disabled={isSubmitting}
              {...form.register("email")}
              className={`border-border/50 ${form.formState.errors.email ? "border-destructive" : ""}`}
              placeholder="juan@example.com"
            />
            {form.formState.errors.email && (
              <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>

          {/* Role field */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="role" className="text-card-foreground">
              Rol {form.formState.errors.role && <span className="text-destructive">*</span>}
            </Label>
            <Select
              value={form.watch("role")}
              onValueChange={(value) => form.setValue("role", value as any, { shouldDirty: true })}
              disabled={isSubmitting}
            >
              <SelectTrigger className="border-border/50">
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Administrador">Administrador</SelectItem>
                <SelectItem value="Doctor">Doctor</SelectItem>
                <SelectItem value="Recepcionista">Recepcionista</SelectItem>
                <SelectItem value="Asistente">Asistente</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.role && (
              <p className="text-xs text-destructive">{form.formState.errors.role.message}</p>
            )}
          </div>

          {/* Password field */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="password" className="text-card-foreground">
              Contraseña {form.formState.errors.password && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id="password"
              type="password"
              disabled={isSubmitting}
              {...form.register("password")}
              className={`border-border/50 ${form.formState.errors.password ? "border-destructive" : ""}`}
              placeholder="Mínimo 8 caracteres"
            />
            {form.formState.errors.password && (
              <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
            )}
            <p className="text-xs text-muted-foreground">Debe contener mayúscula, minúscula y número</p>
          </div>

          {/* Confirm password field */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmPassword" className="text-card-foreground">
              Confirmar Contraseña {form.formState.errors.confirmPassword && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              disabled={isSubmitting}
              {...form.register("confirmPassword")}
              className={`border-border/50 ${form.formState.errors.confirmPassword ? "border-destructive" : ""}`}
              placeholder="Repite la contraseña"
            />
            {form.formState.errors.confirmPassword && (
              <p className="text-xs text-destructive">{form.formState.errors.confirmPassword.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleDialogClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !form.formState.isDirty}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                "Crear Usuario"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
