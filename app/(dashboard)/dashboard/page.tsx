"use client"

import useSWR from "swr"
import { formatRupiah, formatTanggal } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, ShoppingBag, AlertTriangle, ArrowRight, Banknote, Package } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import Link from "next/link"

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data)

function StatCard({ title, value, sub, icon: Icon, trend, color = "bg-primary/10 text-primary" }: any) {
  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
            {trend !== undefined && (
              <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(trend).toFixed(1)}% vs kemarin
              </div>
            )}
          </div>
          <div className={`p-2.5 rounded-xl ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium text-muted-foreground mb-1">{label}</p>
      <p className="font-bold text-primary">{formatRupiah(payload[0].value)}</p>
      <p className="text-muted-foreground">{payload[1]?.value ?? 0} transaksi</p>
    </div>
  )
}

export default function DashboardPage() {
  const { data, isLoading } = useSWR("/api/dashboard", fetcher, { refreshInterval: 60000 })

  const summary = data?.summary
  const trend = summary?.yesterdayRevenue > 0
    ? ((summary.todayRevenue - summary.yesterdayRevenue) / summary.yesterdayRevenue) * 100
    : summary?.todayRevenue > 0 ? 100 : 0

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Ringkasan performa hari ini</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />) : (
          <>
            <StatCard title="Pendapatan Hari Ini" value={formatRupiah(summary?.todayRevenue ?? 0)} icon={Banknote} trend={trend} color="bg-emerald-100 text-emerald-600" />
            <StatCard title="Transaksi Hari Ini" value={`${summary?.todayOrders ?? 0} order`} sub="selesai hari ini" icon={ShoppingBag} color="bg-blue-100 text-blue-600" />
            <StatCard title="Pendapatan Bulan Ini" value={formatRupiah(summary?.monthRevenue ?? 0)} sub={`${summary?.monthOrders} transaksi`} icon={TrendingUp} color="bg-purple-100 text-purple-600" />
            <StatCard title="Alert Stok" value={`${summary?.stokAlertCount ?? 0} item`} sub="perlu restok segera" icon={Package} color="bg-orange-100 text-orange-600" />
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Chart */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Pendapatan 7 Hari Terakhir</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-52" /> : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={data?.chart} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" fill="oklch(0.527 0.154 150.069)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Stock Alerts */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" /> Alert Stok
              </CardTitle>
              <Link href="/stok">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary">Kelola <ArrowRight className="h-3 w-3" /></Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-40" /> : !data?.stokAlert?.length ? (
              <div className="flex flex-col items-center py-6 text-muted-foreground">
                <Package className="h-8 w-8 mb-2 text-emerald-500" />
                <p className="text-sm font-medium text-emerald-600">Semua stok aman</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data.stokAlert.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between py-1.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.categoryName}</p>
                    </div>
                    <Badge variant={item.stock === 0 ? "destructive" : "secondary"} className="shrink-0 ml-2">
                      {item.stock === 0 ? "Habis" : `Sisa ${item.stock}`}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Transaksi Terbaru</CardTitle>
            <Link href="/laporan">
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary">Lihat semua <ArrowRight className="h-3 w-3" /></Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-40" /> : (
            <div className="divide-y">
              {data?.recentOrders?.map((order: any) => (
                <div key={order.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{order.orderNo}</p>
                      <Badge variant={order.status === "COMPLETED" ? "default" : order.status === "VOIDED" ? "destructive" : "secondary"} className="text-[10px] h-4">
                        {order.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatTanggal(order.createdAt)} · {order.cashier?.name}</p>
                  </div>
                  <p className="font-bold text-emerald-600 shrink-0 ml-4">{formatRupiah(order.total)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
