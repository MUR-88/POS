"use client"

import { useState, useEffect } from "react"
import { formatRupiah } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { ChefHat, Clock, CheckCircle2, UtensilsCrossed, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type Order = {
  id: string; orderNo: string; kdsStatus: string; createdAt: string
  table?: { number: string }; cashier: { name: string }
  items: { id: string; qty: number; notes?: string; kdsStatus: string; menuItem: { name: string } }[]
}

const KDS_STATUS = {
  PENDING:   { label: "Antrian",    color: "border-l-yellow-500", badge: "bg-yellow-100 text-yellow-700", next: "PREPARING", nextLabel: "Mulai Masak" },
  PREPARING: { label: "Memasak",   color: "border-l-orange-500", badge: "bg-orange-100 text-orange-700", next: "READY",     nextLabel: "Siap Disajikan" },
  READY:     { label: "Siap",       color: "border-l-green-500",  badge: "bg-green-100 text-green-700",   next: "SERVED",    nextLabel: "Sudah Disajikan" },
}

export default function KDSPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  async function load() {
    const res = await fetch("/api/kds").then(r => r.json())
    setOrders(res.data ?? [])
    setLastUpdate(new Date())
    setLoading(false)
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [])

  async function updateStatus(orderId: string, kdsStatus: string) {
    const res = await fetch("/api/kds", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, kdsStatus }) })
    if (res.ok) {
      if (kdsStatus === "SERVED") toast.success("Order selesai disajikan!")
      load()
    }
  }

  const groups = {
    PENDING:   orders.filter(o => o.kdsStatus === "PENDING"),
    PREPARING: orders.filter(o => o.kdsStatus === "PREPARING"),
    READY:     orders.filter(o => o.kdsStatus === "READY"),
  }

  function OrderCard({ order }: { order: Order }) {
    const cfg = KDS_STATUS[order.kdsStatus as keyof typeof KDS_STATUS]
    const elapsed = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000)

    return (
      <div className={cn("bg-white rounded-xl border-0 shadow-sm border-l-4 overflow-hidden", cfg.color)}>
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="font-bold text-base">{order.orderNo}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {order.table && <Badge variant="outline" className="text-xs h-5">Meja #{order.table.number}</Badge>}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {elapsed}m lalu
                </div>
              </div>
            </div>
            <span className={cn("text-xs font-semibold px-2 py-1 rounded-full", cfg.badge)}>{cfg.label}</span>
          </div>

          <div className="space-y-1.5 mb-4">
            {order.items.map(item => (
              <div key={item.id} className="flex items-start gap-2 text-sm">
                <span className="font-bold text-primary w-6 shrink-0">{item.qty}x</span>
                <div>
                  <span className="font-medium">{item.menuItem.name}</span>
                  {item.notes && <p className="text-xs text-muted-foreground italic">"{item.notes}"</p>}
                </div>
              </div>
            ))}
          </div>

          {cfg.next !== "SERVED" ? (
            <Button size="sm" className="w-full h-8 text-xs" onClick={() => updateStatus(order.id, cfg.next)}>
              {cfg.nextLabel}
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="w-full h-8 text-xs border-green-300 text-green-700 hover:bg-green-50" onClick={() => updateStatus(order.id, cfg.next)}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />{cfg.nextLabel}
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center">
            <ChefHat className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Kitchen Display</h1>
            <p className="text-xs text-muted-foreground">Update terakhir: {format(lastUpdate, "HH:mm:ss", { locale: id })}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-4 flex-1">
          {Array(3).fill(0).map((_, i) => <div key={i} className="bg-muted animate-pulse rounded-xl h-48" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
          <UtensilsCrossed className="h-12 w-12 mb-3 text-muted-foreground/30" />
          <p className="font-medium">Tidak ada order aktif</p>
          <p className="text-sm mt-1">Dapur sedang kosong</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1 overflow-hidden">
          {Object.entries(groups).map(([status, groupOrders]) => {
            const cfg = KDS_STATUS[status as keyof typeof KDS_STATUS]
            return (
              <div key={status} className="flex flex-col gap-3 overflow-hidden">
                <div className="flex items-center gap-2 shrink-0">
                  <h2 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">{cfg.label}</h2>
                  <Badge className={cn("text-xs", cfg.badge, "border-0")}>{groupOrders.length}</Badge>
                </div>
                <div className="flex-1 overflow-y-auto space-y-3 pb-2">
                  {groupOrders.map(order => <OrderCard key={order.id} order={order} />)}
                  {groupOrders.length === 0 && (
                    <div className="h-24 border-2 border-dashed rounded-xl flex items-center justify-center text-muted-foreground/40">
                      <p className="text-sm">Kosong</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
