import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  number: z.string().min(1).optional(),
  capacity: z.number().int().min(1).optional(),
  floor: z.string().optional(),
  status: z.enum(["AVAILABLE", "OCCUPIED", "RESERVED"]).optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  try {
    const body = schema.parse(await req.json())
    const data = await prisma.table.update({ where: { id }, data: body })
    return NextResponse.json({ data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!["ADMIN", "MANAGER"].includes(session.user?.role as string))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { id } = await params
  await prisma.table.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ data: { ok: true } })
}
