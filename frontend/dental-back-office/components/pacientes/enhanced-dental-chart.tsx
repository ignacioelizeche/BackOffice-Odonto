"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import type { ToothData } from "./patients-data"
import { generateOdontogramTeeth, generateTemporaryTeeth, type OdontogramTooth } from "./odontogram-adapter"
import "@/styles/odontogram.css"

// Importar Odontogram dinámicamente sin SSR
const Odontogram = dynamic(
  () => import("op-odontogram").then((mod) => mod.Odontogram),
  { ssr: false }
)

interface EnhancedDentalChartProps {
  teeth: ToothData[]
  selectedTooth: number | null
  onSelectTooth: (toothNumber: number) => void
}

export function EnhancedDentalChart({ teeth: patientTeeth, selectedTooth, onSelectTooth }: EnhancedDentalChartProps) {
  const [teeth, setTeeth] = useState<OdontogramTooth[]>([])
  const [temporaryTeeth, setTemporaryTeeth] = useState<OdontogramTooth[]>([])
  const [showTemporaryTeeth, setShowTemporaryTeeth] = useState(false)
  const [showBiteEffect, setShowBiteEffect] = useState(false)
  const [isAnimatingBite, setIsAnimatingBite] = useState(false)
  const [selected, setSelected] = useState<OdontogramTooth | null>(null)

  // Inicializar los dientes al cargar el componente
  useEffect(() => {
    const odontogramTeeth = generateOdontogramTeeth(patientTeeth)
    setTeeth(odontogramTeeth)
    setTemporaryTeeth(generateTemporaryTeeth())
  }, [patientTeeth])

  // Sincronizar selección con el prop
  useEffect(() => {
    if (selectedTooth !== null) {
      const tooth = teeth.find(t => t.id === selectedTooth)
      setSelected(tooth || null)
    } else {
      setSelected(null)
    }
  }, [selectedTooth, teeth])

  const handleToothClick = (tooth: OdontogramTooth) => {
    setSelected(tooth)
    onSelectTooth(tooth.id)
  }

  const handleToggleTemporaryTeeth = (show: boolean) => {
    setShowTemporaryTeeth(show)
  }

  const handleToggleBiteEffect = (show: boolean) => {
    setShowBiteEffect(show)
  }

  const simulateBite = () => {
    if (isAnimatingBite) return

    setIsAnimatingBite(true)
    setShowBiteEffect(false)

    setTimeout(() => {
      setShowBiteEffect(true)
    }, 300)

    setTimeout(() => {
      setShowBiteEffect(false)
    }, 1000)

    setTimeout(() => {
      setIsAnimatingBite(false)
    }, 1500)
  }

  return (
    <div className="enhanced-dental-chart">
      <Odontogram
        teeth={teeth}
        temporaryTeeth={temporaryTeeth}
        showTemporaryTeeth={showTemporaryTeeth}
        onToggleTemporaryTeeth={handleToggleTemporaryTeeth}
        selectedTooth={selected}
        onToothClick={handleToothClick}
        showBiteEffect={showBiteEffect}
        onToggleBiteEffect={handleToggleBiteEffect}
        isAnimatingBite={isAnimatingBite}
        onSimulateBite={simulateBite}
      />

      <style jsx global>{`
        .enhanced-dental-chart {
          width: 100%;
          min-height: 500px;
        }

        /* Estilos personalizados para integrar con el tema */
        .odontogram-container {
          background: transparent !important;
        }

        /* Ajustar colores al tema del sistema */
        :root {
          --tooth-healthy: hsl(var(--card));
          --tooth-caries: hsl(var(--destructive));
          --tooth-filled: hsl(var(--primary));
          --tooth-crown: hsl(var(--warning));
          --tooth-extracted: hsl(var(--muted));
        }
      `}</style>
    </div>
  )
}
