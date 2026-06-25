import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  number: z.string().min(1),
  capacity: z.number().int().min(1).default(4),
  floor: z.string().optional(),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const data = await prisma.table.findMany({
    where: { isActive: true },
    orderBy: { number: "asc" },
    include: {
      orders: {
        where: { status: { in: ["PENDING", "COMPLETED"] }, kdsStatus: { not: "SERVED" } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  })
  return NextResponse.json({ data })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(session.user?.role as string))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  try {
    const body = schema.parse(await req.json())
    const data = await prisma.table.create({ data: body })
    return NextResponse.json({ data }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
