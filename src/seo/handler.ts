// Lógica das funções de SEO (api/*.ts na Vercel e server/index.ts no servidor Node), separada para poder ser
// testada com Vitest. Recebe fetch e variáveis por parâmetro; lê o Supabase pela API REST com a anon key
// (só dados públicos, sob o mesmo RLS da loja).
import { BUSINESS, HOURS_TEXT, PICKUP_TEXT } from './business'
import { faqOrDefault, fillFaq } from './faq'
import { buildFeed, type FeedProduct } from './feed'
import {
  categoryHead,
  homeHead,
  howToBuyHead,
  notFoundHead,
  privacyHead,
  privateHead,
  productHead,
  readVerification,
  renderHead,
  withSearch,
  type HeadData,
  type SeoCategory,
  type SeoProduct,
  type ShareImage,
  type SiteVerification,
} from './head'
import { injectHead } from './html'
import { normalizeDiscountPct, withWholesalePrice } from './pricing'
import { canonicalPath, resolveRoute, type SeoRoute } from './routes'
import { buildRobots, buildSitemap, type SitemapCategory } from './sitemap'
import { normalizeSiteUrl, publicPhotoUrl } from './url'

export interface SeoEnv {
  siteUrl: string
  supabaseUrl?: string
  supabaseAnonKey?: string
  verification?: SiteVerification
}

export interface SeoDeps {
  env: SeoEnv
  fetch: typeof fetch
  timeoutMs?: number
}

export function readSeoEnv(source: Record<string, string | undefined>): SeoEnv {
  const verification = readVerification(source)
  return {
    siteUrl: normalizeSiteUrl(source.VITE_SITE_URL),
    supabaseUrl: source.VITE_SUPABASE_URL?.trim().replace(/\/+$/, '') || undefined,
    supabaseAnonKey: source.VITE_SUPABASE_ANON_KEY?.trim() || undefined,
    ...(verification ? { verification } : {}),
  }
}

class NotFoundError extends Error {}

