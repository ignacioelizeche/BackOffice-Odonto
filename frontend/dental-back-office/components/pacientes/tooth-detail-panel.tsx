"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select"
import {
  Calendar,
  Plus,
  Stethoscope,
  FileText,
  DollarSign,
  X,
  Clock,
  Save,
  Activity,
  Paperclip,
  Download,
  Trash2,
} from "lucide-react"
import type { ToothData, ToothRecord } from "./patients-data"
import { doctorsService, type Doctor } from "@/services/doctors.service"

const statusLabels: Record<string, string> = {
  sano: "Sano",
  tratado: "Tratado",
  en_tratamiento: "En tratamiento",
  extraccion: "Extracción",
  pendiente: "Pendiente",
}

const statusStyles: Record<string, string> = {
  sano: "bg-emerald-100 text-emerald-700 border-emerald-300",
  tratado: "bg-blue-100 text-blue-700 border-blue-300",
  en_tratamiento: "bg-amber-100 text-amber-700 border-amber-300",
  extraccion: "bg-red-100 text-red-700 border-red-300",
  pendiente: "bg-orange-100 text-orange-700 border-orange-300",
}

// Tratamientos organizados por categoría
const treatmentCategories = [
  {
    label: "Prevención",
    treatments: [
      "Limpieza dental",
      "Aplicación de flúor",
      "Sellador de fosas y fisuras",
      "Profilaxis",
    ]
  },
  {
    label: "Restauración",
    treatments: [
      "Resina compuesta",
      "Amalgama",
      "Incrustación (Inlay/Onlay)",
      "Corona dental",
      "Carilla dental",
    ]
  },
  {
    label: "Endodoncia",
    treatments: [
      "Tratamiento de conducto",
      "Pulpotomía",
      "Recubrimiento pulpar",
    ]
  },
  {
    label: "Cirugía",
    treatments: [
      "Extracción simple",
      "Extracción quirúrgica",
      "Implante dental",
      "Cirugía periodontal",
    ]
  },
  {
    label: "Periodoncia",
    treatments: [
      "Raspado y alisado radicular",
      "Cirugía de colgajo",
      "Injerto gingival",
    ]
  },
  {
    label: "Prótesis",
    treatments: [
      "Prótesis removible",
      "Prótesis fija",
      "Puente dental",
      "Corona sobre implante",
    ]
  },
  {
    label: "Otro",
    treatments: ["Otro tratamiento (especificar)"]
  }
]

// Doctors will be loaded from API

interface ToothDetailPanelProps {
  toothData: ToothData
  onAddRecord: (toothNumber: number, record: ToothRecord) => void
  onClose: () => void
  onUpdateToothStatus?: (toothNumber: number, status: string) => void
}

const toothStates = [
  { value: "sano", label: "Sano", color: "bg-emerald-100 text-emerald-700" },
  { value: "pendiente", label: "Caries", color: "bg-red-100 text-red-700" },
  { value: "tratado", label: "Obturado", color: "bg-blue-100 text-blue-700" },
  { value: "en_tratamiento", label: "Corona", color: "bg-amber-100 text-amber-700" },
  { value: "extraccion", label: "Extraído", color: "bg-gray-100 text-gray-700" },
]

