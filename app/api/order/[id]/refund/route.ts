import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  items: z.array(z.object({ orderItemId: z.string(), qty: z.number().int().positive() })),
  reason: z.string().optional(),
})

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!["ADMIN", "MANAGER"].includes(session.user?.role as string))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  try {
    const body = schema.parse(await req.json())

    const order = await prisma.order.findUnique({ where: { id }, include: { items: true } })
    if (!order) return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 })
    if (order.status === "VOIDED") return NextResponse.json({ error: "Order sudah void" }, { status: 400 })
    if (order.status === "REFUNDED") return NextResponse.json({ error: "Order sudah direfund" }, { status: 400 })

    await prisma.$transaction(async (tx) => {
      for (const refundItem of body.items) {
        const orderItem = order.items.find(i => i.id === refundItem.orderItemId)
        if (!orderItem) continue
        const refundQty = Math.min(refundItem.qty, orderItem.qty)
        const mi = await tx.menuItem.update({
          where: { id: orderItem.menuItemId },
          data: { stock: { increment: refundQty } },
        })
        await tx.stockLog.create({
          data: {
            menuItemId: orderItem.menuItemId,
            type: "REFUND",
            change: refundQty,
            stockAfter: mi.stock,
            reason: body.reason ?? `Refund order ${order.orderNo}`,
            userId: session.user!.id!,
          },
        })
      }
      await tx.order.update({ where: { id }, data: { status: "REFUNDED" } })
    })

    return NextResponse.json({ data: { ok: true } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
