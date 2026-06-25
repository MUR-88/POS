import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { logActivity, getClientInfo } from "@/lib/activity-logger"

const schema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "MANAGER", "KASIR"]).optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = (session.user as any).role
  if (!["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  try {
    const body = schema.parse(await req.json())

    // Cannot change own role
    if (id === session.user?.id && body.role && body.role !== role) {
      return NextResponse.json({ error: "Tidak bisa mengubah role akun sendiri" }, { status: 400 })
    }

    const update: any = { ...body }
    if (body.password) update.password = await bcrypt.hash(body.password, 12)

    const data = await prisma.user.update({
      where: { id },
      data: update,
      select: { id: true, name: true, email: true, role: true, isActive: true },
    })

    logActivity({
      userId: (session.user as any).id,
      userEmail: session.user?.email ?? undefined,
      userName: session.user?.name ?? undefined,
      userRole: role,
      action: 'UPDATE_USER',
      resource: 'user',
      resourceId: id,
      details: { name: data.name, email: data.email, role: data.role },
      ...getClientInfo(req as any),
    })

    return NextResponse.json({ data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = (session.user as any).role
  if (!["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params

  // Cannot delete own account
  if (id === session.user?.id)
    return NextResponse.json({ error: "Tidak bisa menghapus akun sendiri" }, { status: 400 })

  const target = await prisma.user.findUnique({ where: { id }, select: { role: true, name: true, email: true } })
  if (!target) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 })

  if (role === "SUPER_ADMIN") {
    // Super Admin: bisa hapus siapa saja
  } else if (role === "MANAGER") {
    // Manager: bisa hapus ADMIN dan KASIR, tidak bisa hapus SUPER_ADMIN
    if (target.role === "SUPER_ADMIN")
      return NextResponse.json({ error: "Tidak bisa menghapus Super Admin" }, { status: 403 })
  } else if (role === "ADMIN") {
    // Admin: hanya bisa hapus KASIR
    if (target.role !== "KASIR")
      return NextResponse.json({ error: "Admin hanya bisa menghapus Kasir" }, { status: 403 })
  }

  await prisma.user.delete({ where: { id } })

  logActivity({
    userId: (session.user as any).id,
    userEmail: session.user?.email ?? undefined,
    userName: session.user?.name ?? undefined,
    userRole: role,
    action: 'DELETE_USER',
    resource: 'user',
    resourceId: id,
    details: { name: target.name, email: target.email, role: target.role },
    ...getClientInfo(req as any),
  })

  return NextResponse.json({ ok: true })
}
