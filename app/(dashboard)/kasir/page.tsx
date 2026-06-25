"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { toast } from "sonner"
import { useCartStore } from "@/store/cartStore"
import { formatRupiah } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ShoppingCart, Trash2, Plus, Minus, Search, Printer,
  TableIcon, Users2, Tag, SplitSquareHorizontal, Clock,
  ChevronDown, X, Star, PlayCircle, LockKeyhole,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useShift } from "@/lib/shift-context"
import { useRouter } from "next/navigation"

type MenuItem = { id: string; name: string; price: number; stock: number; imageUrl: string | null; category: { name: string; icon: string | null } }
type Category = { id: string; name: string; icon: string | null }
type Table = { id: string; number: string; status: string }
type Member = { id: string; name: string; phone: string; points: number }

function Receipt({ order, settings, onClose }: { order: any; settings: Record<string, string>; onClose: () => void }) {
  return (
    <div>
      <div id="receipt" className="p-4 text-xs font-mono max-w-xs mx-auto space-y-2">
        <div className="text-center space-y-1">
          <p className="font-bold text-sm">{settings.restaurant_name ?? "POS Restoran"}</p>
          {settings.restaurant_address && <p className="text-muted-foreground">{settings.restaurant_address}</p>}
          {settings.restaurant_phone && <p className="text-muted-foreground">{settings.restaurant_phone}</p>}
        </div>
        <Separator />
        <div className="space-y-0.5">
          <div className="flex justify-between"><span className="text-muted-foreground">No</span><span>{order.orderNo}</span></div>
          {order.table && <div className="flex justify-between"><span className="text-muted-foreground">Meja</span><span>#{order.table.number}</span></div>}
          {order.cashier && <div className="flex justify-between"><span className="text-muted-foreground">Kasir</span><span>{order.cashier.name}</span></div>}
          {order.member && <div className="flex justify-between"><span className="text-muted-foreground">Member</span><span>{order.member.name}</span></div>}
        </div>
        <Separator />
        <div className="space-y-1">
          {order.items?.map((item: any) => (
            <div key={item.id}>
              <div className="flex justify-between">
                <span className="flex-1">{item.menuItem?.name}</span>
                <span>{formatRupiah(item.subtotal)}</span>
              </div>
              <div className="text-muted-foreground pl-2">
                {item.qty} × {formatRupiah(item.price)}
                {item.discount > 0 && <span className="text-red-500"> -disc {formatRupiah(item.discount)}</span>}
              </div>
            </div>
          ))}
        </div>
        <Separator />
        <div className="space-y-0.5">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatRupiah(order.subtotal)}</span></div>
          {order.discount > 0 && <div className="flex justify-between text-red-500"><span>Diskon</span><span>-{formatRupiah(order.discount)}</span></div>}
          {order.tax > 0 && <div className="flex justify-between"><span>Pajak ({settings.tax_rate}%)</span><span>{formatRupiah(order.tax)}</span></div>}
          <div className="flex justify-between font-bold text-sm"><span>TOTAL</span><span>{formatRupiah(order.total)}</span></div>
          <div className="flex justify-between"><span>Bayar ({order.payMethod})</span><span>{formatRupiah(order.amountPaid)}</span></div>
          {order.change > 0 && <div className="flex justify-between"><span>Kembalian</span><span>{formatRupiah(order.change)}</span></div>}
          {order.pointsEarned > 0 && <div className="flex justify-between text-yellow-600"><span>Poin Diperoleh</span><span>+{order.pointsEarned} pts</span></div>}
        </div>
        <Separator />
        <p className="text-center text-muted-foreground">{settings.receipt_footer ?? "Terima kasih!"}</p>
      </div>
      <div className="flex gap-2 mt-4">
        <Button variant="outline" className="flex-1" onClick={onClose}>Tutup</Button>
        <Button className="flex-1" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />Cetak</Button>
      </div>
    </div>
  )
}

