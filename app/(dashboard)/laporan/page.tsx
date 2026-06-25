"use client"

import { useState, useEffect, useMemo } from "react"
import { formatRupiah, formatTanggal } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { Download, TrendingUp, Banknote, ShoppingBag, BarChart3, FileText, Eye, RotateCcw, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type Order = { id: string; orderNo: string; total: number; subtotal: number; discount: number; tax: number; status: string; payMethod: string; createdAt: string; cashier: { name: string }; table?: { number: string }; member?: { name: string }; items: any[] }
type SortKey = "orderNo" | "createdAt" | "cashier" | "status" | "payMethod" | "total"
type SortDir = "asc" | "desc"

const RANGES = [
  { label: "Hari Ini", value: "today" },
  { label: "7 Hari", value: "7d" },
  { label: "30 Hari", value: "30d" },
  { label: "Bulan Ini", value: "month" },
]

const METHOD_COLOR: Record<string, string> = {
  CASH: "bg-green-100 text-green-700", QRIS: "bg-blue-100 text-blue-700",
  TRANSFER: "bg-purple-100 text-purple-700", DEBIT: "bg-orange-100 text-orange-700", KREDIT: "bg-red-100 text-red-700",
}

function SortIcon({ col, sortKey, sortDir }: { col: string; sortKey: string; sortDir: SortDir }) {
  if (col !== sortKey) return <ArrowUpDown className="h-3 w-3 opacity-40 ml-1 inline" />
  return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1 text-primary inline" /> : <ArrowDown className="h-3 w-3 ml-1 text-primary inline" />
}

export default function LaporanPage() {
  const [range, setRange] = useState("7d")
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [chart, setChart] = useState<any[]>([])
  const [detailOrder, setDetailOrder] = useState<Order | null>(null)
  const [voidingId, setVoidingId] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterMethod, setFilterMethod] = useState("all")
  const [sortKey, setSortKey] = useState<SortKey>("createdAt")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch("/api/order?limit=200").then(r => r.json()),
      fetch("/api/dashboard/chart").then(r => r.json()),
    ]).then(([ord, ch]) => {
      setOrders(ord.data ?? [])
      setChart(ch.data ?? [])
      setLoading(false)
    })
  }, [range])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("asc") }
  }

  const filtered = useMemo(() => {
    return orders
      .filter(o => {
        if (search && !o.orderNo.toLowerCase().includes(search.toLowerCase()) && !o.cashier?.name.toLowerCase().includes(search.toLowerCase())) return false
        if (filterStatus !== "all" && o.status !== filterStatus) return false
        if (filterMethod !== "all" && o.payMethod !== filterMethod) return false
        return true
      })
      .sort((a, b) => {
        let va: any, vb: any
        if (sortKey === "orderNo") { va = a.orderNo; vb = b.orderNo }
        else if (sortKey === "createdAt") { va = new Date(a.createdAt).getTime(); vb = new Date(b.createdAt).getTime() }
        else if (sortKey === "cashier") { va = a.cashier?.name ?? ""; vb = b.cashier?.name ?? "" }
        else if (sortKey === "status") { va = a.status; vb = b.status }
        else if (sortKey === "payMethod") { va = a.payMethod; vb = b.payMethod }
        else { va = Number(a.total); vb = Number(b.total) }
        const cmp = va < vb ? -1 : va > vb ? 1 : 0
        return sortDir === "asc" ? cmp : -cmp
      })
  }, [orders, search, filterStatus, filterMethod, sortKey, sortDir])

  async function handleVoid(id: string) {
    if (!confirm("Yakin ingin void transaksi ini?")) return
    setVoidingId(id)
    const res = await fetch(`/api/order/${id}/void`, { method: "POST" })
    if (res.ok) { toast.success("Transaksi divoid"); setOrders(prev => prev.map(o => o.id === id ? { ...o, status: "VOIDED" } : o)) }
    else toast.error("Gagal void")
    setVoidingId(null)
  }

  const completed = orders.filter(o => o.status === "COMPLETED")
  const totalRevenue = completed.reduce((s, o) => s + Number(o.total ?? 0), 0)
  const totalOrders = completed.length
  const avgOrder = totalOrders ? totalRevenue / totalOrders : 0
  const totalTax = completed.reduce((s, o) => s + Number(o.tax ?? 0), 0)
  const totalDiscount = orders.reduce((s, o) => s + Number(o.discount ?? 0), 0)
  const methodBreakdown = completed.reduce((acc: Record<string, number>, o) => { acc[o.payMethod] = (acc[o.payMethod] ?? 0) + Number(o.total); return acc }, {})
  const payMethods = [...new Set(orders.map(o => o.payMethod))]

  function exportCSV() {
    const rows = [["No Order", "Tanggal", "Kasir", "Meja", "Status", "Metode", "Subtotal", "Diskon", "Pajak", "Total"]]
    filtered.forEach(o => rows.push([o.orderNo, formatTanggal(o.createdAt), o.cashier?.name, o.table?.number ?? "-", o.status, o.payMethod, String(Number(o.subtotal)), String(Number(o.discount)), String(Number(o.tax)), String(Number(o.total))]))
    const blob = new Blob([rows.map(r => r.join(",")).join("\n")], { type: "text/csv;charset=utf-8;" })
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `laporan-${range}.csv`; a.click()
    toast.success("CSV berhasil diunduh")
  }

  const headCls = "cursor-pointer select-none hover:text-foreground transition-colors whitespace-nowrap"

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Laporan Penjualan</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Analisis transaksi & pendapatan</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>{RANGES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2"><Download className="h-4 w-4" />CSV</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {loading ? Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />) : (
          <>
            {[
              { label: "Total Pendapatan", value: formatRupiah(totalRevenue), icon: Banknote, color: "bg-emerald-100 text-emerald-600" },
              { label: "Total Transaksi", value: `${totalOrders} order`, icon: ShoppingBag, color: "bg-blue-100 text-blue-600" },
              { label: "Rata-rata", value: formatRupiah(avgOrder), icon: BarChart3, color: "bg-purple-100 text-purple-600" },
              { label: "Total Pajak", value: formatRupiah(totalTax), icon: FileText, color: "bg-orange-100 text-orange-600" },
              { label: "Total Diskon", value: formatRupiah(totalDiscount), icon: TrendingUp, color: "bg-pink-100 text-pink-600" },
            ].map(s => (
              <Card key={s.label} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 rounded-lg ${s.color}`}><s.icon className="h-3.5 w-3.5" /></div>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                  <p className="font-bold">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base">Grafik Pendapatan</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => [formatRupiah(v), "Pendapatan"]} />
                <Bar dataKey="revenue" fill="oklch(0.527 0.154 150.069)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base">Metode Bayar</CardTitle></CardHeader>
          <CardContent className="space-y-2.5">
            {Object.entries(methodBreakdown).map(([method, amount]) => (
              <div key={method} className="flex items-center justify-between">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${METHOD_COLOR[method] ?? "bg-gray-100 text-gray-700"}`}>{method}</span>
                <span className="text-sm font-bold">{formatRupiah(amount)}</span>
              </div>
            ))}
            {Object.keys(methodBreakdown).length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Belum ada transaksi</p>}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Cari no. order atau kasir..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="VOIDED">Voided</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterMethod} onValueChange={setFilterMethod}>
          <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="Metode" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Metode</SelectItem>
            {payMethods.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        {(search || filterStatus !== "all" || filterMethod !== "all") && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setSearch(""); setFilterStatus("all"); setFilterMethod("all") }}>Reset</Button>
        )}
        <span className="text-xs text-muted-foreground self-center ml-auto">{filtered.length} transaksi</span>
      </div>

      {/* Transactions Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className={headCls} onClick={() => toggleSort("orderNo")}>No Order<SortIcon col="orderNo" sortKey={sortKey} sortDir={sortDir} /></TableHead>
              <TableHead className={headCls} onClick={() => toggleSort("createdAt")}>Tanggal<SortIcon col="createdAt" sortKey={sortKey} sortDir={sortDir} /></TableHead>
              <TableHead className={headCls} onClick={() => toggleSort("cashier")}>Kasir<SortIcon col="cashier" sortKey={sortKey} sortDir={sortDir} /></TableHead>
              <TableHead>Meja</TableHead>
              <TableHead className={headCls} onClick={() => toggleSort("payMethod")}>Metode<SortIcon col="payMethod" sortKey={sortKey} sortDir={sortDir} /></TableHead>
              <TableHead className={headCls} onClick={() => toggleSort("status")}>Status<SortIcon col="status" sortKey={sortKey} sortDir={sortDir} /></TableHead>
              <TableHead className={cn(headCls, "text-right")} onClick={() => toggleSort("total")}>Total<SortIcon col="total" sortKey={sortKey} sortDir={sortDir} /></TableHead>
              <TableHead className="text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? Array(5).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-8 w-full" /></TableCell></TableRow>) :
              filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Tidak ada transaksi yang cocok</TableCell></TableRow>
              ) : filtered.map(order => (
                <TableRow key={order.id} className="hover:bg-muted/20">
                  <TableCell className="font-mono text-sm font-medium">{order.orderNo}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatTanggal(order.createdAt)}</TableCell>
                  <TableCell className="text-sm">{order.cashier?.name}</TableCell>
                  <TableCell className="text-sm">{order.table ? `#${order.table.number}` : "-"}</TableCell>
                  <TableCell><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${METHOD_COLOR[order.payMethod] ?? "bg-gray-100 text-gray-700"}`}>{order.payMethod}</span></TableCell>
                  <TableCell>
                    <Badge variant={order.status === "COMPLETED" ? "default" : order.status === "VOIDED" ? "destructive" : "secondary"} className="text-xs">
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold">{formatRupiah(order.total)}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex gap-1 justify-center">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDetailOrder(order)} title="Detail"><Eye className="h-3.5 w-3.5" /></Button>
                      {order.status === "COMPLETED" && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleVoid(order.id)} disabled={voidingId === order.id} title="Void">
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detailOrder} onOpenChange={() => setDetailOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{detailOrder?.orderNo}</DialogTitle></DialogHeader>
          {detailOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Kasir</span><p className="font-medium">{detailOrder.cashier?.name}</p></div>
                <div><span className="text-muted-foreground">Metode</span><p className="font-medium">{detailOrder.payMethod}</p></div>
                {detailOrder.table && <div><span className="text-muted-foreground">Meja</span><p className="font-medium">#{detailOrder.table.number}</p></div>}
                {detailOrder.member && <div><span className="text-muted-foreground">Member</span><p className="font-medium">{detailOrder.member.name}</p></div>}
              </div>
              <div className="border rounded-lg overflow-hidden">
                {detailOrder.items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center p-2.5 border-b last:border-0 text-sm">
                    <div><span className="font-medium">{item.menuItem?.name}</span><span className="text-muted-foreground ml-2">×{item.qty}</span></div>
                    <span className="font-semibold">{formatRupiah(item.subtotal)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1 text-sm border-t pt-3">
                <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatRupiah(detailOrder.subtotal)}</span></div>
                {detailOrder.discount > 0 && <div className="flex justify-between text-red-500"><span>Diskon</span><span>-{formatRupiah(detailOrder.discount)}</span></div>}
                {detailOrder.tax > 0 && <div className="flex justify-between text-muted-foreground"><span>Pajak</span><span>{formatRupiah(detailOrder.tax)}</span></div>}
                <div className="flex justify-between font-bold text-base"><span>Total</span><span className="text-primary">{formatRupiah(detailOrder.total)}</span></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
