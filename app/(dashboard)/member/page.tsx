"use client"

import { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"
import { formatRupiah, formatTanggal } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Search, Star, Pencil, Phone, Mail, TrendingUp, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"

type Member = { id: string; name: string; phone: string; email?: string; points: number; totalSpend: number; isActive: boolean; createdAt: string }
type SortKey = "name" | "points" | "totalSpend" | "createdAt"
type SortDir = "asc" | "desc"

function getTier(points: number) {
  if (points >= 1000) return "gold"
  if (points >= 500) return "silver"
  return "bronze"
}

function PointsBadge({ points }: { points: number }) {
  if (points >= 1000) return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">⭐ Gold {points} pts</Badge>
  if (points >= 500) return <Badge className="bg-slate-100 text-slate-700 border-slate-200">🥈 Silver {points} pts</Badge>
  return <Badge variant="outline">{points} pts</Badge>
}

const emptyForm = { name: "", phone: "", email: "" }

export default function MemberPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Member | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const [search, setSearch] = useState("")
  const [filterTier, setFilterTier] = useState("all")
  const [sortKey, setSortKey] = useState<SortKey>("createdAt")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  async function load() {
    fetch("/api/member").then(r => r.json()).then(j => { setMembers(j.data ?? []); setLoading(false) })
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    return members
      .filter(m => {
        if (search && !m.name.toLowerCase().includes(search.toLowerCase()) && !m.phone.includes(search)) return false
        if (filterTier !== "all" && getTier(m.points) !== filterTier) return false
        return true
      })
      .sort((a, b) => {
        let va: any, vb: any
        if (sortKey === "name") { va = a.name; vb = b.name }
        else if (sortKey === "points") { va = a.points; vb = b.points }
        else if (sortKey === "totalSpend") { va = a.totalSpend; vb = b.totalSpend }
        else { va = new Date(a.createdAt).getTime(); vb = new Date(b.createdAt).getTime() }
        const cmp = va < vb ? -1 : va > vb ? 1 : 0
        return sortDir === "asc" ? cmp : -cmp
      })
  }, [members, search, filterTier, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir(key === "name" ? "asc" : "desc") }
  }

  function SortBtn({ col, label }: { col: SortKey; label: string }) {
    const active = sortKey === col
    return (
      <Button variant={active ? "default" : "outline"} size="sm" className="h-7 text-xs gap-1 px-2.5" onClick={() => toggleSort(col)}>
        {label}
        {active ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-50" />}
      </Button>
    )
  }

  function openCreate() { setEditing(null); setForm(emptyForm); setOpen(true) }
  function openEdit(m: Member) { setEditing(m); setForm({ name: m.name, phone: m.phone, email: m.email ?? "" }); setOpen(true) }

  async function handleSave() {
    setSaving(true)
    const url = editing ? `/api/member/${editing.id}` : "/api/member"
    const method = editing ? "PATCH" : "POST"
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    const json = await res.json()
    if (res.ok) { toast.success(editing ? "Member diperbarui" : "Member ditambahkan"); setOpen(false); load() }
    else toast.error(json.error)
    setSaving(false)
  }

  const totalPoints = members.reduce((s, m) => s + m.points, 0)
  const totalSpend = members.reduce((s, m) => s + m.totalSpend, 0)
  const gold = members.filter(m => m.points >= 1000).length
  const silver = members.filter(m => m.points >= 500 && m.points < 1000).length

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Member & Loyalty</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Program loyalitas pelanggan</p>
        </div>
        <Button onClick={openCreate} className="gap-2 shadow-sm shadow-primary/30">
          <Plus className="h-4 w-4" /> Tambah Member
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Member", value: members.length, color: "text-foreground" },
          { label: "Total Points", value: totalPoints.toLocaleString(), color: "text-yellow-600" },
          { label: "Gold Member", value: gold, color: "text-yellow-600" },
          { label: "Total Belanja", value: formatRupiah(totalSpend), color: "text-emerald-600" },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters & Sort */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Cari nama atau telepon..." className="pl-8 h-8 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterTier} onValueChange={setFilterTier}>
          <SelectTrigger className="w-32 h-8 text-sm"><SelectValue placeholder="Tier" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Tier</SelectItem>
            <SelectItem value="gold">⭐ Gold</SelectItem>
            <SelectItem value="silver">🥈 Silver</SelectItem>
            <SelectItem value="bronze">Bronze</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-1 items-center border rounded-lg px-1.5 py-1 bg-muted/30">
          <span className="text-xs text-muted-foreground mr-1">Urut:</span>
          <SortBtn col="name" label="Nama" />
          <SortBtn col="points" label="Points" />
          <SortBtn col="totalSpend" label="Belanja" />
          <SortBtn col="createdAt" label="Bergabung" />
        </div>
        {(search || filterTier !== "all") && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setSearch(""); setFilterTier("all") }}>Reset</Button>
        )}
        <span className="text-xs text-muted-foreground">{filtered.length} member</span>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <Star className="h-10 w-10 mb-3 mx-auto text-muted-foreground/30" />
          <p>Belum ada member</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(member => (
            <Card key={member.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold">{member.name}</p>
                    <PointsBadge points={member.points} />
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 -mt-1" onClick={() => openEdit(member)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" /> <span>{member.phone}</span>
                  </div>
                  {member.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" /> <span className="truncate">{member.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5" /> <span>{formatRupiah(member.totalSpend)} total belanja</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">Member sejak {formatTanggal(member.createdAt)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Member" : "Tambah Member"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {[{ key: "name", label: "Nama *", placeholder: "Nama lengkap", type: "text" },
              { key: "phone", label: "No. Telepon *", placeholder: "08xx-xxxx-xxxx", type: "tel" },
              { key: "email", label: "Email", placeholder: "email@contoh.com", type: "email" }
            ].map(f => (
              <div key={f.key} className="space-y-1">
                <Label>{f.label}</Label>
                <Input type={f.type} placeholder={f.placeholder} value={(form as any)[f.key]} onChange={e => setForm(fo => ({ ...fo, [f.key]: e.target.value }))} />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.phone}>{saving ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
