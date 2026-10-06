// De onde veio cada pedido (Instagram, Google, anúncio, cartaz...). Guarda neste aparelho o primeiro e o
// último canal pelos quais a pessoa chegou ao site e manda junto com o pedido; o painel mostra os pedidos por
// canal sem depender do GA4. Os IDs de clique (gclid, fbclid) ficam guardados para, no futuro, informar ao
// Google Ads e à Meta quais anúncios viraram venda.

export interface Touch {
  /** instagram, google, facebook, whatsapp, cartaz... (utm_source quando existe) */
  source: string
  /** cpc, organic, social, referral, bio... (utm_medium quando existe) */
  medium: string
  campaign?: string
  content?: string
  term?: string
  /** IDs de clique de anúncio presentes na URL de chegada */
  ids?: Record<string, string>
  /** Página de chegada, sem o domínio */
  landing?: string
  /** Site de onde a pessoa veio (sem www) */
  referrer?: string
  at: string
}

export interface Attribution {
  first: Touch
  last: Touch
}

const KEY = 'glamour:origem'
const CLICK_IDS = ['gclid', 'gbraid', 'wbraid', 'fbclid', 'ttclid', 'msclkid'] as const
const PAID_SEARCH = new Set(['gclid', 'gbraid', 'wbraid', 'msclkid'])

const clean = (value: string | null | undefined, max = 100) => value?.trim().slice(0, max) || undefined

function fromHost(host: string): { source: string; medium: string } {
  if (/(^|\.)google\.[a-z.]+$/.test(host)) return { source: 'google', medium: 'organic' }
  if (/(^|\.)(bing\.com|yahoo\.com|duckduckgo\.com|ecosia\.org)$/.test(host)) {
    return { source: host.split('.').slice(-2)[0], medium: 'organic' }
  }
  if (/(^|\.)instagram\.com$/.test(host)) return { source: 'instagram', medium: 'social' }
  if (/(^|\.)(facebook\.com|fb\.com|fb\.me|messenger\.com)$/.test(host)) return { source: 'facebook', medium: 'social' }
  if (/(^|\.)(whatsapp\.com|wa\.me)$/.test(host)) return { source: 'whatsapp', medium: 'social' }
  if (/(^|\.)tiktok\.com$/.test(host)) return { source: 'tiktok', medium: 'social' }
  if (/(^|\.)(youtube\.com|youtu\.be)$/.test(host)) return { source: 'youtube', medium: 'social' }
  if (/(^|\.)(t\.co|x\.com|twitter\.com)$/.test(host)) return { source: 'x', medium: 'social' }
  return { source: host, medium: 'referral' }
}

function clickSource(key: string): string {
  if (PAID_SEARCH.has(key)) return key === 'msclkid' ? 'bing' : 'google'
  if (key === 'fbclid') return 'facebook'
  return 'tiktok'
}

/**
 * O "toque" desta chegada ao site, ou null quando não há nada a registrar
 * (acesso direto ou navegação vinda do próprio site).
 */
export function touchFrom(url: URL, referrer: string, now = new Date()): Touch | null {
  const params = url.searchParams
  const utm = (name: string) => clean(params.get(`utm_${name}`))

  const ids: Record<string, string> = {}
  for (const key of CLICK_IDS) {
    const value = clean(params.get(key), 200)
    if (value) ids[key] = value
  }
  const clickKey = CLICK_IDS.find((key) => ids[key])

  let refHost: string | undefined
  try {
    refHost = referrer ? new URL(referrer).hostname.replace(/^www\./, '').toLowerCase() : undefined
  } catch {
    refHost = undefined
  }
  if (refHost && refHost === url.hostname.replace(/^www\./, '').toLowerCase()) refHost = undefined

  const byHost = refHost ? fromHost(refHost) : undefined
  const source = utm('source')?.toLowerCase() ?? (clickKey ? clickSource(clickKey) : byHost?.source)
  if (!source) return null

  const clickMedium = clickKey ? (PAID_SEARCH.has(clickKey) ? 'cpc' : 'social') : undefined
  const medium = utm('medium')?.toLowerCase() ?? clickMedium ?? byHost?.medium ?? '(none)'

  return {
    source,
    medium,
    ...(utm('campaign') ? { campaign: utm('campaign') } : {}),
    ...(utm('content') ? { content: utm('content') } : {}),
    ...(utm('term') ? { term: utm('term') } : {}),
    ...(clickKey ? { ids } : {}),
    landing: `${url.pathname}${url.search}`.slice(0, 200),
    ...(refHost ? { referrer: refHost } : {}),
    at: now.toISOString(),
  }
}

/** Primeiro canal fica para sempre; o último é trocado a cada chegada com origem conhecida. */
export function mergeAttribution(saved: Attribution | null, touch: Touch | null, now = new Date()): Attribution | null {
  if (touch) return { first: saved?.first ?? touch, last: touch }
  if (saved) return saved
  const direct: Touch = { source: 'direto', medium: '(none)', at: now.toISOString() }
  return { first: direct, last: direct }
}

function load(): Attribution | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Attribution) : null
  } catch {
    return null
  }
}

let current: Attribution | null = null

/** Chame uma vez ao abrir o site (StoreLayout). */
export function captureAttribution() {
  try {
    current = mergeAttribution(load(), touchFrom(new URL(window.location.href), document.referrer))
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    // sem armazenamento: vale só para esta visita
  }
}

/** O que vai junto com o pedido (menos de 2 KB). */
export function attributionForOrder(): Attribution | null {
  const value = current ?? load()
  if (!value) return null
  const json = JSON.stringify(value)
  return json.length <= 1800 ? value : { first: { ...value.first, ids: undefined, landing: undefined }, last: { ...value.last, landing: undefined } }
}

/** "instagram / bio · campanha natal" */
export function describeTouch(touch: Partial<Touch> | null | undefined): string {
  if (!touch?.source) return 'direto'
  const parts = [touch.medium && touch.medium !== '(none)' ? `${touch.source} / ${touch.medium}` : touch.source]
  if (touch.campaign) parts.push(`campanha ${touch.campaign}`)
  return parts.join(' · ')
}
