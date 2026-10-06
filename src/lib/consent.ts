// Consentimento de cookies (LGPD): Google Analytics, Google Ads, Pixel da Meta e Clarity só carregam depois
// que a pessoa aceita no aviso. A escolha fica neste aparelho e pode ser mudada no rodapé ("Preferências de
// cookies"). Sem localStorage (navegação privada), vale só enquanto a aba estiver aberta.
import { useSyncExternalStore } from 'react'

export type ConsentChoice = 'granted' | 'denied'

const KEY = 'glamour:cookies'
/** Suba a versão quando mudar o que é coletado: o aviso volta a aparecer para todo mundo. */
const VERSION = 1
const EVENT = 'glamour:consentimento'

interface Stored {
  choice: ConsentChoice
  at: string
  v: number
}

let memory: ConsentChoice | null = null

export function getConsent(): ConsentChoice | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return memory
    const stored = JSON.parse(raw) as Stored
    if (stored?.v === VERSION && (stored.choice === 'granted' || stored.choice === 'denied')) return stored.choice
    return memory
  } catch {
    return memory
  }
}

function announce(choice: ConsentChoice | null) {
  window.dispatchEvent(new CustomEvent<ConsentChoice | null>(EVENT, { detail: choice }))
}

export function setConsent(choice: ConsentChoice) {
  memory = choice
  try {
    localStorage.setItem(KEY, JSON.stringify({ choice, at: new Date().toISOString(), v: VERSION } satisfies Stored))
  } catch {
    // sem armazenamento: a escolha vale até fechar a aba
  }
  announce(choice)
}

/** Reabre o aviso (link "Preferências de cookies" no rodapé). */
export function resetConsent() {
  memory = null
  try {
    localStorage.removeItem(KEY)
  } catch {
    // sem armazenamento disponível
  }
  announce(null)
}

export function onConsentChange(listener: (choice: ConsentChoice | null) => void): () => void {
  const handler = (event: Event) => listener((event as CustomEvent<ConsentChoice | null>).detail)
  window.addEventListener(EVENT, handler)
  return () => window.removeEventListener(EVENT, handler)
}

/**
 * Escolha atual, que muda na hora quando a pessoa aceita, recusa ou reabre o aviso. Na página pré-montada no
 * servidor a escolha é desconhecida ('unknown'): o aviso só aparece no navegador, para quem ainda não escolheu.
 */
export function useConsent(): ConsentChoice | null | 'unknown' {
  return useSyncExternalStore(
    (notify) => onConsentChange(() => notify()),
    getConsent,
    () => 'unknown',
  )
}
