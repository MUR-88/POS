import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const data = await prisma.$queryRaw<any[]>`
      SELECT mi.id, mi.name, mi.stock, mi."minStock", c.name as "categoryName"
      FROM menu_items mi
      JOIN categories c ON c.id = mi."categoryId"
      WHERE mi."isAvailable" = true AND mi.stock <= mi."minStock"
      ORDER BY mi.stock ASC
    `
    return NextResponse.json({ data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
