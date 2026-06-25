import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { toNum } from "@/lib/utils"
import { z } from "zod"

const schema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional(),
})

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search")

  const data = await prisma.member.findMany({
    where: {
      isActive: true,
      ...(search ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { phone: { contains: search } },
        ],
      } : {}),
    },
    orderBy: { totalSpend: "desc" },
    take: search ? 20 : 500,
  })
  return NextResponse.json({ data: data.map(m => ({ ...m, totalSpend: toNum(m.totalSpend) })) })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const body = schema.parse(await req.json())
    const data = await prisma.member.create({ data: body })
    return NextResponse.json({ data: { ...data, totalSpend: toNum(data.totalSpend) } }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
