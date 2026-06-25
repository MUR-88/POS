import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { toNum } from "@/lib/utils"
import { z } from "zod"

const schema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  try {
    const body = schema.parse(await req.json())
    const data = await prisma.member.update({ where: { id }, data: body })
    return NextResponse.json({ data: { ...data, totalSpend: toNum(data.totalSpend) } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
