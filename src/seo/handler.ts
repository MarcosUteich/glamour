// Lógica das funções da Vercel (api/page.ts, api/sitemap.ts, api/robots.ts), separada para
// poder ser testada com Vitest. Recebe fetch e variáveis por parâmetro; lê o Supabase pela
// API REST com a anon key (só dados públicos, sob o mesmo RLS da loja).
import { BUSINESS } from './business'
import {
  categoryHead,
  homeHead,
  notFoundHead,
  privacyHead,
  privateHead,
  productHead,
  renderHead,
  withSearch,
  type HeadData,
  type SeoCategory,
  type SeoProduct,
} from './head'
import { injectHead } from './html'
import { resolveRoute, type SeoRoute } from './routes'
import { buildRobots, buildSitemap, type SitemapCategory } from './sitemap'

export interface SeoEnv {
  siteUrl: string
  supabaseUrl?: string
  supabaseAnonKey?: string
}

export interface SeoDeps {
  env: SeoEnv
  fetch: typeof fetch
  timeoutMs?: number
}

export function readSeoEnv(source: Record<string, string | undefined>): SeoEnv {
  return {
    siteUrl: (source.VITE_SITE_URL || 'https://glamouratacado.com.br').replace(/\/$/, ''),
    supabaseUrl: source.VITE_SUPABASE_URL?.replace(/\/$/, ''),
    supabaseAnonKey: source.VITE_SUPABASE_ANON_KEY,
  }
}

class NotFoundError extends Error {}

async function rest<T>(deps: SeoDeps, query: string): Promise<T> {
  const { supabaseUrl, supabaseAnonKey } = deps.env
  if (!supabaseUrl || !supabaseAnonKey) throw new Error('Supabase não configurado')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), deps.timeoutMs ?? 2500)
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

function photoUrl(env: SeoEnv, path: string): string {
  const encoded = path.split('/').map(encodeURIComponent).join('/')
  return `${env.supabaseUrl}/storage/v1/object/public/product-images/${encoded}`
}

const firstImage = (images: Array<{ path_lg: string; sort_order: number }> | null) =>
  [...(images ?? [])].sort((a, b) => a.sort_order - b.sort_order)

interface ProductRow extends Omit<SeoProduct, 'images' | 'category'> {
  categories: { name: string; slug: string } | null
  product_images: Array<{ path_lg: string; sort_order: number }> | null
}

async function loadProduct(deps: SeoDeps, slug: string): Promise<SeoProduct> {
  const select =
    'name,slug,code,description,material,plating,size,shade,price_cents,stock,categories(name,slug),product_images(path_lg,sort_order)'
  const rows = await rest<ProductRow[]>(
    deps,
    `products?select=${encodeURIComponent(select)}&slug=eq.${encodeURIComponent(slug)}&active=eq.true&limit=1`,
  )
  const row = rows[0]
  if (!row) throw new NotFoundError()
  const { categories, product_images, ...fields } = row
  return {
    ...fields,
    images: firstImage(product_images).map((img) => photoUrl(deps.env, img.path_lg)),
    category: categories,
  }
}

async function loadCategory(deps: SeoDeps, slug: string): Promise<SeoCategory> {
  // select=* para funcionar antes e depois da migration 0006 (coluna description)
  const rows = await rest<Array<{ name: string; slug: string; description?: string | null }>>(
    deps,
    `categories?select=*&slug=eq.${encodeURIComponent(slug)}&active=eq.true&limit=1`,
  )
  const row = rows[0]
  if (!row) throw new NotFoundError()
  return { name: row.name, slug: row.slug, description: row.description ?? null }
}

async function loadMinOrder(deps: SeoDeps): Promise<number> {
  try {
    const rows = await rest<Array<{ min_order_cents: number }>>(deps, 'settings?select=min_order_cents&id=eq.1')
    return rows[0]?.min_order_cents ?? BUSINESS.minOrderCents
  } catch {
    return BUSINESS.minOrderCents
  }
}

async function headFor(route: SeoRoute, hasSearch: boolean, deps: SeoDeps): Promise<{ head: HeadData; status: number }> {
  const { siteUrl } = deps.env
  const searchable = (head: HeadData) => (hasSearch ? withSearch(head) : head)
  try {
    switch (route.kind) {
      case 'home':
        return { head: searchable(homeHead(siteUrl)), status: 200 }
      case 'privacy':
        return { head: privacyHead(siteUrl), status: 200 }
      case 'private':
        return { head: privateHead(siteUrl), status: 200 }
      case 'notFound':
        return { head: notFoundHead(siteUrl), status: 404 }
      case 'category': {
        if (route.slug === 'novidades') return { head: searchable(categoryHead(siteUrl, 'novidades')), status: 200 }
        const [category, minOrder] = await Promise.all([loadCategory(deps, route.slug), loadMinOrder(deps)])
        return { head: searchable(categoryHead(siteUrl, category, minOrder)), status: 200 }
      }
      case 'product': {
        const [product, minOrder] = await Promise.all([loadProduct(deps, route.slug), loadMinOrder(deps)])
        return { head: productHead(siteUrl, product, minOrder), status: 200 }
      }
    }
  } catch (error) {
    if (error instanceof NotFoundError) return { head: notFoundHead(siteUrl), status: 404 }
    throw error
  }
}

const PAGE_CACHE = 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400'
const SHORT_CACHE = 'public, max-age=0, s-maxage=60'

/**
 * Devolve o index.html da loja com o bloco de SEO certo para a rota pedida.
 * Se o Supabase falhar, entrega o index.html como está: a loja nunca cai por causa do SEO.
 */
export async function handlePageRequest(request: Request, deps: SeoDeps): Promise<Response> {
  const url = new URL(request.url)
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
  product_images: Array<{ path_lg: string; sort_order: number }> | null
}

export async function handleSitemapRequest(deps: SeoDeps): Promise<Response> {
  const headers = { 'content-type': 'application/xml; charset=utf-8' }
  try {
    const productSelect = 'slug,category_id,updated_at,product_images(path_lg,sort_order)'
    const [categories, products] = await Promise.all([
      rest<SitemapCategory[]>(deps, 'categories?select=id,slug,updated_at&active=eq.true'),
      rest<SitemapProductRow[]>(
        deps,
        `products?select=${encodeURIComponent(productSelect)}&active=eq.true&order=updated_at.desc&limit=5000`,
      ),
    ])
    const xml = buildSitemap(
      deps.env.siteUrl,
      categories,
      products.map((p) => {
        const cover = firstImage(p.product_images)[0]
        return {
          slug: p.slug,
          category_id: p.category_id,
          updated_at: p.updated_at,
          image: cover ? photoUrl(deps.env, cover.path_lg) : null,
        }
      }),
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
