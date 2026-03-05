"use client"

import { useState, useEffect, forwardRef, useImperativeHandle } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Search, Clock, CalendarDays, Pencil, Loader2, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { appointmentsService, type Appointment } from "@/services/appointments.service"

type AppointmentDisplay = Appointment & {
  cost: string
}

function getStatusBadge(status: string) {
  switch (status) {
    case "confirmada":
      return <Badge className="bg-accent/15 text-accent border-transparent text-xs font-medium">Confirmada</Badge>
    case "pendiente":
      return <Badge className="bg-[hsl(43,74%,66%)]/15 text-[hsl(35,80%,40%)] border-transparent text-xs font-medium">Pendiente</Badge>
    case "completada":
      return <Badge className="bg-secondary text-secondary-foreground border-transparent text-xs font-medium">Completada</Badge>
    case "cancelada":
      return <Badge className="bg-destructive/15 text-destructive border-transparent text-xs font-medium">Cancelada</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

interface SortHeaderProps {
  label: string
  columnName: "paciente" | "doctor" | "tratamiento" | "horario" | "estado" | "costo"
  sortColumn: string
  sortDirection: "asc" | "desc"
  onSort: (column: "paciente" | "doctor" | "tratamiento" | "horario" | "estado" | "costo") => void
  className?: string
}

function SortHeader({ label, columnName, sortColumn, sortDirection, onSort, className }: SortHeaderProps) {
  const isActive = sortColumn === columnName
  return (
    <TableHead 
      className={cn("cursor-pointer hover:bg-muted/50 select-none", className)}
      onClick={() => onSort(columnName)}
    >
      <div className="flex items-center gap-2">
        {label}
        {isActive ? (
          sortDirection === "asc" ? (
            <ChevronUp className="h-4 w-4 text-primary" />
          ) : (
            <ChevronDown className="h-4 w-4 text-primary" />
          )
        ) : (
          <ArrowUpDown className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
        )}
      </div>
    </TableHead>
  )
}

interface CitasTableProps {
  selectedCitaId: number | null
  onSelectCita: (cita: AppointmentDisplay) => void
}

export const CitasTable = forwardRef<() => void, CitasTableProps>(
  ({ selectedCitaId, onSelectCita }, ref) => {
    const [appointments, setAppointments] = useState<AppointmentDisplay[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState("todos")
    const [dateFilter, setDateFilter] = useState("hoy")
    const [doctorFilter, setDoctorFilter] = useState("todos")
    const [sortColumn, setSortColumn] = useState<"paciente" | "doctor" | "tratamiento" | "horario" | "estado" | "costo">("horario")
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

    const loadAppointments = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await appointmentsService.getAll()
        const appointmentsWithCost = response.data.map((a) => {
          const { cost, ...rest } = a
          return {
            ...rest,
            cost: typeof cost === "number" ? `$${cost}` : cost,
          }
        }) as AppointmentDisplay[]
        setAppointments(appointmentsWithCost)
      } catch (err) {
        console.error("Error loading appointments:", err)
        setError("Error al cargar citas. Verifica que el backend esté corriendo.")
      } finally {
        setLoading(false)
      }
    }

    useEffect(() => {
      loadAppointments()
    }, [])

    // Expose loadAppointments to parent
    useImperativeHandle(ref, () => loadAppointments)

  const handleSortClick = (column: "paciente" | "doctor" | "tratamiento" | "horario" | "estado" | "costo") => {
    if (sortColumn === column) {
      // Si ya está ordenado por esta columna, cambiar la dirección
      setSortDirection(sortDirection === "desc" ? "asc" : "desc")
    } else {
      // Si es una nueva columna, ordenar descendente por defecto
      setSortColumn(column)
      setSortDirection("desc")
    }
  }

  const filtered = appointments.filter((a) => {
    const matchesSearch =
      a.patient.toLowerCase().includes(search.toLowerCase()) ||
      a.doctor.toLowerCase().includes(search.toLowerCase()) ||
      a.treatment.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "todos" || a.status === statusFilter
    const matchesDoctor = doctorFilter === "todos" || a.doctor === doctorFilter
    let matchesDate = true
    if (dateFilter !== "todos") {
      // Normalizar fecha de cita (formato YYYY-MM-DD)
      const appointmentDate = a.date.split("T")[0] // Obtener solo la parte YYYY-MM-DD
      
      // Obtener fechas en formato YYYY-MM-DD
      const getDateString = (date: Date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, "0")
        const day = String(date.getDate()).padStart(2, "0")
        return `${year}-${month}-${day}`
      }
      
      const today = getDateString(new Date())
      const tomorrow = getDateString(new Date(Date.now() + 86400000))
      const yesterday = getDateString(new Date(Date.now() - 86400000))

      if (dateFilter === "hoy") matchesDate = appointmentDate === today
      else if (dateFilter === "manana") matchesDate = appointmentDate === tomorrow
      else if (dateFilter === "ayer") matchesDate = appointmentDate === yesterday
    }
    return matchesSearch && matchesStatus && matchesDate && matchesDoctor
  }).sort((a, b) => {
    let aValue: string | number = ""
    let bValue: string | number = ""

    switch (sortColumn) {
      case "paciente":
        aValue = a.patient.toLowerCase()
        bValue = b.patient.toLowerCase()
        break
      case "doctor":
        aValue = a.doctor.toLowerCase()
        bValue = b.doctor.toLowerCase()
        break
      case "tratamiento":
        aValue = a.treatment.toLowerCase()
        bValue = b.treatment.toLowerCase()
        break
      case "horario":
        aValue = a.time
        bValue = b.time
        break
      case "estado":
        aValue = a.status.toLowerCase()
        bValue = b.status.toLowerCase()
        break
      case "costo":
        aValue = parseFloat((a.cost as string).replace("$", ""))
        bValue = parseFloat((b.cost as string).replace("$", ""))
        break
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
    return 0
  })

  const uniqueDoctors = [...new Set(appointments.map((a) => a.doctor))]

  if (loading) {
    return (
      <Card className="border-border/50 shadow-sm">
        <CardContent className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-border/50 shadow-sm">
        <CardContent className="py-12 text-center text-red-500">
          <p>{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-card-foreground">
              Gestion de Citas
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {filtered.length} citas encontradas
            </p>
          </div>
          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
            <Link href="/citas/nueva">
              <Plus className="mr-1.5 h-4 w-4" />
              Nueva Cita
            </Link>
          </Button>
        </div>
        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por paciente, doctor o tratamiento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-border/50 bg-background pl-9 text-sm"
            />
          </div>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-full border-border/50 sm:w-36">
              <CalendarDays className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder="Fecha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              <SelectItem value="ayer">Ayer</SelectItem>
              <SelectItem value="hoy">Hoy</SelectItem>
              <SelectItem value="manana">Mañana</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full border-border/50 sm:w-40">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="confirmada">Confirmada</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="completada">Completada</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
            </SelectContent>
          </Select>
          <Select value={doctorFilter} onValueChange={setDoctorFilter}>
            <SelectTrigger className="w-full border-border/50 sm:w-48">
              <SelectValue placeholder="Doctor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los doctores</SelectItem>
              {uniqueDoctors.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent group">
              <SortHeader 
                label="Paciente" 
                columnName="paciente" 
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSortClick}
                className="pl-6"
              />
              <SortHeader 
                label="Doctor" 
                columnName="doctor" 
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSortClick}
                className="hidden md:table-cell"
              />
              <SortHeader 
                label="Tratamiento" 
                columnName="tratamiento" 
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSortClick}
              />
              <SortHeader 
                label="Horario" 
                columnName="horario" 
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSortClick}
              />
              <SortHeader 
                label="Estado" 
                columnName="estado" 
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSortClick}
              />
              <SortHeader 
                label="Costo" 
                columnName="costo" 
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSortClick}
                className="hidden sm:table-cell"
              />
              <TableHead className="pr-6 w-16"><span className="sr-only">Acciones</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  No se encontraron citas con los filtros seleccionados
                </TableCell>
              </TableRow>
            )}
            {filtered.map((cita) => (
              <TableRow
                key={cita.id}
                className={cn(
                  "border-border/50 cursor-pointer transition-colors",
                  selectedCitaId === cita.id && "bg-primary/5"
                )}
                onClick={() => onSelectCita(cita)}
              >
                <TableCell className="pl-6">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-medium">
                        {cita.patientInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-card-foreground">{cita.patient}</p>
                      <p className="text-xs text-muted-foreground">{cita.patientAge} anos</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div>
                    <p className="text-sm text-card-foreground">{cita.doctor}</p>
                    <p className="text-xs text-muted-foreground">{cita.doctorSpecialty}</p>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{cita.treatment}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-card-foreground">{cita.time}</p>
                      <p className="text-xs text-muted-foreground">{cita.duration}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(cita.status)}</TableCell>
                <TableCell className="hidden sm:table-cell">
                  <span className="text-sm font-medium text-card-foreground">{cita.cost}</span>
                </TableCell>
                <TableCell className="pr-6">
                  <Link
                    href={`/citas/editar/${cita.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span className="sr-only">Editar cita</span>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
  }
)

CitasTable.displayName = "CitasTable"