export default function KasirPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCat, setSelectedCat] = useState("all")
  const [search, setSearch] = useState("")
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [memberSearchOpen, setMemberSearchOpen] = useState(false)
  const [lastOrder, setLastOrder] = useState<any>(null)
  const [payMethod, setPayMethod] = useState("CASH")
  const [amountPaid, setAmountPaid] = useState("")
  const [processing, setProcessing] = useState(false)
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [memberSearch, setMemberSearch] = useState("")
  const [memberResults, setMemberResults] = useState<Member[]>([])
  const [splitCount, setSplitCount] = useState(1)

  const { shift: activeShift, isOpen: shiftOpen, loading: shiftLoading } = useShift()
  const router = useRouter()
  const cart = useCartStore()

  useEffect(() => {
    Promise.all([
      fetch("/api/kategori").then(r => r.json()),
      fetch("/api/menu").then(r => r.json()),
      fetch("/api/table").then(r => r.json()),
      fetch("/api/setting").then(r => r.json()),
    ]).then(([cats, menus, tbls, sets]) => {
      setCategories(cats.data ?? [])
      setMenuItems((menus.data ?? []).map((m: any) => ({ ...m, price: Number(m.price) })))
      setTables((tbls.data ?? []).filter((t: any) => t.status !== "OCCUPIED"))
      setSettings(sets.data ?? {})
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!memberSearch.trim()) { setMemberResults([]); return }
    const t = setTimeout(() => {
      fetch(`/api/member?search=${encodeURIComponent(memberSearch)}`).then(r => r.json()).then(j => setMemberResults(j.data ?? []))
    }, 300)
    return () => clearTimeout(t)
  }, [memberSearch])

  const taxEnabled = settings.tax_enabled === "true"
  const taxRate = Number(settings.tax_rate ?? 0)
  const sub = cart.subtotal()
  const tax = taxEnabled ? Math.round((sub - cart.discount) * taxRate / 100) : 0
  const total = sub - cart.discount + tax
  const perPerson = splitCount > 1 ? Math.ceil(total / splitCount) : total
  const change = Math.max(0, Number(amountPaid || 0) - total)
  const pointsEarned = cart.memberId ? Math.floor(total / 10000) : 0

  const filtered = menuItems.filter(m =>
    (selectedCat === "all" || m.category?.name === categories.find(c => c.id === selectedCat)?.name) &&
    m.name.toLowerCase().includes(search.toLowerCase())
  )

  async function handleCheckout() {
    if (payMethod === "CASH" && Number(amountPaid) < total) { toast.error("Jumlah bayar kurang"); return }
    setProcessing(true)
    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: cart.tableId || undefined,
          tableNo: cart.tableNo || undefined,
          customerName: cart.customerName || undefined,
          memberId: cart.memberId || undefined,
          shiftId: activeShift?.id ?? undefined,
          discount: cart.discount,
          payMethod,
          amountPaid: payMethod === "CASH" ? Number(amountPaid) : total,
          taxEnabled, taxRate,
          items: cart.items.map(i => ({ menuItemId: i.id, qty: i.qty, price: i.price, discount: i.discount, notes: i.notes })),
        }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error); return }
      setLastOrder({ ...json.data, settings })
      cart.clearCart()
      setCheckoutOpen(false)
      setAmountPaid("")
      setSplitCount(1)
      setReceiptOpen(true)
      toast.success("Transaksi berhasil!")
    } finally {
      setProcessing(false)
    }
  }

  if (!shiftLoading && !shiftOpen) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-6 bg-muted/30 p-8">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center">
            <LockKeyhole className="h-10 w-10 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Shift Belum Dibuka</h2>
            <p className="text-muted-foreground text-sm mt-1.5">
              Kamu harus membuka shift terlebih dahulu sebelum bisa menerima pesanan dan melakukan transaksi.
            </p>
          </div>
          <Button className="gap-2 shadow-sm shadow-primary/30 w-full" onClick={() => router.push("/shift")}>
            <PlayCircle className="h-4 w-4" />Buka Shift Sekarang
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`@media print { body > *:not(#receipt) { display:none; } }`}</style>
      <div className="flex h-screen overflow-hidden">
        {/* LEFT: Menu */}
        <div className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden p-4 gap-3">
          {/* Search + Categories */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari menu..." className="pl-9 h-10" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <ScrollArea className="h-10 shrink-0">
            <div className="flex gap-1.5 pb-1">
              <Button size="sm" variant={selectedCat === "all" ? "default" : "ghost"} className="rounded-full h-7 text-xs shrink-0" onClick={() => setSelectedCat("all")}>Semua</Button>
              {categories.map(c => (
                <Button key={c.id} size="sm" variant={selectedCat === c.id ? "default" : "ghost"} className="rounded-full h-7 text-xs shrink-0" onClick={() => setSelectedCat(c.id)}>
                  {c.icon} {c.name}
                </Button>
              ))}
            </div>
          </ScrollArea>

          {/* Menu grid */}
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 pb-4">
                {filtered.map(item => {
                  const inCart = cart.items.find(i => i.id === item.id)
                  const outOfStock = item.stock === 0
                  return (
                    <div
                      key={item.id}
                      onClick={() => !outOfStock && cart.addItem({ id: item.id, name: item.name, price: Number(item.price), stock: item.stock })}
                      className={cn(
                        "bg-white rounded-xl border shadow-sm cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-95 overflow-hidden",
                        outOfStock && "opacity-40 pointer-events-none",
                        inCart && "ring-2 ring-primary ring-offset-1"
                      )}
                    >
                      <div className="aspect-[4/3] bg-muted relative">
                        {item.imageUrl
                          ? <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>}
                        {inCart && (
                          <div className="absolute top-1.5 right-1.5 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold shadow">
                            {inCart.qty}
                          </div>
                        )}
                        {outOfStock && <div className="absolute inset-0 bg-black/30 flex items-center justify-center"><Badge variant="destructive" className="text-xs">Habis</Badge></div>}
                      </div>
                      <div className="p-2.5">
                        <p className="text-sm font-semibold leading-tight truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.category?.icon} {item.category?.name}</p>
                        <p className="font-bold text-primary text-sm mt-1">{formatRupiah(item.price)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* RIGHT: Cart */}
        <div className="w-80 xl:w-96 flex flex-col bg-white border-l shadow-xl shrink-0">
          {/* Cart Header */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <span className="font-bold">Pesanan</span>
                {cart.items.length > 0 && <Badge className="h-5">{cart.items.length}</Badge>}
              </div>
              {cart.items.length > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={cart.clearCart}>
                  <X className="h-3 w-3 mr-1" />Kosongkan
                </Button>
              )}
            </div>

            {/* Table & Customer */}
            <div className="grid grid-cols-2 gap-2">
              <Select value={cart.tableId} onValueChange={id => {
                const t = tables.find(t => t.id === id)
                cart.setTableId(id)
                cart.setTableNo(t?.number ?? "")
              }}>
                <SelectTrigger className="h-8 text-xs">
                  <TableIcon className="h-3 w-3 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="Pilih meja" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tanpa meja</SelectItem>
                  {tables.map(t => <SelectItem key={t.id} value={t.id}>Meja #{t.number}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="Nama tamu" value={cart.customerName} onChange={e => cart.setCustomerName(e.target.value)} className="h-8 text-xs" />
            </div>

            {/* Member lookup */}
            <div className="mt-2">
              {cart.memberId ? (
                <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-2.5 py-1.5">
                  <Star className="h-3.5 w-3.5 text-yellow-500" />
                  <span className="text-xs font-medium flex-1">{cart.memberName} · {cart.memberPoints} pts</span>
                  <button onClick={() => cart.setMember("", "", 0)} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="w-full h-7 text-xs gap-1" onClick={() => setMemberSearchOpen(true)}>
                  <Users2 className="h-3 w-3" />Pilih Member
                </Button>
              )}
            </div>
          </div>

          {/* Cart Items */}
          <ScrollArea className="flex-1">
            {cart.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <ShoppingCart className="h-8 w-8 mb-2 text-muted-foreground/30" />
                <p className="text-sm">Pilih menu untuk memulai</p>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {cart.items.map(item => (
                  <div key={item.id} className="bg-muted/40 rounded-lg p-2.5">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-primary font-semibold">{formatRupiah(item.price)}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="icon" variant="outline" className="h-6 w-6 rounded-full" onClick={() => cart.updateQty(item.id, item.qty - 1)}><Minus className="h-2.5 w-2.5" /></Button>
                        <span className="w-5 text-center text-sm font-bold">{item.qty}</span>
                        <Button size="icon" variant="outline" className="h-6 w-6 rounded-full" onClick={() => cart.updateQty(item.id, item.qty + 1)} disabled={item.qty >= item.stock}><Plus className="h-2.5 w-2.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => cart.removeItem(item.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </div>
                    {/* Per-item discount */}
                    <div className="flex items-center gap-1 mt-1.5">
                      <Tag className="h-3 w-3 text-muted-foreground" />
                      <Input
                        type="number" min={0} placeholder="Diskon item" value={item.discount || ""}
                        onChange={e => cart.updateItemDiscount(item.id, Number(e.target.value))}
                        className="h-5 text-xs px-1.5 border-dashed"
                      />
                      {item.discount > 0 && <span className="text-xs text-red-500 shrink-0">-{formatRupiah(item.discount)}/item</span>}
                    </div>
                    <Input placeholder="Catatan..." value={item.notes ?? ""} onChange={e => cart.updateNotes(item.id, e.target.value)} className="mt-1 h-5 text-xs px-1.5 border-dashed" />
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Totals & Checkout */}
          <div className="p-3 border-t space-y-2">
            <div className="flex items-center gap-1.5 text-xs">
              <Label className="text-xs text-muted-foreground shrink-0">Diskon order:</Label>
              <Input type="number" min={0} value={cart.discount || ""} onChange={e => cart.setDiscount(Number(e.target.value))} className="h-6 text-xs px-2" placeholder="0" />
              <div className="flex items-center gap-1 shrink-0">
                <SplitSquareHorizontal className="h-3 w-3 text-muted-foreground" />
                <Input type="number" min={1} max={20} value={splitCount} onChange={e => setSplitCount(Number(e.target.value))} className="h-6 text-xs px-2 w-12" title="Split bill" />
                <span className="text-muted-foreground">org</span>
              </div>
            </div>
            <Separator />
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatRupiah(sub)}</span></div>
              {cart.discount > 0 && <div className="flex justify-between text-red-500"><span>Diskon</span><span>-{formatRupiah(cart.discount)}</span></div>}
              {taxEnabled && <div className="flex justify-between text-muted-foreground"><span>Pajak {taxRate}%</span><span>{formatRupiah(tax)}</span></div>}
              <div className="flex justify-between font-bold text-base pt-1 border-t"><span>Total</span><span className="text-primary">{formatRupiah(total)}</span></div>
              {splitCount > 1 && <div className="flex justify-between text-xs text-muted-foreground"><span>Per orang ({splitCount})</span><span>{formatRupiah(perPerson)}</span></div>}
              {cart.memberId && pointsEarned > 0 && <div className="flex justify-between text-xs text-yellow-600"><span>Poin diperoleh</span><span>+{pointsEarned} pts</span></div>}
            </div>
            <Button className="w-full shadow-sm shadow-primary/30" disabled={cart.items.length === 0} onClick={() => setCheckoutOpen(true)}>
              Bayar {formatRupiah(total)}
            </Button>
          </div>
        </div>
      </div>

      {/* Member Search Dialog */}
      <Dialog open={memberSearchOpen} onOpenChange={setMemberSearchOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Cari Member</DialogTitle></DialogHeader>
          <Input placeholder="Nama atau no. telepon..." value={memberSearch} onChange={e => setMemberSearch(e.target.value)} autoFocus />
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {memberResults.map(m => (
              <div key={m.id} className="flex items-center justify-between p-2 rounded-lg border hover:bg-muted cursor-pointer" onClick={() => { cart.setMember(m.id, m.name, m.points); setMemberSearchOpen(false); setMemberSearch("") }}>
                <div>
                  <p className="font-medium text-sm">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.phone}</p>
                </div>
                <Badge variant="outline" className="text-yellow-600">{m.points} pts</Badge>
              </div>
            ))}
            {memberSearch && memberResults.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Member tidak ditemukan</p>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Checkout Dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Pembayaran</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Metode Pembayaran</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {["CASH","QRIS","TRANSFER","DEBIT","KREDIT"].map(m => (
                  <Button key={m} size="sm" variant={payMethod === m ? "default" : "outline"} className="text-xs h-8" onClick={() => setPayMethod(m)}>{m}</Button>
                ))}
              </div>
            </div>
            <div className="bg-muted rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatRupiah(sub)}</span></div>
              {cart.discount > 0 && <div className="flex justify-between text-red-500"><span>Diskon</span><span>-{formatRupiah(cart.discount)}</span></div>}
              {taxEnabled && <div className="flex justify-between text-muted-foreground"><span>Pajak {taxRate}%</span><span>{formatRupiah(tax)}</span></div>}
              <Separator />
              <div className="flex justify-between font-bold text-base"><span>Total</span><span className="text-primary">{formatRupiah(total)}</span></div>
              {splitCount > 1 && <div className="flex justify-between text-muted-foreground text-xs"><span>Per orang ({splitCount})</span><span>{formatRupiah(perPerson)}</span></div>}
            </div>
            {payMethod === "CASH" && (
              <div className="space-y-2">
                <Label className="text-sm">Jumlah Bayar</Label>
                <Input type="number" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} placeholder={String(total)} className="h-11 text-lg font-bold" autoFocus />
                <div className="grid grid-cols-3 gap-1">
                  {[total, Math.ceil(total/5000)*5000, Math.ceil(total/10000)*10000 + 10000].map(amt => (
                    <Button key={amt} variant="outline" size="sm" className="text-xs" onClick={() => setAmountPaid(String(amt))}>{formatRupiah(amt)}</Button>
                  ))}
                </div>
                {Number(amountPaid) >= total && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-center">
                    <p className="text-emerald-700 font-bold">Kembalian: {formatRupiah(change)}</p>
                  </div>
                )}
              </div>
            )}
            {cart.memberId && pointsEarned > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-center">
                <p className="text-yellow-700 text-sm">⭐ {cart.memberName} mendapat <strong>+{pointsEarned} poin</strong></p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>Batal</Button>
            <Button onClick={handleCheckout} disabled={processing} className="flex-1">
              {processing ? "Memproses..." : "Konfirmasi Bayar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Struk Pembayaran</DialogTitle></DialogHeader>
          {lastOrder && <Receipt order={lastOrder} settings={settings} onClose={() => setReceiptOpen(false)} />}
        </DialogContent>
      </Dialog>
    </>
  )
}
