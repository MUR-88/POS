import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logActivity } from "@/lib/activity-logger"

const SUPERADMIN_SETTINGS = ["session_timeout_mins"]

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const settings = await prisma.setting.findMany({
    where: { key: { in: SUPERADMIN_SETTINGS } },
  })
  const data = Object.fromEntries(settings.map((s) => [s.key, s.value]))
  // Provide defaults for missing keys
  if (!data.session_timeout_mins) data.session_timeout_mins = "120"

  return NextResponse.json({ data })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body: Record<string, string> = await req.json()

  // Only allow super admin settings keys
  const filtered = Object.fromEntries(
    Object.entries(body).filter(([k]) => SUPERADMIN_SETTINGS.includes(k))
  )

  await Promise.all(
    Object.entries(filtered).map(([key, value]) =>
      prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } })
    )
  )

  logActivity({
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    userName: session.user.name ?? undefined,
    userRole: session.user.role,
    action: "UPDATE_SETTINGS",
    resource: "settings",
    details: filtered,
  })

  return NextResponse.json({ data: { ok: true } })
}

// Per-user session timeout override
export async function PATCH(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { userId, sessionTimeoutMins } = await req.json()
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })

  await prisma.user.update({
    where: { id: userId },
    data: { sessionTimeoutMins: sessionTimeoutMins === null ? null : parseInt(sessionTimeoutMins) },
  })

  return NextResponse.json({ data: { ok: true } })
}
