import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subDays, format } from "date-fns"
import { serializeOrder } from "@/lib/utils"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const now = new Date()
    const todayStart = startOfDay(now)
    const todayEnd = endOfDay(now)
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)
    const yesterday = startOfDay(subDays(now, 1))
    const yesterdayEnd = endOfDay(subDays(now, 1))
    const days7 = Array.from({ length: 7 }, (_, i) => subDays(now, 6 - i))

    const [todayAgg, yesterdayAgg, monthAgg, stokAlert, recentOrders, chartRows] = await Promise.all([
      prisma.order.aggregate({
        where: { status: "COMPLETED", createdAt: { gte: todayStart, lte: todayEnd } },
        _sum: { total: true }, _count: true,
      }),
      prisma.order.aggregate({
        where: { status: "COMPLETED", createdAt: { gte: yesterday, lte: yesterdayEnd } },
        _sum: { total: true }, _count: true,
      }),
      prisma.order.aggregate({
        where: { status: "COMPLETED", createdAt: { gte: monthStart, lte: monthEnd } },
        _sum: { total: true }, _count: true,
      }),
      prisma.$queryRaw<any[]>`
        SELECT mi.id, mi.name, mi.stock, mi."minStock", c.name as "categoryName"
        FROM menu_items mi JOIN categories c ON c.id = mi."categoryId"
        WHERE mi."isAvailable" = true AND mi.stock <= mi."minStock"
        ORDER BY mi.stock ASC LIMIT 7
      `,
      prisma.order.findMany({
        take: 5, orderBy: { createdAt: "desc" },
        include: { cashier: { select: { name: true } } },
      }),
      prisma.$queryRaw<{ day: Date; revenue: bigint; orders: bigint }[]>`
        SELECT date_trunc('day', "createdAt") as day,
               SUM(total) as revenue, COUNT(*) as orders
        FROM orders
        WHERE status = 'COMPLETED'
          AND "createdAt" >= ${days7[0]}
        GROUP BY day ORDER BY day
      `,
    ])

    const chartMap = new Map(
      chartRows.map(r => [format(new Date(r.day), "dd/MM"), { revenue: Number(r.revenue), orders: Number(r.orders) }])
    )
    const chart = days7.map(d => {
      const key = format(d, "dd/MM")
      return { date: key, revenue: chartMap.get(key)?.revenue ?? 0, orders: chartMap.get(key)?.orders ?? 0 }
    })

    return NextResponse.json({
      data: {
        summary: {
          todayRevenue: Number(todayAgg._sum.total ?? 0),
          todayOrders: Number(todayAgg._count ?? 0),
          yesterdayRevenue: Number(yesterdayAgg._sum.total ?? 0),
          monthRevenue: Number(monthAgg._sum.total ?? 0),
          monthOrders: Number(monthAgg._count ?? 0),
          stokAlertCount: stokAlert.length,
        },
        chart,
        stokAlert,
        recentOrders: recentOrders.map(serializeOrder),
      },
    }, {
      headers: { "Cache-Control": "private, s-maxage=30, stale-while-revalidate=60" },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
