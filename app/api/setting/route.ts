import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const settings = await prisma.setting.findMany()
  const data = Object.fromEntries(settings.map(s => [s.key, s.value]))
  return NextResponse.json({ data })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user?.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body: Record<string, string> = await req.json()

  await Promise.all(
    Object.entries(body).map(([key, value]) =>
      prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } })
    )
  )

  return NextResponse.json({ data: { ok: true } })
}
