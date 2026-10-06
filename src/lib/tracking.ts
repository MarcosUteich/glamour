// Google Analytics 4, Google Ads, Pixel da Meta e Microsoft Clarity. Só carregam em produção, só na loja
// (o /admin não monta o StoreLayout), só quando os IDs estão configurados e só depois que a pessoa aceita
// os cookies no aviso (LGPD). Se ela recusar depois, os envios param na hora.
import { getConsent, onConsentChange } from './consent'
import type { EventType } from './types'

type Command = (...args: unknown[]) => void

interface Fbq extends Command {
  callMethod?: Command
  queue: unknown[]
  push: Fbq
  loaded: boolean
  version: string
}

interface Clarity extends Command {
  q?: unknown[]
}

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: Command
    fbq?: Fbq
    _fbq?: Fbq
    clarity?: Clarity
  }
}

const env = import.meta.env
const GA_ID = env.VITE_GA_ID?.trim() || undefined
const PIXEL_ID = env.VITE_META_PIXEL_ID?.trim() || undefined
const ADS_ID = env.VITE_GOOGLE_ADS_ID?.trim() || undefined
const ADS_LEAD_LABEL = env.VITE_GOOGLE_ADS_LEAD_LABEL?.trim() || undefined
const CLARITY_ID = env.VITE_CLARITY_ID?.trim() || undefined

/** Há alguma ferramenta de medição configurada neste build? Sem nenhuma, o aviso de cookies nem aparece. */
export const trackingConfigured = Boolean(import.meta.env.PROD && (GA_ID || PIXEL_ID || ADS_ID || CLARITY_ID))

let listening = false
let started = false
let paused = false

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

const GRANTED = { ad_storage: 'granted', analytics_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted' }
const DENIED = { ad_storage: 'denied', analytics_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' }

function loadScript(src: string) {
  const script = document.createElement('script')
  script.async = true
  script.src = src
  document.head.appendChild(script)
}

function startGoogle() {
  window.dataLayer = window.dataLayer ?? []
  // O gtag.js só entende o objeto `arguments`, não um array
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer?.push(arguments)
  }
  // Consent Mode v2: só chegamos aqui depois do "Aceitar"
  window.gtag('consent', 'default', GRANTED)
  window.gtag('js', new Date())
  // page_view é enviado à mão a cada troca de rota (SPA), com o título já atualizado
  if (GA_ID) window.gtag('config', GA_ID, { send_page_view: false })
  if (ADS_ID) window.gtag('config', ADS_ID)
  loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent((GA_ID ?? ADS_ID) as string)}`)
}

function startPixel(pixelId: string) {
  if (window.fbq) return
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
  fbq('consent', 'grant')
  // Sem coleta automática (cliques e campos de formulário): só os eventos que enviamos
  fbq('set', 'autoConfig', false, pixelId)
  fbq('init', pixelId)
}

function startClarity(clarityId: string) {
  if (window.clarity) return
  const clarity = ((...args: unknown[]) => {
    ;(clarity.q = clarity.q ?? []).push(args)
  }) as Clarity
  window.clarity = clarity
  loadScript(`https://www.clarity.ms/tag/${encodeURIComponent(clarityId)}`)
  clarity('consent')
}

function start() {
  if (started) {
    // Aceitou de novo depois de recusar nesta mesma visita
    paused = false
    window.gtag?.('consent', 'update', GRANTED)
    window.fbq?.('consent', 'grant')
    return
  }
  started = true
  paused = false
  if (GA_ID || ADS_ID) startGoogle()
  if (PIXEL_ID) startPixel(PIXEL_ID)
  if (CLARITY_ID) startClarity(CLARITY_ID)
}

function stop() {
  paused = true
  window.gtag?.('consent', 'update', DENIED)
  window.fbq?.('consent', 'revoke')
}

const active = () => started && !paused

/** Liga a medição se a pessoa já aceitou, e passa a ouvir o aviso de cookies. */
export function initTracking() {
  if (!trackingConfigured || listening) return
  listening = true
  if (getConsent() === 'granted') start()
  onConsentChange((choice) => {
    if (choice === 'granted') {
      start()
      trackPageView(window.location.pathname)
    } else if (started) {
      stop()
    }
  })
}

export function trackPageView(path: string) {
  if (!active()) return
  if (GA_ID) {
    window.gtag?.('event', 'page_view', {
      send_to: GA_ID,
      page_path: path,
      page_location: window.location.href,
      page_title: document.title,
    })
  }
  window.fbq?.('track', 'PageView')
}

export function sendAdsEvent(
  type: EventType,
  items: TrackedItem[],
  valueCents?: number,
  meta?: Record<string, unknown>,
) {
  if (!active()) return
  const value = (valueCents ?? items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0)) / 100
  const orderNumber = typeof meta?.order_number === 'string' ? meta.order_number : undefined

  const gaName = GA_EVENTS[type]
  if (gaName && GA_ID) {
    window.gtag?.('event', gaName, {
      send_to: GA_ID,
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

  // Conversão "pedido registrado" direto no Google Ads (opcional; também dá para importar do GA4)
  if (type === 'order_created' && ADS_ID && ADS_LEAD_LABEL) {
    window.gtag?.('event', 'conversion', {
      send_to: `${ADS_ID}/${ADS_LEAD_LABEL}`,
      value,
      currency: 'BRL',
      ...(orderNumber ? { transaction_id: orderNumber } : {}),
    })
  }

  const pixelName = PIXEL_EVENTS[type]
  if (pixelName) {
    // eventID igual ao que a API de Conversões mandará depois: a Meta não conta o pedido duas vezes
    const eventID =
      orderNumber && type === 'order_created' ? orderNumber : orderNumber && type === 'whatsapp_clicked' ? `${orderNumber}-whatsapp` : undefined
    window.fbq?.(
      'track',
      pixelName,
      {
        currency: 'BRL',
        value,
        content_type: 'product',
        content_ids: items.map((i) => i.code),
        contents: items.map((i) => ({ id: i.code, quantity: i.quantity })),
        ...(items.length === 1 ? { content_name: items[0].name } : {}),
      },
      ...(eventID ? [{ eventID }] : []),
    )
  }
}
