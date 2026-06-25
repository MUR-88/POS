import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ valid: false }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { currentSessionToken: true, isActive: true },
  })

  if (!user?.isActive) {
    return NextResponse.json({ valid: false, reason: "ACCOUNT_DISABLED" }, { status: 401 })
  }

  const sessionToken = session.user.sessionToken
  if (sessionToken && user.currentSessionToken !== sessionToken) {
    return NextResponse.json({ valid: false, reason: "SESSION_KICKED" }, { status: 401 })
  }

  // Update last active
  if (sessionToken) {
    await prisma.userSession
      .updateMany({
        where: { sessionToken },
        data: { lastActiveAt: new Date() },
      })
      .catch(() => {})
  }

  return NextResponse.json({ valid: true })
}
