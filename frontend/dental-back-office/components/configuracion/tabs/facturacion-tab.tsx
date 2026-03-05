"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DollarSign, CreditCard, FileText, Pencil } from "lucide-react"

const recentInvoices = [
  { id: "FAC-2026-0421", patient: "Maria Garcia Lopez", amount: "$800", date: "12 Feb 2026", status: "pagada" },
  { id: "FAC-2026-0420", patient: "Juan Rodriguez Perez", amount: "$2,500", date: "12 Feb 2026", status: "pendiente" },
  { id: "FAC-2026-0419", patient: "Isabel Gomez Luna", amount: "$5,200", date: "11 Feb 2026", status: "parcial" },
  { id: "FAC-2026-0418", patient: "Laura Fernandez Gil", amount: "$1,200", date: "11 Feb 2026", status: "pagada" },
  { id: "FAC-2026-0417", patient: "Pedro Sanchez Diaz", amount: "$4,200", date: "10 Feb 2026", status: "vencida" },
]

function getInvoiceStatusBadge(status: string) {
  switch (status) {
    case "pagada":
      return <Badge className="bg-accent/15 text-accent border-transparent text-xs font-medium">Pagada</Badge>
    case "pendiente":
      return <Badge className="bg-[hsl(43,74%,66%)]/15 text-[hsl(35,80%,40%)] border-transparent text-xs font-medium">Pendiente</Badge>
    case "parcial":
      return <Badge className="bg-primary/15 text-primary border-transparent text-xs font-medium">Parcial</Badge>
    case "vencida":
      return <Badge className="bg-destructive/15 text-destructive border-transparent text-xs font-medium">Vencida</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export function FacturacionTab() {
  return (
    <div className="flex flex-col gap-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
              <DollarSign className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ingresos del Mes</p>
              <p className="text-xl font-bold text-card-foreground">$148,520</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(43,74%,66%)]/15">
              <CreditCard className="h-5 w-5 text-[hsl(35,80%,40%)]" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Saldo Pendiente</p>
              <p className="text-xl font-bold text-card-foreground">$24,300</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
              <FileText className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Facturas Vencidas</p>
              <p className="text-xl font-bold text-card-foreground">8</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Billing settings */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-card-foreground">
            Configuracion de Facturacion
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label className="text-card-foreground">Moneda</Label>
              <Select defaultValue="mxn">
                <SelectTrigger className="border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mxn">MXN - Peso Mexicano</SelectItem>
                  <SelectItem value="usd">USD - Dolar Americano</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-card-foreground">IVA (%)</Label>
              <Input defaultValue="16" type="number" className="border-border/50" />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-card-foreground">Prefijo de Factura</Label>
              <Input defaultValue="FAC-2026-" className="border-border/50" />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-card-foreground">Siguiente Numero</Label>
              <Input defaultValue="0422" className="border-border/50" />
            </div>
          </div>

          <div className="flex items-start gap-4 rounded-xl border border-border/50 p-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-card-foreground">Facturacion automatica</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Generar factura automaticamente al completar un tratamiento
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-start gap-4 rounded-xl border border-border/50 p-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-card-foreground">Recordatorio de pago</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enviar recordatorio a pacientes con saldo pendiente despues de 15 dias
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex justify-end">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              Guardar Configuracion
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent invoices */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-card-foreground">
            Facturas Recientes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="pl-6">No. Factura</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="pr-6 w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentInvoices.map((inv) => (
                <TableRow key={inv.id} className="border-border/50">
                  <TableCell className="pl-6 font-medium text-card-foreground text-sm">{inv.id}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{inv.patient}</TableCell>
                  <TableCell className="text-sm font-medium text-card-foreground">{inv.amount}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{inv.date}</TableCell>
                  <TableCell>{getInvoiceStatusBadge(inv.status)}</TableCell>
                  <TableCell className="pr-6">
                    <button className="text-muted-foreground hover:text-card-foreground transition-colors">
                      <Pencil className="h-3.5 w-3.5" />
                      <span className="sr-only">Editar factura</span>
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
