import { describe, expect, it } from 'vitest'
import {
  buildCustomerMessage,
  buildOrderMessage,
  buildOrderWhatsApp,
  whatsappLink,
  WHATSAPP_TEXT_LIMIT,
  type OrderSummary,
} from './whatsapp'

// O Intl separa "R$" do numero com espaco fino ou duro (U+00A0 / U+202F)
const plain = (s: string) => s.replace(/[\u00A0\u202F]/g, ' ')

const order: OrderSummary = {
  orderNumber: 'GLM-20260910-001',
  customerName: 'Maria Silva',
  customerPhone: '51999999999',
  items: [
    { name: 'Brinco argola dourada', code: 'BR-102', size: '2,5 cm', quantity: 2, unitPriceCents: 2490, totalCents: 4980 },
    { name: 'Batom matte', code: 'MQ-014', shade: 'Nude 02', quantity: 6, unitPriceCents: 990, totalCents: 5940 },
  ],
  totalCents: 52000,
  itemCount: 18,
  minOrderCents: 49000,
  pickupText: 'Glamour Acessórios · Shopping Lindoia · Porto Alegre/RS',
}

describe('buildOrderMessage', () => {
  it('monta a mensagem completa do pedido', () => {
    expect(plain(buildOrderMessage(order))).toBe(
      [
        'Olá, Glamour! Quero fazer um pedido de atacado.',
        '',
        '*Pedido #GLM-20260910-001*',
        'Cliente: Maria Silva',
        'WhatsApp: (51) 99999-9999',
        '',
        '*Itens*',
        '1. Brinco argola dourada · BR-102 · 2,5 cm',
        '   2 × R$ 24,90 = R$ 49,80',
        '2. Batom matte · MQ-014 · Tom: Nude 02',
        '   6 × R$ 9,90 = R$ 59,40',
        '',
        '*Total: R$ 520,00* (18 peças)',
        'Pedido mínimo: R$ 490,00 ✓',
        '',
        '*Retirada*',
        'Glamour Acessórios · Shopping Lindoia · Porto Alegre/RS',
      ].join('\n'),
    )
  })
})

describe('buildOrderWhatsApp', () => {
  it('abre o WhatsApp da loja com o texto codificado', () => {
    const { url, truncated } = buildOrderWhatsApp(order, '5551992275944')
    expect(url.startsWith('https://wa.me/5551992275944?text=')).toBe(true)
    expect(decodeURIComponent(url.split('?text=')[1])).toBe(buildOrderMessage(order))
    expect(truncated).toBe(false)
  })

  it('encurta a lista em pedidos enormes sem passar do limite', () => {
    const big: OrderSummary = {
      ...order,
      items: Array.from({ length: 150 }, (_, i) => ({
        name: `Brinco modelo ${i + 1}`,
        code: `BR-${100 + i}`,
        size: '2 cm',
        quantity: 3,
        unitPriceCents: 1990,
        totalCents: 5970,
      })),
    }
    const { text, truncated } = buildOrderWhatsApp(big, '5551992275944')
    expect(truncated).toBe(true)
    expect(encodeURIComponent(text).length).toBeLessThanOrEqual(WHATSAPP_TEXT_LIMIT)
    expect(text).toMatch(/…e mais \d+ itens \(pedido completo registrado como #GLM-20260910-001\)/)
    expect(text).toContain('*Total:')
  })
})

describe('whatsappLink', () => {
  it('codifica acentos', () => {
    expect(whatsappLink('55 51 99227-5944', 'Olá')).toBe('https://wa.me/5551992275944?text=Ol%C3%A1')
  })
})

describe('buildCustomerMessage', () => {
  it('avisa que o pedido está pronto com local e horário', () => {
    const msg = buildCustomerMessage('pronto', {
      customerName: 'Maria Silva',
      orderNumber: 'GLM-20260910-001',
      totalCents: 52000,
      pickupText: 'Glamour Acessórios · Shopping Lindoia',
      hoursText: 'seg. a sáb., 10h às 22h',
    })
    expect(msg).toBe(
      'Olá, Maria! Seu pedido #GLM-20260910-001 está pronto para retirada: Glamour Acessórios · Shopping Lindoia. Horário: seg. a sáb., 10h às 22h.',
    )
  })
})
