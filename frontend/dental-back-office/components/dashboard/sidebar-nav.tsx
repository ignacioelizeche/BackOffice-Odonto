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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import Link from "next/link"
import { usePathname } from "next/navigation"

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
  // Doctors don't see general configuration, can view their own profile instead
  // { icon: Settings, label: "Mi Configuracion", href: "/configuracion/personal" },
]

export function SidebarNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()

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

  return (
    <aside className="flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <Stethoscope className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-sidebar-foreground">AgilDent</h1>
          <p className="text-xs text-sidebar-foreground/60">Desarrollo</p>
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

      <div className="border-t border-sidebar-border px-3 py-4">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground text-xs font-semibold">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-medium text-sidebar-foreground">{user?.name || "Usuario"}</p>
            <p className="text-xs text-sidebar-foreground/50">{user?.email || "email@example.com"}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
            aria-label="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
