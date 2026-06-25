import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const sessions = await prisma.userSession.findMany({
    where: { isActive: true },
    orderBy: { lastActiveAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  })

  return NextResponse.json({ data: sessions })
}

// DELETE /api/superadmin/sessions?sessionToken=xxx  → kick specific session
// DELETE /api/superadmin/sessions?userId=xxx        → kick all sessions for user
export async function DELETE(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const sessionToken = searchParams.get("sessionToken")
  const userId = searchParams.get("userId")

  if (!sessionToken && !userId) {
    return NextResponse.json({ error: "Butuh sessionToken atau userId" }, { status: 400 })
  }

  const where: any = sessionToken ? { sessionToken } : { userId }

  await prisma.$transaction([
    prisma.userSession.updateMany({ where, data: { isActive: false } }),
    // Reset currentSessionToken so next API call from that user returns 401
    ...(userId
      ? [prisma.user.update({ where: { id: userId }, data: { currentSessionToken: null } })]
      : []),
  ])

  if (sessionToken && !userId) {
    // Find userId from sessionToken to invalidate user token too
    const s = await prisma.userSession.findUnique({ where: { sessionToken }, select: { userId: true } })
    if (s) {
      await prisma.user.update({ where: { id: s.userId }, data: { currentSessionToken: null } })
    }
  }

  return NextResponse.json({ data: { ok: true } })
}
