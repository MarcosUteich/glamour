import { supabase } from './supabase'
import type { EventType } from './types'

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

/** Registra um evento anônimo para o painel (mais vistos, mais adicionados, abandono). Nunca quebra a tela. */
export function track(type: EventType, productId?: string | null, meta?: Record<string, unknown>) {
  if (!supabase) return
  if (type === 'product_view' && productId) {
    if (viewed.has(productId)) return
    viewed.add(productId)
  }
  void supabase
    .from('events')
    .insert({ type, product_id: productId ?? null, session_id: sessionId(), meta: meta ?? null })
    .then(
      () => undefined,
      () => undefined,
    )
}
