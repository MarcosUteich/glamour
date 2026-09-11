import type { Settings } from './lib/types'

export const SITE_URL = (import.meta.env.VITE_SITE_URL ?? 'https://glamouratacado.com.br').replace(/\/$/, '')

/** Usado enquanto as configurações carregam e no modo demonstração. */
export const DEFAULT_SETTINGS: Settings = {
  whatsapp_number: '5551992275944',
  min_order_cents: 49000,
  pickup_text: 'Glamour Acessórios · Shopping Lindoia · Porto Alegre/RS',
  hours_text: null,
  instagram_url: null,
}

/** Produtos cadastrados há menos dias que isso aparecem em "Novidades". */
export const NEW_PRODUCT_DAYS = 30
