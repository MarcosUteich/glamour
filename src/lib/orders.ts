export const ORDER_STATUSES = [
  { value: 'novo', label: 'Novo' },
  { value: 'em_atendimento', label: 'Em atendimento' },
  { value: 'confirmado', label: 'Confirmado' },
  { value: 'separando', label: 'Separando' },
  { value: 'pronto', label: 'Pronto para retirada' },
  { value: 'retirado', label: 'Retirado' },
  { value: 'cancelado', label: 'Cancelado' },
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]['value']

export function orderStatusLabel(status: OrderStatus): string {
  return ORDER_STATUSES.find((s) => s.value === status)?.label ?? status
}

/** A partir de quanto faltar mostramos "Veja peças para completar seu pedido". */
export const SUGGEST_WHEN_MISSING_CENTS = 15000

export function minOrderProgress(totalCents: number, minOrderCents: number) {
  const remainingCents = Math.max(minOrderCents - totalCents, 0)
  return {
    reached: totalCents >= minOrderCents,
    remainingCents,
    ratio: minOrderCents > 0 ? Math.min(totalCents / minOrderCents, 1) : 1,
    suggest: remainingCents > 0 && remainingCents <= SUGGEST_WHEN_MISSING_CENTS,
  }
}

/** Traduz os códigos de erro de create_order (supabase/migrations/0003_functions.sql). */
export function orderErrorMessage(code: string, detail?: string | null): string {
  let info: Record<string, unknown>
  try {
    info = detail ? (JSON.parse(detail) as Record<string, unknown>) : {}
  } catch {
    info = {}
  }
  const code_ = typeof info.code === 'string' ? info.code : ''

  switch (code) {
    case 'invalid_name':
      return 'Informe seu nome para enviarmos o pedido.'
    case 'invalid_phone':
      return 'Confira o WhatsApp: use DDD + número, como (51) 99999-9999.'
    case 'empty_cart':
      return 'Seu pedido está vazio.'
    case 'too_many_items':
      return 'São muitos itens em um pedido só. Divida em dois pedidos, por favor.'
    case 'rate_limited':
      return 'Recebemos vários pedidos deste WhatsApp na última hora. Fale com a gente pelo WhatsApp para continuar.'
    case 'product_unavailable':
      return `A peça ${code_} não está mais disponível. Remova do pedido e tente de novo.`
    case 'insufficient_stock':
      return `Temos só ${String(info.available ?? 0)} unidade(s) da peça ${code_}. Ajuste a quantidade e tente de novo.`
    case 'invalid_quantity':
      return `Confira a quantidade da peça ${code_}.`
    case 'below_minimum':
      return 'O pedido ainda não chegou ao valor mínimo. Os preços podem ter mudado; confira o total.'
    default:
      return 'Não conseguimos registrar o pedido agora. Tente de novo em instantes.'
  }
}
