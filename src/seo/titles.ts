// Títulos das páginas, iguais no HTML que o Google e o WhatsApp recebem e no <title> que o React troca
// ao navegar. Sem dependências do app: roda no build, na Vercel e no servidor Node.
import { BUSINESS } from './business'

export const BRAND = BUSINESS.name
export const SITE_NAME = BUSINESS.siteName

/** "R$ 1.234,56" sem depender do ICU do ambiente (as funções rodam na borda da Vercel). */
export function brl(cents: number): string {
  const [int, dec] = (cents / 100).toFixed(2).split('.')
  return `R$ ${int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${dec}`
}

/** "24.90": o formato de preço dos dados estruturados e do catálogo da Meta */
export const reais = (cents: number) => (cents / 100).toFixed(2)

export const titles = {
  home: () => `Semijoias no atacado em Porto Alegre | ${BRAND}`,
  novidades: () => `Novidades no atacado em Porto Alegre | ${BRAND}`,
  category: (name: string) => `${name} no atacado em Porto Alegre | ${BRAND}`,
  product: (p: { name: string; code: string; price_cents: number }) =>
    `${p.name} ${p.code} · ${brl(p.price_cents)} no atacado | ${BRAND}`,
  howToBuy: () => `Como comprar no atacado | ${BRAND}`,
  /** Páginas de serviço: "Seu pedido · Glamour Lindóia Atacado" */
  page: (label: string) => `${label} · ${SITE_NAME}`,
}