async function rest<T>(deps: SeoDeps, query: string, timeoutMs = deps.timeoutMs ?? 2500): Promise<T> {
  const { supabaseUrl, supabaseAnonKey } = deps.env
  if (!supabaseUrl || !supabaseAnonKey) throw new Error('Supabase não configurado')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await deps.fetch(`${supabaseUrl}/rest/v1/${query}`, {
      headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}`, Accept: 'application/json' },
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`Supabase respondeu ${res.status}`)
    return (await res.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

const photoUrl = (env: SeoEnv, path: string) => publicPhotoUrl(env.supabaseUrl, path)

/** product_images(*): funciona antes e depois da migration 0007 (coluna path_share) */
interface ImageRow {
  path_lg: string
  path_share?: string | null
  sort_order: number
}

const byOrder = (images: ImageRow[] | null) => [...(images ?? [])].sort((a, b) => a.sort_order - b.sort_order)

function photosOf(env: SeoEnv, images: ImageRow[] | null) {
  const sorted = byOrder(images)
  const cover = sorted[0]
  return {
    images: sorted.map((img) => photoUrl(env, img.path_lg)),
    shareImage: cover?.path_share ? photoUrl(env, cover.path_share) : null,
  }
}

interface ProductRow extends Omit<SeoProduct, 'images' | 'shareImage' | 'category' | 'wholesale_price_cents'> {
  categories: { name: string; slug: string } | null
  product_images: ImageRow[] | null
}

const PRODUCT_FIELDS = 'name,slug,code,description,material,plating,size,shade,price_cents,stock'

/** A peça como está no banco; o preço de atacado entra depois, com o desconto de Config. */
async function loadProduct(deps: SeoDeps, slug: string): Promise<Omit<SeoProduct, 'wholesale_price_cents'>> {
  const select = `${PRODUCT_FIELDS},categories(name,slug),product_images(*)`
  const rows = await rest<ProductRow[]>(
    deps,
    `products?select=${encodeURIComponent(select)}&slug=eq.${encodeURIComponent(slug)}&active=eq.true&limit=1`,
  )
  const row = rows[0]
  if (!row) throw new NotFoundError()
  const { categories, product_images, ...fields } = row
  return { ...fields, ...photosOf(deps.env, product_images), category: categories }
}

async function loadCategory(deps: SeoDeps, slug: string): Promise<SeoCategory & { id: string }> {
  // select=* para funcionar antes e depois da migration 0006 (coluna description)
  const rows = await rest<Array<{ id: string; name: string; slug: string; description?: string | null }>>(
    deps,
    `categories?select=*&slug=eq.${encodeURIComponent(slug)}&active=eq.true&limit=1`,
  )
  const row = rows[0]
  if (!row) throw new NotFoundError()
  return { id: row.id, name: row.name, slug: row.slug, description: row.description ?? null }
}

/**
 * Peças mais novas de uma categoria (ou do catálogo todo, em Novidades): diz se a lista está vazia (fica fora do
 * Google) e escolhe a foto da prévia de link. Em dúvida (banco fora do ar), deixa indexar com a arte da loja.
 */
async function listCover(deps: SeoDeps, categoryId: string | null): Promise<{ empty: boolean; cover: ShareImage | null }> {
  try {
    const filter = categoryId ? `&category_id=eq.${encodeURIComponent(categoryId)}` : ''
    const rows = await rest<Array<{ name: string; product_images: ImageRow[] | null }>>(
      deps,
      `products?select=${encodeURIComponent('name,product_images(*)')}&active=eq.true${filter}&order=created_at.desc&limit=6`,
    )
    const withShare = rows.find((row) => byOrder(row.product_images)[0]?.path_share)
    const share = withShare ? byOrder(withShare.product_images)[0].path_share : null
    return {
      empty: rows.length === 0,
      cover: withShare && share ? { url: photoUrl(deps.env, share), alt: withShare.name } : null,
    }
  } catch {
    return { empty: false, cover: null }
  }
}

/** Configurações da loja (/admin → Config); se o banco falhar, os dados fixos de business.ts. */
export interface StoreSettings {
  minOrderCents: number
  /** Desconto do atacado sobre o preço original, em % (migration 0009; antes dela, 0) */
  wholesaleDiscountPct: number
  pickupText: string
  hoursText: string | null
  whatsappNumber: string
  /** Perguntas da página Como comprar como estão no banco (migration 0008) */
  faq: unknown
  updatedAt?: string
}

const FALLBACK_SETTINGS: StoreSettings = {
  minOrderCents: BUSINESS.minOrderCents,
  wholesaleDiscountPct: 0,
  pickupText: PICKUP_TEXT,
  hoursText: HOURS_TEXT,
  whatsappNumber: BUSINESS.phone.replace(/\D/g, ''),
  faq: null,
}

/** Configurações como estão no banco; erro se o banco falhar. */
async function readSettings(deps: SeoDeps, timeoutMs?: number): Promise<StoreSettings> {
  // select=* funciona antes e depois das migrations 0008 (coluna faq) e 0009 (coluna wholesale_discount_pct)
  const rows = await rest<
    Array<{
      min_order_cents: number
      wholesale_discount_pct?: number
      pickup_text: string
      hours_text: string | null
      whatsapp_number: string
      faq?: unknown
      updated_at?: string
    }>
  >(deps, 'settings?select=*&id=eq.1', timeoutMs)
  const row = rows[0]
  if (!row) return FALLBACK_SETTINGS
  return {
    minOrderCents: row.min_order_cents ?? BUSINESS.minOrderCents,
    wholesaleDiscountPct: normalizeDiscountPct(row.wholesale_discount_pct),
    pickupText: row.pickup_text || PICKUP_TEXT,
    hoursText: row.hours_text ?? null,
    whatsappNumber: row.whatsapp_number || FALLBACK_SETTINGS.whatsappNumber,
    faq: row.faq ?? null,
    updatedAt: row.updated_at,
  }
}

export async function loadSettings(deps: SeoDeps): Promise<StoreSettings> {
  try {
    return await readSettings(deps)
  } catch {
    return FALLBACK_SETTINGS
  }
}

async function loadMinOrder(deps: SeoDeps): Promise<number> {
  return (await loadSettings(deps)).minOrderCents
}

async function headFor(route: SeoRoute, hasSearch: boolean, deps: SeoDeps): Promise<{ head: HeadData; status: number }> {
  const { siteUrl } = deps.env
  const searchable = (head: HeadData) => (hasSearch ? withSearch(head) : head)
  try {
    switch (route.kind) {
      case 'home':
        return { head: searchable(homeHead(siteUrl, await loadMinOrder(deps), deps.env.verification)), status: 200 }
      case 'privacy':
        return { head: privacyHead(siteUrl), status: 200 }
      case 'howToBuy': {
        const settings = await loadSettings(deps)
        const faq = fillFaq(faqOrDefault(settings.faq), settings)
        return { head: howToBuyHead(siteUrl, faq, settings.minOrderCents), status: 200 }
      }
      case 'private':
        return { head: privateHead(siteUrl), status: 200 }
      case 'notFound':
        return { head: notFoundHead(siteUrl), status: 404 }
      case 'category': {
        if (route.slug === 'novidades') {
          const { cover } = await listCover(deps, null)
          return { head: searchable(categoryHead(siteUrl, 'novidades', undefined, false, cover)), status: 200 }
        }
        const [category, minOrder] = await Promise.all([loadCategory(deps, route.slug), loadMinOrder(deps)])
        const { empty, cover } = await listCover(deps, category.id)
        return { head: searchable(categoryHead(siteUrl, category, minOrder, empty, cover)), status: 200 }
      }
      case 'product': {
        const [product, settings] = await Promise.all([loadProduct(deps, route.slug), loadSettings(deps)])
        const priced = withWholesalePrice(product, settings.wholesaleDiscountPct)
        return { head: productHead(siteUrl, priced, settings.minOrderCents), status: 200 }
      }
    }
  } catch (error) {
    if (error instanceof NotFoundError) return { head: notFoundHead(siteUrl), status: 404 }
    throw error
  }
}

const PAGE_CACHE = 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400'
const SHORT_CACHE = 'public, max-age=0, s-maxage=60'

/** Endereço canônico do caminho pedido (sem barra no fim, catálogo em minúsculas), com a busca preservada. */
export function redirectFor(requestUrl: URL): string | null {
  const path = requestUrl.searchParams.get('__p') || requestUrl.pathname
  const target = canonicalPath(path)
  if (!target) return null
  const query = new URLSearchParams(requestUrl.search)
  query.delete('__p')
  const qs = query.toString()
  return `${target}${qs ? `?${qs}` : ''}`
}

/**
 * Devolve o index.html da loja com o bloco de SEO certo para a rota pedida.
 * Se o Supabase falhar, entrega o index.html como está: a loja nunca cai por causa do SEO.
 */
export async function handlePageRequest(request: Request, deps: SeoDeps): Promise<Response> {
  const url = new URL(request.url)

  // Um endereço por página: /produto/x/ e /Produto/X viram /produto/x (301)
  const location = redirectFor(url)
  if (location) return new Response(null, { status: 301, headers: { location, 'cache-control': 'public, max-age=3600' } })

  const route = resolveRoute(url.searchParams.get('__p') || url.pathname)

  const templateResponse = await deps.fetch(new URL('/index.html', url.origin).toString())
  if (!templateResponse.ok) return new Response('Não foi possível carregar a página.', { status: 502 })
  const template = await templateResponse.text()

  let result: { head: HeadData; status: number } | null
  try {
    result = await headFor(route, url.searchParams.has('busca'), deps)
  } catch {
    result = null
  }

  const status = result?.status ?? 200
  const headers: Record<string, string> = {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': status === 200 ? PAGE_CACHE : SHORT_CACHE,
  }
  if (result?.head.robots.startsWith('noindex')) headers['x-robots-tag'] = 'noindex'
  const html = result ? injectHead(template, renderHead(result.head)) : template
  return new Response(html, { status, headers })
}

interface SitemapProductRow {
  slug: string
  category_id: string
  updated_at: string
  product_images: ImageRow[] | null
}

export async function handleSitemapRequest(deps: SeoDeps): Promise<Response> {
  const headers = { 'content-type': 'application/xml; charset=utf-8' }
  try {
    const productSelect = 'slug,category_id,updated_at,product_images(*)'
    const [categories, products, settings] = await Promise.all([
      rest<SitemapCategory[]>(deps, 'categories?select=id,slug,updated_at&active=eq.true'),
      rest<SitemapProductRow[]>(
        deps,
        `products?select=${encodeURIComponent(productSelect)}&active=eq.true&order=updated_at.desc&limit=5000`,
      ),
      loadSettings(deps),
    ])
    const xml = buildSitemap(
      deps.env.siteUrl,
      categories,
      products.map((p) => {
        const cover = byOrder(p.product_images)[0]
        return {
          slug: p.slug,
          category_id: p.category_id,
          updated_at: p.updated_at,
          image: cover ? photoUrl(deps.env, cover.path_lg) : null,
        }
      }),
      { settingsUpdatedAt: settings.updatedAt },
    )
    return new Response(xml, {
      headers: { ...headers, 'cache-control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400' },
    })
  } catch {
    return new Response(buildSitemap(deps.env.siteUrl, [], []), {
      headers: { ...headers, 'cache-control': 'public, max-age=0, s-maxage=300' },
    })
  }
}

export function handleRobotsRequest(deps: Pick<SeoDeps, 'env'>): Response {
  return new Response(buildRobots(deps.env.siteUrl), {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=0, s-maxage=86400' },
  })
}

interface FeedRow extends Omit<FeedProduct, 'images' | 'shareImage' | 'category' | 'wholesale_price_cents'> {
  categories: { name: string; slug: string } | null
  product_images: ImageRow[] | null
}

/**
 * /catalogo.xml: as peças ativas para o Gerenciador de Commerce da Meta (e o Merchant Center, se um dia usar).
 * Se o Supabase falhar, responde 503 e a Meta tenta de novo: um catálogo vazio apagaria os produtos de lá (e,
 * sem o desconto de Config, os preços sairiam errados).
 */
export async function handleFeedRequest(deps: SeoDeps): Promise<Response> {
  try {
    const select = `${PRODUCT_FIELDS},categories(name,slug),product_images(*)`
    const timeoutMs = deps.timeoutMs ?? 10_000
    const [rows, settings] = await Promise.all([
      rest<FeedRow[]>(
        deps,
        `products?select=${encodeURIComponent(select)}&active=eq.true&order=updated_at.desc&limit=5000`,
        timeoutMs,
      ),
      readSettings(deps, timeoutMs),
    ])
    const products: FeedProduct[] = rows.map(({ categories, product_images, ...fields }) =>
      withWholesalePrice(
        { ...fields, ...photosOf(deps.env, product_images), category: categories },
        settings.wholesaleDiscountPct,
      ),
    )
    return new Response(buildFeed(deps.env.siteUrl, products), {
      headers: {
        'content-type': 'application/xml; charset=utf-8',
        'cache-control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
        'x-robots-tag': 'noindex',
      },
    })
  } catch {
    return new Response('Catálogo indisponível no momento. Tente de novo em alguns minutos.', {
      status: 503,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'retry-after': '600', 'cache-control': 'no-store' },
    })
  }
}

/** Consulta leve que impede o projeto Free do Supabase de pausar por falta de uso. */
export async function pingSupabase(deps: SeoDeps): Promise<string> {
  try {
    await rest<unknown[]>(deps, 'settings?select=id&limit=1')
    return 'supabase ok'
  } catch (error) {
    return `supabase falhou: ${error instanceof Error ? error.message : String(error)}`
  }
}
