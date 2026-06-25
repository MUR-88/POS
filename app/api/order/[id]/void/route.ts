import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(session.user?.role as string))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params

  try {
    const order = await prisma.order.findUnique({ where: { id }, include: { items: true } })
    if (!order) return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 })
    if (order.status === "VOIDED") return NextResponse.json({ error: "Order sudah divoid" }, { status: 400 })

    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id }, data: { status: "VOIDED" } })

      for (const item of order.items) {
        const mi = await tx.menuItem.update({
          where: { id: item.menuItemId },
          data: { stock: { increment: item.qty } },
        })
        await tx.stockLog.create({
          data: {
            menuItemId: item.menuItemId,
            type: "VOID",
            change: item.qty,
            stockAfter: mi.stock,
            reason: `Void order ${order.orderNo}`,
            userId: session.user!.id!,
          },
        })
      }
    })

    return NextResponse.json({ data: { ok: true } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
