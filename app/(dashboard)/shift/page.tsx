"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { formatRupiah, formatTanggal, toNum } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Clock, PlayCircle, StopCircle, Banknote, ShoppingBag, TrendingUp } from "lucide-react"
import { useShift } from "@/lib/shift-context"

export default function ShiftPage() {
  const { refresh: refreshShiftCtx } = useShift()
  const [activeShift, setActiveShift] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [openModal, setOpenModal] = useState(false)
  const [closeModal, setCloseModal] = useState(false)
  const [openingCash, setOpeningCash] = useState("")
  const [closingCash, setClosingCash] = useState("")
  const [closeNotes, setCloseNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [closedSummary, setClosedSummary] = useState<any>(null)

  async function load() {
    const res = await fetch("/api/shift").then(r => r.json())
    setActiveShift(res.data)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function handleOpen() {
    setSaving(true)
    const res = await fetch("/api/shift", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openingCash: Number(openingCash || 0) }),
    })
    const json = await res.json()
    if (res.ok) { toast.success("Shift dibuka!"); setOpenModal(false); setOpeningCash(""); load(); refreshShiftCtx() }
    else toast.error(json.error)
    setSaving(false)
  }

  async function handleClose() {
    setSaving(true)
    const res = await fetch("/api/shift/close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ closingCash: Number(closingCash || 0), notes: closeNotes }),
    })
    const json = await res.json()
    if (res.ok) {
      toast.success("Shift ditutup!")
      setClosedSummary(json.data)
      setCloseModal(false)
      setClosingCash("")
      setCloseNotes("")
      setActiveShift(null)
      refreshShiftCtx()
    } else toast.error(json.error)
    setSaving(false)
  }

  const elapsed = activeShift ? Math.floor((Date.now() - new Date(activeShift.openedAt).getTime()) / 60000) : 0
  const hours = Math.floor(elapsed / 60)
  const minutes = elapsed % 60

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Manajemen Shift</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Buka dan tutup shift kasir</p>
      </div>

      {!loading && (
        <>
          {activeShift ? (
            <Card className="border-0 shadow-sm border-l-4 border-l-emerald-500">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      <span className="font-bold text-emerald-700">Shift Aktif</span>
                    </div>
                    <p className="text-muted-foreground text-sm">Dibuka: {formatTanggal(activeShift.openedAt)}</p>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700 border-0">
                    <Clock className="h-3 w-3 mr-1" />
                    {hours > 0 ? `${hours}j ` : ""}{minutes}m
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Modal Awal</p>
                    <p className="font-bold text-lg">{formatRupiah(toNum(activeShift.openingCash))}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Kasir</p>
                    <p className="font-bold">{activeShift.cashier?.name ?? "—"}</p>
                  </div>
                </div>
                <Button variant="destructive" className="w-full gap-2" onClick={() => setCloseModal(true)}>
                  <StopCircle className="h-4 w-4" /> Tutup Shift
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-sm border-dashed border-2 border-muted-foreground/30">
              <CardContent className="p-8 text-center">
                <Clock className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
                <p className="font-semibold text-muted-foreground">Tidak ada shift aktif</p>
                <p className="text-sm text-muted-foreground/70 mb-5 mt-1">Buka shift untuk mulai menerima pesanan</p>
                <Button className="gap-2 shadow-sm shadow-primary/30" onClick={() => setOpenModal(true)}>
                  <PlayCircle className="h-4 w-4" /> Buka Shift
                </Button>
              </CardContent>
            </Card>
          )}

          {closedSummary && (
            <Card className="border-0 shadow-sm bg-slate-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Ringkasan Shift Terakhir</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                {[
                  { label: "Dibuka", value: formatTanggal(closedSummary.openedAt), icon: PlayCircle },
                  { label: "Ditutup", value: formatTanggal(closedSummary.closedAt), icon: StopCircle },
                  { label: "Modal Awal", value: formatRupiah(closedSummary.openingCash), icon: Banknote },
                  { label: "Kas Akhir", value: formatRupiah(closedSummary.closingCash), icon: Banknote },
                  { label: "Total Penjualan", value: formatRupiah(closedSummary.totalSales), icon: TrendingUp },
                  { label: "Total Transaksi", value: `${closedSummary.totalOrders} order`, icon: ShoppingBag },
                ].map(item => (
                  <div key={item.label} className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="flex items-center gap-1.5 mb-1">
                      <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                    </div>
                    <p className="font-bold">{item.value}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Open Shift Dialog */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><PlayCircle className="h-5 w-5 text-emerald-600" />Buka Shift</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Modal Awal (uang kas) — Opsional</Label>
            <Input type="number" min={0} placeholder="0" value={openingCash} onChange={e => setOpeningCash(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenModal(false)}>Batal</Button>
            <Button onClick={handleOpen} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving ? "..." : "Buka Shift"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Shift Dialog */}
      <Dialog open={closeModal} onOpenChange={setCloseModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><StopCircle className="h-5 w-5 text-red-600" />Tutup Shift</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Jumlah Kas Akhir</Label>
              <Input type="number" min={0} placeholder="0" value={closingCash} onChange={e => setClosingCash(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Catatan — Opsional</Label>
              <Input placeholder="Catatan penutupan shift..." value={closeNotes} onChange={e => setCloseNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseModal(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleClose} disabled={saving}>{saving ? "..." : "Tutup Shift"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
