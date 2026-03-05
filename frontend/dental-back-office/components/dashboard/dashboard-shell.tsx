"use client"

import { useState } from "react"
import { SidebarNav } from "@/components/dashboard/sidebar-nav"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { X } from "lucide-react"

interface DashboardShellProps {
  title: string
  subtitle: string
  children: React.ReactNode
}

export function DashboardShell({ title, subtitle, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <SidebarNav />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-10 h-full w-64">
            <SidebarNav />
            <button
              className="absolute right-3 top-3 rounded-md p-1 text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Cerrar menu</span>
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader
          onToggleSidebar={() => setSidebarOpen(true)}
          title={title}
          subtitle={subtitle}
        />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-7xl flex flex-col gap-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
