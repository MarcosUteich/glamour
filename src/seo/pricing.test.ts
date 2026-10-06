import { describe, expect, it } from 'vitest'
import { hasWholesaleDiscount, normalizeDiscountPct, wholesalePriceCents, withWholesalePrice } from './pricing'

describe('preço de atacado', () => {
  it('aplica o desconto e arredonda ao centavo', () => {
    expect(wholesalePriceCents(10000, 30)).toBe(7000)
    expect(wholesalePriceCents(2490, 30)).toBe(1743)
    expect(wholesalePriceCents(4990, 35)).toBe(3244) // 3243,5 → sobe
    expect(wholesalePriceCents(1999, 15)).toBe(1699) // 1699,15
  })

  it('sem desconto fica o preço original', () => {
    expect(wholesalePriceCents(2490, 0)).toBe(2490)
    expect(hasWholesaleDiscount(withWholesalePrice({ price_cents: 2490 }, 0))).toBe(false)
    expect(hasWholesaleDiscount(withWholesalePrice({ price_cents: 2490 }, 10))).toBe(true)
  })

  it('nunca chega a zero', () => {
    expect(wholesalePriceCents(1, 90)).toBe(1)
  })

  it('lê o desconto do banco com cuidado', () => {
    expect(normalizeDiscountPct(30)).toBe(30)
    expect(normalizeDiscountPct(undefined)).toBe(0)
    expect(normalizeDiscountPct(null)).toBe(0)
    expect(normalizeDiscountPct('30')).toBe(0)
    expect(normalizeDiscountPct(-5)).toBe(0)
    expect(normalizeDiscountPct(150)).toBe(90)
    expect(wholesalePriceCents(10000, 150)).toBe(1000)
  })
})
