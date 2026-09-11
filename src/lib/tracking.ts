// Google Analytics 4 e Pixel da Meta. Só carregam em produção, só na loja (o /admin não monta
// o StoreLayout) e só quando os IDs estão configurados (VITE_GA_ID, VITE_META_PIXEL_ID).
import type { EventType } from './types'

type Command = (...args: unknown[]) => void

interface Fbq extends Command {
  callMethod?: Command
  queue: unknown[]
  push: Fbq
  loaded: boolean
  version: string
}

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: Command
    fbq?: Fbq
    _fbq?: Fbq
  }
}

const GA_ID: string | undefined = import.meta.env.VITE_GA_ID
const PIXEL_ID: string | undefined = import.meta.env.VITE_META_PIXEL_ID
let started = false

export interface TrackedItem {
  code: string
  name: string
  priceCents: number
  quantity: number
  category?: string | null
}

// Eventos recomendados do GA4 (comércio) e padrão do Pixel
const GA_EVENTS: Partial<Record<EventType, string>> = {
  product_view: 'view_item',
  add_to_cart: 'add_to_cart',
  remove_from_cart: 'remove_from_cart',
  cart_view: 'view_cart',
  checkout_started: 'begin_checkout',
  order_created: 'generate_lead',
  whatsapp_clicked: 'whatsapp_click',
}

const PIXEL_EVENTS: Partial<Record<EventType, string>> = {
  product_view: 'ViewContent',
  add_to_cart: 'AddToCart',
  checkout_started: 'InitiateCheckout',
  order_created: 'Lead',
  whatsapp_clicked: 'Contact',
}

function loadScript(src: string) {
  const script = document.createElement('script')
  script.async = true
  script.src = src
  document.head.appendChild(script)
}

export function initTracking() {
  if (started || !import.meta.env.PROD || (!GA_ID && !PIXEL_ID)) return
  started = true

  if (GA_ID) {
    window.dataLayer = window.dataLayer ?? []
    // O gtag.js só entende o objeto `arguments`, não um array
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer?.push(arguments)
    }
    window.gtag('js', new Date())
    // page_view é enviado à mão a cada troca de rota (SPA), com o título já atualizado
    window.gtag('config', GA_ID, { send_page_view: false })
    loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`)
  }

  if (PIXEL_ID && !window.fbq) {
    // Snippet oficial da Meta: guarda os comandos numa fila até o fbevents.js carregar
    const fbq = ((...args: unknown[]) => {
      if (fbq.callMethod) fbq.callMethod(...args)
      else fbq.queue.push(args)
    }) as Fbq
    fbq.push = fbq
    fbq.loaded = true
    fbq.version = '2.0'
    fbq.queue = []
    window.fbq = fbq
    window._fbq = fbq
    loadScript('https://connect.facebook.net/en_US/fbevents.js')
    // Sem coleta automática (cliques e campos de formulário): só os eventos que enviamos
    fbq('set', 'autoConfig', false, PIXEL_ID)
    fbq('init', PIXEL_ID)
  }
}

export function trackPageView(path: string) {
  if (!started) return
  window.gtag?.('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  })
  window.fbq?.('track', 'PageView')
}

export function sendAdsEvent(
  type: EventType,
  items: TrackedItem[],
  valueCents?: number,
  meta?: Record<string, unknown>,
) {
  if (!started) return
  const value = (valueCents ?? items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0)) / 100

  const gaName = GA_EVENTS[type]
  if (gaName) {
    window.gtag?.('event', gaName, {
      currency: 'BRL',
      value,
      items: items.map((i) => ({
        item_id: i.code,
        item_name: i.name,
        item_category: i.category ?? undefined,
        price: i.priceCents / 100,
        quantity: i.quantity,
      })),
      ...meta,
    })
  }

  const pixelName = PIXEL_EVENTS[type]
  if (pixelName) {
    window.fbq?.('track', pixelName, {
      currency: 'BRL',
      value,
      content_type: 'product',
      content_ids: items.map((i) => i.code),
      contents: items.map((i) => ({ id: i.code, quantity: i.quantity })),
      ...(items.length === 1 ? { content_name: items[0].name } : {}),
    })
  }
}
