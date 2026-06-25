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

  if (userId) {
    // Kick all sessions for a user
    await prisma.userSession.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    })
    await prisma.user.update({
      where: { id: userId },
      data: { currentSessionToken: null },
    })
  } else if (sessionToken) {
    // Kick specific session — first find which user owns it
    const target = await prisma.userSession.findUnique({
      where: { sessionToken },
      select: { userId: true },
    })

    await prisma.userSession.updateMany({
      where: { sessionToken },
      data: { isActive: false },
    })

    if (target) {
      // Only clear currentSessionToken if it still matches (user hasn't logged in from elsewhere)
      await prisma.user.updateMany({
        where: { id: target.userId, currentSessionToken: sessionToken },
        data: { currentSessionToken: null },
      })
    }
  }

  return NextResponse.json({ data: { ok: true } })
}
