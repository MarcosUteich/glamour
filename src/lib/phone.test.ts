import { describe, expect, it } from 'vitest'
import { formatBRPhone, isValidBRPhone, normalizeBRPhone, toWhatsAppNumber } from './phone'

describe('normalizeBRPhone', () => {
  it('remove máscara, +55 e zero do DDD', () => {
    expect(normalizeBRPhone('+55 (51) 99227-5944')).toBe('51992275944')
    expect(normalizeBRPhone('051 99227-5944')).toBe('51992275944')
    expect(normalizeBRPhone('(55) 99999-8888')).toBe('55999998888')
  })
})

describe('isValidBRPhone', () => {
  it('aceita celular e fixo com DDD', () => {
    expect(isValidBRPhone('(51) 99227-5944')).toBe(true)
    expect(isValidBRPhone('(51) 3333-4444')).toBe(true)
  })

  it('recusa números incompletos ou com DDD inválido', () => {
    expect(isValidBRPhone('(51) 9922-7594')).toBe(false)
    expect(isValidBRPhone('(05) 99999-9999')).toBe(false)
    expect(isValidBRPhone('99227-5944')).toBe(false)
  })
})

describe('formatBRPhone', () => {
  it('aplica a máscara enquanto a pessoa digita', () => {
    expect(formatBRPhone('5')).toBe('(5')
    expect(formatBRPhone('5199')).toBe('(51) 99')
    expect(formatBRPhone('5133334444')).toBe('(51) 3333-4444')
    expect(formatBRPhone('51992275944')).toBe('(51) 99227-5944')
    expect(formatBRPhone('+55 51 99227 5944')).toBe('(51) 99227-5944')
  })
})

describe('toWhatsAppNumber', () => {
  it('monta o número do wa.me', () => {
    expect(toWhatsAppNumber('(51) 99227-5944')).toBe('5551992275944')
  })
})
