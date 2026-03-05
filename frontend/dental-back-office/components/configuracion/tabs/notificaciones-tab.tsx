"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Bell, Loader, Mail, MessageSquare, Smartphone } from "lucide-react"
import { configService } from "@/services/config.service"
import { notificationsConfigSchema, type NotificationsConfigFormValues } from "@/lib/validations/config"

const notificationSettings = [
  {
    id: "confirm-email",
    icon: Mail,
    title: "Confirmación de cita por email",
    description: "Enviar email automático al paciente al confirmar una cita",
  },
  {
    id: "reminder-24h",
    icon: Bell,
    title: "Recordatorio 24 horas antes",
    description: "Notificar al paciente un día antes de su cita",
  },
  {
    id: "reminder-2h",
    icon: Smartphone,
    title: "Recordatorio 2 horas antes",
    description: "SMS de recordatorio 2 horas antes de la cita",
  },
  {
    id: "cancel-notify",
    icon: Bell,
    title: "Aviso de cancelación",
    description: "Notificar al doctor cuando un paciente cancela su cita",
  },
  {
    id: "followup",
    icon: MessageSquare,
    title: "Seguimiento post-tratamiento",
    description: "Enviar encuesta de satisfacción después del tratamiento",
  },
  {
    id: "birthday",
    icon: Mail,
    title: "Felicitación de cumpleaños",
    description: "Enviar email automático en el cumpleaños del paciente",
  },
  {
    id: "reactivation",
    icon: Mail,
    title: "Reactivación de pacientes",
    description: "Email a pacientes que no han visitado en más de 6 meses",
  },
  {
    id: "daily-summary",
    icon: Bell,
    title: "Resumen diario",
    description: "Enviar resumen de citas del día siguiente al equipo",
  },
]

