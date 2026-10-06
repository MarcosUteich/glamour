import type { Settings } from './lib/types'
import { BUSINESS, HOURS_TEXT, PICKUP_TEXT } from './seo/business'
import { normalizeSiteUrl } from './seo/url'

/** Endereço do site com https e sem barra no fim, mesmo que VITE_SITE_URL venha só com o domínio. */
export const SITE_URL = normalizeSiteUrl(import.meta.env.VITE_SITE_URL)

/** Usado enquanto as configurações carregam e no modo demonstração. */
export const DEFAULT_SETTINGS: Settings = {
  whatsapp_number: '5551992275944',
  min_order_cents: BUSINESS.minOrderCents,
  pickup_text: PICKUP_TEXT,
  hours_text: HOURS_TEXT,
  instagram_url: BUSINESS.social.find((url) => url.includes('instagram.com')) ?? null,
}

/** Produtos cadastrados há menos dias que isso aparecem em "Novidades". */
export const NEW_PRODUCT_DAYS = 30
