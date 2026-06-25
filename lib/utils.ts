import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRupiah(amount: number | string | bigint): string {
  const num = typeof amount === 'bigint' ? Number(amount) : Number(amount)
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

export function generateInvoiceNo(prefix = 'INV', sequence: number): string {
  const date = new Date()
  const d = date.toISOString().slice(0, 10).replace(/-/g, '')
  return `${prefix}-${d}-${String(sequence).padStart(3, '0')}`
}

// Convert Prisma Decimal (serialized as string) to number
export function toNum(val: any): number {
  return Number(val ?? 0)
}

export function serializeMenuItem(item: any) {
  return { ...item, price: toNum(item.price) }
}

export function serializeOrder(order: any) {
  return {
    ...order,
    subtotal:   toNum(order.subtotal),
    discount:   toNum(order.discount),
    tax:        toNum(order.tax),
    total:      toNum(order.total),
    amountPaid: toNum(order.amountPaid),
    change:     toNum(order.change),
    items: order.items?.map((i: any) => ({
      ...i,
      price:    toNum(i.price),
      subtotal: toNum(i.subtotal),
    })),
  }
}

export function formatTanggal(date: Date | string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date))
}
