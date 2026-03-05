/**
 * Adaptador de datos para convertir entre el formato actual
 * y el formato requerido por op-odontogram
 */

import type { ToothData } from './patients-data'

// Tipos de la librería op-odontogram
export type ToothStatus =
  | 'healthy'
  | 'caries'
  | 'filled'
  | 'crown'
  | 'extracted'
  | 'implant'
  | 'root_canal'
  | 'fracture'
  | 'bridge'
  | 'extraction_indicated'
  | 'not_erupted'

export interface OdontogramTooth {
  id: number
  quadrant: 1 | 2 | 3 | 4
  position: number
  status: ToothStatus
  clinicalId?: string
  notes?: string
  isTemporary?: boolean
  surfaces?: {
    oclusal?: ToothStatus
    vestibular?: ToothStatus
    lingual?: ToothStatus
    mesial?: ToothStatus
    distal?: ToothStatus
  }
}

/**
 * Mapeo de estados de nuestro sistema al de op-odontogram
 */
const statusMap: Record<string, ToothStatus> = {
  sano: 'healthy',
  tratado: 'filled',
  en_tratamiento: 'caries',
  extraccion: 'extracted',
  pendiente: 'caries',
}

/**
 * Convierte un número de diente a cuadrante y posición
 * Sistema FDI: 11-18 (cuadrante 1), 21-28 (cuadrante 2),
 *             31-38 (cuadrante 3), 41-48 (cuadrante 4)
 */
function getQuadrantAndPosition(toothNumber: number): { quadrant: 1 | 2 | 3 | 4; position: number } {
  const quadrant = Math.floor(toothNumber / 10) as 1 | 2 | 3 | 4
  const position = toothNumber % 10
  return { quadrant, position }
}

/**
 * Convierte un diente de nuestro formato al formato de op-odontogram
 */
export function convertToOdontogramTooth(tooth: ToothData): OdontogramTooth {
  const { quadrant, position } = getQuadrantAndPosition(tooth.number)
  const status = statusMap[tooth.status] || 'healthy'

  // Convertir número al formato FDI (ej: 11 -> "1.1")
  const clinicalId = `${quadrant}.${position}`

  // Combinar notas de todos los registros
  const notes = tooth.records
    .map(r => `${r.date}: ${r.treatment}`)
    .join('\n')

  return {
    id: tooth.number,
    quadrant,
    position,
    status,
    clinicalId,
    notes: notes || undefined,
    isTemporary: false,
  }
}

/**
 * Convierte un array de dientes al formato de op-odontogram
 */
export function convertTeethToOdontogram(teeth: ToothData[]): OdontogramTooth[] {
  return teeth.map(convertToOdontogramTooth)
}

/**
 * Genera el array completo de 32 dientes permanentes en formato op-odontogram
 * Usa los datos del paciente si existen, o crea dientes sanos por defecto
 */
export function generateOdontogramTeeth(patientTeeth?: ToothData[]): OdontogramTooth[] {
  const allNumbers = [
    // Cuadrante 1 (superior derecha)
    18, 17, 16, 15, 14, 13, 12, 11,
    // Cuadrante 2 (superior izquierda)
    21, 22, 23, 24, 25, 26, 27, 28,
    // Cuadrante 3 (inferior izquierda)
    38, 37, 36, 35, 34, 33, 32, 31,
    // Cuadrante 4 (inferior derecha)
    48, 47, 46, 45, 44, 43, 42, 41,
  ]

  const teethMap = new Map(patientTeeth?.map(t => [t.number, t]))

  return allNumbers.map(num => {
    const existingTooth = teethMap.get(num)
    if (existingTooth) {
      return convertToOdontogramTooth(existingTooth)
    }

    // Crear diente sano por defecto
    const { quadrant, position } = getQuadrantAndPosition(num)
    return {
      id: num,
      quadrant,
      position,
      status: 'healthy' as ToothStatus,
      clinicalId: `${quadrant}.${position}`,
      isTemporary: false,
    }
  })
}

/**
 * Genera array de dientes temporales vacío (20 dientes)
 */
export function generateTemporaryTeeth(): OdontogramTooth[] {
  const temporaryNumbers = [
    // Cuadrante 5 (superior derecha temporal)
    55, 54, 53, 52, 51,
    // Cuadrante 6 (superior izquierda temporal)
    61, 62, 63, 64, 65,
    // Cuadrante 7 (inferior izquierda temporal)
    75, 74, 73, 72, 71,
    // Cuadrante 8 (inferior derecha temporal)
    85, 84, 83, 82, 81,
  ]

  return temporaryNumbers.map(num => {
    const quadrant = Math.floor(num / 10) as 1 | 2 | 3 | 4
    const position = num % 10
    return {
      id: num,
      quadrant,
      position,
      status: 'healthy' as ToothStatus,
      clinicalId: `${quadrant}.${position}`,
      isTemporary: true,
    }
  })
}
