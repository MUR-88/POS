import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [totalUsers, activeUsers, activeSessions, logsToday, errorsToday, recentLogs] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.userSession.count({ where: { isActive: true, expiresAt: { gt: new Date() } } }),
    prisma.activityLog.count({ where: { createdAt: { gte: today } } }),
    prisma.activityLog.count({ where: { createdAt: { gte: today }, statusCode: { gte: 400 } } }),
    prisma.activityLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userName: true,
        userRole: true,
        action: true,
        resource: true,
        statusCode: true,
        ipAddress: true,
        createdAt: true,
      },
    }),
  ])

  return NextResponse.json({
    data: { totalUsers, activeUsers, activeSessions, logsToday, errorsToday, recentLogs },
  })
}
