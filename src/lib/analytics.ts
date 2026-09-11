import type { CartLine } from '@/store/cart-logic'
import { supabase } from './supabase'
import { sendAdsEvent, type TrackedItem } from './tracking'
import type { EventType, Product } from './types'

const SESSION_KEY = 'glamour:sessao'
let session: string | null = null
const viewed = new Set<string>()

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function sessionId(): string {
  if (session) return session
  try {
    session = sessionStorage.getItem(SESSION_KEY) ?? randomId()
    sessionStorage.setItem(SESSION_KEY, session)
  } catch {
    session = randomId()
  }
  return session
}

export interface TrackOptions {
  /** Peça do evento (ver, adicionar, remover) */
  product?: Product
  category?: string | null
  quantity?: number
  /** Itens do pedido (ver pedido, iniciar envio) */
  lines?: CartLine[]
  valueCents?: number
  meta?: Record<string, unknown>
}

function itemsOf(options: TrackOptions): TrackedItem[] {
  if (options.product) {
    const p = options.product
    return [{ code: p.code, name: p.name, priceCents: p.price_cents, quantity: options.quantity ?? 1, category: options.category }]
  }
  return (options.lines ?? []).map((l) => ({ code: l.code, name: l.name, priceCents: l.priceCents, quantity: l.quantity }))
}

/**
 * Registra o evento no painel da loja (Supabase, anônimo, sem cookie) e envia para o GA4 e o
 * Pixel da Meta. Nunca quebra a tela.
 */
export function track(type: EventType, options: TrackOptions = {}) {
  const productId = options.product?.id ?? null
  if (type === 'product_view' && productId) {
    if (viewed.has(productId)) return
    viewed.add(productId)
  }

  // order_created já é gravado pelo create_order no banco; aqui não repete
  if (supabase && type !== 'order_created') {
    void supabase
      .from('events')
      .insert({ type, product_id: productId, session_id: sessionId(), meta: options.meta ?? null })
      .then(
        () => undefined,
        () => undefined,
      )
  }

  try {
    sendAdsEvent(type, itemsOf(options), options.valueCents, options.meta)
  } catch {
    // script de terceiro nunca derruba a loja
  }
}
