"use client"

import { Search, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NotificationBell } from "@/components/notifications/notification-bell"

interface DashboardHeaderProps {
  onToggleSidebar: () => void
  title: string
  subtitle: string
}

export function DashboardHeader({ onToggleSidebar, title, subtitle }: DashboardHeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border/50 bg-card px-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden text-muted-foreground hover:text-foreground"
          onClick={onToggleSidebar}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Abrir menu</span>
        </Button>
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar paciente, doctor..."
            className="w-64 border-border/50 bg-background pl-9 text-sm placeholder:text-muted-foreground"
          />
        </div>
        <NotificationBell />
      </div>
    </header>
  )
}
