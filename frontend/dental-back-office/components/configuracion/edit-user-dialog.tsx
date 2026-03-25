"use client"

import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader } from "lucide-react"
import { configService, type User } from "@/services/config.service"
import { editUserSchema, type EditUserFormValues } from "@/lib/validations/config"

interface EditUserDialogProps {
  isOpen: boolean
  user: User | null
  onClose: () => void
  onUserUpdated: () => void
}

export function EditUserDialog({ isOpen, user, onClose, onUserUpdated }: EditUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const defaultValues = useMemo(
    () => ({
      name: user?.name ?? "",
      email: user?.email ?? "",
      role: (user?.role ?? "Recepcionista") as EditUserFormValues["role"],
      password: "",
      confirmPassword: "",
    }),
    [user]
  )

  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues,
  })

  useEffect(() => {
    form.reset(defaultValues)
  }, [defaultValues, form])

  const onSubmit = async (values: EditUserFormValues) => {
    if (!user) return

    const payload: {
      name?: string
      email?: string
      role?: string
      password?: string
    } = {}

    if (values.name !== user.name) payload.name = values.name
    if (values.email !== user.email) payload.email = values.email
    if (values.role !== user.role) payload.role = values.role
    if (values.password && values.password.trim().length > 0) payload.password = values.password

    if (Object.keys(payload).length === 0) {
      toast.info("No hay cambios para guardar")
      return
    }

    setIsSubmitting(true)
    try {
      await configService.updateUser(user.id, payload)
      toast.success("Usuario actualizado exitosamente")
      form.reset({ ...values, password: "", confirmPassword: "" })
      onClose()
      onUserUpdated()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido"
      toast.error(`Error al actualizar usuario: ${message}`)
      console.error("Error updating user:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDialogClose = () => {
    if (!isSubmitting) {
      form.reset(defaultValues)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Usuario</DialogTitle>
          <DialogDescription>
            Actualiza nombre, email, rol o contraseña del usuario.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-user-name" className="text-card-foreground">
              Nombre {form.formState.errors.name && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id="edit-user-name"
              disabled={isSubmitting}
              {...form.register("name")}
              className={`border-border/50 ${form.formState.errors.name ? "border-destructive" : ""}`}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-user-email" className="text-card-foreground">
              Email {form.formState.errors.email && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id="edit-user-email"
              type="email"
              disabled={isSubmitting}
              {...form.register("email")}
              className={`border-border/50 ${form.formState.errors.email ? "border-destructive" : ""}`}
            />
            {form.formState.errors.email && (
              <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-user-role" className="text-card-foreground">
              Rol {form.formState.errors.role && <span className="text-destructive">*</span>}
            </Label>
            <Select
              value={form.watch("role")}
              onValueChange={(value) => form.setValue("role", value as EditUserFormValues["role"], { shouldDirty: true })}
              disabled={isSubmitting}
            >
              <SelectTrigger id="edit-user-role" className="border-border/50">
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

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-user-password" className="text-card-foreground">
              Nueva Contraseña (opcional)
            </Label>
            <Input
              id="edit-user-password"
              type="password"
              disabled={isSubmitting}
              {...form.register("password")}
              className={`border-border/50 ${form.formState.errors.password ? "border-destructive" : ""}`}
              placeholder="Deja vacío para mantener la actual"
            />
            {form.formState.errors.password && (
              <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-user-confirm-password" className="text-card-foreground">
              Confirmar Nueva Contraseña
            </Label>
            <Input
              id="edit-user-confirm-password"
              type="password"
              disabled={isSubmitting}
              {...form.register("confirmPassword")}
              className={`border-border/50 ${form.formState.errors.confirmPassword ? "border-destructive" : ""}`}
              placeholder="Repite la nueva contraseña"
            />
            {form.formState.errors.confirmPassword && (
              <p className="text-xs text-destructive">{form.formState.errors.confirmPassword.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleDialogClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !user}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar Cambios"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
