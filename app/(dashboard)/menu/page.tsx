"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { toast } from "sonner"
import { formatRupiah } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Pencil, Search, ImageIcon, UtensilsCrossed, Filter } from "lucide-react"
import { cn } from "@/lib/utils"

type MenuItem = { id: string; name: string; description?: string; price: number; imageUrl?: string; stock: number; minStock: number; isAvailable: boolean; categoryId: string; category: { id: string; name: string; icon?: string } }
type Category = { id: string; name: string; icon?: string }

const empty = { name: "", description: "", price: 0, stock: 0, minStock: 5, categoryId: "", isAvailable: true, imageUrl: "" }

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [catFilter, setCatFilter] = useState("all")
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<MenuItem | null>(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    const [m, c] = await Promise.all([fetch("/api/menu").then(r => r.json()), fetch("/api/kategori").then(r => r.json())])
    setItems(m.data ?? []); setCategories(c.data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function openCreate() { setEditing(null); setForm(empty); setOpen(true) }
  function openEdit(item: MenuItem) {
    setEditing(item)
    setForm({ name: item.name, description: item.description ?? "", price: item.price, stock: item.stock, minStock: item.minStock, categoryId: item.categoryId, isAvailable: item.isAvailable, imageUrl: item.imageUrl ?? "" })
    setOpen(true)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    const fd = new FormData(); fd.append("file", file)
    const res = await fetch("/api/upload", { method: "POST", body: fd })
    const json = await res.json()
    if (res.ok) setForm(f => ({ ...f, imageUrl: json.data.url }))
    else toast.error(json.error)
    setUploading(false)
  }

  async function handleSave() {
    if (!form.name || !form.categoryId) { toast.error("Nama dan kategori wajib diisi"); return }
    setSaving(true)
    const url = editing ? `/api/menu/${editing.id}` : "/api/menu"
    const method = editing ? "PATCH" : "POST"
    const res = await fetch(url, {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, price: Number(form.price), stock: Number(form.stock), minStock: Number(form.minStock) }),
    })
    const json = await res.json()
    if (res.ok) { toast.success(editing ? "Menu diperbarui" : "Menu ditambahkan"); setOpen(false); load() }
    else toast.error(json.error)
    setSaving(false)
  }

  const filtered = items.filter(i =>
    (catFilter === "all" || i.categoryId === catFilter) &&
    i.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manajemen Menu</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{items.length} item tersedia</p>
        </div>
        <Button onClick={openCreate} className="gap-2 shadow-sm shadow-primary/30">
          <Plus className="h-4 w-4" />Tambah Menu
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari menu..." className="pl-9 w-56" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <Button size="sm" variant={catFilter === "all" ? "default" : "outline"} className="rounded-full h-8" onClick={() => setCatFilter("all")}>Semua</Button>
          {categories.map(c => (
            <Button key={c.id} size="sm" variant={catFilter === c.id ? "default" : "outline"} className="rounded-full h-8" onClick={() => setCatFilter(c.id)}>
              {c.icon} {c.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array(10).fill(0).map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-muted-foreground">
          <UtensilsCrossed className="h-10 w-10 mb-3 text-muted-foreground/30" />
          <p className="font-medium">Tidak ada menu ditemukan</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map(item => (
            <Card key={item.id} className="border-0 shadow-sm hover:shadow-md transition-all group overflow-hidden">
              <div className="aspect-video bg-muted relative overflow-hidden">
                {item.imageUrl
                  ? <Image src={item.imageUrl} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                  : <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <Badge className={cn("absolute top-2 right-2 text-[10px] shadow-sm", item.isAvailable ? "bg-emerald-500 text-white" : "bg-gray-500 text-white")}>
                  {item.isAvailable ? "Aktif" : "Nonaktif"}
                </Badge>
                <Button
                  size="icon" variant="secondary"
                  className="absolute bottom-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  onClick={() => openEdit(item)}
                ><Pencil className="h-3 w-3" /></Button>
              </div>
              <CardContent className="p-3">
                <p className="font-semibold text-sm leading-tight truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.category?.icon} {item.category?.name}</p>
                <div className="flex items-center justify-between mt-2">
                  <p className="font-bold text-primary text-sm">{formatRupiah(item.price)}</p>
                  <span className={cn("text-xs font-medium", item.stock <= item.minStock ? "text-red-500" : "text-muted-foreground")}>
                    Stok: {item.stock}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Menu" : "Tambah Menu Baru"}</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
            <div className="space-y-1"><Label>Nama Menu *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Contoh: Nasi Goreng Spesial" /></div>
            <div className="space-y-1">
              <Label>Kategori *</Label>
              <Select value={form.categoryId} onValueChange={v => setForm(f => ({ ...f, categoryId: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Deskripsi</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Deskripsi singkat menu..." rows={2} /></div>
            <div className="space-y-1"><Label>Harga (Rp) *</Label><Input type="number" value={form.price || ""} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} placeholder="0" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Stok Awal</Label><Input type="number" min={0} value={form.stock} onChange={e => setForm(f => ({ ...f, stock: Number(e.target.value) }))} /></div>
              <div className="space-y-1"><Label>Stok Minimum</Label><Input type="number" min={0} value={form.minStock} onChange={e => setForm(f => ({ ...f, minStock: Number(e.target.value) }))} /></div>
            </div>
            <div className="space-y-1">
              <Label>Foto Menu</Label>
              <div className="flex items-center gap-2">
                {form.imageUrl && <Image src={form.imageUrl} alt="preview" width={48} height={48} className="rounded-lg object-cover" />}
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-2">
                  <ImageIcon className="h-4 w-4" />{uploading ? "Mengupload..." : "Upload Foto"}
                </Button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <Switch checked={form.isAvailable} onCheckedChange={v => setForm(f => ({ ...f, isAvailable: v }))} />
              <Label className="cursor-pointer">Tersedia untuk dijual</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.categoryId}>{saving ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
