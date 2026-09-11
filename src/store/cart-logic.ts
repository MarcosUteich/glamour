import type { Product } from '@/lib/types'

export interface CartLine {
  productId: string
  slug: string
  name: string
  code: string
  size: string | null
  shade: string | null
  priceCents: number
  photo: string | null
  stock: number | null
  quantity: number
}

export const MAX_QUANTITY = 999

export function maxQuantityFor(stock: number | null): number {
  return stock === null ? MAX_QUANTITY : Math.min(Math.max(stock, 0), MAX_QUANTITY)
}

export function lineFromProduct(product: Product, quantity: number): CartLine {
  return {
    productId: product.id,
    slug: product.slug,
    name: product.name,
    code: product.code,
    size: product.size,
    shade: product.shade,
    priceCents: product.price_cents,
    photo: product.photos[0]?.sm ?? null,
    stock: product.stock,
    quantity,
  }
}

export type AddResult = 'added' | 'limited' | 'unavailable'

export function addToLines(lines: CartLine[], product: Product, quantity = 1): { lines: CartLine[]; result: AddResult } {
  const max = maxQuantityFor(product.stock)
  if (!product.active || max <= 0 || quantity <= 0) return { lines, result: 'unavailable' }

  const existing = lines.find((l) => l.productId === product.id)
  const wanted = (existing?.quantity ?? 0) + Math.floor(quantity)
  const next = Math.min(wanted, max)
  if (existing && next === existing.quantity) return { lines, result: 'limited' }

  const line = lineFromProduct(product, next)
  return {
    lines: existing ? lines.map((l) => (l.productId === product.id ? line : l)) : [...lines, line],
    result: next < wanted ? 'limited' : 'added',
  }
}

/** Quantidade 0 (ou menos) tira a peça do pedido. */
export function setLineQuantity(lines: CartLine[], productId: string, quantity: number): CartLine[] {
  if (quantity <= 0) return lines.filter((l) => l.productId !== productId)
  return lines.map((l) =>
    l.productId === productId ? { ...l, quantity: Math.min(Math.floor(quantity), maxQuantityFor(l.stock)) } : l,
  )
}

export function cartTotals(lines: CartLine[]) {
  let totalCents = 0
  let pieces = 0
  for (const l of lines) {
    totalCents += l.priceCents * l.quantity
    pieces += l.quantity
  }
  return { totalCents, pieces }
}

/**
 * Atualiza preço, estoque e dados das peças com o catálogo mais recente e tira do pedido
 * o que saiu de linha. Devolve as mudanças para avisar a cliente.
 */
export function syncLines(lines: CartLine[], products: Product[]): { lines: CartLine[]; changes: string[] } {
  const byId = new Map(products.map((p) => [p.id, p]))
  const changes: string[] = []
  const next: CartLine[] = []

  for (const line of lines) {
    const product = byId.get(line.productId)
    const max = product ? maxQuantityFor(product.stock) : 0
    if (!product || !product.active || max <= 0) {
      changes.push(`${line.name} saiu do pedido (indisponível)`)
      continue
    }
    const quantity = Math.min(line.quantity, max)
    if (quantity < line.quantity) changes.push(`${product.name}: ajustado para ${quantity} (estoque)`)
    if (product.price_cents !== line.priceCents) changes.push(`${product.name}: preço atualizado`)
    next.push(lineFromProduct(product, quantity))
  }

  const unchanged =
    next.length === lines.length && next.every((l, i) => JSON.stringify(l) === JSON.stringify(lines[i]))
  return { lines: unchanged ? lines : next, changes }
}
