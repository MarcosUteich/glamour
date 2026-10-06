import { describe, expect, it } from 'vitest'
import { BUSINESS } from './business'
import { buildFeed, googleCategory } from './feed'
import {
  handleFeedRequest,
  handlePageRequest,
  handleRobotsRequest,
  handleSitemapRequest,
  readSeoEnv,
  redirectFor,
  type SeoEnv,
} from './handler'
import { DEFAULT_FAQ, faqOrDefault, fillFaq, parseFaq } from './faq'
import { homeHead, readVerification, renderHead, verificationToken } from './head'
import { escapeHtml, injectHead, jsonLdScript, truncate } from './html'
import { canonicalPath, resolveRoute } from './routes'
import { buildSitemap } from './sitemap'
import { titles } from './titles'
import { normalizeSiteUrl, publicPhotoUrl } from './url'

const env: SeoEnv = { siteUrl: 'https://glamour.test', supabaseUrl: 'https://db.test', supabaseAnonKey: 'anon' }

const TEMPLATE = [
  '<!doctype html><html lang="pt-BR"><head>',
  '    <!-- seo:start -->',
  '    <title>Glamour Lindóia Atacado</title>',
  '    <!-- seo:end -->',
  '  </head><body><div id="root"></div></body></html>',
].join('\n')

type Reply = unknown

/** fetch falso: serve o index.html e responde o Supabase pelo trecho da URL (a primeira chave que casar). */
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

const WITH_SHARE = {
  ...PRODUCT_ROW,
  stock: null,
  product_images: [
    { path_lg: 'p1/b2-lg.webp', path_share: 'p1/b2-share.jpg', sort_order: 1 },
    { path_lg: 'p1/b1-lg.webp', path_share: 'p1/b1-share.jpg', sort_order: 0 },
  ],
}

describe('endereço do site', () => {
  it.each([
    ['glamourlindoia.com.br', 'https://glamourlindoia.com.br'],
    ['https://glamourlindoia.com.br/', 'https://glamourlindoia.com.br'],
    ['  HTTP://Glamourlindoia.com.br/loja  ', 'https://glamourlindoia.com.br'],
    ['http://localhost:5173', 'http://localhost:5173'],
    ['', 'https://glamourlindoia.com.br'],
    [undefined, 'https://glamourlindoia.com.br'],
  ])('%s → %s', (raw, expected) => {
    expect(normalizeSiteUrl(raw)).toBe(expected)
  })

  it('lê as variáveis da hospedagem já normalizadas', () => {
    const read = readSeoEnv({
      VITE_SITE_URL: 'glamourlindoia.com.br',
      VITE_SUPABASE_URL: 'https://db.test/',
      VITE_SUPABASE_ANON_KEY: ' anon ',
      VITE_GOOGLE_SITE_VERIFICATION: '<meta name="google-site-verification" content="abc123" />',
    })
    expect(read).toEqual({
      siteUrl: 'https://glamourlindoia.com.br',
      supabaseUrl: 'https://db.test',
      supabaseAnonKey: 'anon',
      verification: { google: 'abc123', meta: undefined },
    })
  })
})

describe('verificação de domínio', () => {
  it('aceita o código ou a tag inteira', () => {
    expect(verificationToken('xyz')).toBe('xyz')
    expect(verificationToken(`<meta name='facebook-domain-verification' content='fb42' />`)).toBe('fb42')
    expect(verificationToken('   ')).toBeUndefined()
    expect(readVerification({})).toBeUndefined()
  })

  it('entra só na home, com as duas tags', () => {
    const html = renderHead(homeHead(env.siteUrl, 49900, { google: 'g-code', meta: 'fb-code' }))
    expect(html).toContain('<meta name="google-site-verification" content="g-code" />')
    expect(html).toContain('<meta name="facebook-domain-verification" content="fb-code" />')
    expect(renderHead(homeHead(env.siteUrl))).not.toContain('verification')
  })
})

