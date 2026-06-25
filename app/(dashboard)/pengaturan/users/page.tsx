"use client"

import { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"
import { formatTanggal } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Pencil, Trash2, UserCircle2, Shield, Eye, EyeOff, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"

type User = { id: string; name: string; email: string; role: string; isActive: boolean; createdAt: string }
type SortKey = "name" | "email" | "role" | "isActive" | "createdAt"
type SortDir = "asc" | "desc"

const ROLE_CONFIG: Record<string, { label: string; color: string; desc: string }> = {
  ADMIN:   { label: "Admin",   color: "bg-red-100 text-red-700 border-red-200",     desc: "Akses penuh" },
  MANAGER: { label: "Manager", color: "bg-blue-100 text-blue-700 border-blue-200",  desc: "Laporan & menu" },
  KASIR:   { label: "Kasir",   color: "bg-green-100 text-green-700 border-green-200", desc: "Kasir & meja" },
}

const emptyForm = { name: "", email: "", password: "", role: "KASIR", isActive: true }

function SortIcon({ col, sortKey, sortDir }: { col: string; sortKey: string; sortDir: SortDir }) {
  if (col !== sortKey) return <ArrowUpDown className="h-3 w-3 opacity-40 ml-1 inline" />
  return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1 text-primary inline" /> : <ArrowDown className="h-3 w-3 ml-1 text-primary inline" />
}

export default function UsersPage() {
  const { data: session } = useSession()
  const myRole = (session?.user as any)?.role as string
  const myId = (session?.user as any)?.id as string

  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [filterRole, setFilterRole] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [sortKey, setSortKey] = useState<SortKey>("createdAt")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  async function load() {
    fetch("/api/user").then(r => r.json()).then(j => { setUsers(j.data ?? []); setLoading(false) })
  }
  useEffect(() => { load() }, [])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("asc") }
  }

  const filtered = useMemo(() => {
    return users
      .filter(u => {
        if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false
        if (filterRole !== "all" && u.role !== filterRole) return false
        if (filterStatus === "aktif" && !u.isActive) return false
        if (filterStatus === "nonaktif" && u.isActive) return false
        return true
      })
      .sort((a, b) => {
        let va: any, vb: any
        if (sortKey === "name") { va = a.name; vb = b.name }
        else if (sortKey === "email") { va = a.email; vb = b.email }
        else if (sortKey === "role") { va = a.role; vb = b.role }
        else if (sortKey === "isActive") { va = a.isActive ? 1 : 0; vb = b.isActive ? 1 : 0 }
        else { va = new Date(a.createdAt).getTime(); vb = new Date(b.createdAt).getTime() }
        const cmp = va < vb ? -1 : va > vb ? 1 : 0
        return sortDir === "asc" ? cmp : -cmp
      })
  }, [users, search, filterRole, filterStatus, sortKey, sortDir])

  function openCreate() { setEditing(null); setForm(emptyForm); setShowPass(false); setOpen(true) }
  function openEdit(u: User) { setEditing(u); setForm({ name: u.name, email: u.email, password: "", role: u.role, isActive: u.isActive }); setShowPass(false); setOpen(true) }

  async function handleSave() {
    setSaving(true)
    const url = editing ? `/api/user/${editing.id}` : "/api/user"
    const method = editing ? "PATCH" : "POST"
    const body: any = { name: form.name, email: form.email, role: form.role, isActive: form.isActive }
    if (form.password) body.password = form.password
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    const json = await res.json()
    if (res.ok) { toast.success(editing ? "User diperbarui" : "User ditambahkan"); setOpen(false); load() }
    else toast.error(json.error)
    setSaving(false)
  }

  async function handleDelete(u: User) {
    if (!confirm(`Hapus user "${u.name}"?`)) return
    setDeletingId(u.id)
    const res = await fetch(`/api/user/${u.id}`, { method: "DELETE" })
    const json = await res.json()
    if (res.ok) { toast.success("User dihapus"); load() }
    else toast.error(json.error)
    setDeletingId(null)
  }

  function canDelete(u: User) {
    if (u.id === myId) return false
    if (myRole === "MANAGER") return true
    if (myRole === "ADMIN") return u.role === "KASIR"
    return false
  }

  const headCls = "cursor-pointer select-none hover:text-foreground transition-colors whitespace-nowrap"

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manajemen User</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{users.length} user terdaftar</p>
        </div>
        <Button onClick={openCreate} className="gap-2 shadow-sm shadow-primary/30"><Plus className="h-4 w-4" />Tambah User</Button>
      </div>

      {/* Role summary */}
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(ROLE_CONFIG).map(([role, cfg]) => (
          <Card key={role} className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterRole(filterRole === role ? "all" : role)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", cfg.color, filterRole === role && "ring-2 ring-offset-1 ring-primary")}>{cfg.label}</span>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold">{users.filter(u => u.role === role).length}</p>
              <p className="text-xs text-muted-foreground">{cfg.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Cari nama atau email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-32 h-8 text-sm"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Role</SelectItem>
            {Object.entries(ROLE_CONFIG).map(([r, c]) => <SelectItem key={r} value={r}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32 h-8 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua</SelectItem>
            <SelectItem value="aktif">Aktif</SelectItem>
            <SelectItem value="nonaktif">Nonaktif</SelectItem>
          </SelectContent>
        </Select>
        {(search || filterRole !== "all" || filterStatus !== "all") && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setSearch(""); setFilterRole("all"); setFilterStatus("all") }}>Reset</Button>
        )}
        <span className="text-xs text-muted-foreground self-center ml-auto">{filtered.length} user</span>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className={headCls} onClick={() => toggleSort("name")}>Nama<SortIcon col="name" sortKey={sortKey} sortDir={sortDir} /></TableHead>
              <TableHead className={headCls} onClick={() => toggleSort("email")}>Email<SortIcon col="email" sortKey={sortKey} sortDir={sortDir} /></TableHead>
              <TableHead className={headCls} onClick={() => toggleSort("role")}>Role<SortIcon col="role" sortKey={sortKey} sortDir={sortDir} /></TableHead>
              <TableHead className={cn(headCls, "text-center")} onClick={() => toggleSort("isActive")}>Status<SortIcon col="isActive" sortKey={sortKey} sortDir={sortDir} /></TableHead>
              <TableHead className={headCls} onClick={() => toggleSort("createdAt")}>Bergabung<SortIcon col="createdAt" sortKey={sortKey} sortDir={sortDir} /></TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? Array(4).fill(0).map((_, i) => (
              <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
            )) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Tidak ada user yang cocok</TableCell></TableRow>
            ) : filtered.map(u => {
              const cfg = ROLE_CONFIG[u.role]
              return (
                <TableRow key={u.id} className={cn("hover:bg-muted/20", u.id === myId && "bg-primary/5")}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                        <span className="font-bold text-primary text-xs">{u.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="font-medium text-sm">{u.name}{u.id === myId && <span className="text-xs text-muted-foreground ml-1">(Anda)</span>}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", cfg?.color)}>{cfg?.label}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={u.isActive ? "default" : "secondary"} className="text-xs">{u.isActive ? "Aktif" : "Nonaktif"}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatTanggal(u.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(u)} title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {canDelete(u) && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(u)} disabled={deletingId === u.id} title="Hapus">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><UserCircle2 className="h-5 w-5" />{editing ? "Edit User" : "Tambah User Baru"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Nama Lengkap *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="John Doe" /></div>
            <div className="space-y-1"><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="user@pos.com" /></div>
            <div className="space-y-1">
              <Label>Password {editing && <span className="text-muted-foreground text-xs font-normal">(kosongkan jika tidak diubah)</span>}</Label>
              <div className="relative">
                <Input type={showPass ? "text" : "password"} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder={editing ? "••••••••" : "Min. 6 karakter"} className="pr-9" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPass(v => !v)}>
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_CONFIG).map(([r, cfg]) => (
                    <SelectItem key={r} value={r}>
                      <div><span className="font-medium">{cfg.label}</span><span className="text-muted-foreground ml-2 text-xs">{cfg.desc}</span></div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
              <Label className="cursor-pointer">Akun aktif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.email || (!editing && !form.password)}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
