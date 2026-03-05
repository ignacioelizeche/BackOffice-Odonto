"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ClinicaTab } from "./tabs/clinica-tab"
import { HorarioTab } from "./tabs/horario-tab"
import { NotificacionesTab } from "./tabs/notificaciones-tab"
import { FacturacionTab } from "./tabs/facturacion-tab"
import { SeguridadTab } from "./tabs/seguridad-tab"

export function SettingsContent() {
  return (
    <Tabs defaultValue="clinica" className="flex flex-col gap-6">
      <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-card border border-border/50 p-1.5 rounded-xl">
        <TabsTrigger
          value="clinica"
          className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        >
          Clinica
        </TabsTrigger>
        <TabsTrigger
          value="horario"
          className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        >
          Horarios
        </TabsTrigger>
        <TabsTrigger
          value="seguridad"
          className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        >
          Seguridad
        </TabsTrigger>
        <TabsTrigger
          value="notificaciones"
          className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        >
          Notificaciones
        </TabsTrigger>
      </TabsList>

      <TabsContent value="clinica">
        <ClinicaTab />
      </TabsContent>
      <TabsContent value="horario">
        <HorarioTab />
      </TabsContent>
      <TabsContent value="seguridad">
        <SeguridadTab />
      </TabsContent>
      <TabsContent value="notificaciones">
        <NotificacionesTab />
      </TabsContent>
    </Tabs>
  )
}
