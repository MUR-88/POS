import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// DELETE /api/superadmin/users  body: { ids: string[] }
export async function DELETE(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body?.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
    return NextResponse.json({ error: "ids array required" }, { status: 400 })
  }

  // Cannot delete own account
  const ids: string[] = body.ids.filter((id: string) => id !== session.user.id)

  if (ids.length === 0) {
    return NextResponse.json({ error: "Tidak bisa menghapus akun sendiri" }, { status: 400 })
  }

  // Invalidate sessions for deleted users first
  await prisma.userSession.updateMany({
    where: { userId: { in: ids }, isActive: true },
    data: { isActive: false },
  })
  await prisma.user.updateMany({
    where: { id: { in: ids } },
    data: { currentSessionToken: null },
  })

  const { count } = await prisma.user.deleteMany({
    where: { id: { in: ids } },
  })

  return NextResponse.json({ data: { deleted: count } })
}
