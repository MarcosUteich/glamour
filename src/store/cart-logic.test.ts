import { describe, expect, it } from 'vitest'
import type { Product } from '@/lib/types'
import { addToLines, cartTotals, setLineQuantity, syncLines, type CartLine } from './cart-logic'

const product = (id: string, price: number, extra: Partial<Product> = {}): Product => ({
  id,
  category_id: 'c',
  name: `Peça ${id}`,
  slug: id,
  code: id.toUpperCase(),
  description: null,
  material: null,
  plating: null,
  size: null,
  shade: null,
  weight_g: null,
  price_cents: price,
  stock: null,
  active: true,
  created_at: '2026-01-01T00:00:00Z',
  photos: [],
  ...extra,
})

describe('addToLines', () => {
  it('soma quantidades da mesma peça', () => {
    let lines: CartLine[] = []
    lines = addToLines(lines, product('a', 2490)).lines
    lines = addToLines(lines, product('a', 2490), 2).lines
    expect(lines).toHaveLength(1)
    expect(lines[0].quantity).toBe(3)
  })

  it('não passa do estoque', () => {
    const p = product('b', 1000, { stock: 2 })
    const first = addToLines([], p, 5)
    expect(first.result).toBe('limited')
    expect(first.lines[0].quantity).toBe(2)
    expect(addToLines(first.lines, p).result).toBe('limited')
  })

  it('não adiciona peça sem estoque', () => {
    const r = addToLines([], product('c', 1000, { stock: 0 }))
    expect(r.result).toBe('unavailable')
    expect(r.lines).toHaveLength(0)
  })
})

describe('setLineQuantity', () => {
  it('ajusta, limita ao estoque e remove com zero', () => {
    const lines = addToLines([], product('d', 1000, { stock: 5 })).lines
    expect(setLineQuantity(lines, 'd', 4)[0].quantity).toBe(4)
    expect(setLineQuantity(lines, 'd', 50)[0].quantity).toBe(5)
    expect(setLineQuantity(lines, 'd', 0)).toHaveLength(0)
  })
})

describe('cartTotals', () => {
  it('soma valor e peças', () => {
    let lines = addToLines([], product('e', 2490), 2).lines
    lines = addToLines(lines, product('f', 7990)).lines
    lines = addToLines(lines, product('g', 2990), 3).lines
    expect(cartTotals(lines)).toEqual({ totalCents: 21940, pieces: 6 })
  })
})

describe('syncLines', () => {
  it('atualiza preço, respeita estoque novo e tira peça que saiu de linha', () => {
    let lines = addToLines([], product('h', 1000), 4).lines
    lines = addToLines(lines, product('i', 1000)).lines
    const { lines: next, changes } = syncLines(lines, [product('h', 1200, { stock: 3 })])
    expect(next).toEqual([expect.objectContaining({ productId: 'h', priceCents: 1200, quantity: 3 })])
    expect(changes).toHaveLength(3)
  })

  it('devolve a mesma lista quando nada mudou', () => {
    const lines = addToLines([], product('j', 1000)).lines
    expect(syncLines(lines, [product('j', 1000)]).lines).toBe(lines)
  })
})
