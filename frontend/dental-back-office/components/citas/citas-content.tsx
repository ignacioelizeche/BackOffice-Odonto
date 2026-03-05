"use client"

import { useState, useRef } from "react"
import { CitasStats } from "./citas-stats"
import { CitasTable } from "./citas-table"
import { CitaDetailPanel } from "./cita-detail-panel"
import { Appointment } from "@/services/appointments.service"

export function CitasContent() {
  const [selectedCita, setSelectedCita] = useState<(Appointment & { cost: string }) | null>(null)
  const refreshTrigger = useRef<() => void>(() => {})

  const handleStatusChanged = () => {
    // Recargar la tabla de citas
    refreshTrigger.current?.()
  }

  return (
    <>
      <CitasStats />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className={selectedCita ? "xl:col-span-2" : "xl:col-span-3"}>
          <CitasTable
            selectedCitaId={selectedCita?.id ?? null}
            onSelectCita={setSelectedCita}
            ref={refreshTrigger}
          />
        </div>
        {selectedCita && (
          <div>
            <CitaDetailPanel
              cita={selectedCita}
              onClose={() => setSelectedCita(null)}
              onStatusChanged={handleStatusChanged}
            />
          </div>
        )}
      </div>
    </>
  )
}
