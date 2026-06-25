import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  type: z.enum(["FIXED", "PERCENT"]).optional(),
  value: z.number().positive().optional(),
  minOrder: z.number().min(0).optional().nullable(),
  maxDiscount: z.number().min(0).optional().nullable(),
  target: z.enum(["GLOBAL", "CATEGORY", "ITEM"]).optional(),
  categoryId: z.string().optional().nullable(),
  menuItemId: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
})

function requireManagerOrAdmin(role: string) {
  return ["ADMIN", "MANAGER"].includes(role)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = (session.user as any).role
  if (!requireManagerOrAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const { id } = await params
    const body = schema.parse(await req.json())
    const data = await prisma.discount.update({
      where: { id },
      data: {
        ...body,
        startDate: body.startDate ? new Date(body.startDate) : body.startDate === null ? null : undefined,
        endDate: body.endDate ? new Date(body.endDate) : body.endDate === null ? null : undefined,
      },
    })
    return NextResponse.json({ data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = (session.user as any).role
  if (!requireManagerOrAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  await prisma.discount.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
