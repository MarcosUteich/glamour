import { describe, expect, it } from 'vitest'
import { minOrderProgress, orderErrorMessage } from './orders'

describe('minOrderProgress', () => {
  it('mostra quanto falta enquanto está abaixo do mínimo', () => {
    const p = minOrderProgress(21940, 49000)
    expect(p.reached).toBe(false)
    expect(p.remainingCents).toBe(27060)
    expect(p.ratio).toBeCloseTo(0.4478, 3)
    expect(p.suggest).toBe(false)
  })

  it('sugere peças quando falta pouco', () => {
    expect(minOrderProgress(48000, 49000).suggest).toBe(true)
  })

  it('libera ao atingir exatamente o mínimo', () => {
    const p = minOrderProgress(49000, 49000)
    expect(p.reached).toBe(true)
    expect(p.remainingCents).toBe(0)
    expect(p.ratio).toBe(1)
    expect(p.suggest).toBe(false)
  })
})

describe('orderErrorMessage', () => {
  it('traduz falta de estoque com código e quantidade', () => {
    const msg = orderErrorMessage('insufficient_stock', '{"code":"BR-102","available":3}')
    expect(msg).toContain('BR-102')
    expect(msg).toContain('3')
  })

  it('tem mensagem genérica para erros desconhecidos', () => {
    expect(orderErrorMessage('boom')).toMatch(/Tente de novo/)
  })
})
