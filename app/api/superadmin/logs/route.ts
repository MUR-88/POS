import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"))
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "50"))
  const userId = searchParams.get("userId") ?? undefined
  const action = searchParams.get("action") ?? undefined
  const dateFrom = searchParams.get("dateFrom")
  const dateTo = searchParams.get("dateTo")

  const where: any = {}
  if (userId) where.userId = userId
  if (action) where.action = { contains: action, mode: "insensitive" }
  if (dateFrom || dateTo) {
    where.createdAt = {}
    if (dateFrom) where.createdAt.gte = new Date(dateFrom)
    if (dateTo) {
      const end = new Date(dateTo)
      end.setHours(23, 59, 59, 999)
      where.createdAt.lte = end
    }
  }

  const [total, logs] = await Promise.all([
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({
      where,
      take: limit,
      skip: (page - 1) * limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userId: true,
        userName: true,
        userEmail: true,
        userRole: true,
        action: true,
        resource: true,
        resourceId: true,
        details: true,
        ipAddress: true,
        userAgent: true,
        method: true,
        path: true,
        statusCode: true,
        duration: true,
        createdAt: true,
      },
    }),
  ])

  return NextResponse.json({ data: logs, total, page, limit })
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const olderThanDays = parseInt(searchParams.get("olderThanDays") ?? "90")
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000)

  const { count } = await prisma.activityLog.deleteMany({ where: { createdAt: { lt: cutoff } } })
  return NextResponse.json({ data: { deleted: count } })
}
