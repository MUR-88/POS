"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Shield, Activity, Users, Settings, MonitorDot,
  RefreshCw, Trash2, LogOut, Clock, AlertTriangle,
  CheckCircle2, XCircle, Info, ChevronLeft, ChevronRight, Plus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { id as localeId } from "date-fns/locale"

// ─── Types ────────────────────────────────────────────────────────────────────

type Stats = {
  totalUsers: number
  activeUsers: number
  activeSessions: number
  logsToday: number
  errorsToday: number
  recentLogs: LogEntry[]
}

type LogEntry = {
  id: string
  userId?: string
  userName?: string
  userEmail?: string
  userRole?: string
  action: string
  resource: string
  resourceId?: string
  details?: string
  ipAddress?: string
  userAgent?: string
  method?: string
  path?: string
  statusCode?: number
  duration?: number
  createdAt: string
}

type SessionEntry = {
  id: string
  userId: string
  sessionToken: string
  deviceInfo?: string
  ipAddress?: string
  expiresAt: string
  lastActiveAt: string
  createdAt: string
  isActive: boolean
  user: { id: string; name: string; email: string; role: string }
}

type UserEntry = {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  createdAt: string
  sessionTimeoutMins?: number | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function roleBadgeColor(role: string) {
  if (role === "SUPER_ADMIN") return "bg-purple-500/20 text-purple-300 border-purple-500/30"
  if (role === "ADMIN") return "bg-blue-500/20 text-blue-300 border-blue-500/30"
  if (role === "MANAGER") return "bg-green-500/20 text-green-300 border-green-500/30"
  return "bg-slate-500/20 text-slate-300 border-slate-500/30"
}

function actionColor(action: string) {
  if (action === "LOGIN") return "text-green-400"
  if (action === "LOGOUT") return "text-slate-400"
  if (action.includes("DELETE") || action.includes("VOID")) return "text-red-400"
  if (action.includes("CREATE") || action.includes("RESTOCK")) return "text-blue-400"
  if (action.includes("UPDATE") || action.includes("ADJUST")) return "text-yellow-400"
  return "text-slate-300"
}

function fmtTime(d: string) {
  return format(new Date(d), "dd/MM HH:mm:ss", { locale: localeId })
}

function parseUA(ua?: string) {
  if (!ua) return "Unknown"
  if (ua.includes("Chrome")) return "Chrome"
  if (ua.includes("Firefox")) return "Firefox"
  if (ua.includes("Safari")) return "Safari"
  if (ua.includes("Edge")) return "Edge"
  return ua.slice(0, 30)
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: any; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

// ─── BulkActionBar ────────────────────────────────────────────────────────────

function BulkActionBar({ count, onDelete, onClear, deleting }: { count: number; onDelete: () => void; onClear: () => void; deleting: boolean }) {
  if (count === 0) return null
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-purple-600/10 border border-purple-500/30 rounded-lg">
      <span className="text-sm font-medium text-purple-300">{count} item dipilih</span>
      <div className="flex-1" />
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs text-muted-foreground hover:text-foreground"
        onClick={onClear}
      >
        Batal pilih
      </Button>
      <Button
        size="sm"
        className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white gap-1"
        onClick={onDelete}
        disabled={deleting}
      >
        <Trash2 className="h-3 w-3" />
        {deleting ? "Menghapus..." : `Hapus ${count} item`}
      </Button>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
  { id: "overview", label: "Overview", icon: MonitorDot },
  { id: "logs",     label: "Activity Logs", icon: Activity },
  { id: "sessions", label: "Sessions",      icon: Shield },
  { id: "users",    label: "Users",         icon: Users },
  { id: "settings", label: "Settings",      icon: Settings },
]

export default function SuperAdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tab, setTab] = useState("overview")

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "SUPER_ADMIN") {
      router.replace("/dashboard")
    }
  }, [session, status, router])

  if (status === "loading") return <div className="p-8 text-muted-foreground">Memuat...</div>
  if (session?.user?.role !== "SUPER_ADMIN") return null

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Super Admin Console</h1>
            <p className="text-xs text-muted-foreground">Full system control &amp; monitoring</p>
          </div>
        </div>
        <div className="flex gap-1 mt-4 overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                  tab === t.id
                    ? "bg-purple-600 text-white shadow-md shadow-purple-500/30"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {tab === "overview"  && <OverviewTab />}
        {tab === "logs"      && <LogsTab />}
        {tab === "sessions"  && <SessionsTab />}
        {tab === "users"     && <UsersTab />}
        {tab === "settings"  && <SettingsTab />}
      </div>
    </div>
  )
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/superadmin/stats")
    if (res.ok) setStats((await res.json()).data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="text-muted-foreground text-sm">Memuat statistik...</div>
  if (!stats) return <div className="text-red-400 text-sm">Gagal memuat statistik</div>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Total Users"    value={stats.totalUsers}    icon={Users}         color="bg-blue-500/20 text-blue-400" />
        <StatCard label="Users Aktif"    value={stats.activeUsers}   icon={CheckCircle2}  color="bg-green-500/20 text-green-400" />
        <StatCard label="Sessions Aktif" value={stats.activeSessions} icon={MonitorDot}   color="bg-purple-500/20 text-purple-400" />
        <StatCard label="Log Hari Ini"   value={stats.logsToday}     icon={Activity}      color="bg-cyan-500/20 text-cyan-400" />
        <StatCard label="Error Hari Ini" value={stats.errorsToday}   icon={AlertTriangle} color={stats.errorsToday > 0 ? "bg-red-500/20 text-red-400" : "bg-slate-500/20 text-slate-400"} />
      </div>

      <div className="bg-card border border-border rounded-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-semibold text-sm">Aktivitas Terbaru</h2>
          <Button variant="ghost" size="sm" onClick={load} className="h-7 gap-1 text-xs">
            <RefreshCw className="h-3 w-3" /> Refresh
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs">
                <th className="px-4 py-2 text-left">Waktu</th>
                <th className="px-4 py-2 text-left">User</th>
                <th className="px-4 py-2 text-left">Action</th>
                <th className="px-4 py-2 text-left">Resource</th>
                <th className="px-4 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentLogs.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-xs">Belum ada log. Login ulang untuk mulai merekam aktivitas.</td></tr>
              ) : stats.recentLogs.map((log) => (
                <tr key={log.id} className="border-b border-border/50 hover:bg-accent/30">
                  <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">{fmtTime(log.createdAt)}</td>
                  <td className="px-4 py-2">
                    <div className="text-xs">
                      <span className="font-medium">{log.userName ?? "System"}</span>
                      {log.userRole && (
                        <Badge variant="outline" className={cn("ml-1 text-[10px] h-4", roleBadgeColor(log.userRole))}>
                          {log.userRole}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className={cn("px-4 py-2 text-xs font-mono font-medium", actionColor(log.action))}>{log.action}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{log.resource}</td>
                  <td className="px-4 py-2">
                    {log.statusCode ? (
                      <span className={cn("text-xs font-mono", log.statusCode >= 400 ? "text-red-400" : "text-green-400")}>
                        {log.statusCode}
                      </span>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Logs Tab ─────────────────────────────────────────────────────────────────

function LogsTab() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [filterAction, setFilterAction] = useState("")
  const [filterDateFrom, setFilterDateFrom] = useState("")
  const [filterDateTo, setFilterDateTo] = useState("")
  const [expanded, setExpanded] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const LIMIT = 50

  const load = useCallback(async () => {
    setLoading(true)
    setSelected(new Set())
    const p = new URLSearchParams({ page: String(page), limit: String(LIMIT) })
    if (filterAction) p.set("action", filterAction)
    if (filterDateFrom) p.set("dateFrom", filterDateFrom)
    if (filterDateTo) p.set("dateTo", filterDateTo)
    const res = await fetch(`/api/superadmin/logs?${p}`)
    if (res.ok) {
      const j = await res.json()
      setLogs(j.data)
      setTotal(j.total)
    }
    setLoading(false)
  }, [page, filterAction, filterDateFrom, filterDateTo])

  useEffect(() => { load() }, [load])

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === logs.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(logs.map(l => l.id)))
    }
  }

  async function deleteSelected() {
    if (!confirm(`Hapus ${selected.size} log yang dipilih?`)) return
    setDeleting(true)
    await fetch("/api/superadmin/logs", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected) }),
    })
    setDeleting(false)
    load()
  }

  async function clearOld() {
    if (!confirm("Hapus semua log lebih dari 90 hari?")) return
    await fetch("/api/superadmin/logs?olderThanDays=90", { method: "DELETE" })
    load()
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))
  const allSelected = logs.length > 0 && selected.size === logs.length
  const someSelected = selected.size > 0 && selected.size < logs.length

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Action</Label>
            <Input placeholder="LOGIN, CREATE..." value={filterAction} onChange={(e) => { setFilterAction(e.target.value); setPage(1) }} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Dari Tanggal</Label>
            <Input type="date" value={filterDateFrom} onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1) }} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Sampai Tanggal</Label>
            <Input type="date" value={filterDateTo} onChange={(e) => { setFilterDateTo(e.target.value); setPage(1) }} className="h-8 text-xs" />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={load} size="sm" className="h-8 flex-1 text-xs">
              <RefreshCw className="h-3 w-3 mr-1" />Refresh
            </Button>
            <Button onClick={clearOld} variant="outline" size="sm" className="h-8 text-xs text-red-400 border-red-400/30 hover:bg-red-400/10" title="Hapus log > 90 hari">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{total.toLocaleString()} log ditemukan</span>
      </div>

      <BulkActionBar count={selected.size} onDelete={deleteSelected} onClear={() => setSelected(new Set())} deleting={deleting} />

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-accent/50 text-muted-foreground text-xs">
                <th className="px-3 py-2 w-8">
                  <Checkbox
                    checked={allSelected}
                    data-state={someSelected ? "indeterminate" : allSelected ? "checked" : "unchecked"}
                    onCheckedChange={toggleAll}
                    className="h-3.5 w-3.5"
                  />
                </th>
                <th className="px-3 py-2 text-left">Waktu</th>
                <th className="px-3 py-2 text-left">User</th>
                <th className="px-3 py-2 text-left">Action</th>
                <th className="px-3 py-2 text-left">Resource</th>
                <th className="px-3 py-2 text-left">IP</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Detail</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground text-xs">Memuat...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground text-xs">Tidak ada log. Login ulang untuk mulai merekam.</td></tr>
              ) : logs.map((log) => (
                <>
                  <tr
                    key={log.id}
                    className={cn("border-b border-border/50 hover:bg-accent/30 cursor-pointer", selected.has(log.id) && "bg-purple-500/5")}
                    onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                  >
                    <td className="px-3 py-2" onClick={(e) => { e.stopPropagation(); toggleSelect(log.id) }}>
                      <Checkbox checked={selected.has(log.id)} onCheckedChange={() => toggleSelect(log.id)} className="h-3.5 w-3.5" />
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{fmtTime(log.createdAt)}</td>
                    <td className="px-3 py-2 text-xs">
                      <div>{log.userName ?? <span className="text-muted-foreground italic">System</span>}</div>
                      {log.userRole && (
                        <Badge variant="outline" className={cn("text-[9px] h-3.5 mt-0.5", roleBadgeColor(log.userRole))}>
                          {log.userRole}
                        </Badge>
                      )}
                    </td>
                    <td className={cn("px-3 py-2 text-xs font-mono font-medium", actionColor(log.action))}>{log.action}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{log.resource}{log.resourceId ? `/${log.resourceId.slice(0, 6)}` : ""}</td>
                    <td className="px-3 py-2 text-xs font-mono text-muted-foreground">{log.ipAddress ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">
                      {log.statusCode ? (
                        <span className={cn("font-mono", log.statusCode >= 400 ? "text-red-400" : "text-green-400")}>{log.statusCode}</span>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {log.details && <Info className={cn("h-3.5 w-3.5", expanded === log.id ? "text-purple-400" : "text-muted-foreground")} />}
                    </td>
                  </tr>
                  {expanded === log.id && (
                    <tr key={`${log.id}-detail`} className="bg-accent/20 border-b border-border/50">
                      <td colSpan={8} className="px-4 py-3 text-xs">
                        <div className="grid grid-cols-2 gap-x-8 gap-y-1 font-mono">
                          {log.userEmail && <div><span className="text-muted-foreground">Email: </span>{log.userEmail}</div>}
                          {log.userAgent && <div><span className="text-muted-foreground">Browser: </span>{parseUA(log.userAgent)}</div>}
                          {log.method && <div><span className="text-muted-foreground">Method: </span>{log.method}</div>}
                          {log.path && <div><span className="text-muted-foreground">Path: </span>{log.path}</div>}
                          {log.duration && <div><span className="text-muted-foreground">Duration: </span>{log.duration}ms</div>}
                          {log.details && (
                            <div className="col-span-2 mt-1">
                              <span className="text-muted-foreground">Details: </span>
                              <code className="text-purple-300">{log.details}</code>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-accent/20">
          <span className="text-xs text-muted-foreground">Halaman {page} dari {totalPages}</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Sessions Tab ─────────────────────────────────────────────────────────────

function SessionsTab() {
  const [sessions, setSessions] = useState<SessionEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [kicking, setKicking] = useState<string | null>(null)
  const { data: currentSession } = useSession()

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/superadmin/sessions")
    if (res.ok) setSessions((await res.json()).data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function kick(target: SessionEntry) {
    if (!confirm(`Kick session ${target.user.name}?`)) return
    setKicking(target.id)
    await fetch(`/api/superadmin/sessions?sessionToken=${target.sessionToken}`, { method: "DELETE" })
    await load()
    setKicking(null)
  }

  async function kickAll(userId: string, name: string) {
    if (!confirm(`Kick SEMUA session milik ${name}?`)) return
    await fetch(`/api/superadmin/sessions?userId=${userId}`, { method: "DELETE" })
    load()
  }

  const now = new Date()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{sessions.length} session aktif</div>
        <Button variant="outline" size="sm" onClick={load} className="h-8 text-xs gap-1">
          <RefreshCw className="h-3 w-3" /> Refresh
        </Button>
      </div>

      {sessions.length === 0 && !loading && (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground text-sm">
          Tidak ada session aktif. Login ulang untuk session muncul di sini.
        </div>
      )}

      {sessions.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-accent/50 text-muted-foreground text-xs">
                  <th className="px-4 py-2 text-left">User</th>
                  <th className="px-4 py-2 text-left">IP</th>
                  <th className="px-4 py-2 text-left">Browser</th>
                  <th className="px-4 py-2 text-left">Login</th>
                  <th className="px-4 py-2 text-left">Last Active</th>
                  <th className="px-4 py-2 text-left">Expires</th>
                  <th className="px-4 py-2 text-left">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-xs">Memuat...</td></tr>
                ) : sessions.map((s) => {
                  const isExpired = new Date(s.expiresAt) < now
                  const isCurrent = s.user.id === currentSession?.user?.id
                  return (
                    <tr key={s.id} className={cn("border-b border-border/50", isCurrent && "bg-purple-500/5")}>
                      <td className="px-4 py-3">
                        <div className="text-xs font-medium">{s.user.name}</div>
                        <div className="text-[10px] text-muted-foreground">{s.user.email}</div>
                        <div className="flex gap-1 mt-0.5">
                          <Badge variant="outline" className={cn("text-[9px] h-3.5", roleBadgeColor(s.user.role))}>{s.user.role}</Badge>
                          {isCurrent && <Badge variant="outline" className="text-[9px] h-3.5 bg-purple-500/20 text-purple-300 border-purple-500/30">Anda</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{s.ipAddress ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{parseUA(s.deviceInfo)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmtTime(s.createdAt)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmtTime(s.lastActiveAt)}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {isExpired ? (
                          <span className="text-red-400 flex items-center gap-1"><XCircle className="h-3 w-3" />Expired</span>
                        ) : (
                          <span className="text-green-400 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />{fmtTime(s.expiresAt)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {!isCurrent && (
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" className="h-7 text-xs text-red-400 border-red-400/30 hover:bg-red-400/10" disabled={kicking === s.id} onClick={() => kick(s)}>
                              <LogOut className="h-3 w-3 mr-1" />Kick
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 text-xs text-orange-400 border-orange-400/30 hover:bg-orange-400/10" onClick={() => kickAll(s.user.id, s.user.name)} title="Kick semua session user ini">
                              All
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Users Tab ─────────────────────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState<UserEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<UserEntry | null>(null)
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "KASIR", isActive: true, sessionTimeoutMins: "" })
  const [saving, setSaving] = useState(false)
  const [showNewForm, setShowNewForm] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const { data: session } = useSession()

  const load = useCallback(async () => {
    setLoading(true)
    setSelected(new Set())
    const res = await fetch("/api/user")
    if (res.ok) setUsers((await res.json()).data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function toggleSelect(id: string) {
    if (id === session?.user?.id) return
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    const selectable = users.filter(u => u.id !== session?.user?.id).map(u => u.id)
    if (selected.size === selectable.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(selectable))
    }
  }

  async function deleteSelected() {
    if (!confirm(`Hapus ${selected.size} user yang dipilih? Tindakan ini tidak bisa dibatalkan.`)) return
    setDeleting(true)
    await fetch("/api/superadmin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected) }),
    })
    setDeleting(false)
    load()
  }

  function startEdit(u: UserEntry) {
    setEditing(u)
    setForm({ name: u.name, email: u.email, password: "", role: u.role, isActive: u.isActive, sessionTimeoutMins: u.sessionTimeoutMins != null ? String(u.sessionTimeoutMins) : "" })
  }

  async function saveEdit() {
    if (!editing) return
    setSaving(true)
    const body: any = { name: form.name, email: form.email, role: form.role, isActive: form.isActive }
    if (form.password) body.password = form.password

    await fetch(`/api/user/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })

    const timeout = form.sessionTimeoutMins === "" ? null : parseInt(form.sessionTimeoutMins)
    await fetch("/api/superadmin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: editing.id, sessionTimeoutMins: timeout }),
    })

    setEditing(null)
    setSaving(false)
    load()
  }

  async function deleteUser(u: UserEntry) {
    if (!confirm(`Hapus user ${u.name}? Tindakan ini tidak bisa dibatalkan.`)) return
    await fetch(`/api/user/${u.id}`, { method: "DELETE" })
    load()
  }

  async function createUser() {
    setSaving(true)
    const body: any = { name: form.name, email: form.email, password: form.password, role: form.role }
    const res = await fetch("/api/user", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })

    if (res.ok) {
      const newUser = (await res.json()).data
      if (form.sessionTimeoutMins) {
        await fetch("/api/superadmin/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: newUser.id, sessionTimeoutMins: parseInt(form.sessionTimeoutMins) }),
        })
      }
      setShowNewForm(false)
      load()
    } else {
      const err = await res.json()
      alert(err.error ?? "Gagal membuat user")
    }
    setSaving(false)
  }

  const selectable = users.filter(u => u.id !== session?.user?.id)
  const allSelected = selectable.length > 0 && selected.size === selectable.length
  const someSelected = selected.size > 0 && selected.size < selectable.length

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">{users.length} user terdaftar</div>
        <Button size="sm" className="h-8 text-xs bg-purple-600 hover:bg-purple-700 gap-1"
          onClick={() => { setShowNewForm(true); setForm({ name: "", email: "", password: "", role: "KASIR", isActive: true, sessionTimeoutMins: "" }) }}>
          <Plus className="h-3.5 w-3.5" />Tambah User
        </Button>
      </div>

      {showNewForm && (
        <div className="bg-card border border-purple-500/30 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-purple-300">Buat User Baru</h3>
          <UserForm form={form} setForm={setForm} isNew />
          <div className="flex gap-2">
            <Button size="sm" className="h-8 text-xs bg-purple-600 hover:bg-purple-700" disabled={saving} onClick={createUser}>Simpan</Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowNewForm(false)}>Batal</Button>
          </div>
        </div>
      )}

      <BulkActionBar count={selected.size} onDelete={deleteSelected} onClear={() => setSelected(new Set())} deleting={deleting} />

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-accent/50 text-muted-foreground text-xs">
                <th className="px-4 py-2 w-8">
                  <Checkbox
                    checked={allSelected}
                    data-state={someSelected ? "indeterminate" : allSelected ? "checked" : "unchecked"}
                    onCheckedChange={toggleAll}
                    className="h-3.5 w-3.5"
                  />
                </th>
                <th className="px-4 py-2 text-left">User</th>
                <th className="px-4 py-2 text-left">Role</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Session Timeout</th>
                <th className="px-4 py-2 text-left">Dibuat</th>
                <th className="px-4 py-2 text-left">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-xs">Memuat...</td></tr>
              ) : users.map((u) => (
                editing?.id === u.id ? (
                  <tr key={u.id} className="border-b border-border bg-accent/20">
                    <td colSpan={7} className="px-4 py-3">
                      <UserForm form={form} setForm={setForm} />
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" className="h-7 text-xs bg-purple-600 hover:bg-purple-700" disabled={saving} onClick={saveEdit}>Simpan</Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditing(null)}>Batal</Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={u.id} className={cn("border-b border-border/50 hover:bg-accent/30", selected.has(u.id) && "bg-purple-500/5")}>
                    <td className="px-4 py-3">
                      {u.id !== session?.user?.id && (
                        <Checkbox checked={selected.has(u.id)} onCheckedChange={() => toggleSelect(u.id)} className="h-3.5 w-3.5" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-medium flex items-center gap-1.5">
                        {u.name}
                        {u.id === session?.user?.id && <Badge variant="outline" className="text-[9px] h-3.5 bg-purple-500/20 text-purple-300 border-purple-500/30">Anda</Badge>}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={cn("text-[10px] h-4", roleBadgeColor(u.role))}>{u.role}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {u.isActive
                        ? <span className="text-xs text-green-400 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Aktif</span>
                        : <span className="text-xs text-red-400 flex items-center gap-1"><XCircle className="h-3 w-3" />Nonaktif</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {u.sessionTimeoutMins != null ? `${u.sessionTimeoutMins} mnt` : "Default"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(u.createdAt), "dd/MM/yy")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => startEdit(u)}>Edit</Button>
                        {u.id !== session?.user?.id && (
                          <Button variant="outline" size="sm" className="h-7 text-xs text-red-400 border-red-400/30 hover:bg-red-400/10" onClick={() => deleteUser(u)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function UserForm({ form, setForm, isNew }: { form: any; setForm: any; isNew?: boolean }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      <div className="space-y-1">
        <Label className="text-xs">Nama</Label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-8 text-xs" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Email</Label>
        <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-8 text-xs" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">{isNew ? "Password" : "Password Baru (opsional)"}</Label>
        <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="h-8 text-xs" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Role</Label>
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
          className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background">
          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
          <option value="ADMIN">ADMIN</option>
          <option value="MANAGER">MANAGER</option>
          <option value="KASIR">KASIR</option>
        </select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Session Timeout (menit)</Label>
        <Input type="number" placeholder="Default (global)" value={form.sessionTimeoutMins}
          onChange={(e) => setForm({ ...form, sessionTimeoutMins: e.target.value })} className="h-8 text-xs" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Status</Label>
        <select value={String(form.isActive)} onChange={(e) => setForm({ ...form, isActive: e.target.value === "true" })}
          className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background">
          <option value="true">Aktif</option>
          <option value="false">Nonaktif</option>
        </select>
      </div>
    </div>
  )
}

// ─── Settings Tab ──────────────────────────────────────────────────────────────

function SettingsTab() {
  const [settings, setSettings] = useState<Record<string, string>>({ session_timeout_mins: "120" })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch("/api/superadmin/settings").then(r => r.ok ? r.json() : null).then(j => {
      if (j) setSettings(j.data)
      setLoading(false)
    })
  }, [])

  async function save() {
    setSaving(true)
    await fetch("/api/superadmin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return <div className="text-muted-foreground text-sm">Memuat...</div>

  return (
    <div className="max-w-lg space-y-6">
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold">Manajemen Sesi</h2>

        <div className="space-y-2">
          <Label className="text-sm">Session Timeout Global (menit)</Label>
          <p className="text-xs text-muted-foreground">Default untuk semua user. Bisa di-override per-user di tab Users.</p>
          <div className="flex gap-2 items-center">
            <Input type="number" min="15" max="480" value={settings.session_timeout_mins}
              onChange={(e) => setSettings({ ...settings, session_timeout_mins: e.target.value })} className="w-32 h-9" />
            <span className="text-sm text-muted-foreground">menit</span>
            <span className="text-xs text-muted-foreground">
              (= {Math.round(parseInt(settings.session_timeout_mins || "120") / 60 * 10) / 10} jam)
            </span>
          </div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-300 flex gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>Perubahan timeout berlaku untuk login berikutnya. Session aktif menggunakan timeout saat login.</span>
        </div>

        <Button onClick={save} disabled={saving}
          className={cn("bg-purple-600 hover:bg-purple-700", saved && "bg-green-600 hover:bg-green-700")}>
          {saved ? <><CheckCircle2 className="h-4 w-4 mr-2" />Tersimpan!</> : saving ? "Menyimpan..." : "Simpan Pengaturan"}
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Info className="h-4 w-4 text-purple-400" />
          Fitur yang Dapat Ditambahkan
        </h2>
        <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
          {[
            "Two-factor authentication (2FA) untuk SUPER_ADMIN",
            "Backup & restore database otomatis",
            "Email/WhatsApp notifikasi stok habis & ringkasan shift",
            "Log retention policy (auto-delete log lama)",
            "Rate limiting & brute-force protection login",
            "Printer thermal integration (ESC/POS)",
            "Multi-outlet / cabang",
            "Inventory raw material & resep",
            "Reservasi meja",
            "Split bill",
            "Loyalty tier otomatis berdasarkan poin",
            "Export laporan ke Excel/PDF",
            "Webhook integrasi akuntansi",
          ].map((s) => <li key={s}>{s}</li>)}
        </ul>
      </div>
    </div>
  )
}
