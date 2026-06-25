import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subDays } from "date-fns"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)
  const yesterday = startOfDay(subDays(now, 1))
  const yesterdayEnd = endOfDay(subDays(now, 1))

  try { const [todayOrders, yesterdayOrders, monthOrders, totalMenus, stokAlert] = await Promise.all([
    prisma.order.aggregate({
      where: { status: "COMPLETED", createdAt: { gte: todayStart, lte: todayEnd } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.order.aggregate({
      where: { status: "COMPLETED", createdAt: { gte: yesterday, lte: yesterdayEnd } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.order.aggregate({
      where: { status: "COMPLETED", createdAt: { gte: monthStart, lte: monthEnd } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.menuItem.count({ where: { isAvailable: true } }),
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM menu_items
      WHERE "isAvailable" = true AND stock <= "minStock"
    `,
  ])

  return NextResponse.json({
      data: {
        todayRevenue: Number(todayOrders._sum.total ?? 0),
        todayOrders: todayOrders._count,
        yesterdayRevenue: Number(yesterdayOrders._sum.total ?? 0),
        monthRevenue: Number(monthOrders._sum.total ?? 0),
        monthOrders: monthOrders._count,
        totalMenus,
        stokAlertCount: Number(stokAlert[0]?.count ?? 0),
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
