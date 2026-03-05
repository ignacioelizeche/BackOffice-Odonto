"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Clock, Key, Loader, Shield, Trash2, Users } from "lucide-react"
import { configService, type User } from "@/services/config.service"
import {
  passwordChangeSchema,
  securityConfigSchema,
  type PasswordChangeFormValues,
  type SecurityConfigFormValues,
} from "@/lib/validations/config"
import { AddUserDialog } from "@/components/configuracion/add-user-dialog"

function getRoleBadge(role: string) {
  switch (role) {
    case "Administrador":
      return <Badge className="bg-primary/15 text-primary border-transparent text-xs font-medium">Administrador</Badge>
    case "Doctor":
      return <Badge className="bg-accent/15 text-accent border-transparent text-xs font-medium">Doctor</Badge>
    case "Recepcionista":
      return <Badge className="bg-secondary text-secondary-foreground border-transparent text-xs font-medium">Recepcionista</Badge>
    default:
      return <Badge variant="secondary">{role}</Badge>
  }
}

export function SeguridadTab() {
  // Estado general
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Form: Cambio de contraseña
  const passwordForm = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  // Form: Opciones de seguridad
  const [isLoadingSecurityConfig, setIsLoadingSecurityConfig] = useState(true)
  const securityForm = useForm<SecurityConfigFormValues>({
    resolver: zodResolver(securityConfigSchema),
    mode: "onChange",
    defaultValues: {
      twoFactor: false,
      autoLogout: true,
      activityLog: true,
      dataEncryption: true,
    },
  })

  // 1. Cargar usuarios al montar
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setIsLoadingUsers(true)
        const data = await configService.getUsers()
        setUsers(data)
      } catch (error) {
        toast.error("Error al cargar usuarios")
        console.error(error)
      } finally {
        setIsLoadingUsers(false)
      }
    }

    loadUsers()
  }, [])

  // 2. Cargar configuración de seguridad
  useEffect(() => {
    const loadSecurityConfig = async () => {
      try {
        setIsLoadingSecurityConfig(true)
        const data = await configService.getSecurityConfig()
        securityForm.reset({
          twoFactor: data.twoFactor,
          autoLogout: data.autoLogout,
          activityLog: data.activityLog,
          dataEncryption: data.dataEncryption,
        })
      } catch (error) {
        toast.error("Error al cargar configuración de seguridad")
        console.error(error)
      } finally {
        setIsLoadingSecurityConfig(false)
      }
    }

    loadSecurityConfig()
  }, [securityForm])

  // 3. Manejar cambio de contraseña
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

  // 4. Manejar cambio de opciones de seguridad
  const onSecuritySubmit = async (values: SecurityConfigFormValues) => {
    setIsSaving(true)
    try {
      await configService.updateSecurityConfig({
        twoFactor: values.twoFactor,
        autoLogout: values.autoLogout,
        activityLog: values.activityLog,
        dataEncryption: values.dataEncryption,
      })
      toast.success("Configuración de seguridad actualizada")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido"
      toast.error(`Error al guardar: ${message}`)
      console.error("Error saving security config:", error)
    } finally {
      setIsSaving(false)
    }
  }

  // 5. Manejar eliminación de usuario
  const handleDeleteUser = async (userId: number) => {
    setIsDeleting(true)
    try {
      await configService.deleteUser(userId)
      setUsers(users.filter(u => u.id !== userId))
      setUserToDelete(null)
      toast.success("Usuario eliminado exitosamente")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido"
      toast.error(`Error al eliminar usuario: ${message}`)
      console.error("Error deleting user:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  // 6. Manejar nuevo usuario agregado
  const handleUserAdded = async () => {
    try {
      const data = await configService.getUsers()
      setUsers(data)
    } catch (error) {
      console.error("Error reloading users:", error)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Card 1: Cambio de Contraseña */}
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

      {/* Card 2: Opciones de Seguridad */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
              <Shield className="h-5 w-5 text-accent" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-card-foreground">
                Opciones de Seguridad
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingSecurityConfig ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <form onSubmit={securityForm.handleSubmit(onSecuritySubmit)} className="flex flex-col gap-4">
              {/* 2FA Toggle */}
              <div className="flex items-start gap-4 rounded-xl border border-border/50 p-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-card-foreground">Autenticación de dos factores (2FA)</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Requiere un código adicional al iniciar sesión
                  </p>
                </div>
                <Switch
                  checked={securityForm.watch("twoFactor")}
                  onCheckedChange={(value) =>
                    securityForm.setValue("twoFactor", value)
                  }
                  disabled={isSaving}
                />
              </div>

              {/* Auto-logout Toggle */}
              <div className="flex items-start gap-4 rounded-xl border border-border/50 p-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-card-foreground">Cierre de sesión automático</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Cerrar sesión después de 30 minutos de inactividad
                  </p>
                </div>
                <Switch
                  checked={securityForm.watch("autoLogout")}
                  onCheckedChange={(value) =>
                    securityForm.setValue("autoLogout", value)
                  }
                  disabled={isSaving}
                />
              </div>

              {/* Activity Log Toggle */}
              <div className="flex items-start gap-4 rounded-xl border border-border/50 p-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-card-foreground">Registro de actividad</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Registrar todas las acciones de los usuarios en el sistema
                  </p>
                </div>
                <Switch
                  checked={securityForm.watch("activityLog")}
                  onCheckedChange={(value) =>
                    securityForm.setValue("activityLog", value)
                  }
                  disabled={isSaving}
                />
              </div>

              {/* Data Encryption Toggle */}
              <div className="flex items-start gap-4 rounded-xl border border-border/50 p-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-card-foreground">Encriptación de datos sensibles</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Encriptar historiales clínicos y datos personales de pacientes
                  </p>
                </div>
                <Switch
                  checked={securityForm.watch("dataEncryption")}
                  onCheckedChange={(value) =>
                    securityForm.setValue("dataEncryption", value)
                  }
                  disabled={isSaving}
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={isSaving || !securityForm.formState.isDirty}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isSaving ? (
                    <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar Cambios"
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Card 3: Usuarios del Sistema */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-card-foreground">
                  Usuarios del Sistema
                </CardTitle>
                <p className="text-sm text-muted-foreground">{users.length} usuarios activos</p>
              </div>
            </div>
            <Button
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => setIsAddUserDialogOpen(true)}
            >
              Agregar Usuario
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {isLoadingUsers ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No hay usuarios</AlertTitle>
              <AlertDescription>
                Crea el primer usuario del sistema haciendo clic en "Agregar Usuario".
              </AlertDescription>
            </Alert>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                className="flex flex-col gap-3 rounded-xl border border-border/50 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-medium">
                      {user.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-card-foreground">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 pl-13 sm:pl-0">
                  {getRoleBadge(user.role)}
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {user.lastAccess}
                  </span>
                  {user.role !== "Administrador" && (
                    <button
                      onClick={() => setUserToDelete(user.id)}
                      disabled={isDeleting}
                      className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="sr-only">Eliminar usuario</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Dialog para agregar usuario */}
      <AddUserDialog
        isOpen={isAddUserDialogOpen}
        onClose={() => setIsAddUserDialogOpen(false)}
        onUserAdded={handleUserAdded}
      />

      {/* Alert Dialog para confirmar eliminación */}
      <AlertDialog open={userToDelete !== null} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Eliminar usuario</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end mt-4">
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToDelete && handleDeleteUser(userToDelete)}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
