"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Key, Loader } from "lucide-react"
import { configService } from "@/services/config.service"
import {
  passwordChangeSchema,
  type PasswordChangeFormValues,
} from "@/lib/validations/config"

export function ChangePasswordCard() {
  const [isSaving, setIsSaving] = useState(false)

  const passwordForm = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  const onPasswordSubmit = async (values: PasswordChangeFormValues) => {
    setIsSaving(true)
    try {
      await configService.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      })
      passwordForm.reset()
      toast.success("Contraseña actualizada exitosamente")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido"
      toast.error(`Error al cambiar contraseña: ${message}`)
      console.error("Error changing password:", error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Key className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold text-card-foreground">
              Cambiar Contraseña
            </CardTitle>
            <p className="text-sm text-muted-foreground">Actualiza tu contraseña de acceso</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Current password */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="currentPassword" className="text-card-foreground">
                Contraseña Actual {passwordForm.formState.errors.currentPassword && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id="currentPassword"
                type="password"
                disabled={isSaving}
                {...passwordForm.register("currentPassword")}
                className={`border-border/50 ${passwordForm.formState.errors.currentPassword ? "border-destructive" : ""}`}
                placeholder="********"
              />
              {passwordForm.formState.errors.currentPassword && (
                <p className="text-xs text-destructive">{passwordForm.formState.errors.currentPassword.message}</p>
              )}
            </div>

            <div />

            {/* New password */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="newPassword" className="text-card-foreground">
                Nueva Contraseña {passwordForm.formState.errors.newPassword && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id="newPassword"
                type="password"
                disabled={isSaving}
                {...passwordForm.register("newPassword")}
                className={`border-border/50 ${passwordForm.formState.errors.newPassword ? "border-destructive" : ""}`}
                placeholder="Mínimo 8 caracteres"
              />
              {passwordForm.formState.errors.newPassword && (
                <p className="text-xs text-destructive">{passwordForm.formState.errors.newPassword.message}</p>
              )}
              <p className="text-xs text-muted-foreground">Debe contener mayúscula, minúscula y número</p>
            </div>

            {/* Confirm password */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmPassword" className="text-card-foreground">
                Confirmar Contraseña {passwordForm.formState.errors.confirmPassword && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                disabled={isSaving}
                {...passwordForm.register("confirmPassword")}
                className={`border-border/50 ${passwordForm.formState.errors.confirmPassword ? "border-destructive" : ""}`}
                placeholder="Repetir contraseña"
              />
              {passwordForm.formState.errors.confirmPassword && (
                <p className="text-xs text-destructive">{passwordForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSaving || !passwordForm.formState.isDirty}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSaving ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Actualizando...
                </>
              ) : (
                "Actualizar Contraseña"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
