import { describe, expect, it } from 'vitest'
import { centsToInput, formatBRL, parseBRLToCents } from './money'

// O Intl separa "R$" do numero com espaco fino ou duro (U+00A0 / U+202F)
const plain = (s: string) => s.replace(/[\u00A0\u202F]/g, ' ')

describe('formatBRL', () => {
  it('formata centavos no padrão brasileiro', () => {
    expect(plain(formatBRL(2490))).toBe('R$ 24,90')
    expect(plain(formatBRL(123456))).toBe('R$ 1.234,56')
    expect(plain(formatBRL(49000))).toBe('R$ 490,00')
  })
})

describe('parseBRLToCents', () => {
  it.each([
    ['24,90', 2490],
    ['24.90', 2490],
    ['1.234,56', 123456],
    ['R$ 49', 4900],
    ['R$ 49,90', 4990],
    ['49', 4900],
    ['1.234', 123400],
    ['0,5', 50],
  ])('%s → %i centavos', (input, cents) => {
    expect(parseBRLToCents(input)).toBe(cents)
  })

  it('recusa o que não é valor', () => {
    expect(parseBRLToCents('')).toBeNull()
    expect(parseBRLToCents('abc')).toBeNull()
    expect(parseBRLToCents('-10')).toBeNull()
  })
})

describe('centsToInput', () => {
  it('prepara o valor para edição', () => {
    expect(centsToInput(2490)).toBe('24,90')
    expect(centsToInput(123456)).toBe('1.234,56')
  })
})
