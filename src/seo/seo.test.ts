import { describe, expect, it } from 'vitest'
import { BUSINESS } from './business'
import { handlePageRequest, handleRobotsRequest, handleSitemapRequest, type SeoEnv } from './handler'
import { homeHead, renderHead } from './head'
import { escapeHtml, injectHead, jsonLdScript, truncate } from './html'
import { resolveRoute } from './routes'
import { buildSitemap } from './sitemap'

const env: SeoEnv = { siteUrl: 'https://glamour.test', supabaseUrl: 'https://db.test', supabaseAnonKey: 'anon' }

const TEMPLATE = [
  '<!doctype html><html lang="pt-BR"><head>',
  '    <!-- seo:start -->',
  '    <title>Glamour Atacado</title>',
  '    <!-- seo:end -->',
  '  </head><body><div id="root"></div></body></html>',
].join('\n')

type Reply = unknown

/** fetch falso: serve o index.html e responde o Supabase pelo trecho da URL. */
function fakeFetch(replies: Record<string, Reply | (() => Response)> = {}) {
  const calls: string[] = []
  const fn = async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    calls.push(url)
    if (url.endsWith('/index.html')) return new Response(TEMPLATE)
    const key = Object.keys(replies).find((k) => url.includes(k))
    if (!key) return new Response('[]')
    const reply = replies[key]
    return typeof reply === 'function' ? (reply as () => Response)() : new Response(JSON.stringify(reply))
  }
  return { fetch: fn as unknown as typeof fetch, calls }
}

const request = (path: string, query = '') =>
  new Request(`https://glamour.test/api/page?__p=${encodeURIComponent(path)}${query}`)

const PRODUCT_ROW = {
  name: 'Brinco argola lisa',
  slug: 'brinco-argola-lisa-br-101',
  code: 'BR-101',
  description: null,
  material: 'Latão',
  plating: 'Ouro 18k',
  size: '2,5 cm',
  shade: null,
  price_cents: 2490,
  stock: 0,
  categories: { name: 'Brincos', slug: 'brincos' },
  product_images: [{ path_lg: 'p1/brinco-lg.webp', sort_order: 0 }],
}

describe('resolveRoute', () => {
  it.each([
    ['/', 'home'],
    ['/categoria/brincos', 'category'],
    ['/produto/brinco-argola-lisa-br-101/', 'product'],
    ['/privacidade', 'privacy'],
    ['/pedido', 'private'],
    ['/pedido/confirmado/GLM-20260910-001', 'private'],
    ['/meus-pedidos', 'private'],
    ['/admin/produtos', 'private'],
    ['/xyz', 'notFound'],
    ['/produto/Nome Errado', 'notFound'],
  ])('%s → %s', (path, kind) => {
    expect(resolveRoute(path).kind).toBe(kind)
  })
})

describe('html', () => {
  it('escapa texto e não deixa JSON-LD fechar a tag <script>', () => {
    expect(escapeHtml(`<b>"x" & 'y'</b>`)).toBe('&lt;b&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/b&gt;')
    const script = jsonLdScript({ name: '</script><script>alert(1)</script>' })
    expect(script.match(/<\/script>/g)).toHaveLength(1)
  })

  it('corta descrição longa sem quebrar palavra', () => {
    const text = truncate('palavra '.repeat(40), 60)
    expect(text.length).toBeLessThanOrEqual(60)
    expect(text.endsWith('…')).toBe(true)
  })

  it('insere o bloco antes de </head> quando não há marcadores', () => {
    expect(injectHead('<html><head></head></html>', '<title>x</title>')).toContain('<!-- seo:start -->\n<title>x</title>')
  })
})

describe('home', () => {
  it('tem canonical e os dados da loja física', () => {
    const html = renderHead(homeHead(env.siteUrl))
    expect(html).toContain('<link rel="canonical" href="https://glamour.test/" />')
    expect(html).toContain('"@type":"JewelryStore"')
    expect(html).toContain(BUSINESS.address.postalCode)
    expect(html).toContain('Loja 160')
    expect(html).toContain('Lindóia Shopping')
    expect(html).not.toContain('openingHoursSpecification')
  })
})

