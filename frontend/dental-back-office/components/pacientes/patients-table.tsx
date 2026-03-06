"use client"

import { useState, useEffect } from "react"
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
import { Plus, Search, Phone, Mail, ChevronRight, Loader2, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { patientsService, type Patient } from "@/services/patients.service"

type SortColumn = "nombre" | "lastVisit" | "estado" | "saldo"

interface PatientForSort extends Patient {
  sortName?: string
  sortBalance?: number
}

function getStatusBadge(status: string) {
  switch (status) {
    case "activo":
      return <Badge className="bg-accent/15 text-accent border-transparent text-xs font-medium">Activo</Badge>
    case "inactivo":
      return <Badge className="bg-muted text-muted-foreground border-transparent text-xs font-medium">Inactivo</Badge>
    case "nuevo":
      return <Badge className="bg-primary/15 text-primary border-transparent text-xs font-medium">Nuevo</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

interface SortHeaderProps {
  label: string
  columnName: SortColumn
  sortColumn: SortColumn
  sortDirection: "asc" | "desc"
  onSort: (column: SortColumn) => void
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

export function PatientsTable() {
  const [patients, setPatients] = useState<PatientForSort[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("todos")
  const [sortColumn, setSortColumn] = useState<SortColumn>("nombre")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // Cargar pacientes del backend
  useEffect(() => {
    const loadPatients = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await patientsService.getAll()
        setPatients(response.data)
      } catch (err) {
        console.error("Error loading patients:", err)
        setError("Error al cargar pacientes. Verifica que el backend esté corriendo.")
      } finally {
        setLoading(false)
      }
    }

    loadPatients()
  }, [])

  const handleSortClick = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "desc" ? "asc" : "desc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const filtered = patients.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.email?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      p.doctor.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "todos" || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const sorted = [...filtered].sort((a, b) => {
    let aValue: any
    let bValue: any

    switch (sortColumn) {
      case "nombre":
        aValue = a.name.toLowerCase()
        bValue = b.name.toLowerCase()
        break
      case "lastVisit":
        aValue = new Date(a.lastVisit || 0).getTime()
        bValue = new Date(b.lastVisit || 0).getTime()
        break
      case "estado":
        aValue = a.status
        bValue = b.status
        break
      case "saldo":
        aValue = a.balance || 0
        bValue = b.balance || 0
        break
      default:
        return 0
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
    return 0
  })

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-card-foreground">
              Lista de Pacientes
            </CardTitle>
            {loading ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : error ? (
              <p className="text-sm text-red-500">{error}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {sorted.length} pacientes encontrados
              </p>
            )}
          </div>
          <Link href="/pacientes/nuevo">
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="mr-1.5 h-4 w-4" />
              Nuevo Paciente
            </Button>
          </Link>
        </div>
        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, email o doctor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-border/50 bg-background pl-9 text-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full border-border/50 sm:w-40">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="activo">Activo</SelectItem>
              <SelectItem value="inactivo">Inactivo</SelectItem>
              <SelectItem value="nuevo">Nuevo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="py-8 text-center text-red-500">
            <p>{error}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <SortHeader
                  label="Paciente"
                  columnName="nombre"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSortClick}
                  className="pl-6"
                />
                <TableHead className="hidden md:table-cell">Contacto</TableHead>
                <TableHead className="hidden lg:table-cell">Doctor</TableHead>
                <SortHeader
                  label="Última Visita"
                  columnName="lastVisit"
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
                  label="Saldo"
                  columnName="saldo"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSortClick}
                  className="hidden sm:table-cell"
                />
                <TableHead className="w-10"><span className="sr-only">Ver</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No hay pacientes que coincidan con tu búsqueda
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((patient) => (
                  <TableRow
                    key={patient.id}
                    className="border-border/50 group transition-colors hover:bg-primary/5"
                  >
                    <TableCell className="pl-6">
                      <Link href={`/pacientes/${patient.id}`} className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-medium">
                            {patient.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-card-foreground">{patient.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {patient.age} años - {patient.gender}
                          </p>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-col gap-1">
                        {patient.email && (
                          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {patient.email}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {patient.phone}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {patient.doctor}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {patient.lastVisit}
                    </TableCell>
                    <TableCell>{getStatusBadge(patient.status)}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className={cn(
                        "text-sm font-medium",
                        patient.balance === 0 ? "text-muted-foreground" : "text-destructive"
                      )}>
                        ${patient.balance || 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Link href={`/pacientes/${patient.id}`} className="flex items-center">
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
