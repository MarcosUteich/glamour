import { formatBRL } from './money'
import type { OrderStatus } from './orders'
import { formatBRPhone } from './phone'

export interface OrderLine {
  name: string
  code: string
  size?: string | null
  shade?: string | null
  quantity: number
  unitPriceCents: number
  totalCents: number
}

export interface OrderSummary {
  orderNumber: string
  customerName: string
  customerPhone: string
  items: OrderLine[]
  totalCents: number
  /** Total de peças (soma das quantidades) */
  itemCount: number
  minOrderCents: number
  pickupText: string
}

/** Tamanho máximo do texto já codificado no link, para abrir bem em qualquer aparelho. */
export const WHATSAPP_TEXT_LIMIT = 3500

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

function describeLine(line: OrderLine, index: number): string {
  const details = [line.name, line.code, line.size, line.shade ? `Tom: ${line.shade}` : null]
    .filter(Boolean)
    .join(' · ')
  return `${index + 1}. ${details}\n   ${line.quantity} × ${formatBRL(line.unitPriceCents)} = ${formatBRL(line.totalCents)}`
}

/** Mensagem que chega no WhatsApp da loja. `maxLines` corta a lista em pedidos muito grandes. */
export function buildOrderMessage(order: OrderSummary, maxLines = order.items.length): string {
  const shown = order.items.slice(0, maxLines)
  const hidden = order.items.length - shown.length
  const lines = [
    'Olá, Glamour! Quero fazer um pedido de atacado.',
    '',
    `*Pedido #${order.orderNumber}*`,
    `Cliente: ${order.customerName}`,
    `WhatsApp: ${formatBRPhone(order.customerPhone)}`,
    '',
    '*Itens*',
    ...shown.map(describeLine),
  ]
  if (hidden > 0) {
    lines.push(`…e mais ${plural(hidden, 'item', 'itens')} (pedido completo registrado como #${order.orderNumber})`)
  }
  lines.push(
    '',
    `*Total: ${formatBRL(order.totalCents)}* (${plural(order.itemCount, 'peça', 'peças')})`,
    `Pedido mínimo: ${formatBRL(order.minOrderCents)} ✓`,
    '',
    '*Retirada*',
    order.pickupText,
  )
  return lines.join('\n')
}

export function whatsappLink(number: string, text?: string): string {
  const base = `https://wa.me/${number.replace(/\D/g, '')}`
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}

/** Mensagem + link do pedido, encurtando a lista de itens se o link ficar grande demais. */
export function buildOrderWhatsApp(order: OrderSummary, storeNumber: string) {
  let maxLines = order.items.length
  let text = buildOrderMessage(order, maxLines)
  while (encodeURIComponent(text).length > WHATSAPP_TEXT_LIMIT && maxLines > 1) {
    maxLines -= 1
    text = buildOrderMessage(order, maxLines)
  }
  return { text, url: whatsappLink(storeNumber, text), truncated: maxLines < order.items.length }
}

/** Mensagens prontas que o painel usa para responder o cliente em cada etapa. */
export function buildCustomerMessage(
  status: OrderStatus,
  order: { customerName: string; orderNumber: string; totalCents: number; pickupText: string; hoursText?: string | null },
): string {
  const name = order.customerName.trim().split(/\s+/)[0]
  const number = `#${order.orderNumber}`
  const total = formatBRL(order.totalCents)

  switch (status) {
    case 'novo':
    case 'em_atendimento':
      return `Olá, ${name}! Aqui é da Glamour. Recebemos seu pedido ${number} (${total}) e já estamos conferindo as peças.`
    case 'confirmado':
      return `Olá, ${name}! Seu pedido ${number} (${total}) está confirmado. Avisamos por aqui assim que ele estiver separado.`
    case 'separando':
      return `Olá, ${name}! Estamos separando as peças do seu pedido ${number}. Logo ele fica pronto para retirada.`
    case 'pronto':
      return `Olá, ${name}! Seu pedido ${number} está pronto para retirada: ${order.pickupText}.${
        order.hoursText ? ` Horário: ${order.hoursText}.` : ''
      }`
    case 'retirado':
      return `Agradecemos pela compra, ${name}! Quando quiser repor seu estoque, é só montar um novo pedido no nosso catálogo de atacado.`
    case 'cancelado':
      return `Olá, ${name}. Seu pedido ${number} foi cancelado. Se quiser, podemos montar um novo pedido juntos.`
  }
}
