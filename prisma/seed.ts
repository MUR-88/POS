import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminPass = await bcrypt.hash('Admin1234!', 12)
  const managerPass = await bcrypt.hash('Manager1234!', 12)
  const kasirPass = await bcrypt.hash('Kasir1234!', 12)

  await prisma.user.createMany({
    data: [
      { name: 'Admin',   email: 'admin@pos.com',   password: adminPass,   role: 'ADMIN' },
      { name: 'Manager', email: 'manager@pos.com', password: managerPass, role: 'MANAGER' },
      { name: 'Kasir 1', email: 'kasir@pos.com',   password: kasirPass,   role: 'KASIR' },
    ],
    skipDuplicates: true,
  })

  await Promise.all([
    prisma.category.upsert({ where: { id: 'cat-makanan' }, update: {}, create: { id: 'cat-makanan', name: 'Makanan', icon: '🍔', sortOrder: 1 } }),
    prisma.category.upsert({ where: { id: 'cat-minuman' }, update: {}, create: { id: 'cat-minuman', name: 'Minuman', icon: '☕', sortOrder: 2 } }),
    prisma.category.upsert({ where: { id: 'cat-snack' },   update: {}, create: { id: 'cat-snack',   name: 'Snack',   icon: '🍟', sortOrder: 3 } }),
    prisma.category.upsert({ where: { id: 'cat-paket' },   update: {}, create: { id: 'cat-paket',   name: 'Paket',   icon: '🎁', sortOrder: 4 } }),
  ])

  await prisma.menuItem.createMany({
    data: [
      { name: 'Nasi Goreng Spesial', price: 25000, stock: 50, minStock: 5,  categoryId: 'cat-makanan', description: 'Nasi goreng dengan telur, ayam, dan sayuran segar' },
      { name: 'Mie Goreng',          price: 22000, stock: 40, minStock: 5,  categoryId: 'cat-makanan' },
      { name: 'Ayam Bakar',          price: 35000, stock: 20, minStock: 3,  categoryId: 'cat-makanan' },
      { name: 'Soto Ayam',           price: 20000, stock: 30, minStock: 5,  categoryId: 'cat-makanan' },
      { name: 'Es Teh Manis',        price: 8000,  stock: 99, minStock: 10, categoryId: 'cat-minuman' },
      { name: 'Es Jeruk',            price: 10000, stock: 99, minStock: 10, categoryId: 'cat-minuman' },
      { name: 'Kopi Hitam',          price: 12000, stock: 99, minStock: 10, categoryId: 'cat-minuman' },
      { name: 'Jus Alpukat',         price: 18000, stock: 15, minStock: 5,  categoryId: 'cat-minuman' },
      { name: 'Pisang Goreng',       price: 10000, stock: 3,  minStock: 5,  categoryId: 'cat-snack' },
      { name: 'Kentang Goreng',      price: 15000, stock: 0,  minStock: 5,  categoryId: 'cat-snack' },
      { name: 'Paket Hemat A',       price: 30000, stock: 20, minStock: 3,  categoryId: 'cat-paket', description: 'Nasi + Ayam + Es Teh' },
    ],
    skipDuplicates: true,
  })

  // ── Tables ─────────────────────────────────────────────────────────────────
  const tableNumbers = ['1','2','3','4','5','6','7','8','VIP-1','VIP-2']
  for (const number of tableNumbers) {
    await prisma.table.upsert({
      where: { number },
      update: {},
      create: { number, capacity: number.startsWith('VIP') ? 6 : 4, floor: number.startsWith('VIP') ? 'VIP Room' : 'Lantai 1' },
    })
  }

  // ── Sample Members ──────────────────────────────────────────────────────────
  const sampleMembers = [
    { name: 'Budi Santoso', phone: '08111111111', points: 250 },
    { name: 'Siti Rahayu',  phone: '08222222222', points: 1200 },
  ]
  for (const m of sampleMembers) {
    await prisma.member.upsert({ where: { phone: m.phone }, update: {}, create: m })
  }

  const defaultSettings = [
    { key: 'restaurant_name',    value: 'Kafe Saya' },
    { key: 'restaurant_address', value: 'Jl. Contoh No. 123, Pekanbaru' },
    { key: 'restaurant_phone',   value: '0811-2345-6789' },
    { key: 'tax_enabled',        value: 'true' },
    { key: 'tax_rate',           value: '11' },
    { key: 'invoice_prefix',     value: 'INV' },
    { key: 'receipt_footer',     value: 'Terima kasih telah berkunjung! 😊' },
  ]

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({ where: { key: setting.key }, update: {}, create: setting })
  }

  console.log('✅ Seed berhasil!')
  console.log('   Admin:   admin@pos.com   / Admin1234!')
  console.log('   Manager: manager@pos.com / Manager1234!')
  console.log('   Kasir:   kasir@pos.com   / Kasir1234!')
}

main().catch(console.error).finally(() => prisma.$disconnect())
