import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import bcrypt from "bcryptjs"

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "MANAGER", "KASIR"]).default("KASIR"),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!["SUPER_ADMIN", "ADMIN", "MANAGER"].includes((session.user as any).role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const data = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ data })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!["SUPER_ADMIN", "ADMIN", "MANAGER"].includes((session.user as any).role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const body = schema.parse(await req.json())
    const hashed = await bcrypt.hash(body.password, 12)
    const data = await prisma.user.create({
      data: { ...body, password: hashed },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    })
    return NextResponse.json({ data }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
