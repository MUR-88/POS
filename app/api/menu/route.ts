import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { serializeMenuItem } from "@/lib/utils"
import { z } from "zod"

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  imageUrl: z.string().optional(),
  stock: z.number().int().min(0).default(0),
  minStock: z.number().int().min(0).default(5),
  categoryId: z.string(),
  isAvailable: z.boolean().default(true),
})

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const categoryId = searchParams.get("categoryId")
  const search = searchParams.get("search")

  const data = await prisma.menuItem.findMany({
    where: {
      ...(categoryId ? { categoryId } : {}),
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    },
    include: { category: { select: { id: true, name: true, icon: true } } },
    orderBy: { name: "asc" },
  })
  return NextResponse.json({ data: data.map(serializeMenuItem) })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!["ADMIN", "MANAGER"].includes(session.user?.role as string))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const body = schema.parse(await req.json())
    const data = await prisma.menuItem.create({ data: body })
    return NextResponse.json({ data }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
