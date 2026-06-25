import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { toNum } from "@/lib/utils"
import { z } from "zod"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const active = await prisma.shift.findFirst({
      where: { cashierId: session.user!.id!, status: "OPEN" },
      include: { cashier: { select: { name: true } } },
    })
    return NextResponse.json({ data: active ? { ...active, openingCash: toNum(active.openingCash) } : null })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = z.object({ openingCash: z.number().min(0).default(0) }).parse(await req.json())

    const existing = await prisma.shift.findFirst({ where: { cashierId: session.user!.id!, status: "OPEN" } })
    if (existing) return NextResponse.json({ error: "Shift sudah terbuka" }, { status: 400 })

    const data = await prisma.shift.create({
      data: { cashierId: session.user!.id!, openingCash: body.openingCash },
    })
    return NextResponse.json({ data: { ...data, openingCash: toNum(data.openingCash) } }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
