import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["FIXED", "PERCENT"]),
  value: z.number().positive(),
  minOrder: z.number().min(0).optional().nullable(),
  maxDiscount: z.number().min(0).optional().nullable(),
  target: z.enum(["GLOBAL", "CATEGORY", "ITEM"]).default("GLOBAL"),
  categoryId: z.string().optional().nullable(),
  menuItemId: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const data = await prisma.discount.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      category: { select: { name: true } },
      menuItem: { select: { name: true } },
    },
  })

  return NextResponse.json({
    data: data.map(d => ({
      ...d,
      value: Number(d.value),
      minOrder: d.minOrder ? Number(d.minOrder) : null,
      maxDiscount: d.maxDiscount ? Number(d.maxDiscount) : null,
    })),
  })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = (session.user as any).role
  if (!["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const body = schema.parse(await req.json())
    const data = await prisma.discount.create({
      data: {
        name: body.name,
        description: body.description,
        type: body.type,
        value: body.value,
        minOrder: body.minOrder ?? null,
        maxDiscount: body.maxDiscount ?? null,
        target: body.target,
        categoryId: body.categoryId ?? null,
        menuItemId: body.menuItemId ?? null,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        isActive: body.isActive,
      },
    })
    return NextResponse.json({ data }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
