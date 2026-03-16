"use client"

import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  UserCog,
  Settings,
  LogOut,
  Stethoscope,
  Bell,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { configService } from "@/services/config.service"

// Navigation items available to all users
const commonNavItems = [
  { icon: LayoutDashboard, label: "Panel Principal", href: "/" },
  { icon: CalendarDays, label: "Citas", href: "/citas" },
  { icon: Users, label: "Pacientes", href: "/pacientes" },
  { icon: UserCog, label: "Doctores", href: "/doctores" },
  { icon: Bell, label: "Notificaciones", href: "/notificaciones" },
]

// Configuration menu items - different for admins vs doctors
const adminNavItems = [
  ...commonNavItems,
  { icon: Settings, label: "Configuracion", href: "/configuracion" },
]

const doctorNavItems = [
  ...commonNavItems,
  { icon: Settings, label: "Mi Perfil", href: "/mi-perfil" },
]

export function SidebarNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const [clinicConfig, setClinicConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadClinicConfig = async () => {
      try {
        const config = await configService.getClinicConfig()
        setClinicConfig(config)
      } catch (error) {
        console.error("Error loading clinic config:", error)
      } finally {
        setLoading(false)
      }
    }

    loadClinicConfig()
  }, [])

  // Select navigation items based on user role
  const navItems = user?.role === "Doctor" ? doctorNavItems : adminNavItems

  const handleLogout = () => {
    logout()
    router.push("/auth/login")
  }

  const userInitials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U"

  const clinicName = clinicConfig?.name || "Clínica Dental"
  const clinicLogoUrl = clinicConfig?.logoUrl

  // Build absolute URL for logo if it's a relative path
  const resolvedLogoUrl = clinicLogoUrl
    ? clinicLogoUrl.startsWith('http')
      ? clinicLogoUrl
      : `${process.env.NEXT_PUBLIC_API_URL || ''}${clinicLogoUrl}`
    : null

  return (
    <aside className="flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground overflow-y-auto">
      {/* Clinic Logo and Name Section */}
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary overflow-hidden">
          {resolvedLogoUrl && !loading ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolvedLogoUrl}
              alt="Clinic Logo"
              className="h-full w-full object-cover"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/agildent_logo.png"
              alt="AgilDent Logo"
              className="h-full w-full object-contain"
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-sidebar-foreground truncate">{clinicName}</h1>
          <p className="text-xs text-sidebar-foreground/60">{user?.name || "Usuario"}</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/40">
          Menu
        </p>
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href

            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User Menu Section */}
      <div className="border-t border-sidebar-border px-3 py-4">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <Avatar className="h-9 w-9 flex-shrink-0">
            <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground text-xs font-semibold">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name || "Usuario"}</p>
            <p className="text-xs text-sidebar-foreground/50 truncate">{user?.email || "email@example.com"}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors flex-shrink-0"
            aria-label="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