describe('resolveRoute e endereço canônico', () => {
  it.each([
    ['/', 'home'],
    ['/categoria/brincos', 'category'],
    ['/produto/brinco-argola-lisa-br-101/', 'product'],
    ['/privacidade', 'privacy'],
    ['/como-comprar', 'howToBuy'],
    ['/pedido', 'private'],
    ['/pedido/confirmado/GLM-20260910-001', 'private'],
    ['/meus-pedidos', 'private'],
    ['/admin/produtos', 'private'],
    ['/xyz', 'notFound'],
    ['/produto/Nome Errado', 'notFound'],
  ])('%s → %s', (path, kind) => {
    expect(resolveRoute(path).kind).toBe(kind)
  })

  it.each([
    ['/', null],
    ['/categoria/brincos', null],
    ['/produto/abc/', '/produto/abc'],
    ['/Produto/ABC-10', '/produto/abc-10'],
    ['//categoria//brincos/', '/categoria/brincos'],
    ['/index.html', '/'],
    ['/pedido/confirmado/GLM-20260910-001', null],
  ])('%s → %s', (path, expected) => {
    expect(canonicalPath(path)).toBe(expected)
  })

  it('redireciona mantendo a busca e as UTMs, sem o __p interno da Vercel', () => {
    expect(redirectFor(new URL('https://glamour.test/api/page?__p=%2Fproduto%2Fabc%2F&utm_source=instagram'))).toBe(
      '/produto/abc?utm_source=instagram',
    )
    expect(redirectFor(new URL('https://glamour.test/produto/abc'))).toBeNull()
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
  it('tem canonical, os dados da loja física, horário, mapa e perfis oficiais', () => {
    const html = renderHead(homeHead(env.siteUrl))
    expect(html).toContain('<title>Semijoias no atacado em Porto Alegre | Glamour Lindóia</title>')
    expect(html).toContain('<link rel="canonical" href="https://glamour.test/" />')
    expect(html).toContain('<meta property="og:image" content="https://glamour.test/brand/og-image.png" />')
    expect(html).toContain('"@type":"JewelryStore"')
    expect(html).toContain(BUSINESS.address.postalCode)
    expect(html).toContain('Loja 160')
    expect(html).toContain('Lindóia Shopping')
    expect(html).toContain('"openingHoursSpecification"')
    expect(html).toContain('"@type":"GeoCoordinates"')
    expect(html).toContain(BUSINESS.mapsUrl)
    expect(html).toContain('https://www.instagram.com/glamour_lindoia/')
    expect(html).toContain('"@type":"WebSite"')
    expect(html).toContain('Pedido mínimo de R$ 499,00')
    expect(html).toContain('"logo":{"@type":"ImageObject","url":"https://glamour.test/brand/logo.png","width":512,"height":512}')
    expect(html).toContain('<meta name="twitter:image:alt"')
  })

  it('pela função, usa o pedido mínimo do painel', async () => {
    const { fetch } = fakeFetch({ '/rest/v1/settings': [{ min_order_cents: 45000 }] })
    const html = await (await handlePageRequest(request('/'), { env, fetch })).text()
    expect(html).toContain('Pedido mínimo de R$ 450,00')
  })
})

describe('página de produto', () => {
  it('traz título, Open Graph e Product com preço, estoque e pedido mínimo', async () => {
    const { fetch } = fakeFetch({ '/rest/v1/products': [PRODUCT_ROW], '/rest/v1/settings': [{ min_order_cents: 49000 }] })
    const res = await handlePageRequest(request('/produto/brinco-argola-lisa-br-101'), { env, fetch })
    const html = await res.text()

    expect(res.status).toBe(200)
    expect(html).toContain('<title>Brinco argola lisa BR-101 · R$ 24,90 no atacado | Glamour Lindóia</title>')
    expect(html).toContain('<link rel="canonical" href="https://glamour.test/produto/brinco-argola-lisa-br-101" />')
    expect(html).toContain('<meta property="og:type" content="product" />')
    expect(html).toContain(
      '<meta property="og:image" content="https://db.test/storage/v1/object/public/product-images/p1/brinco-lg.webp" />',
    )
    expect(html).toContain('"price":"24.90"')
    expect(html).toContain('OutOfStock')
    expect(html).toContain('"minPrice":"799.90"')
    expect(html).toContain('"@type":"BreadcrumbList"')
    expect(html).not.toContain('<title>Glamour Lindóia Atacado</title>')
    expect(html).toContain('<!-- seo:end -->')
  })

  it('na prévia de link usa o JPEG quadrado da capa quando existe', async () => {
    const { fetch } = fakeFetch({ '/rest/v1/products': [WITH_SHARE] })
    const html = await (await handlePageRequest(request('/produto/brinco-argola-lisa-br-101'), { env, fetch })).text()
    expect(html).toContain(
      '<meta property="og:image" content="https://db.test/storage/v1/object/public/product-images/p1/b1-share.jpg" />',
    )
    expect(html).toContain('<meta property="og:image:type" content="image/jpeg" />')
    expect(html).toContain('<meta property="og:image:width" content="1080" />')
    expect(html).toContain('InStock')
    // Tags de produto da Meta, com o mesmo código do catálogo e do Pixel
    expect(html).toContain('<meta property="product:retailer_item_id" content="BR-101" />')
    expect(html).toContain('<meta property="product:availability" content="in stock" />')
    expect(html).toContain('<meta property="product:condition" content="new" />')
    // A foto grande que a página mostra primeiro começa a baixar antes do JavaScript
    expect(html).toContain(
      '<link rel="preload" as="image" href="https://db.test/storage/v1/object/public/product-images/p1/b1-lg.webp" fetchpriority="high" />',
    )
  })

  it('sem desconto de atacado, um preço só', async () => {
    const { fetch } = fakeFetch({ '/rest/v1/products': [PRODUCT_ROW], '/rest/v1/settings': [{ wholesale_discount_pct: 0 }] })
    const html = await (await handlePageRequest(request('/produto/brinco-argola-lisa-br-101'), { env, fetch })).text()
    expect(html).toContain('<meta property="product:price:amount" content="24.90" />')
    expect(html).not.toContain('sale_price')
    expect(html).not.toContain('StrikethroughPrice')
  })

  it('com desconto de atacado, cobra o de atacado e mostra o original riscado', async () => {
    const { fetch } = fakeFetch({
      '/rest/v1/products': [PRODUCT_ROW],
      '/rest/v1/settings': [{ min_order_cents: 49000, wholesale_discount_pct: 30 }],
    })
    const html = await (await handlePageRequest(request('/produto/brinco-argola-lisa-br-101'), { env, fetch })).text()
    // 24,90 com 30% = 17,43
    expect(html).toContain('<title>Brinco argola lisa BR-101 · R$ 17,43 no atacado | Glamour Lindóia</title>')
    expect(html).toContain('por R$ 17,43 no atacado')
    expect(html).toContain('"price":"17.43"')
    expect(html).toContain(
      '"priceSpecification":{"@type":"UnitPriceSpecification","priceType":"https://schema.org/StrikethroughPrice","price":"24.90","priceCurrency":"BRL"}',
    )
    // Meta: igual ao catalogo.xml (original em price, atacado em sale_price)
    expect(html).toContain('<meta property="product:price:amount" content="24.90" />')
    expect(html).toContain('<meta property="product:sale_price:amount" content="17.43" />')
    expect(html).toContain('<meta property="product:sale_price:currency" content="BRL" />')
  })

  it('peça sem estoque sai como "out of stock" para a Meta', async () => {
    const { fetch } = fakeFetch({ '/rest/v1/products': [PRODUCT_ROW] })
    const html = await (await handlePageRequest(request('/produto/brinco-argola-lisa-br-101'), { env, fetch })).text()
    expect(html).toContain('<meta property="product:availability" content="out of stock" />')
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

  it('barra no fim e maiúsculas redirecionam (301) para o endereço certo', async () => {
    const { fetch, calls } = fakeFetch()
    const slash = await handlePageRequest(request('/produto/brinco-argola-lisa-br-101/', '&utm_source=whatsapp'), { env, fetch })
    expect(slash.status).toBe(301)
    expect(slash.headers.get('location')).toBe('/produto/brinco-argola-lisa-br-101?utm_source=whatsapp')
    const upper = await handlePageRequest(request('/Categoria/Brincos'), { env, fetch })
    expect(upper.headers.get('location')).toBe('/categoria/brincos')
    expect(calls).toHaveLength(0)
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
    const category = { id: 'c1', name: 'Brincos', slug: 'brincos', description: 'Argolas e pontos de luz para revender.' }
    const { fetch } = fakeFetch({ '/rest/v1/categories': [category], '/rest/v1/products': [{ id: 'p1' }] })

    const normal = await (await handlePageRequest(request('/categoria/brincos'), { env, fetch })).text()
    expect(normal).toContain(`<title>${titles.category('Brincos')}</title>`)
    expect(normal).toContain('content="Argolas e pontos de luz para revender."')
    expect(normal).toContain('index, follow')

    const search = await (await handlePageRequest(request('/categoria/brincos', '&busca=argola'), { env, fetch })).text()
    expect(search).toContain('noindex, follow')
    expect(search).toContain('<link rel="canonical" href="https://glamour.test/categoria/brincos" />')
  })

  it('categoria usa na prévia de link a foto da peça mais nova que tem o JPEG quadrado', async () => {
    const category = { id: 'c1', name: 'Brincos', slug: 'brincos', description: null }
    const newest = { name: 'Brinco sem JPEG', product_images: [{ path_lg: 'p2/x-lg.webp', sort_order: 0 }] }
    const { fetch, calls } = fakeFetch({ '/rest/v1/categories': [category], '/rest/v1/products': [newest, WITH_SHARE] })
    const html = await (await handlePageRequest(request('/categoria/brincos'), { env, fetch })).text()
    expect(html).toContain(
      '<meta property="og:image" content="https://db.test/storage/v1/object/public/product-images/p1/b1-share.jpg" />',
    )
    expect(html).toContain('<meta property="og:image:alt" content="Brinco argola lisa" />')
    expect(calls.some((c) => c.includes('category_id=eq.c1') && c.includes('order=created_at.desc'))).toBe(true)
  })

  it('novidades usa a foto da peça mais nova do catálogo; sem foto, a arte da loja', async () => {
    const { fetch } = fakeFetch({ '/rest/v1/products': [WITH_SHARE] })
    const html = await (await handlePageRequest(request('/categoria/novidades'), { env, fetch })).text()
    expect(html).toContain('p1/b1-share.jpg')
    const empty = fakeFetch({ '/rest/v1/products': [] })
    const plain = await (await handlePageRequest(request('/categoria/novidades'), { env, fetch: empty.fetch })).text()
    expect(plain).toContain('<meta property="og:image" content="https://glamour.test/brand/og-image.png" />')
  })

  it('categoria sem peças fica fora do Google até ter peças', async () => {
    const category = { id: 'c9', name: 'Tornozeleiras', slug: 'tornozeleiras', description: null }
    const { fetch } = fakeFetch({ '/rest/v1/categories': [category], '/rest/v1/products': [] })
    const res = await handlePageRequest(request('/categoria/tornozeleiras'), { env, fetch })
    expect(res.status).toBe(200)
    expect(res.headers.get('x-robots-tag')).toBe('noindex')
  })

  it('rota desconhecida responde 404', async () => {
    const { fetch } = fakeFetch()
    expect((await handlePageRequest(request('/qualquer-coisa'), { env, fetch })).status).toBe(404)
  })
})

describe('como comprar e perguntas frequentes', () => {
  const settings = {
    min_order_cents: 49900,
    pickup_text: 'Glamour Lindóia · Lindóia Shopping · Loja 160 (térreo) · Porto Alegre/RS.',
    hours_text: 'Segunda a sábado, das 10h às 21h',
    whatsapp_number: '5551992275944',
    updated_at: '2026-09-25T12:00:00Z',
  }

  it('sem perguntas salvas usa as padrão, com os valores atuais da loja', async () => {
    const { fetch } = fakeFetch({ '/rest/v1/settings': [{ ...settings, faq: null }] })
    const res = await handlePageRequest(request('/como-comprar'), { env, fetch })
    const html = await res.text()
    expect(res.status).toBe(200)
    expect(html).toContain(`<title>${titles.howToBuy()}</title>`)
    expect(html).toContain('<link rel="canonical" href="https://glamour.test/como-comprar" />')
    expect(html).toContain('"@type":"FAQPage"')
    expect(html).toContain('O pedido mínimo é de R$ 499,00')
    expect(html).toContain('(51) 99227-5944')
    expect(html).toContain('Na loja: Glamour Lindóia · Lindóia Shopping · Loja 160 (térreo) · Porto Alegre/RS. Horário: Segunda')
    expect(html).not.toContain('{pedido_minimo}')
    expect(html).toContain('"@type":"BreadcrumbList"')
  })

  it('usa as perguntas salvas no painel', async () => {
    const faq = [{ question: 'Aceitam Pix?', answer: 'Sim, e o mínimo é {pedido_minimo}.' }]
    const { fetch } = fakeFetch({ '/rest/v1/settings': [{ ...settings, min_order_cents: 50000, faq }] })
    const html = await (await handlePageRequest(request('/como-comprar'), { env, fetch })).text()
    expect(html).toContain('"name":"Aceitam Pix?"')
    expect(html).toContain('Sim, e o mínimo é R$ 500,00.')
    expect(html).not.toContain('Qual é o pedido mínimo?')
  })

  it('sem perguntas (a loja tirou todas) a página segue no Google, sem FAQPage', async () => {
    const { fetch } = fakeFetch({ '/rest/v1/settings': [{ ...settings, faq: [] }] })
    const html = await (await handlePageRequest(request('/como-comprar'), { env, fetch })).text()
    expect(html).toContain('index, follow')
    expect(html).not.toContain('FAQPage')
  })

  it('se o banco falhar, usa as perguntas padrão e os dados fixos da loja', async () => {
    const { fetch } = fakeFetch({ '/rest/v1/settings': () => new Response('erro', { status: 500 }) })
    const html = await (await handlePageRequest(request('/como-comprar'), { env, fetch })).text()
    expect(html).toContain('"@type":"FAQPage"')
    expect(html).toContain('R$ 499,00')
  })

  it('lê o valor do banco com cuidado', () => {
    expect(parseFaq(null)).toBeNull()
    expect(parseFaq('texto')).toBeNull()
    expect(parseFaq([])).toEqual([])
    expect(parseFaq([{ question: ' Oi? ', answer: ' Olá ' }, { question: 'Sem resposta' }, 3])).toEqual([
      { question: 'Oi?', answer: 'Olá' },
    ])
    expect(parseFaq([{ foo: 1 }])).toBeNull()
    expect(parseFaq(Array.from({ length: 40 }, (_, i) => ({ question: `P${i}`, answer: 'R' })))).toHaveLength(30)
    expect(faqOrDefault(undefined)).toBe(DEFAULT_FAQ)
  })

  it('troca os marcadores e aguenta horário vazio', () => {
    const [item] = fillFaq([{ question: 'Onde e quando?', answer: '{retirada}. {horario}. {whatsapp}. {outro}' }], {
      minOrderCents: 49900,
      pickupText: 'Loja 160.',
      hoursText: null,
      whatsappNumber: '5551992275944',
    })
    expect(item.answer).toBe('Loja 160. confirme pelo WhatsApp. (51) 99227-5944. {outro}')
  })

  it('entra no sitemap com a data da última mudança em Config', () => {
    const xml = buildSitemap(env.siteUrl, [], [], { settingsUpdatedAt: '2026-09-25T12:00:00Z' })
    expect(xml).toContain('<loc>https://glamour.test/como-comprar</loc>\n    <lastmod>2026-09-25T12:00:00.000Z</lastmod>')
  })
})

describe('fotos', () => {
  it('monta o endereço público igual no site e no servidor', () => {
    expect(publicPhotoUrl('https://db.test/', 'p1/brinco lindo-lg.webp')).toBe(
      'https://db.test/storage/v1/object/public/product-images/p1/brinco%20lindo-lg.webp',
    )
    expect(publicPhotoUrl('https://db.test', 'https://cdn.test/x.jpg')).toBe('https://cdn.test/x.jpg')
    expect(publicPhotoUrl(undefined, 'p1/x.webp')).toBe('p1/x.webp')
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

describe('catálogo para a Meta (catalogo.xml)', () => {
  it('traz os campos que a Meta exige, com o código da peça como id', async () => {
    const { fetch } = fakeFetch({ '/rest/v1/products': [WITH_SHARE, PRODUCT_ROW, { ...PRODUCT_ROW, code: 'SEM-FOTO', product_images: [] }] })
    const res = await handleFeedRequest({ env, fetch })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('xml')
    const xml = await res.text()
    expect(xml).toContain('xmlns:g="http://base.google.com/ns/1.0"')
    expect(xml).toContain('<g:id>BR-101</g:id>')
    expect(xml).toContain('<g:price>24.90 BRL</g:price>')
    expect(xml).toContain('<g:availability>in stock</g:availability>')
    expect(xml).toContain('<g:availability>out of stock</g:availability>')
    expect(xml).toContain('<g:image_link>https://db.test/storage/v1/object/public/product-images/p1/b1-share.jpg</g:image_link>')
    expect(xml).toContain('<g:link>https://glamour.test/produto/brinco-argola-lisa-br-101</g:link>')
    expect(xml).toContain(`<g:brand>${BUSINESS.name}</g:brand>`)
    expect(xml).toContain('<g:google_product_category>Apparel &amp; Accessories &gt; Jewelry</g:google_product_category>')
    expect(xml).not.toContain('SEM-FOTO')
  })

  it('com desconto de atacado, manda o original em price e o de atacado em sale_price', async () => {
    const { fetch } = fakeFetch({ '/rest/v1/products': [WITH_SHARE], '/rest/v1/settings': [{ wholesale_discount_pct: 30 }] })
    const xml = await (await handleFeedRequest({ env, fetch })).text()
    expect(xml).toContain('<g:price>24.90 BRL</g:price>')
    expect(xml).toContain('<g:sale_price>17.43 BRL</g:sale_price>')
  })

  it('sem desconto, sem sale_price', async () => {
    const { fetch } = fakeFetch({ '/rest/v1/products': [WITH_SHARE], '/rest/v1/settings': [{ wholesale_discount_pct: 0 }] })
    expect(await (await handleFeedRequest({ env, fetch })).text()).not.toContain('sale_price')
  })

  it('sem conseguir ler o desconto responde 503 (preço errado não vai para a Meta)', async () => {
    const { fetch } = fakeFetch({
      '/rest/v1/products': [WITH_SHARE],
      '/rest/v1/settings': () => new Response('erro', { status: 500 }),
    })
    expect((await handleFeedRequest({ env, fetch })).status).toBe(503)
  })

  it('se o banco falhar responde 503, nunca um catálogo vazio', async () => {
    const { fetch } = fakeFetch({ '/rest/v1/products': () => new Response('erro', { status: 500 }) })
    const res = await handleFeedRequest({ env, fetch })
    expect(res.status).toBe(503)
  })

  it('maquiagem vai para a categoria de maquiagem do Google', () => {
    expect(googleCategory('maquiagem')).toContain('Makeup')
    expect(googleCategory('brincos')).toBe('Apparel & Accessories > Jewelry')
    expect(buildFeed(env.siteUrl, [])).toContain('<channel>')
  })
})
