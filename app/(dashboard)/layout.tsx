"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import {
  BarChart3, ShoppingCart, UtensilsCrossed, Package,
  TrendingUp, Settings, LogOut, Menu, X, ChefHat,
  TableIcon, Users2, MonitorPlay, ChevronRight, AlarmClock, Tag,
  AlertCircle, PlayCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { SessionProvider } from "next-auth/react"
import { ShiftProvider, useShift } from "@/lib/shift-context"

const navItems = [
  { href: "/dashboard",  label: "Dashboard",   icon: BarChart3,       roles: ["ADMIN","MANAGER","KASIR"],  color: "text-blue-400" },
  { href: "/kasir",      label: "Kasir",        icon: ShoppingCart,    roles: ["ADMIN","MANAGER","KASIR"],  color: "text-green-400" },
  { href: "/meja",       label: "Meja",         icon: TableIcon,       roles: ["ADMIN","MANAGER","KASIR"],  color: "text-yellow-400" },
  { href: "/kds",        label: "Kitchen",      icon: MonitorPlay,     roles: ["ADMIN","MANAGER","KASIR"],  color: "text-orange-400" },
  { href: "/menu",       label: "Menu",         icon: UtensilsCrossed, roles: ["ADMIN","MANAGER"],          color: "text-purple-400" },
  { href: "/stok",       label: "Stok",         icon: Package,         roles: ["ADMIN","MANAGER"],          color: "text-red-400" },
  { href: "/diskon",     label: "Diskon",        icon: Tag,             roles: ["ADMIN","MANAGER"],          color: "text-pink-400" },
  { href: "/member",     label: "Member",       icon: Users2,          roles: ["ADMIN","MANAGER","KASIR"],  color: "text-indigo-400" },
  { href: "/laporan",    label: "Laporan",      icon: TrendingUp,      roles: ["ADMIN","MANAGER"],          color: "text-cyan-400" },
  { href: "/shift",      label: "Shift",        icon: AlarmClock,      roles: ["ADMIN","MANAGER","KASIR"],  color: "text-teal-400" },
  { href: "/pengaturan", label: "Pengaturan",   icon: Settings,        roles: ["ADMIN","MANAGER"],          color: "text-slate-400" },
]

function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = session?.user?.role as string | undefined

  const visible = navItems.filter(item => !role || item.roles.includes(role))

  return (
    <div className="flex flex-col h-full w-64 bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-sidebar-border">
        <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
          <ChefHat className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm leading-tight">POS Restoran</p>
          <p className="text-xs text-sidebar-foreground/50">Management System</p>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-sidebar-foreground/50 hover:text-white hover:bg-sidebar-accent" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visible.map(item => {
          const Icon = item.icon
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"))
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                active
                  ? "bg-primary text-white shadow-md shadow-primary/30"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", active ? "text-white" : item.color)} />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="h-3 w-3 opacity-60" />}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-sidebar-accent transition-colors">
          <Avatar className="h-8 w-8 ring-2 ring-primary/30">
            <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
              {session?.user?.name?.charAt(0)?.toUpperCase() ?? "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate leading-tight">{session?.user?.name}</p>
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary/80 h-4 mt-0.5">{role}</Badge>
          </div>
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 text-sidebar-foreground/40 hover:text-red-400 hover:bg-red-400/10"
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Keluar"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function ShiftBanner() {
  const { shift, isOpen, loading } = useShift()
  const router = useRouter()
  const pathname = usePathname()

  if (loading || isOpen || pathname === "/shift") return null

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-sm shrink-0">
      <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
      <span className="flex-1 font-medium">Shift belum dibuka — fitur kasir tidak aktif</span>
      <Button size="sm" className="h-7 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white" onClick={() => router.push("/shift")}>
        <PlayCircle className="h-3.5 w-3.5" />Buka Shift
      </Button>
    </div>
  )
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const title = navItems.find(n => pathname === n.href || pathname.startsWith(n.href + "/"))?.label ?? "POS"

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:shrink-0 shadow-xl shadow-black/10">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-10">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-sidebar text-sidebar-foreground border-b border-sidebar-border">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-sidebar-foreground/70 hover:text-white" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
            <ChefHat className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-sm">{title}</span>
        </header>

        {/* Shift banner */}
        <ShiftBanner />

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ShiftProvider>
        <DashboardContent>{children}</DashboardContent>
      </ShiftProvider>
    </SessionProvider>
  )
}
