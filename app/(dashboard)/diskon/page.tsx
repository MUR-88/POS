"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { format } from "date-fns"
import { id as localeId } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Pencil, Trash2, Tag, Percent, BadgeDollarSign, CalendarDays } from "lucide-react"
import { formatRupiah } from "@/lib/utils"
import { cn } from "@/lib/utils"

type Discount = {
  id: string
  name: string
  description?: string
  type: "FIXED" | "PERCENT"
  value: number
  minOrder?: number | null
  maxDiscount?: number | null
  target: "GLOBAL" | "CATEGORY" | "ITEM"
  categoryId?: string | null
  menuItemId?: string | null
  category?: { name: string } | null
  menuItem?: { name: string } | null
  startDate?: string | null
  endDate?: string | null
  isActive: boolean
}

type Category = { id: string; name: string }
type MenuItem = { id: string; name: string }

const emptyForm = {
  name: "", description: "", type: "PERCENT" as "FIXED" | "PERCENT",
  value: 0, minOrder: "", maxDiscount: "", target: "GLOBAL" as "GLOBAL" | "CATEGORY" | "ITEM",
  categoryId: "", menuItemId: "", startDate: "", endDate: "", isActive: true,
}

function isActive(d: Discount) {
  if (!d.isActive) return false
  const now = new Date()
  if (d.startDate && new Date(d.startDate) > now) return false
  if (d.endDate && new Date(d.endDate) < now) return false
  return true
}

