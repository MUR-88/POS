import { create } from "zustand"

export type CartItem = {
  id: string
  name: string
  price: number
  qty: number
  stock: number
  discount: number
  notes?: string
}

type CartStore = {
  items: CartItem[]
  tableId: string
  tableNo: string
  customerName: string
  memberId: string
  memberName: string
  memberPoints: number
  discount: number
  addItem: (item: Omit<CartItem, "qty" | "notes" | "discount">) => void
  removeItem: (id: string) => void
  updateQty: (id: string, qty: number) => void
  updateNotes: (id: string, notes: string) => void
  updateItemDiscount: (id: string, discount: number) => void
  setTableId: (id: string) => void
  setTableNo: (v: string) => void
  setCustomerName: (v: string) => void
  setMember: (id: string, name: string, points: number) => void
  setDiscount: (v: number) => void
  clearCart: () => void
  subtotal: () => number
  itemSubtotal: (item: CartItem) => number
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  tableId: "",
  tableNo: "",
  customerName: "",
  memberId: "",
  memberName: "",
  memberPoints: 0,
  discount: 0,

  addItem(item) {
    set(s => {
      const existing = s.items.find(i => i.id === item.id)
      if (existing) {
        if (existing.qty >= item.stock) return s
        return { items: s.items.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i) }
      }
      return { items: [...s.items, { ...item, qty: 1, discount: 0 }] }
    })
  },

  removeItem(id) {
    set(s => ({ items: s.items.filter(i => i.id !== id) }))
  },

  updateQty(id, qty) {
    if (qty <= 0) { get().removeItem(id); return }
    set(s => ({ items: s.items.map(i => i.id === id ? { ...i, qty } : i) }))
  },

  updateNotes(id, notes) {
    set(s => ({ items: s.items.map(i => i.id === id ? { ...i, notes } : i) }))
  },

  updateItemDiscount(id, discount) {
    set(s => ({ items: s.items.map(i => i.id === id ? { ...i, discount } : i) }))
  },

  setTableId: (id) => set({ tableId: id }),
  setTableNo: (v) => set({ tableNo: v }),
  setCustomerName: (v) => set({ customerName: v }),
  setMember: (id, name, points) => set({ memberId: id, memberName: name, memberPoints: points }),
  setDiscount: (v) => set({ discount: v }),

  clearCart: () => set({
    items: [], tableId: "", tableNo: "", customerName: "",
    memberId: "", memberName: "", memberPoints: 0, discount: 0,
  }),

  itemSubtotal(item) {
    return (item.price - item.discount) * item.qty
  },

  subtotal() {
    return get().items.reduce((sum, i) => sum + get().itemSubtotal(i), 0)
  },
}))
