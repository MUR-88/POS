"use client"

import { createContext, useContext, useState, useEffect, useCallback } from "react"

type Shift = { id: string; openedAt: string; openingCash: number; cashier: { name: string } }
type ShiftCtx = { shift: Shift | null; isOpen: boolean; loading: boolean; refresh: () => void }

const ShiftContext = createContext<ShiftCtx>({
  shift: null, isOpen: false, loading: true, refresh: () => {},
})

export function ShiftProvider({ children }: { children: React.ReactNode }) {
  const [shift, setShift] = useState<Shift | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/shift").then(r => r.json())
      setShift(res.data ?? null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 60_000)
    return () => clearInterval(t)
  }, [refresh])

  return (
    <ShiftContext.Provider value={{ shift, isOpen: !!shift, loading, refresh }}>
      {children}
    </ShiftContext.Provider>
  )
}

export function useShift() { return useContext(ShiftContext) }
