"use client"

import { useEffect, useState } from "react"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Plus, Loader2, ChevronUp, ChevronDown, ArrowUpDown, Check, X } from "lucide-react"
import { appointmentsService, type Appointment } from "@/services/appointments.service"
import Link from "next/link"
import { cn } from "@/lib/utils"

function getStatusBadge(status: string) {
  switch (status) {
    case "confirmada":
      return <Badge className="bg-accent/15 text-accent border-transparent font-medium">Confirmada</Badge>
    case "en-curso":
      return <Badge className="bg-primary/15 text-primary border-transparent font-medium">En Curso</Badge>
    case "pendiente":
      return <Badge className="bg-[hsl(43,74%,66%)]/15 text-[hsl(35,80%,40%)] border-transparent font-medium">Pendiente</Badge>
    case "completada":
      return <Badge className="bg-secondary text-secondary-foreground border-transparent font-medium">Completada</Badge>
    case "cancelada":
      return <Badge className="bg-destructive/15 text-destructive border-transparent font-medium">Cancelada</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

interface SortHeaderProps {
  label: string
  columnName: "paciente" | "doctor" | "tratamiento" | "hora" | "estado"
  sortColumn: string
  sortDirection: "asc" | "desc"
  onSort: (column: "paciente" | "doctor" | "tratamiento" | "hora" | "estado") => void
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

export function AppointmentsTable() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortColumn, setSortColumn] = useState<"paciente" | "doctor" | "tratamiento" | "hora" | "estado">("hora")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  useEffect(() => {
    const loadAppointments = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await appointmentsService.getAll()
        const today = new Date().toISOString().split("T")[0]
        const todayAppointments = response.data.filter(a => a.date.startsWith(today))
        setAppointments(todayAppointments)
      } catch (err) {
        console.error("Error loading today's appointments:", err)
        setError("Error al cargar citas de hoy")
      } finally {
        setLoading(false)
      }
    }

    loadAppointments()
  }, [])

  const handleSort = (column: "paciente" | "doctor" | "tratamiento" | "hora" | "estado") => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "desc" ? "asc" : "desc")
    } else {
      setSortColumn(column)
      setSortDirection("desc")
    }
  }

  const handleStatusChange = async (appointmentId: number, newStatus: "pendiente" | "confirmada" | "completada" | "cancelada") => {
    try {
      setActionLoading(appointmentId)
      await appointmentsService.updateStatus(appointmentId, newStatus)
      // Actualizar la cita en la lista
      setAppointments(prev => prev.map(apt => 
        apt.id === appointmentId ? { ...apt, status: newStatus } : apt
      ))
    } catch (err) {
      console.error("Error al cambiar estado:", err)
    } finally {
      setActionLoading(null)
    }
  }

  const sorted = [...appointments].sort((a, b) => {
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
      case "hora":
        aValue = a.time
        bValue = b.time
        break
      case "estado":
        aValue = a.status.toLowerCase()
        bValue = b.status.toLowerCase()
        break
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
    return 0
  })

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

  const today = new Date().toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-lg font-semibold text-card-foreground">Citas de Hoy</CardTitle>
          <p className="text-sm text-muted-foreground">{today}</p>
        </div>
        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
          <Link href="/citas/nueva">
            <Plus className="mr-1.5 h-4 w-4" />
            Nueva Cita
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {appointments.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-muted-foreground">
            <p>No hay citas para hoy</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent group">
                <SortHeader 
                  label="Paciente" 
                  columnName="paciente" 
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  className="pl-6"
                />
                <SortHeader 
                  label="Doctor" 
                  columnName="doctor" 
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
                <SortHeader 
                  label="Tratamiento" 
                  columnName="tratamiento" 
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
                <SortHeader 
                  label="Hora" 
                  columnName="hora" 
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
                <SortHeader 
                  label="Estado" 
                  columnName="estado" 
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
                <TableHead className="w-10 pr-6"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((apt) => (
                <TableRow key={apt.id} className="border-border/50 hover:bg-muted/50 transition-colors">
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-medium">
                          {apt.patientInitials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-card-foreground">{apt.patient}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{apt.doctor}</TableCell>
                  <TableCell className="text-muted-foreground">{apt.treatment}</TableCell>
                  <TableCell className="font-medium text-card-foreground">{apt.time}</TableCell>
                  <TableCell>{getStatusBadge(apt.status)}</TableCell>
                  <TableCell className="pr-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          disabled={actionLoading === apt.id}
                        >
                          {actionLoading === apt.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreHorizontal className="h-4 w-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {apt.status === "pendiente" && (
                          <DropdownMenuItem onClick={() => handleStatusChange(apt.id, "confirmada")}>
                            <Check className="mr-2 h-4 w-4" />
                            Confirmar
                          </DropdownMenuItem>
                        )}
                        {(apt.status === "pendiente" || apt.status === "confirmada") && (
                          <DropdownMenuItem onClick={() => handleStatusChange(apt.id, "completada")}>
                            <Check className="mr-2 h-4 w-4" />
                            Marcar Completada
                          </DropdownMenuItem>
                        )}
                        {apt.status !== "cancelada" && apt.status !== "completada" && (
                          <DropdownMenuItem 
                            onClick={() => handleStatusChange(apt.id, "cancelada")}
                            className="text-destructive focus:text-destructive"
                          >
                            <X className="mr-2 h-4 w-4" />
                            Cancelar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
