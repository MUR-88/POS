"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Store, Receipt, Percent, Save, Users, ArrowRight } from "lucide-react"
import Link from "next/link"

export default function PengaturanPage() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/setting").then(r => r.json()).then(j => { setSettings(j.data ?? {}); setLoading(false) })
  }, [])

  function update(key: string, value: string) { setSettings(s => ({ ...s, [key]: value })) }

  async function save() {
    setSaving(true)
    const res = await fetch("/api/setting", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) })
    if (res.ok) toast.success("Pengaturan berhasil disimpan")
    else toast.error("Gagal menyimpan pengaturan")
    setSaving(false)
  }

  if (loading) return <div className="p-6"><Skeleton className="h-96 rounded-xl" /></div>

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Pengaturan</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Konfigurasi informasi restoran dan sistem</p>
      </div>

      {/* Restaurant Info */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center"><Store className="h-4 w-4 text-primary" /></div>
            <div>
              <CardTitle className="text-base">Informasi Restoran</CardTitle>
              <CardDescription className="text-xs">Tampil pada struk dan laporan</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: "restaurant_name", label: "Nama Restoran", placeholder: "Contoh: Kafe Saya" },
            { key: "restaurant_address", label: "Alamat", placeholder: "Jl. Contoh No. 123, Kota" },
            { key: "restaurant_phone", label: "No. Telepon", placeholder: "0812-3456-7890" },
          ].map(f => (
            <div key={f.key} className="space-y-1">
              <Label className="text-sm">{f.label}</Label>
              <Input value={settings[f.key] ?? ""} onChange={e => update(f.key, e.target.value)} placeholder={f.placeholder} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Receipt Settings */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center"><Receipt className="h-4 w-4 text-blue-600" /></div>
            <div>
              <CardTitle className="text-base">Pengaturan Struk</CardTitle>
              <CardDescription className="text-xs">Format dan pesan pada struk transaksi</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label className="text-sm">Prefix No. Invoice</Label>
            <Input value={settings.invoice_prefix ?? "INV"} onChange={e => update("invoice_prefix", e.target.value)} placeholder="INV" className="w-32" />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">Pesan Footer Struk</Label>
            <Input value={settings.receipt_footer ?? ""} onChange={e => update("receipt_footer", e.target.value)} placeholder="Terima kasih telah berkunjung!" />
          </div>
        </CardContent>
      </Card>

      {/* Tax Settings */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center"><Percent className="h-4 w-4 text-orange-600" /></div>
            <div>
              <CardTitle className="text-base">Pengaturan Pajak (PPN)</CardTitle>
              <CardDescription className="text-xs">Pajak akan ditambahkan ke total transaksi</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Aktifkan Pajak PPN</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Pajak dihitung dari subtotal setelah diskon</p>
            </div>
            <Switch checked={settings.tax_enabled === "true"} onCheckedChange={v => update("tax_enabled", String(v))} />
          </div>
          {settings.tax_enabled === "true" && (
            <>
              <Separator />
              <div className="space-y-1">
                <Label className="text-sm">Persentase Pajak</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number" min={0} max={100}
                    value={settings.tax_rate ?? "11"}
                    onChange={e => update("tax_rate", e.target.value)}
                    className="w-24"
                  />
                  <span className="text-muted-foreground font-medium">%</span>
                </div>
                <p className="text-xs text-muted-foreground">PPN standar Indonesia: 11%</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* User Management Link */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center"><Users className="h-4 w-4 text-indigo-600" /></div>
            <div>
              <CardTitle className="text-base">Manajemen User</CardTitle>
              <CardDescription className="text-xs">Kelola akun dan role pengguna sistem</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Link href="/pengaturan/users">
            <Button variant="outline" className="gap-2 w-full">
              <Users className="h-4 w-4" />Buka Manajemen User<ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving} className="gap-2 shadow-sm shadow-primary/30">
        <Save className="h-4 w-4" />{saving ? "Menyimpan..." : "Simpan Pengaturan"}
      </Button>
    </div>
  )
}
