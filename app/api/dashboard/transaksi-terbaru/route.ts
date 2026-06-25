import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { serializeOrder } from "@/lib/utils"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const data = await prisma.order.findMany({
      take: 5, orderBy: { createdAt: "desc" },
      include: { cashier: { select: { name: true } } },
    })
    return NextResponse.json({ data: data.map(serializeOrder) })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
