import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const menuItemId = searchParams.get("menuItemId")
  const limit = Number(searchParams.get("limit") ?? 50)

  try {
    const data = await prisma.stockLog.findMany({
      where: menuItemId ? { menuItemId } : {},
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        menuItem: { select: { name: true } },
        user: { select: { name: true } },
      },
    })
    return NextResponse.json({ data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
