import { useMemo } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product } from '@/lib/types'
import { addToLines, cartTotals, setLineQuantity, syncLines, type AddResult, type CartLine } from './cart-logic'

interface CartState {
  lines: CartLine[]
  add: (product: Product, quantity?: number) => AddResult
  setQuantity: (productId: string, quantity: number) => void
  remove: (productId: string) => void
  clear: () => void
  /** Confere o pedido com o catálogo atual e devolve o que mudou. */
  sync: (products: Product[]) => string[]
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      add: (product, quantity = 1) => {
        const { lines, result } = addToLines(get().lines, product, quantity)
        if (lines !== get().lines) set({ lines })
        return result
      },
      setQuantity: (productId, quantity) => set({ lines: setLineQuantity(get().lines, productId, quantity) }),
      remove: (productId) => set({ lines: get().lines.filter((l) => l.productId !== productId) }),
      clear: () => set({ lines: [] }),
      sync: (products) => {
        const { lines, changes } = syncLines(get().lines, products)
        if (lines !== get().lines) set({ lines })
        return changes
      },
    }),
    { name: 'glamour:pedido', version: 1, partialize: (s) => ({ lines: s.lines }) },
  ),
)

export function useCartLine(productId: string | undefined) {
  return useCart((s) => (productId ? s.lines.find((l) => l.productId === productId) : undefined))
}

export function useCartTotals() {
  const lines = useCart((s) => s.lines)
  return useMemo(() => ({ lines, ...cartTotals(lines) }), [lines])
}