describe('página de produto', () => {
  it('traz título, Open Graph e Product com preço, estoque e pedido mínimo', async () => {
    const { fetch } = fakeFetch({ '/rest/v1/products': [PRODUCT_ROW], '/rest/v1/settings': [{ min_order_cents: 49000 }] })
    const res = await handlePageRequest(request('/produto/brinco-argola-lisa-br-101'), { env, fetch })
    const html = await res.text()

    expect(res.status).toBe(200)
    expect(html).toContain('<title>Brinco argola lisa BR-101 · R$ 24,90 no atacado | Glamour</title>')
    expect(html).toContain('<link rel="canonical" href="https://glamour.test/produto/brinco-argola-lisa-br-101" />')
    expect(html).toContain('<meta property="og:type" content="product" />')
    expect(html).toContain('https://db.test/storage/v1/object/public/product-images/p1/brinco-lg.webp')
    expect(html).toContain('"price":"24.90"')
    expect(html).toContain('OutOfStock')
    expect(html).toContain('"minPrice":"490.00"')
    expect(html).toContain('"@type":"BreadcrumbList"')
    expect(html).not.toContain('<title>Glamour Atacado</title>')
    expect(html).toContain('<!-- seo:end -->')
  })

  it('peça inexistente ou inativa responde 404 e fica fora do Google', async () => {
    const { fetch } = fakeFetch({ '/rest/v1/products': [] })
    const res = await handlePageRequest(request('/produto/nao-existe'), { env, fetch })
    expect(res.status).toBe(404)
    expect(res.headers.get('x-robots-tag')).toBe('noindex')
    expect(await res.text()).toContain('noindex, follow')
  })

  it('se o Supabase falhar, entrega o index.html como está', async () => {
    const { fetch } = fakeFetch({ '/rest/v1/products': () => new Response('erro', { status: 500 }) })
    const res = await handlePageRequest(request('/produto/brinco-argola-lisa-br-101'), { env, fetch })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe(TEMPLATE)
  })
})

describe('outras rotas', () => {
  it('pedido fica fora do Google e não consulta o banco', async () => {
    const { fetch, calls } = fakeFetch()
    const res = await handlePageRequest(request('/pedido'), { env, fetch })
    expect(res.headers.get('x-robots-tag')).toBe('noindex')
    expect(await res.text()).toContain('noindex, follow')
    expect(calls.some((c) => c.includes('/rest/v1/'))).toBe(false)
  })

  it('categoria usa a descrição cadastrada; com busca fica noindex e canonical sem a busca', async () => {
    const category = { name: 'Brincos', slug: 'brincos', description: 'Argolas e pontos de luz para revender.' }
    const { fetch } = fakeFetch({ '/rest/v1/categories': [category] })

    const normal = await (await handlePageRequest(request('/categoria/brincos'), { env, fetch })).text()
    expect(normal).toContain('<title>Brincos no atacado | Glamour Atacado · Porto Alegre</title>')
    expect(normal).toContain('content="Argolas e pontos de luz para revender."')
    expect(normal).toContain('index, follow')

    const search = await (await handlePageRequest(request('/categoria/brincos', '&busca=argola'), { env, fetch })).text()
    expect(search).toContain('noindex, follow')
    expect(search).toContain('<link rel="canonical" href="https://glamour.test/categoria/brincos" />')
  })

  it('rota desconhecida responde 404', async () => {
    const { fetch } = fakeFetch()
    expect((await handlePageRequest(request('/qualquer-coisa'), { env, fetch })).status).toBe(404)
  })
})

describe('sitemap e robots', () => {
  it('lista só categorias com peças e cada peça com a foto', () => {
    const xml = buildSitemap(
      env.siteUrl,
      [
        { id: 'c1', slug: 'brincos', updated_at: '2026-09-01T10:00:00Z' },
        { id: 'c2', slug: 'vazia', updated_at: '2026-09-01T10:00:00Z' },
      ],
      [{ slug: 'brinco-a&b', category_id: 'c1', updated_at: '2026-09-10T10:00:00Z', image: 'https://db.test/x.webp' }],
    )
    expect(xml).toContain('<loc>https://glamour.test/categoria/brincos</loc>')
    expect(xml).not.toContain('/categoria/vazia')
    expect(xml).toContain('<loc>https://glamour.test/produto/brinco-a&amp;b</loc>')
    expect(xml).toContain('<image:loc>https://db.test/x.webp</image:loc>')
    expect(xml).toContain('<lastmod>2026-09-10T10:00:00.000Z</lastmod>')
  })

  it('sitemap vem do banco e o robots aponta para ele', async () => {
    const { fetch } = fakeFetch({
      '/rest/v1/categories': [{ id: 'c1', slug: 'brincos', updated_at: '2026-09-01T10:00:00Z' }],
      '/rest/v1/products': [
        {
          slug: 'brinco-argola-lisa-br-101',
          category_id: 'c1',
          updated_at: '2026-09-10T10:00:00Z',
          product_images: [{ path_lg: 'p1/b-lg.webp', sort_order: 0 }],
        },
      ],
    })
    const sitemap = await handleSitemapRequest({ env, fetch })
    expect(sitemap.headers.get('content-type')).toContain('xml')
    const xml = await sitemap.text()
    expect(xml).toContain('https://glamour.test/produto/brinco-argola-lisa-br-101')
    expect(xml).toContain('https://db.test/storage/v1/object/public/product-images/p1/b-lg.webp')

    const robots = await handleRobotsRequest({ env }).text()
    expect(robots).toContain('Sitemap: https://glamour.test/sitemap.xml')
    expect(robots).toContain('Disallow: /admin')
  })
})