export default function DiskonPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Discount | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  async function load() {
    const [d, c, m] = await Promise.all([
      fetch("/api/diskon").then(r => r.json()),
      fetch("/api/kategori").then(r => r.json()),
      fetch("/api/menu").then(r => r.json()),
    ])
    setDiscounts(d.data ?? [])
    setCategories(c.data ?? [])
    setMenuItems(m.data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function openCreate() {
    setEditing(null); setForm(emptyForm); setOpen(true)
  }
  function openEdit(d: Discount) {
    setEditing(d)
    setForm({
      name: d.name, description: d.description ?? "",
      type: d.type, value: d.value,
      minOrder: d.minOrder?.toString() ?? "",
      maxDiscount: d.maxDiscount?.toString() ?? "",
      target: d.target,
      categoryId: d.categoryId ?? "",
      menuItemId: d.menuItemId ?? "",
      startDate: d.startDate ? d.startDate.slice(0, 10) : "",
      endDate: d.endDate ? d.endDate.slice(0, 10) : "",
      isActive: d.isActive,
    })
    setOpen(true)
  }

  async function handleSave() {
    if (!form.name || form.value <= 0) { toast.error("Nama dan nilai diskon wajib diisi"); return }
    setSaving(true)
    const url = editing ? `/api/diskon/${editing.id}` : "/api/diskon"
    const method = editing ? "PATCH" : "POST"
    const body = {
      name: form.name,
      description: form.description || undefined,
      type: form.type,
      value: Number(form.value),
      minOrder: form.minOrder ? Number(form.minOrder) : null,
      maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
      target: form.target,
      categoryId: form.target === "CATEGORY" ? form.categoryId : null,
      menuItemId: form.target === "ITEM" ? form.menuItemId : null,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      isActive: form.isActive,
    }
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    const json = await res.json()
    if (res.ok) { toast.success(editing ? "Diskon diperbarui" : "Diskon ditambahkan"); setOpen(false); load() }
    else toast.error(json.error)
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus diskon ini?")) return
    const res = await fetch(`/api/diskon/${id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Diskon dihapus"); load() }
    else toast.error("Gagal menghapus")
  }

  const active = discounts.filter(isActive)
  const inactive = discounts.filter(d => !isActive(d))

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manajemen Diskon</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{discounts.length} diskon · {active.length} aktif</p>
        </div>
        <Button onClick={openCreate} className="gap-2 shadow-sm shadow-primary/30">
          <Plus className="h-4 w-4" />Tambah Diskon
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Diskon", value: discounts.length, icon: Tag, color: "bg-primary/10 text-primary" },
          { label: "Aktif Sekarang", value: active.length, icon: Percent, color: "bg-emerald-100 text-emerald-600" },
          { label: "Tidak Aktif", value: inactive.length, icon: BadgeDollarSign, color: "bg-orange-100 text-orange-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("p-2 rounded-xl", color)}><Icon className="h-5 w-5" /></div>
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : discounts.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <Tag className="h-12 w-12 mb-3 opacity-30" />
          <p className="font-medium">Belum ada diskon</p>
          <p className="text-sm">Klik "Tambah Diskon" untuk membuat diskon baru</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {discounts.map(d => {
            const active = isActive(d)
            return (
              <Card key={d.id} className="border-0 shadow-sm hover:shadow-md transition-shadow group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn("p-2 rounded-xl shrink-0", d.type === "PERCENT" ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600")}>
                        {d.type === "PERCENT" ? <Percent className="h-4 w-4" /> : <BadgeDollarSign className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{d.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{d.description || (d.target === "GLOBAL" ? "Semua transaksi" : d.target === "CATEGORY" ? `Kategori: ${d.category?.name}` : `Item: ${d.menuItem?.name}`)}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(d)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDelete(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>

                  <div className="text-2xl font-bold mb-2">
                    {d.type === "PERCENT" ? `${d.value}%` : formatRupiah(d.value)}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant={active ? "default" : "secondary"} className="text-xs">{active ? "Aktif" : "Tidak Aktif"}</Badge>
                    {d.minOrder && <Badge variant="outline" className="text-xs">Min. {formatRupiah(d.minOrder)}</Badge>}
                    {d.type === "PERCENT" && d.maxDiscount && <Badge variant="outline" className="text-xs">Maks. {formatRupiah(d.maxDiscount)}</Badge>}
                  </div>

                  {(d.startDate || d.endDate) && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <CalendarDays className="h-3 w-3" />
                      {d.startDate && format(new Date(d.startDate), "dd MMM yy", { locale: localeId })}
                      {d.startDate && d.endDate && " — "}
                      {d.endDate && format(new Date(d.endDate), "dd MMM yy", { locale: localeId })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Diskon" : "Tambah Diskon Baru"}</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
            <div className="space-y-1"><Label>Nama Diskon *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Contoh: Promo Akhir Pekan" /></div>
            <div className="space-y-1"><Label>Deskripsi</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Opsional" /></div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tipe Diskon *</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENT">Persentase (%)</SelectItem>
                    <SelectItem value="FIXED">Potongan Harga (Rp)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Nilai {form.type === "PERCENT" ? "(%)" : "(Rp)"} *</Label>
                <Input type="number" min={0} max={form.type === "PERCENT" ? 100 : undefined} value={form.value} onChange={e => setForm(f => ({ ...f, value: Number(e.target.value) }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Min. Transaksi (Rp)</Label><Input type="number" min={0} value={form.minOrder} onChange={e => setForm(f => ({ ...f, minOrder: e.target.value }))} placeholder="Opsional" /></div>
              {form.type === "PERCENT" && (
                <div className="space-y-1"><Label>Maks. Diskon (Rp)</Label><Input type="number" min={0} value={form.maxDiscount} onChange={e => setForm(f => ({ ...f, maxDiscount: e.target.value }))} placeholder="Opsional" /></div>
              )}
            </div>

            <div className="space-y-1">
              <Label>Berlaku Untuk</Label>
              <Select value={form.target} onValueChange={v => setForm(f => ({ ...f, target: v as any, categoryId: "", menuItemId: "" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GLOBAL">Semua Transaksi</SelectItem>
                  <SelectItem value="CATEGORY">Kategori Tertentu</SelectItem>
                  <SelectItem value="ITEM">Menu Tertentu</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.target === "CATEGORY" && (
              <div className="space-y-1">
                <Label>Pilih Kategori</Label>
                <Select value={form.categoryId} onValueChange={v => setForm(f => ({ ...f, categoryId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih kategori..." /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {form.target === "ITEM" && (
              <div className="space-y-1">
                <Label>Pilih Menu</Label>
                <Select value={form.menuItemId} onValueChange={v => setForm(f => ({ ...f, menuItemId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih menu..." /></SelectTrigger>
                  <SelectContent>{menuItems.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Tanggal Mulai</Label><Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Tanggal Selesai</Label><Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} /></div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
              <Label className="cursor-pointer">Diskon aktif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || form.value <= 0}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