export function NotificacionesTab() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const form = useForm<NotificationsConfigFormValues>({
    resolver: zodResolver(notificationsConfigSchema),
    mode: "onChange",
    defaultValues: {
      notifications: notificationSettings.map((setting) => ({
        id: setting.id,
        enabled: true,
      })),
      emailServer: {
        smtpServer: "",
        smtpPort: 587,
        senderEmail: "",
        senderName: "",
        useSSL: true,
      },
    },
  })

  // 1. Cargar datos de la API al montar
  useEffect(() => {
    const loadNotificationsConfig = async () => {
      try {
        setIsLoading(true)
        const data = await configService.getNotificationsConfig()
        form.reset({
          notifications: data.notifications.map((n) => ({
            id: n.id,
            enabled: n.enabled,
          })),
          emailServer: {
            smtpServer: data.emailServer.smtpServer,
            smtpPort: data.emailServer.smtpPort,
            senderEmail: data.emailServer.senderEmail,
            senderName: data.emailServer.senderName,
            useSSL: data.emailServer.useSSL || true,
          },
        })
      } catch (error) {
        toast.error("Error al cargar configuración de notificaciones")
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    loadNotificationsConfig()
  }, [form])

  // 2. Detectar cambios
  const watchedValues = form.watch()
  useEffect(() => {
    const hasChanges = JSON.stringify(watchedValues) !==
      JSON.stringify(form.formState.defaultValues)
    setHasChanges(hasChanges && form.formState.isDirty)
  }, [watchedValues, form.formState])

  // 3. Advertencia al salir con cambios no guardados
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault()
        e.returnValue = ""
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [hasChanges])

  // 4. Manejar guardado
  const onSubmit = async (values: NotificationsConfigFormValues) => {
    setIsSaving(true)
    try {
      await configService.updateNotificationsConfig({
        notifications: values.notifications,
        emailServer: values.emailServer,
      })
      form.reset(values)
      setHasChanges(false)
      toast.success("Configuración de notificaciones actualizada exitosamente")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido"
      toast.error(`Error al guardar: ${message}`)
      console.error("Error saving notifications config:", error)
    } finally {
      setIsSaving(false)
    }
  }

  // Mostrar skeleton mientras carga
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="py-6">
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded animate-pulse" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <div className="flex flex-col gap-6">
        {/* Alert de cambios no guardados */}
        {hasChanges && (
          <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-900">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Cambios sin guardar</AlertTitle>
            <AlertDescription>
              Tienes cambios pendientes. Haz clic en "Guardar Cambios" para guardarlos.
            </AlertDescription>
          </Alert>
        )}

        {/* Notificaciones Automáticas */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-card-foreground">
              Notificaciones Automáticas
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Configura las notificaciones que se envían a pacientes y personal
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {notificationSettings.map((setting, index) => {
              const notifications = form.watch("notifications")
              const isEnabled = notifications[index]?.enabled || false

              return (
                <div
                  key={setting.id}
                  className="flex items-start gap-4 rounded-xl border border-border/50 p-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <setting.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-card-foreground">{setting.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{setting.description}</p>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(value) => {
                      const newNotifications = form.getValues("notifications")
                      newNotifications[index].enabled = value
                      form.setValue("notifications", newNotifications, { shouldDirty: true })
                    }}
                    disabled={isSaving}
                  />
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Configuración de Email */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-card-foreground">
              Configuración de Email
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Configura el servidor SMTP para enviar notificaciones
            </p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* SMTP Server */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="smtpServer" className="text-card-foreground">
                Servidor SMTP {form.formState.errors.emailServer?.smtpServer && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id="smtpServer"
                disabled={isSaving}
                {...form.register("emailServer.smtpServer")}
                className={`border-border/50 ${form.formState.errors.emailServer?.smtpServer ? "border-destructive" : ""}`}
                placeholder="smtp.ejemplo.com"
              />
              {form.formState.errors.emailServer?.smtpServer && (
                <p className="text-xs text-destructive">{form.formState.errors.emailServer.smtpServer.message}</p>
              )}
            </div>

            {/* SMTP Port */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="smtpPort" className="text-card-foreground">
                Puerto {form.formState.errors.emailServer?.smtpPort && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id="smtpPort"
                type="number"
                disabled={isSaving}
                {...form.register("emailServer.smtpPort", { valueAsNumber: true })}
                className={`border-border/50 ${form.formState.errors.emailServer?.smtpPort ? "border-destructive" : ""}`}
                placeholder="587"
              />
              {form.formState.errors.emailServer?.smtpPort && (
                <p className="text-xs text-destructive">{form.formState.errors.emailServer.smtpPort.message}</p>
              )}
            </div>

            {/* Sender Email */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="senderEmail" className="text-card-foreground">
                Email remitente {form.formState.errors.emailServer?.senderEmail && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id="senderEmail"
                type="email"
                disabled={isSaving}
                {...form.register("emailServer.senderEmail")}
                className={`border-border/50 ${form.formState.errors.emailServer?.senderEmail ? "border-destructive" : ""}`}
                placeholder="citas@ejemplo.com"
              />
              {form.formState.errors.emailServer?.senderEmail && (
                <p className="text-xs text-destructive">{form.formState.errors.emailServer.senderEmail.message}</p>
              )}
            </div>

            {/* Sender Name */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="senderName" className="text-card-foreground">
                Nombre remitente {form.formState.errors.emailServer?.senderName && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id="senderName"
                disabled={isSaving}
                {...form.register("emailServer.senderName")}
                className={`border-border/50 ${form.formState.errors.emailServer?.senderName ? "border-destructive" : ""}`}
                placeholder="AgilDent Citas"
              />
              {form.formState.errors.emailServer?.senderName && (
                <p className="text-xs text-destructive">{form.formState.errors.emailServer.senderName.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Save button */}
        <div className="flex justify-end gap-2">
          <Button
            type="submit"
            disabled={isSaving || !hasChanges}
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
      </div>
    </form>
  )
}
