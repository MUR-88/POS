import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { serializeOrder } from "@/lib/utils"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const data = await prisma.order.findMany({
      where: {
        status: "COMPLETED",
        kdsStatus: { in: ["PENDING", "PREPARING", "READY"] },
      },
      orderBy: { createdAt: "asc" },
      include: {
        items: { include: { menuItem: { select: { name: true } } } },
        table: { select: { number: true } },
        cashier: { select: { name: true } },
      },
    })
    return NextResponse.json({ data: data.map(serializeOrder) })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { orderId, kdsStatus } = body
    if (!orderId || !kdsStatus) return NextResponse.json({ error: "orderId dan kdsStatus wajib diisi" }, { status: 400 })

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { kdsStatus },
      include: {
        items: { include: { menuItem: { select: { name: true } } } },
        table: { select: { number: true } },
      },
    })
    return NextResponse.json({ data: serializeOrder(order) })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
