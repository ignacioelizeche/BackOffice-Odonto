"use client"

import { cn } from "@/lib/utils"
import type { ToothData } from "./patients-data"

const statusColors: Record<string, { fill: string; stroke: string; gradient: string; label: string }> = {
  sano: { fill: "#ffffff", stroke: "#10b981", gradient: "url(#grad-healthy)", label: "Sano" },
  tratado: { fill: "#dbeafe", stroke: "#3b82f6", gradient: "url(#grad-treated)", label: "Tratado" },
  en_tratamiento: { fill: "#fef3c7", stroke: "#f59e0b", gradient: "url(#grad-treatment)", label: "En tratamiento" },
  extraccion: { fill: "#fee2e2", stroke: "#ef4444", gradient: "url(#grad-extraction)", label: "Extracción" },
  pendiente: { fill: "#fed7aa", stroke: "#ea580c", gradient: "url(#grad-pending)", label: "Pendiente" },
}

interface ToothShapeProps {
  toothData: ToothData
  x: number
  y: number
  isSelected: boolean
  onClick: () => void
  toothType: "incisor" | "canine" | "premolar" | "molar"
}

function ToothShape({ toothData, x, y, isSelected, onClick, toothType }: ToothShapeProps) {
  const colors = statusColors[toothData.status]
  const hasRecords = toothData.records.length > 0

  // Dimensiones según el tipo de diente
  const dimensions = {
    incisor: { w: 28, h: 40, rootW: 8, rootH: 18 },
    canine: { w: 30, h: 44, rootW: 10, rootH: 20 },
    premolar: { w: 34, h: 38, rootW: 12, rootH: 16 },
    molar: { w: 40, h: 42, rootW: 16, rootH: 14 }
  }

  const { w, h, rootW, rootH } = dimensions[toothType]

  return (
    <g
      className="cursor-pointer transition-all hover:opacity-90"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Diente ${toothData.number} - ${toothData.name} - ${colors.label}`}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick() }}
    >
      {/* Selection glow */}
      {isSelected && (
        <>
          <ellipse
            cx={x}
            cy={y}
            rx={w / 2 + 8}
            ry={h / 2 + 8}
            className="fill-primary/20 animate-pulse"
          />
          <ellipse
            cx={x}
            cy={y}
            rx={w / 2 + 6}
            ry={h / 2 + 6}
            className="fill-none stroke-primary stroke-[2.5]"
            strokeDasharray="4 4"
          />
        </>
      )}

      {/* Shadow */}
      <ellipse
        cx={x}
        cy={y + h / 2 + 2}
        rx={w / 2}
        ry={4}
        className="fill-black/10"
      />

      {/* Raíz del diente */}
      <g opacity="0.7">
        {toothType === "molar" ? (
          <>
            {/* Dos raíces para molares */}
            <path
              d={`M ${x - rootW / 3} ${y + h / 2 - 5}
                  L ${x - rootW / 3 - 2} ${y + h / 2 + rootH}
                  Q ${x - rootW / 3} ${y + h / 2 + rootH + 3} ${x - rootW / 3 + 2} ${y + h / 2 + rootH}
                  Z`}
              fill={colors.stroke}
              opacity="0.6"
            />
            <path
              d={`M ${x + rootW / 3} ${y + h / 2 - 5}
                  L ${x + rootW / 3 + 2} ${y + h / 2 + rootH}
                  Q ${x + rootW / 3} ${y + h / 2 + rootH + 3} ${x + rootW / 3 - 2} ${y + h / 2 + rootH}
                  Z`}
              fill={colors.stroke}
              opacity="0.6"
            />
          </>
        ) : toothType === "premolar" ? (
          <>
            {/* Raíz bifurcada para premolares */}
            <path
              d={`M ${x - 3} ${y + h / 2 - 5}
                  L ${x - 5} ${y + h / 2 + rootH}
                  Q ${x} ${y + h / 2 + rootH + 2} ${x + 5} ${y + h / 2 + rootH}
                  L ${x + 3} ${y + h / 2 - 5}
                  Z`}
              fill={colors.stroke}
              opacity="0.6"
            />
          </>
        ) : (
          <>
            {/* Raíz única para incisivos y caninos */}
            <path
              d={`M ${x - rootW / 4} ${y + h / 2 - 5}
                  L ${x - rootW / 4 - 1} ${y + h / 2 + rootH}
                  Q ${x} ${y + h / 2 + rootH + 4} ${x + rootW / 4 + 1} ${y + h / 2 + rootH}
                  L ${x + rootW / 4} ${y + h / 2 - 5}
                  Z`}
              fill={colors.stroke}
              opacity="0.6"
            />
          </>
        )}
      </g>

      {/* Corona del diente */}
      <g filter="url(#tooth-shadow)">
        {toothType === "incisor" ? (
          <path
            d={`M ${x - w / 2} ${y - h / 2 + 8}
                Q ${x - w / 2} ${y - h / 2} ${x - w / 2 + 6} ${y - h / 2}
                L ${x + w / 2 - 6} ${y - h / 2}
                Q ${x + w / 2} ${y - h / 2} ${x + w / 2} ${y - h / 2 + 8}
                L ${x + w / 2} ${y + h / 2 - 8}
                Q ${x + w / 2} ${y + h / 2} ${x + w / 2 - 8} ${y + h / 2}
                L ${x - w / 2 + 8} ${y + h / 2}
                Q ${x - w / 2} ${y + h / 2} ${x - w / 2} ${y + h / 2 - 8}
                Z`}
            fill={colors.gradient}
            stroke={colors.stroke}
            strokeWidth="2"
          />
        ) : toothType === "canine" ? (
          <path
            d={`M ${x} ${y - h / 2}
                L ${x + w / 2} ${y - h / 2 + 12}
                L ${x + w / 2} ${y + h / 2 - 8}
                Q ${x + w / 2} ${y + h / 2} ${x + w / 2 - 8} ${y + h / 2}
                L ${x - w / 2 + 8} ${y + h / 2}
                Q ${x - w / 2} ${y + h / 2} ${x - w / 2} ${y + h / 2 - 8}
                L ${x - w / 2} ${y - h / 2 + 12}
                Z`}
            fill={colors.gradient}
            stroke={colors.stroke}
            strokeWidth="2"
          />
        ) : toothType === "molar" ? (
          <rect
            x={x - w / 2}
            y={y - h / 2}
            width={w}
            height={h}
            rx="6"
            fill={colors.gradient}
            stroke={colors.stroke}
            strokeWidth="2"
          />
        ) : (
          <rect
            x={x - w / 2}
            y={y - h / 2}
            width={w}
            height={h}
            rx="8"
            fill={colors.gradient}
            stroke={colors.stroke}
            strokeWidth="2"
          />
        )}

        {/* Detalles de superficie oclusal para molares */}
        {toothType === "molar" && (
          <>
            <circle cx={x - 8} cy={y - 6} r="3" fill={colors.stroke} opacity="0.15" />
            <circle cx={x + 8} cy={y - 6} r="3" fill={colors.stroke} opacity="0.15" />
            <circle cx={x - 8} cy={y + 6} r="3" fill={colors.stroke} opacity="0.15" />
            <circle cx={x + 8} cy={y + 6} r="3" fill={colors.stroke} opacity="0.15" />
          </>
        )}

        {/* Líneas de textura */}
        {toothType !== "molar" && (
          <>
            <line
              x1={x - w / 4}
              y1={y - h / 2 + 8}
              x2={x - w / 4}
              y2={y + h / 2 - 8}
              stroke={colors.stroke}
              strokeWidth="0.5"
              opacity="0.2"
            />
            <line
              x1={x + w / 4}
              y1={y - h / 2 + 8}
              x2={x + w / 4}
              y2={y + h / 2 - 8}
              stroke={colors.stroke}
              strokeWidth="0.5"
              opacity="0.2"
            />
          </>
        )}
      </g>

      {/* Número del diente */}
      <text
        x={x}
        y={y + 2}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-gray-700 text-[11px] font-bold select-none pointer-events-none"
        style={{ textShadow: "0 1px 2px rgba(255,255,255,0.8)" }}
      >
        {toothData.number}
      </text>

      {/* Indicador de registros */}
      {hasRecords && (
        <>
          <circle
            cx={x + w / 2 - 6}
            cy={y - h / 2 + 6}
            r="8"
            className="fill-primary"
            filter="url(#badge-shadow)"
          />
          <text
            x={x + w / 2 - 6}
            y={y - h / 2 + 8}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-white text-[9px] font-bold select-none pointer-events-none"
          >
            {toothData.records.length}
          </text>
        </>
      )}
    </g>
  )
}

interface DentalChartProps {
  teeth: ToothData[]
  selectedTooth: number | null
  onSelectTooth: (toothNumber: number) => void
}

export function DentalChart({ teeth, selectedTooth, onSelectTooth }: DentalChartProps) {
  const teethMap = new Map(teeth.map((t) => [t.number, t]))

  // Upper teeth: right (18-11) then left (21-28)
  const upperRight = [18, 17, 16, 15, 14, 13, 12, 11]
  const upperLeft = [21, 22, 23, 24, 25, 26, 27, 28]
  // Lower teeth: right (48-41) then left (31-38)
  const lowerRight = [48, 47, 46, 45, 44, 43, 42, 41]
  const lowerLeft = [31, 32, 33, 34, 35, 36, 37, 38]

  const getToothType = (num: number): "incisor" | "canine" | "premolar" | "molar" => {
    const n = num % 10
    if (n === 1 || n === 2) return "incisor"
    if (n === 3) return "canine"
    if (n === 4 || n === 5) return "premolar"
    return "molar"
  }

  const getX = (index: number, side: "right" | "left") => {
    const baseGap = 48
    if (side === "right") {
      return 50 + index * baseGap
    }
    return 450 + index * baseGap
  }

  const svgWidth = 850
  const svgHeight = 320

  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-x-auto rounded-xl border border-border/50 bg-gradient-to-b from-card to-muted/20 p-6">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="mx-auto w-full min-w-[650px] max-w-[850px]"
          role="img"
          aria-label="Odontograma dental interactivo"
        >
          {/* Definir gradientes y filtros */}
          <defs>
            {/* Gradientes para estados */}
            <linearGradient id="grad-healthy" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#f0fdf4" />
            </linearGradient>
            <linearGradient id="grad-treated" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#dbeafe" />
              <stop offset="100%" stopColor="#bfdbfe" />
            </linearGradient>
            <linearGradient id="grad-treatment" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="100%" stopColor="#fde68a" />
            </linearGradient>
            <linearGradient id="grad-extraction" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fee2e2" />
              <stop offset="100%" stopColor="#fecaca" />
            </linearGradient>
            <linearGradient id="grad-pending" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fed7aa" />
              <stop offset="100%" stopColor="#fdba74" />
            </linearGradient>

            {/* Sombras */}
            <filter id="tooth-shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
              <feOffset dx="0" dy="2" result="offsetblur"/>
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.2"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>

            <filter id="badge-shadow">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1"/>
              <feOffset dx="0" dy="1" result="offsetblur"/>
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.3"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Fondo decorativo */}
          <rect x="0" y="0" width={svgWidth} height={svgHeight} fill="transparent"/>

          {/* Labels superiores */}
          <text x={svgWidth / 2} y={28} textAnchor="middle" className="fill-foreground text-[13px] font-semibold select-none">
            ARCADA SUPERIOR
          </text>
          <text x={svgWidth / 2} y={svgHeight - 12} textAnchor="middle" className="fill-foreground text-[13px] font-semibold select-none">
            ARCADA INFERIOR
          </text>

          {/* Línea central (Línea media) */}
          <line
            x1={svgWidth / 2}
            y1={45}
            x2={svgWidth / 2}
            y2={svgHeight - 30}
            className="stroke-primary/30 stroke-[2]"
            strokeDasharray="6 4"
          />

          {/* Línea horizontal divisoria */}
          <line
            x1={30}
            y1={svgHeight / 2}
            x2={svgWidth - 30}
            y2={svgHeight / 2}
            className="stroke-border/40 stroke-[1.5]"
            strokeDasharray="8 4"
          />

          {/* Etiquetas en esquinas */}
          <g className="select-none">
            {/* Top-left corner: DERECHA (patient's right, upper right teeth) */}
            <text x={10} y={20} textAnchor="start" className="fill-muted-foreground text-[10px] font-medium">DERECHA</text>
            {/* Top-right corner: IZQUIERDA (patient's left, upper left teeth) */}
            <text x={svgWidth - 10} y={20} textAnchor="end" className="fill-muted-foreground text-[10px] font-medium">IZQUIERDA</text>
            {/* Bottom-left corner: DERECHA (patient's right, lower right teeth) */}
            <text x={10} y={svgHeight - 5} textAnchor="start" className="fill-muted-foreground text-[10px] font-medium">DERECHA</text>
            {/* Bottom-right corner: IZQUIERDA (patient's left, lower left teeth) */}
            <text x={svgWidth - 10} y={svgHeight - 5} textAnchor="end" className="fill-muted-foreground text-[10px] font-medium">IZQUIERDA</text>
          </g>

          {/* Upper right teeth */}
          {upperRight.map((num, i) => {
            const tooth = teethMap.get(num)
            if (!tooth) return null
            return (
              <ToothShape
                key={num}
                toothData={tooth}
                x={getX(i, "right")}
                y={95}
                isSelected={selectedTooth === num}
                onClick={() => onSelectTooth(num)}
                toothType={getToothType(num)}
              />
            )
          })}

          {/* Upper left teeth */}
          {upperLeft.map((num, i) => {
            const tooth = teethMap.get(num)
            if (!tooth) return null
            return (
              <ToothShape
                key={num}
                toothData={tooth}
                x={getX(i, "left")}
                y={95}
                isSelected={selectedTooth === num}
                onClick={() => onSelectTooth(num)}
                toothType={getToothType(num)}
              />
            )
          })}

          {/* Lower right teeth */}
          {lowerRight.map((num, i) => {
            const tooth = teethMap.get(num)
            if (!tooth) return null
            return (
              <ToothShape
                key={num}
                toothData={tooth}
                x={getX(i, "right")}
                y={225}
                isSelected={selectedTooth === num}
                onClick={() => onSelectTooth(num)}
                toothType={getToothType(num)}
              />
            )
          })}

          {/* Lower left teeth */}
          {lowerLeft.map((num, i) => {
            const tooth = teethMap.get(num)
            if (!tooth) return null
            return (
              <ToothShape
                key={num}
                toothData={tooth}
                x={getX(i, "left")}
                y={225}
                isSelected={selectedTooth === num}
                onClick={() => onSelectTooth(num)}
                toothType={getToothType(num)}
              />
            )
          })}
        </svg>
      </div>

      {/* Leyenda mejorada */}
      <div className="flex flex-wrap items-center justify-center gap-6">
        {Object.entries(statusColors).map(([key, val]) => (
          <div key={key} className="flex items-center gap-2.5 group">
            <div
              className="h-5 w-5 rounded-md border-2 shadow-sm transition-transform group-hover:scale-110"
              style={{
                backgroundColor: val.fill,
                borderColor: val.stroke
              }}
            />
            <span className="text-sm font-medium text-foreground">{val.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
