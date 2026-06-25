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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Settings2, AlertTriangle, Package, TrendingUp, Search, ArrowUpDown, ArrowUp, ArrowDown, ToggleLeft } from "lucide-react"
import { cn } from "@/lib/utils"

type MenuItem = { id: string; name: string; stock: number; minStock: number; isAvailable: boolean; category: { name: string } }
type StockLog = { id: string; type: string; change: number; stockAfter: number; reason: string; createdAt: string; menuItem: { name: string }; user: { name: string } }
type SortDir = "asc" | "desc"
type SortKey = "name" | "category" | "stock" | "status"

const TYPE_COLOR: Record<string, string> = {
  SALE: "bg-red-100 text-red-700", RESTOCK: "bg-green-100 text-green-700",
  ADJUSTMENT: "bg-blue-100 text-blue-700", VOID: "bg-orange-100 text-orange-700", REFUND: "bg-purple-100 text-purple-700",
}

function SortIcon({ col, sortKey, sortDir }: { col: string; sortKey: string; sortDir: SortDir }) {
  if (col !== sortKey) return <ArrowUpDown className="h-3.5 w-3.5 opacity-40 ml-1" />
  return sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5 ml-1 text-primary" /> : <ArrowDown className="h-3.5 w-3.5 ml-1 text-primary" />
}

