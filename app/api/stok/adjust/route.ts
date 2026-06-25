import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { serializeMenuItem } from "@/lib/utils"
import { z } from "zod"

const schema = z.object({
  menuItemId: z.string(),
  newStock: z.number().int().min(0),
  reason: z.string().optional(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!["ADMIN", "MANAGER"].includes(session.user?.role as string))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const { menuItemId, newStock, reason } = schema.parse(await req.json())

    const current = await prisma.menuItem.findUnique({ where: { id: menuItemId } })
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const change = newStock - current.stock
    const item = await prisma.menuItem.update({ where: { id: menuItemId }, data: { stock: newStock } })

    await prisma.stockLog.create({
      data: {
        menuItemId,
        type: "ADJUSTMENT",
        change,
        stockAfter: newStock,
        reason: reason ?? "Koreksi stok",
        userId: session.user!.id!,
      },
    })

    return NextResponse.json({ data: serializeMenuItem(item) })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
