import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { subDays, format, startOfDay, endOfDay } from "date-fns"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i))
    const data = await Promise.all(
      days.map(async (day) => {
        const result = await prisma.order.aggregate({
          where: { status: "COMPLETED", createdAt: { gte: startOfDay(day), lte: endOfDay(day) } },
          _sum: { total: true }, _count: true,
        })
        return { date: format(day, "dd/MM"), revenue: Number(result._sum.total ?? 0), orders: result._count }
      })
    )
    return NextResponse.json({ data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
