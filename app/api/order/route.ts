import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateInvoiceNo, serializeOrder } from "@/lib/utils"
import { z } from "zod"

const itemSchema = z.object({
  menuItemId: z.string(),
  qty: z.number().int().positive(),
  price: z.number().positive(),
  discount: z.number().min(0).default(0),
  notes: z.string().optional(),
})

const schema = z.object({
  tableId: z.string().optional(),
  tableNo: z.string().optional(),
  customerName: z.string().optional(),
  memberId: z.string().optional(),
  shiftId: z.string().optional(),
  items: z.array(itemSchema).min(1),
  discount: z.number().min(0).default(0),
  payMethod: z.enum(["CASH", "QRIS", "TRANSFER", "DEBIT", "KREDIT"]).default("CASH"),
  amountPaid: z.number().min(0).default(0),
  notes: z.string().optional(),
  taxEnabled: z.boolean().default(false),
  taxRate: z.number().default(0),
})

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limit = Number(searchParams.get("limit") ?? 20)
  const page = Number(searchParams.get("page") ?? 1)
  const status = searchParams.get("status")

  const [data, total] = await Promise.all([
    prisma.order.findMany({
      take: limit,
      skip: (page - 1) * limit,
      orderBy: { createdAt: "desc" },
      where: status ? { status: status as any } : {},
      include: {
        cashier: { select: { name: true } },
        table: { select: { number: true } },
        member: { select: { name: true } },
        items: { include: { menuItem: { select: { name: true } } } },
      },
    }),
    prisma.order.count(status ? { where: { status: status as any } } : undefined),
  ])

  return NextResponse.json({ data: data.map(serializeOrder), total, page, limit })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Require active shift
  const activeShift = await prisma.shift.findFirst({
    where: { cashierId: session.user!.id!, status: "OPEN" },
  })
  if (!activeShift) {
    return NextResponse.json({ error: "Shift belum dibuka. Buka shift terlebih dahulu sebelum melakukan transaksi." }, { status: 403 })
  }

  try {
    const body = schema.parse(await req.json())

    // Calculate totals with per-item discounts
    const subtotal = body.items.reduce((s, i) => s + (i.price - i.discount) * i.qty, 0)
    const tax = body.taxEnabled ? Math.round((subtotal - body.discount) * body.taxRate / 100) : 0
    const total = subtotal - body.discount + tax
    const change = Math.max(0, body.amountPaid - total)
    const pointsEarned = body.memberId ? Math.floor(total / 10000) : 0

    const count = await prisma.order.count()
    const setting = await prisma.setting.findUnique({ where: { key: "invoice_prefix" } })
    const orderNo = generateInvoiceNo(setting?.value ?? "INV", count + 1)

    const order = await prisma.$transaction(async (tx) => {
      // Create order
      const created = await tx.order.create({
        data: {
          orderNo,
          tableId: body.tableId || undefined,
          tableNo: body.tableNo || undefined,
          customerName: body.customerName || undefined,
          memberId: body.memberId || undefined,
          shiftId: body.shiftId || undefined,
          subtotal,
          discount: body.discount,
          tax,
          total,
          payMethod: body.payMethod,
          amountPaid: body.amountPaid,
          change,
          notes: body.notes || undefined,
          cashierId: session.user!.id!,
          status: "COMPLETED",
          kdsStatus: "PENDING",
          items: {
            create: body.items.map(i => ({
              menuItemId: i.menuItemId,
              qty: i.qty,
              price: i.price,
              discount: i.discount,
              subtotal: (i.price - i.discount) * i.qty,
              notes: i.notes || undefined,
              kdsStatus: "PENDING",
            })),
          },
        },
        include: {
          items: { include: { menuItem: { select: { name: true } } } },
          cashier: { select: { name: true } },
          table: { select: { number: true } },
          member: { select: { name: true } },
        },
      })

      // Deduct stock + log
      for (const item of body.items) {
        const mi = await tx.menuItem.update({
          where: { id: item.menuItemId },
          data: { stock: { decrement: item.qty } },
        })
        await tx.stockLog.create({
          data: {
            menuItemId: item.menuItemId,
            type: "SALE",
            change: -item.qty,
            stockAfter: mi.stock,
            reason: `Order ${orderNo}`,
            userId: session.user!.id!,
          },
        })
      }

      // Update table status to OCCUPIED
      if (body.tableId) {
        await tx.table.update({ where: { id: body.tableId }, data: { status: "OCCUPIED" } })
      }

      // Update member points + total spend
      if (body.memberId && pointsEarned > 0) {
        await tx.member.update({
          where: { id: body.memberId },
          data: { points: { increment: pointsEarned }, totalSpend: { increment: total } },
        })
      }

      return created
    })

    return NextResponse.json({ data: { ...serializeOrder(order), pointsEarned } }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
