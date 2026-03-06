"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Loader, Stethoscope, Upload } from "lucide-react"
import { configService } from "@/services/config.service"
import { clinicConfigSchema, type ClinicConfigFormValues } from "@/lib/validations/config"

const availableSpecialties = [
  "Odontologia General",
  "Cirugia Oral",
  "Ortodoncia",
  "Endodoncia",
  "Periodoncia",
  "Implantologia",
  "Estetica Dental",
  "Odontopediatria",
]

export function ClinicaTab() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const form = useForm<ClinicConfigFormValues>({
    resolver: zodResolver(clinicConfigSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      rfc: "",
      phone: "",
      email: "",
      website: "",
      licenseNumber: "",
      address: "",
      specialties: [],
    },
  })

  // 1. Cargar datos de la API al montar el componente
  useEffect(() => {
    const loadClinicConfig = async () => {
      try {
        setIsLoading(true)
        const data = await configService.getClinicConfig()
        form.reset({
          name: data.name,
          rfc: data.rfc,
          phone: data.phone,
          email: data.email,
          website: data.website || "",
          licenseNumber: data.licenseNumber,
          address: data.address,
          specialties: data.specialties || [],
        })
        // Set logo preview if logoUrl exists
        if (data.logoUrl) {
          setLogoPreview(data.logoUrl)
        }
      } catch (error) {
        toast.error("Error al cargar configuración de clínica")
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    loadClinicConfig()
  }, [form])

  // 2. Detectar cambios en el formulario
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

  // 4. Manejar guardado de cambios
  const onSubmit = async (values: ClinicConfigFormValues) => {
    setIsSaving(true)
    try {
      await configService.updateClinicConfig({
        name: values.name,
        rfc: values.rfc,
        phone: values.phone,
        email: values.email,
        website: values.website || undefined,
        licenseNumber: values.licenseNumber,
        address: values.address,
        specialties: values.specialties,
      })
      form.reset(values)
      setHasChanges(false)
      toast.success("Configuración de clínica actualizada exitosamente")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido"
      toast.error(`Error al guardar: ${message}`)
      console.error("Error saving clinic config:", error)
    } finally {
      setIsSaving(false)
    }
  }

  // 5. Manejar upload de logo
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validaciones de archivo
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg']
    const maxSize = 5 * 1024 * 1024 // 5MB

    if (!validTypes.includes(file.type)) {
      toast.error("Solo se permiten archivos JPG y PNG")
      return
    }

    if (file.size > maxSize) {
      toast.error("El archivo no puede exceder 5MB")
      return
    }

    setIsUploadingLogo(true)
    try {
      // Crear preview local
      const reader = new FileReader()
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      // Subir a servidor
      const response = await configService.uploadClinicLogo(file)
      toast.success("Logo actualizado exitosamente")
      console.log("Logo URL:", response.logoUrl)

      // Actualizar preview con la URL del servidor
      setLogoPreview(response.logoUrl)

      // Recargar configuración de clínica para actualizar el logo en todo el sitio
      const updatedConfig = await configService.getClinicConfig()
      form.reset({
        name: updatedConfig.name,
        rfc: updatedConfig.rfc,
        phone: updatedConfig.phone,
        email: updatedConfig.email,
        website: updatedConfig.website || "",
        licenseNumber: updatedConfig.licenseNumber,
        address: updatedConfig.address,
        specialties: updatedConfig.specialties || [],
      })

      // Usar el logoUrl retornado del endpoint en lugar de esperar a refetch
      if (updatedConfig.logoUrl) {
        setLogoPreview(updatedConfig.logoUrl)
      }

      // Recargar la página para que el sidebar y otros componentes vean el nuevo logo
      setTimeout(() => {
        window.location.reload()
      }, 500)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido"
      toast.error(`Error al subir logo: ${message}`)
      console.error("Error uploading logo:", error)
      setLogoPreview(null)
    } finally {
      setIsUploadingLogo(false)
      // Limpiar input
      e.target.value = ""
    }
  }

  // Mostrar skeleton mientras carga
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="py-6">
            <div className="space-y-4">
              <div className="h-10 w-full bg-muted rounded animate-pulse" />
              <div className="h-10 w-full bg-muted rounded animate-pulse" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-10 bg-muted rounded animate-pulse" />
                <div className="h-10 bg-muted rounded animate-pulse" />
              </div>
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

        {/* Clinic profile card */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-card-foreground">
              Información de la Clínica
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {/* Logo section */}
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <Avatar className="h-20 w-20">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="h-20 w-20 object-cover rounded-full" />
                ) : (
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Stethoscope className="h-8 w-8" />
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex flex-col gap-2 text-center sm:text-left">
                <h3 className="text-lg font-semibold text-card-foreground">
                  {form.watch("name") || "Clínica"}
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-border/50"
                  disabled={isUploadingLogo || isSaving}
                  onClick={() => document.getElementById("logo-upload")?.click()}
                >
                  {isUploadingLogo ? (
                    <>
                      <Loader className="mr-1.5 h-4 w-4 animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-1.5 h-4 w-4" />
                      Cambiar Logo
                    </>
                  )}
                </Button>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/jpg"
                  className="hidden"
                  onChange={handleLogoUpload}
                  disabled={isUploadingLogo || isSaving}
                />
              </div>
            </div>

            {/* Form fields */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Name field */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="name" className="text-card-foreground">
                  Nombre de la Clínica {form.formState.errors.name && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id="name"
                  disabled={isSaving}
                  {...form.register("name")}
                  className={`border-border/50 ${form.formState.errors.name ? "border-destructive" : ""}`}
                  placeholder="Ej: AgilDent Clínica"
                />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>

              {/* RFC field */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="rfc" className="text-card-foreground">
                  RFC {form.formState.errors.rfc && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id="rfc"
                  disabled={isSaving}
                  {...form.register("rfc")}
                  className={`border-border/50 ${form.formState.errors.rfc ? "border-destructive" : ""}`}
                  placeholder="Ej: DCP210415AB3"
                />
                {form.formState.errors.rfc && (
                  <p className="text-xs text-destructive">{form.formState.errors.rfc.message}</p>
                )}
              </div>

              {/* Phone field */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="phone" className="text-card-foreground">
                  Teléfono {form.formState.errors.phone && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id="phone"
                  disabled={isSaving}
                  {...form.register("phone")}
                  className={`border-border/50 ${form.formState.errors.phone ? "border-destructive" : ""}`}
                  placeholder="+52 55 1234 5678"
                />
                {form.formState.errors.phone && (
                  <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
                )}
              </div>

              {/* Email field */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="email" className="text-card-foreground">
                  Correo Electrónico {form.formState.errors.email && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id="email"
                  type="email"
                  disabled={isSaving}
                  {...form.register("email")}
                  className={`border-border/50 ${form.formState.errors.email ? "border-destructive" : ""}`}
                  placeholder="contacto@clinica.com"
                />
                {form.formState.errors.email && (
                  <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>

              {/* Website field */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="website" className="text-card-foreground">
                  Sitio Web (Opcional)
                </Label>
                <Input
                  id="website"
                  disabled={isSaving}
                  {...form.register("website")}
                  className={`border-border/50 ${form.formState.errors.website ? "border-destructive" : ""}`}
                  placeholder="https://www.clinica.com"
                />
                {form.formState.errors.website && (
                  <p className="text-xs text-destructive">{form.formState.errors.website.message}</p>
                )}
              </div>

              {/* License field */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="licenseNumber" className="text-card-foreground">
                  Licencia Sanitaria {form.formState.errors.licenseNumber && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id="licenseNumber"
                  disabled={isSaving}
                  {...form.register("licenseNumber")}
                  className={`border-border/50 ${form.formState.errors.licenseNumber ? "border-destructive" : ""}`}
                  placeholder="Ej: LS-2021-CDMX-04521"
                />
                {form.formState.errors.licenseNumber && (
                  <p className="text-xs text-destructive">{form.formState.errors.licenseNumber.message}</p>
                )}
              </div>
            </div>

            {/* Address field - full width */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="address" className="text-card-foreground">
                Dirección Completa {form.formState.errors.address && <span className="text-destructive">*</span>}
              </Label>
              <Textarea
                id="address"
                disabled={isSaving}
                {...form.register("address")}
                className={`border-border/50 min-h-[60px] ${form.formState.errors.address ? "border-destructive" : ""}`}
                placeholder="Dirección completa de la clínica..."
              />
              {form.formState.errors.address && (
                <p className="text-xs text-destructive">{form.formState.errors.address.message}</p>
              )}
            </div>

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
          </CardContent>
        </Card>

        {/* Specialties card */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-card-foreground">
              Especialidades Ofrecidas {form.formState.errors.specialties && <span className="text-destructive">*</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {availableSpecialties.map((specialty) => {
                const isSelected = form.watch("specialties").includes(specialty)
                return (
                  <button
                    key={specialty}
                    type="button"
                    disabled={isSaving}
                    onClick={() => {
                      const current = form.watch("specialties") || []
                      if (isSelected) {
                        form.setValue("specialties", current.filter(s => s !== specialty), { shouldDirty: true })
                      } else {
                        form.setValue("specialties", [...current, specialty], { shouldDirty: true })
                      }
                    }}
                    className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border/50 bg-muted/50 text-card-foreground hover:bg-muted"
                    } ${isSaving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    {specialty}
                  </button>
                )
              })}
            </div>
            {form.formState.errors.specialties && (
              <p className="text-xs text-destructive">{form.formState.errors.specialties.message}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </form>
  )
}
