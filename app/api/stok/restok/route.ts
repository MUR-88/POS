import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { serializeMenuItem } from "@/lib/utils"
import { z } from "zod"

const schema = z.object({
  menuItemId: z.string(),
  qty: z.number().int().positive(),
  reason: z.string().optional(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(session.user?.role as string))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const { menuItemId, qty, reason } = schema.parse(await req.json())

    const item = await prisma.menuItem.update({
      where: { id: menuItemId },
      data: { stock: { increment: qty } },
    })

    await prisma.stockLog.create({
      data: {
        menuItemId,
        type: "RESTOCK",
        change: qty,
        stockAfter: item.stock,
        reason: reason ?? "Restok",
        userId: session.user!.id!,
      },
    })

    return NextResponse.json({ data: serializeMenuItem(item) })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
