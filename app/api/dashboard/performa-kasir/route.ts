import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { startOfMonth, endOfMonth } from "date-fns"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const now = new Date()
    const data = await prisma.order.groupBy({
      by: ["cashierId"],
      where: { status: "COMPLETED", createdAt: { gte: startOfMonth(now), lte: endOfMonth(now) } },
      _sum: { total: true }, _count: true,
      orderBy: { _sum: { total: "desc" } },
      take: 5,
    })
    const withNames = await Promise.all(
      data.map(async (row) => {
        const user = await prisma.user.findUnique({ where: { id: row.cashierId }, select: { name: true } })
        return { name: user?.name ?? "Unknown", total: Number(row._sum.total ?? 0), count: row._count }
      })
    )
    return NextResponse.json({ data: withNames })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
