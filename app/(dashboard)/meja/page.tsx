"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Users, Pencil, CheckCircle2, Clock, CalendarCheck } from "lucide-react"
import { cn } from "@/lib/utils"

type Table = {
  id: string; number: string; capacity: number; floor?: string
  status: "AVAILABLE" | "OCCUPIED" | "RESERVED"; isActive: boolean
  orders?: any[]
}

const STATUS_CONFIG = {
  AVAILABLE:  { label: "Tersedia",   color: "bg-emerald-500", textColor: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200 hover:bg-emerald-100", icon: CheckCircle2 },
  OCCUPIED:   { label: "Terisi",     color: "bg-orange-500", textColor: "text-orange-700",  bg: "bg-orange-50 border-orange-200 hover:bg-orange-100",   icon: Clock },
  RESERVED:   { label: "Dipesan",    color: "bg-blue-500",   textColor: "text-blue-700",    bg: "bg-blue-50 border-blue-200 hover:bg-blue-100",         icon: CalendarCheck },
}

const emptyForm = { number: "", capacity: 4, floor: "" }

export default function MejaPage() {
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Table | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [filterFloor, setFilterFloor] = useState("all")

  async function load() {
    const res = await fetch("/api/table").then(r => r.json())
    setTables(res.data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function openCreate() { setEditing(null); setForm(emptyForm); setOpen(true) }
  function openEdit(t: Table) { setEditing(t); setForm({ number: t.number, capacity: t.capacity, floor: t.floor ?? "" }); setOpen(true) }

  async function handleSave() {
    setSaving(true)
    const url = editing ? `/api/table/${editing.id}` : "/api/table"
    const method = editing ? "PATCH" : "POST"
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, capacity: Number(form.capacity) }) })
    const json = await res.json()
    if (res.ok) { toast.success(editing ? "Meja diperbarui" : "Meja ditambahkan"); setOpen(false); load() }
    else toast.error(json.error)
    setSaving(false)
  }

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/table/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) })
    if (!res.ok) { const j = await res.json(); toast.error(j.error ?? "Gagal update status"); return }
    load()
  }

  const floors = ["all", ...Array.from(new Set(tables.map(t => t.floor ?? "").filter(Boolean)))]
  const filtered = tables.filter(t => filterFloor === "all" || t.floor === filterFloor)

  const counts = {
    AVAILABLE: tables.filter(t => t.status === "AVAILABLE").length,
    OCCUPIED: tables.filter(t => t.status === "OCCUPIED").length,
    RESERVED: tables.filter(t => t.status === "RESERVED").length,
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manajemen Meja</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Floor plan & status meja restoran</p>
        </div>
        <Button onClick={openCreate} className="gap-2 shadow-sm shadow-primary/30">
          <Plus className="h-4 w-4" /> Tambah Meja
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} className={cn("rounded-xl border p-4 cursor-pointer transition-colors", cfg.bg)} onClick={() => setFilterFloor("all")}>
            <div className="flex items-center gap-2">
              <div className={cn("w-2.5 h-2.5 rounded-full", cfg.color)} />
              <p className="text-sm font-medium">{cfg.label}</p>
            </div>
            <p className="text-2xl font-bold mt-1">{counts[key as keyof typeof counts]}</p>
          </div>
        ))}
      </div>

      {/* Floor filter */}
      {floors.length > 1 && (
        <div className="flex gap-2">
          {floors.map(f => (
            <Button key={f} size="sm" variant={filterFloor === f ? "default" : "outline"} onClick={() => setFilterFloor(f)}>
              {f === "all" ? "Semua Lantai" : f}
            </Button>
          ))}
        </div>
      )}

      {/* Table grid */}
      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array(12).fill(0).map((_, i) => <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {filtered.map(table => {
            const cfg = STATUS_CONFIG[table.status]
            const Icon = cfg.icon
            return (
              <div key={table.id} className={cn("relative rounded-xl border-2 p-4 cursor-pointer transition-all group", cfg.bg)}>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(table)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div>
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-3", cfg.color)}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <p className="font-bold text-lg leading-none">#{table.number}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{table.capacity} kursi</span>
                </div>
                <Badge className={cn("text-[10px] mt-2 border-0", cfg.textColor, cfg.bg)}>{cfg.label}</Badge>

                {/* Status changer */}
                <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Select value={table.status} onValueChange={v => updateStatus(table.id, v)}>
                    <SelectTrigger className="h-6 text-[10px] border-0 bg-white/70">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AVAILABLE">Tersedia</SelectItem>
                      <SelectItem value="OCCUPIED">Terisi</SelectItem>
                      <SelectItem value="RESERVED">Dipesan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Meja" : "Tambah Meja"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nomor Meja *</Label>
              <Input value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} placeholder="Contoh: 1, A1, VIP-1" />
            </div>
            <div className="space-y-1">
              <Label>Kapasitas Kursi</Label>
              <Input type="number" min={1} value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1">
              <Label>Lantai / Area</Label>
              <Input value={form.floor} onChange={e => setForm(f => ({ ...f, floor: e.target.value }))} placeholder="Contoh: Lantai 1, Outdoor" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving || !form.number}>{saving ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
