import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { toNum } from "@/lib/utils"
import { z } from "zod"

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = z.object({ closingCash: z.number().min(0), notes: z.string().optional() }).parse(await req.json())

    const shift = await prisma.shift.findFirst({ where: { cashierId: session.user!.id!, status: "OPEN" } })
    if (!shift) return NextResponse.json({ error: "Tidak ada shift aktif" }, { status: 404 })

    const [summary, closed] = await Promise.all([
      prisma.order.aggregate({
        where: { shiftId: shift.id, status: "COMPLETED" },
        _sum: { total: true },
        _count: true,
      }),
      prisma.shift.update({
        where: { id: shift.id },
        data: { status: "CLOSED", closedAt: new Date(), closingCash: body.closingCash, notes: body.notes },
      }),
    ])

    return NextResponse.json({
      data: {
        ...closed,
        openingCash: toNum(closed.openingCash),
        closingCash: toNum(closed.closingCash),
        totalSales: toNum(summary._sum.total),
        totalOrders: summary._count,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