export default function StokPage() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [logs, setLogs] = useState<StockLog[]>([])
  const [loading, setLoading] = useState(true)
  const [modalType, setModalType] = useState<"restok" | "adjust" | null>(null)
  const [selected, setSelected] = useState<MenuItem | null>(null)
  const [qty, setQty] = useState("")
  const [reason, setReason] = useState("")
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)

  // Filter & Sort state
  const [search, setSearch] = useState("")
  const [filterKategori, setFilterKategori] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")  // all | aktif | nonaktif
  const [filterStok, setFilterStok] = useState("all")      // all | habis | menipis | aman
  const [sortKey, setSortKey] = useState<SortKey>("name")
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  // Log filter
  const [logSearch, setLogSearch] = useState("")
  const [logType, setLogType] = useState("all")
  const [logSort, setLogSort] = useState<"asc" | "desc">("desc")

  async function load() {
    const [m, l] = await Promise.all([
      fetch("/api/menu").then(r => r.json()),
      fetch("/api/stok/log").then(r => r.json()),
    ])
    setItems(m.data ?? [])
    setLogs(l.data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("asc") }
  }

  const categories = useMemo(() => [...new Set(items.map(i => i.category?.name).filter(Boolean))], [items])

  const filtered = useMemo(() => {
    return items
      .filter(i => {
        if (search && !i.name.toLowerCase().includes(search.toLowerCase()) && !i.category?.name.toLowerCase().includes(search.toLowerCase())) return false
        if (filterKategori !== "all" && i.category?.name !== filterKategori) return false
        if (filterStatus === "aktif" && !i.isAvailable) return false
        if (filterStatus === "nonaktif" && i.isAvailable) return false
        if (filterStok === "habis" && i.stock !== 0) return false
        if (filterStok === "menipis" && !(i.stock > 0 && i.stock <= i.minStock)) return false
        if (filterStok === "aman" && !(i.stock > i.minStock)) return false
        return true
      })
      .sort((a, b) => {
        let va: any, vb: any
        if (sortKey === "name") { va = a.name; vb = b.name }
        else if (sortKey === "category") { va = a.category?.name ?? ""; vb = b.category?.name ?? "" }
        else if (sortKey === "stock") { va = a.stock; vb = b.stock }
        else { va = a.isAvailable ? 1 : 0; vb = b.isAvailable ? 1 : 0 }
        const cmp = va < vb ? -1 : va > vb ? 1 : 0
        return sortDir === "asc" ? cmp : -cmp
      })
  }, [items, search, filterKategori, filterStatus, filterStok, sortKey, sortDir])

  const filteredLogs = useMemo(() => {
    return logs
      .filter(l => {
        if (logSearch && !l.menuItem?.name.toLowerCase().includes(logSearch.toLowerCase())) return false
        if (logType !== "all" && l.type !== logType) return false
        return true
      })
      .sort((a, b) => {
        const cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        return logSort === "asc" ? cmp : -cmp
      })
  }, [logs, logSearch, logType, logSort])

  const aktif = items.filter(i => i.isAvailable)
  const nonaktif = items.filter(i => !i.isAvailable)
  const habis = aktif.filter(i => i.stock === 0)
  const menipis = aktif.filter(i => i.stock > 0 && i.stock <= i.minStock)
  const aman = aktif.filter(i => i.stock > i.minStock)

  function openModal(item: MenuItem, type: "restok" | "adjust") {
    setSelected(item); setModalType(type); setQty(""); setReason("")
  }

  async function handleSave() {
    if (!selected || !qty) return
    setSaving(true)
    const url = modalType === "restok" ? "/api/stok/restok" : "/api/stok/adjust"
    const body = modalType === "restok"
      ? { menuItemId: selected.id, qty: Number(qty), reason }
      : { menuItemId: selected.id, newStock: Number(qty), reason }
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    const json = await res.json()
    if (res.ok) { toast.success("Stok diperbarui"); setModalType(null); load() }
    else toast.error(json.error)
    setSaving(false)
  }

  async function handleToggleAvailable(item: MenuItem) {
    setToggling(item.id)
    const res = await fetch(`/api/menu/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable: !item.isAvailable }),
    })
    if (res.ok) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, isAvailable: !i.isAvailable } : i))
      toast.success(`Stok ${!item.isAvailable ? "diaktifkan" : "dinonaktifkan"}`)
    } else toast.error("Gagal mengubah status")
    setToggling(null)
  }

  const headCls = "cursor-pointer select-none hover:text-foreground transition-colors"

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Manajemen Stok</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Monitor dan kelola stok bahan & menu</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Stok Aktif", value: aktif.length, color: "border-l-emerald-500", bg: "bg-emerald-100 text-emerald-600", icon: TrendingUp },
          { label: "Tidak Aktif", value: nonaktif.length, color: "border-l-gray-400", bg: "bg-gray-100 text-gray-600", icon: ToggleLeft },
          { label: "Stok Habis", value: habis.length, color: "border-l-red-500", bg: "bg-red-100 text-red-600", icon: Package },
          { label: "Stok Menipis", value: menipis.length, color: "border-l-orange-500", bg: "bg-orange-100 text-orange-600", icon: AlertTriangle },
          { label: "Stok Aman", value: aman.length, color: "border-l-blue-500", bg: "bg-blue-100 text-blue-600", icon: TrendingUp },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <Card key={label} className={`border-0 shadow-sm border-l-4 ${color}`}>
            <CardContent className="p-3 flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bg}`}><Icon className="h-4 w-4" /></div>
              <div><p className="text-xs text-muted-foreground leading-tight">{label}</p><p className="text-xl font-bold leading-tight">{value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="stok">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="stok">Stok Saat Ini</TabsTrigger>
          <TabsTrigger value="log">Riwayat Perubahan</TabsTrigger>
        </TabsList>

        <TabsContent value="stok" className="mt-4 space-y-3">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-40">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Cari nama menu..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
            </div>
            <Select value={filterKategori} onValueChange={setFilterKategori}>
              <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="Kategori" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32 h-8 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="aktif">Aktif</SelectItem>
                <SelectItem value="nonaktif">Tidak Aktif</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStok} onValueChange={setFilterStok}>
              <SelectTrigger className="w-32 h-8 text-sm"><SelectValue placeholder="Kondisi" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kondisi</SelectItem>
                <SelectItem value="habis">Habis</SelectItem>
                <SelectItem value="menipis">Menipis</SelectItem>
                <SelectItem value="aman">Aman</SelectItem>
              </SelectContent>
            </Select>
            {(search || filterKategori !== "all" || filterStatus !== "all" || filterStok !== "all") && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setSearch(""); setFilterKategori("all"); setFilterStatus("all"); setFilterStok("all") }}>Reset</Button>
            )}
            <span className="text-xs text-muted-foreground self-center ml-auto">{filtered.length} item</span>
          </div>

          <Card className="border-0 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className={headCls} onClick={() => toggleSort("name")}>
                    <span className="flex items-center">Nama Menu<SortIcon col="name" sortKey={sortKey} sortDir={sortDir} /></span>
                  </TableHead>
                  <TableHead className={headCls} onClick={() => toggleSort("category")}>
                    <span className="flex items-center">Kategori<SortIcon col="category" sortKey={sortKey} sortDir={sortDir} /></span>
                  </TableHead>
                  <TableHead className={cn(headCls, "text-center")} onClick={() => toggleSort("stock")}>
                    <span className="flex items-center justify-center">Stok<SortIcon col="stock" sortKey={sortKey} sortDir={sortDir} /></span>
                  </TableHead>
                  <TableHead className="text-center">Min</TableHead>
                  <TableHead className={cn(headCls, "text-center")} onClick={() => toggleSort("status")}>
                    <span className="flex items-center justify-center">Status<SortIcon col="status" sortKey={sortKey} sortDir={sortDir} /></span>
                  </TableHead>
                  <TableHead className="text-center">Aktif</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? Array(6).fill(0).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                )) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Tidak ada data yang cocok</TableCell></TableRow>
                ) : filtered.map(item => {
                  const isHabis = item.stock === 0
                  const isMenipis = !isHabis && item.stock <= item.minStock
                  return (
                    <TableRow key={item.id} className={cn("hover:bg-muted/20", !item.isAvailable && "opacity-50")}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{item.category?.name}</TableCell>
                      <TableCell className="text-center">
                        <span className={cn("font-mono font-bold", !item.isAvailable ? "text-muted-foreground" : isHabis ? "text-red-600" : isMenipis ? "text-orange-600" : "text-foreground")}>
                          {item.stock}
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-mono text-muted-foreground">{item.minStock}</TableCell>
                      <TableCell className="text-center">
                        {!item.isAvailable ? (
                          <Badge className="text-xs bg-gray-100 text-gray-600 border-0">Nonaktif</Badge>
                        ) : (
                          <Badge className={cn("text-xs border-0", isHabis ? "bg-red-100 text-red-700" : isMenipis ? "bg-orange-100 text-orange-700" : "bg-emerald-100 text-emerald-700")}>
                            {isHabis ? "Habis" : isMenipis ? "Menipis" : "Aman"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={item.isAvailable}
                          onCheckedChange={() => handleToggleAvailable(item)}
                          disabled={toggling === item.id}
                          className="scale-90"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => openModal(item, "restok")} disabled={!item.isAvailable}>
                            <Plus className="h-3 w-3" />Restok
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openModal(item, "adjust")} disabled={!item.isAvailable} title="Koreksi stok">
                            <Settings2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="log" className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-40">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Cari nama menu..." value={logSearch} onChange={e => setLogSearch(e.target.value)} className="pl-8 h-8 text-sm" />
            </div>
            <Select value={logType} onValueChange={setLogType}>
              <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="Tipe" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                {["SALE","RESTOCK","ADJUSTMENT","VOID","REFUND"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setLogSort(d => d === "asc" ? "desc" : "asc")}>
              {logSort === "desc" ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />}
              {logSort === "desc" ? "Terbaru" : "Terlama"}
            </Button>
            <span className="text-xs text-muted-foreground self-center ml-auto">{filteredLogs.length} riwayat</span>
          </div>

          <Card className="border-0 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead>Waktu</TableHead>
                  <TableHead>Menu</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead className="text-center">Perubahan</TableHead>
                  <TableHead className="text-center">Stok Akhir</TableHead>
                  <TableHead>Oleh</TableHead>
                  <TableHead>Keterangan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Tidak ada riwayat</TableCell></TableRow>
                ) : filteredLogs.map(log => (
                  <TableRow key={log.id} className="hover:bg-muted/20">
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatTanggal(log.createdAt)}</TableCell>
                    <TableCell className="font-medium text-sm">{log.menuItem?.name}</TableCell>
                    <TableCell><span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", TYPE_COLOR[log.type] ?? "bg-gray-100 text-gray-700")}>{log.type}</span></TableCell>
                    <TableCell className={cn("text-center font-mono font-bold", log.change < 0 ? "text-red-600" : "text-green-600")}>
                      {log.change > 0 ? "+" : ""}{log.change}
                    </TableCell>
                    <TableCell className="text-center font-mono">{log.stockAfter}</TableCell>
                    <TableCell className="text-sm">{log.user?.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{log.reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!modalType} onOpenChange={() => setModalType(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {modalType === "restok" ? <><Plus className="h-5 w-5 text-green-600" />Tambah Stok</> : <><Settings2 className="h-5 w-5 text-blue-600" />Koreksi Stok</>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="font-semibold">{selected?.name}</p>
              <p className="text-muted-foreground">Stok saat ini: <strong className="text-foreground">{selected?.stock}</strong></p>
            </div>
            <div className="space-y-1">
              <Label>{modalType === "restok" ? "Jumlah yang Ditambahkan" : "Stok Baru (Total)"}</Label>
              <Input type="number" min={0} value={qty} onChange={e => setQty(e.target.value)} placeholder="0" autoFocus />
              {modalType === "restok" && qty && <p className="text-xs text-emerald-600">Stok menjadi: {(selected?.stock ?? 0) + Number(qty)}</p>}
            </div>
            <div className="space-y-1">
              <Label>Keterangan — Opsional</Label>
              <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Alasan perubahan stok..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalType(null)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving || !qty}>{saving ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