export function ToothDetailPanel({
  toothData,
  onAddRecord,
  onClose,
  onUpdateToothStatus
}: ToothDetailPanelProps) {
  const [showForm, setShowForm] = useState(false)
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loadingDoctors, setLoadingDoctors] = useState(true)
  const [newRecord, setNewRecord] = useState({
    treatment: "",
    doctor: "",
    notes: "",
    cost: "",
    files: [] as File[],
  })
  const [filePreview, setFilePreview] = useState<Array<{ name: string; size: string }>>([])
  const fileInputRef = useState<HTMLInputElement | null>(null)[1]

  // Fetch doctors from API
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setLoadingDoctors(true)
        const response = await doctorsService.getAll()
        setDoctors(response.data || [])
      } catch (error) {
        console.error("Error loading doctors:", error)
        setDoctors([])
      } finally {
        setLoadingDoctors(false)
      }
    }

    fetchDoctors()
  }, [])

  const formatCurrency = (value: string) => {
    // Remover todo excepto números
    const numbers = value.replace(/\D/g, "")
    if (!numbers) return ""

    // Formatear con comas
    const formatted = parseFloat(numbers).toLocaleString()
    return `$${formatted}`
  }

  const handleCostChange = (value: string) => {
    const formatted = formatCurrency(value)
    setNewRecord({ ...newRecord, cost: formatted })
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    const maxSize = 10 * 1024 * 1024 // 10 MB

    const validFiles = selectedFiles.filter(file => {
      if (file.size > maxSize) {
        alert(`El archivo ${file.name} es muy grande (máx 10 MB)`)
        return false
      }
      return true
    })

    setNewRecord({
      ...newRecord,
      files: [...newRecord.files, ...validFiles],
    })

    setFilePreview([
      ...filePreview,
      ...validFiles.map(f => ({ name: f.name, size: formatFileSize(f.size) }))
    ])

    // Reset input
    if (e.target) {
      e.target.value = ''
    }
  }

  const removeFile = (index: number) => {
    setNewRecord({
      ...newRecord,
      files: newRecord.files.filter((_, i) => i !== index),
    })
    setFilePreview(filePreview.filter((_, i) => i !== index))
  }

  const resetForm = () => {
    setNewRecord({ treatment: "", doctor: "", notes: "", cost: "", files: [] })
    setFilePreview([])
    setShowForm(false)
  }

  const getApiBaseUrl = () => {
    if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL
    }
    if (typeof window !== "undefined") {
      return `${window.location.protocol}//${window.location.hostname}:8000/api`
    }
    return ""
  }

  const handleDownload = async (attachment: any) => {
    const apiBase = getApiBaseUrl()
    const rawUrl = attachment?.downloadUrl || attachment?.download_url
    if (!rawUrl) return

    let url = rawUrl.startsWith("http") ? rawUrl : `${apiBase}${rawUrl}`
    if (apiBase.endsWith("/api") && rawUrl.startsWith("/api")) {
      url = `${apiBase.replace(/\/api$/, "")}${rawUrl}`
    }
    const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null

    try {
      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`)
      }

      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = blobUrl
      link.download = attachment.name || "archivo"
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(blobUrl)
    } catch (error) {
      console.error("Error downloading attachment:", error)
    }
  }

  const formatDateConsistent = (dateStr: string): string => {
    // Convierte cualquier formato a "DD MMM YYYY"
    if (typeof dateStr !== "string") return "---"

    // Si ya está en formato "DD MMM YYYY", retorna tal cual
    if (/^\d{1,2}\s+[A-Za-z]+\s+\d{4}$/.test(dateStr)) {
      return dateStr
    }

    // Si está en formato "YYYY-MM-DD" o similar, convierte
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr // Si no es válido, retorna original

    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
  }

  const getSortedRecordsByDate = (records: ToothRecord[]): ToothRecord[] => {
    return [...records].sort((a, b) => {
      const dateA = new Date(a.date)
      const dateB = new Date(b.date)
      return dateB.getTime() - dateA.getTime() // Descendente (más reciente primero)
    })
  }

  const handleSubmit = () => {
    if (!newRecord.treatment.trim() || !newRecord.doctor.trim()) return

    const today = new Date()
    const months = [
      "Ene", "Feb", "Mar", "Abr", "May", "Jun",
      "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
    ]
    const dateStr = `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`

    onAddRecord(toothData.number, {
      id: Date.now(),
      date: dateStr,
      treatment: newRecord.treatment,
      doctor: newRecord.doctor,
      notes: newRecord.notes,
      cost: newRecord.cost || "$0",
      files: newRecord.files,
      attachments: filePreview.map(f => ({ name: f.name, size: f.size })),
    } as any)

    resetForm()
  }

  const parseCostValue = (value: unknown) => {
    if (typeof value === "number") return value
    if (typeof value === "string") {
      return parseFloat(value.replace(/[$,]/g, "")) || 0
    }
    return 0
  }

  const totalCost = toothData.records.reduce((sum, r) => {
    return sum + parseCostValue(r.cost)
  }, 0)

  return (
    <Card className="border-border/50 shadow-lg">
      <CardHeader className="pb-4 bg-gradient-to-r from-card to-muted/30">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1.5">
            <CardTitle className="text-xl font-bold text-card-foreground">
              Diente {toothData.number}
            </CardTitle>
            <p className="text-sm font-medium text-muted-foreground">{toothData.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={toothData.status}
              onValueChange={(val) => onUpdateToothStatus?.(toothData.number, val)}
            >
              <SelectTrigger className="w-auto border-border bg-card px-3 py-1.5 h-auto shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sano" className="text-sm">
                  <span className="font-medium">Sano</span>
                </SelectItem>
                <SelectItem value="tratado" className="text-sm">
                  <span className="font-medium">Tratado</span>
                </SelectItem>
                <SelectItem value="en_tratamiento" className="text-sm">
                  <span className="font-medium">En tratamiento</span>
                </SelectItem>
                <SelectItem value="extraccion" className="text-sm">
                  <span className="font-medium">Extracción</span>
                </SelectItem>
                <SelectItem value="pendiente" className="text-sm">
                  <span className="font-medium">Pendiente</span>
                </SelectItem>
              </SelectContent>
            </Select>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-6 pt-6 overflow-hidden">

        {/* Summary stats mejoradas - Vertical */}
        <div className="flex flex-col gap-3 overflow-hidden">
          <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-primary/20 bg-primary/5 p-4 transition-all hover:border-primary/40 hover:shadow-md overflow-hidden">
            <div className="rounded-full bg-primary/10 p-2 shrink-0">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <p className="text-2xl font-bold text-card-foreground text-center">{toothData.records.length}</p>
            <p className="text-xs font-medium text-muted-foreground text-center">Registros</p>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4 transition-all hover:border-emerald-300 hover:shadow-md overflow-hidden">
            <div className="rounded-full bg-emerald-100 p-2 shrink-0">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-700 text-center truncate max-w-full">
              {totalCost > 0 ? `$${totalCost.toLocaleString()}` : "$0"}
            </p>
            <p className="text-xs font-medium text-emerald-600 text-center">Total Gastado</p>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-blue-200 bg-blue-50 p-4 transition-all hover:border-blue-300 hover:shadow-md overflow-hidden">
            <div className="rounded-full bg-blue-100 p-2 shrink-0">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-sm font-bold text-blue-700 text-center">
              {toothData.records.length > 0 ? formatDateConsistent(toothData.records[toothData.records.length - 1].date) : "---"}
            </p>
            <p className="text-xs font-medium text-blue-600 text-center">Último</p>
          </div>
        </div>

        {/* Add record button / form mejorado */}
        {!showForm ? (
          <Button
            onClick={() => setShowForm(true)}
            className="w-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 shadow-md"
            size="lg"
          >
            <Plus className="mr-2 h-5 w-5" />
            Agregar Nuevo Registro
          </Button>
        ) : (
          <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-b from-primary/5 to-primary/10 p-5 shadow-inner">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-primary/20 p-1.5">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                <p className="text-base font-bold text-card-foreground">Nuevo Registro Médico</p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-card/50 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <Label htmlFor="treatment" className="text-sm font-semibold text-foreground mb-1.5">
                  Tratamiento <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={newRecord.treatment}
                  onValueChange={(val) => setNewRecord({ ...newRecord, treatment: val })}
                >
                  <SelectTrigger className="border-border bg-card text-sm h-11 shadow-sm pl-3">
                    <SelectValue placeholder="Selecciona el tipo de tratamiento" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    {treatmentCategories.map((category) => (
                      <SelectGroup key={category.label}>
                        <SelectLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 py-1.5">
                          {category.label}
                        </SelectLabel>
                        {category.treatments.map((treatment) => (
                          <SelectItem key={treatment} value={treatment} className="text-sm py-2 px-2">
                            {treatment}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="doctor" className="text-sm font-semibold text-foreground mb-1.5">
                  Doctor Responsable <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={newRecord.doctor}
                  onValueChange={(val) => setNewRecord({ ...newRecord, doctor: val })}
                  disabled={loadingDoctors}
                >
                  <SelectTrigger className="border-border bg-card text-sm h-11 shadow-sm">
                    <SelectValue placeholder={loadingDoctors ? "Cargando doctores..." : "Selecciona el doctor"} />
                  </SelectTrigger>
                  <SelectContent>
                    {!loadingDoctors && doctors.length > 0 ? (
                      doctors.map((doctor) => (
                        <SelectItem key={doctor.id} value={doctor.name} className="text-sm">
                          <div className="flex items-center gap-2">
                            <Stethoscope className="h-3.5 w-3.5 text-muted-foreground" />
                            {doctor.name}
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        {loadingDoctors ? "Cargando doctores..." : "No hay doctores disponibles"}
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="cost" className="text-sm font-semibold text-foreground mb-1.5">
                  Costo del Tratamiento
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="cost"
                    placeholder="0"
                    value={newRecord.cost}
                    onChange={(e) => handleCostChange(e.target.value)}
                    className="pl-9 border-border bg-card text-sm h-11 shadow-sm"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes" className="text-sm font-semibold text-foreground mb-1.5">
                  Notas Clínicas y Observaciones
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Describe el procedimiento realizado, observaciones importantes, recomendaciones para el paciente..."
                  value={newRecord.notes}
                  onChange={(e) => setNewRecord({ ...newRecord, notes: e.target.value })}
                  className="min-h-[100px] border-border bg-card text-sm shadow-sm resize-none"
                />
              </div>

              <div>
                <Label className="text-sm font-semibold text-foreground mb-1.5">
                  Adjuntos (Radiografías, Reportes, etc.)
                </Label>
                <div className="flex flex-col gap-3">
                  <div className="relative border-2 border-dashed border-border/50 rounded-lg p-4 text-center transition-colors hover:bg-muted/30">
                    <input
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    />
                    <div className="flex flex-col items-center gap-2">
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs font-medium text-muted-foreground">
                        Arrastra archivos aquí o haz clic para seleccionar
                      </p>
                      <p className="text-xs text-muted-foreground/70">
                        PDF, JPG, PNG, DOC (máx 10 MB)
                      </p>
                    </div>
                  </div>

                  {filePreview.length > 0 && (
                    <div className="rounded-lg border border-border/30 bg-muted/20 p-3 overflow-hidden">
                      <p className="text-xs font-semibold text-foreground mb-2">
                        {filePreview.length} archivo{filePreview.length !== 1 ? 's' : ''} seleccionado{filePreview.length !== 1 ? 's' : ''}
                      </p>
                      <div className="flex flex-col gap-2">
                        {filePreview.map((file, index) => (
                          <div key={index} className="flex items-center justify-between text-xs p-2 bg-card rounded border border-border/30 gap-2 overflow-hidden">
                            <span className="flex items-center gap-2 text-muted-foreground min-w-0">
                              <FileText className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{file.name}</span>
                              <span className="text-muted-foreground/70 shrink-0 whitespace-nowrap">({file.size})</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="text-destructive hover:bg-destructive/10 rounded p-1 transition-colors shrink-0"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={resetForm}
                  variant="outline"
                  className="flex-1"
                  size="lg"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!newRecord.treatment.trim() || !newRecord.doctor.trim()}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  size="lg"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Registro
                </Button>
              </div>
            </div>
          </div>
        )}

        <Separator className="bg-border/50" />

        {/* History timeline mejorado */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Historial de Tratamientos
            </p>
            {toothData.records.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {toothData.records.length} {toothData.records.length === 1 ? "registro" : "registros"}
              </Badge>
            )}
          </div>

          {toothData.records.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border/50 bg-muted/20 py-12">
              <div className="rounded-full bg-muted p-4">
                <Stethoscope className="h-10 w-10 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Sin registros médicos</p>
              <p className="text-xs text-muted-foreground/70 text-center max-w-[200px]">
                Este diente aún no tiene tratamientos registrados
              </p>
            </div>
          ) : (
            <div className="relative flex flex-col gap-0">
              {/* Timeline line mejorada */}
              <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-transparent" />

              {getSortedRecordsByDate(toothData.records).map((record, i) => (
                <div key={record.id} className="relative flex gap-4 pb-6 last:pb-0">
                  {/* Dot mejorado */}
                  <div className="relative z-10 mt-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-3 border-primary bg-card shadow-md">
                    <div className="h-3 w-3 rounded-full bg-primary animate-pulse" />
                  </div>

                  {/* Content mejorado */}
                  <div className="flex-1 rounded-xl border-2 border-border/50 bg-gradient-to-br from-card to-muted/30 p-4 shadow-sm hover:shadow-md transition-shadow overflow-hidden min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="text-base font-bold text-card-foreground">
                        {record.treatment}
                      </p>
                      <Badge variant="outline" className="shrink-0 text-xs font-semibold whitespace-nowrap text-center">
                        {formatDateConsistent(record.date)}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Stethoscope className="h-4 w-4 text-primary" />
                        <span className="font-medium">{record.doctor}</span>
                      </span>
                      <span className="flex items-center gap-1.5 font-semibold text-emerald-600">
                        <DollarSign className="h-4 w-4" />
                        {record.cost}
                      </span>
                    </div>

                    {record.notes && (
                      <div className="mt-3 rounded-lg bg-muted/50 p-3 border border-border/30">
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {record.notes}
                        </p>
                      </div>
                    )}

                    {(record as any).attachments && (record as any).attachments.length > 0 && (
                      <div className="mt-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 p-3 border border-blue-200 dark:border-blue-900 overflow-x-hidden">
                        <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-1.5 overflow-hidden">
                          <Paperclip className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">Archivos adjuntos ({(record as any).attachments.length})</span>
                        </p>
                        <div className="flex flex-col gap-1.5 min-w-0">
                          {(record as any).attachments.map((attachment: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 text-xs p-2 bg-white dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800 overflow-x-hidden min-w-0">
                              <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                              <span className="flex-1 text-blue-900 dark:text-blue-100 truncate min-w-0">
                                {attachment.name}
                              </span>
                              <span className="text-blue-600 dark:text-blue-400 text-xs shrink-0 whitespace-nowrap">
                                {attachment.size}
                              </span>
                              {attachment.downloadUrl || attachment.download_url ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-blue-700 hover:text-blue-900 shrink-0"
                                  onClick={() => handleDownload(attachment)}
                                  title="Descargar"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </Button>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
