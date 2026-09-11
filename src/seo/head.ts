// Título, descrição, canonical, Open Graph e dados estruturados (JSON-LD) de cada página.
// Usado no build (home) e na função da Vercel (demais páginas). Sem dependências do app.
import { BUSINESS, type Business } from './business'
import { escapeHtml, jsonLdScript, truncate } from './html'

export interface HeadData {
  title: string
  description: string
  /** URL absoluta; páginas noindex ficam sem canonical */
  canonical: string | null
  robots: string
  ogType: 'website' | 'product'
  image: string
  imageAlt: string
  imageSize?: { width: number; height: number }
  priceCents?: number
  jsonLd: unknown[]
}

export interface SeoCategory {
  name: string
  slug: string
  description: string | null
}

export interface SeoProduct {
  name: string
  slug: string
  code: string
  description: string | null
  material: string | null
  plating: string | null
  size: string | null
  shade: string | null
  price_cents: number
  stock: number | null
  /** URLs absolutas, a capa primeiro */
  images: string[]
  category: { name: string; slug: string } | null
}

const INDEX = 'index, follow, max-image-preview:large'
const NOINDEX = 'noindex, follow'
const SITE_NAME = 'Glamour Atacado'
const PICKUP = 'retirada no Lindóia Shopping, em Porto Alegre'

/** "R$ 1.234,56" sem depender do ICU do ambiente (a função roda na borda da Vercel). */
function brl(cents: number): string {
  const [int, dec] = (cents / 100).toFixed(2).split('.')
  return `R$ ${int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${dec}`
}

const reais = (cents: number) => (cents / 100).toFixed(2)

function defaultImage(siteUrl: string) {
  return {
    image: `${siteUrl}/brand/og-image.png`,
    imageAlt: 'Glamour Atacado · semijoias, acessórios e maquiagem no atacado em Porto Alegre',
    imageSize: { width: 1200, height: 630 },
  }
}

export function localBusinessJsonLd(siteUrl: string, business: Business = BUSINESS) {
  const { address } = business
  return {
    '@context': 'https://schema.org',
    '@type': 'JewelryStore',
    '@id': `${siteUrl}/#loja`,
    name: business.name,
    alternateName: business.siteName,
    description:
      'Semijoias, acessórios e maquiagem no atacado para lojistas e revendedoras, com pedido pelo WhatsApp e retirada na loja.',
    url: `${siteUrl}/`,
    logo: `${siteUrl}/brand/icon-512.png`,
    image: `${siteUrl}/brand/og-image.png`,
    telephone: business.phone,
    priceRange: '$$',
    currenciesAccepted: 'BRL',
    address: {
      '@type': 'PostalAddress',
      streetAddress: `${address.street} - ${address.neighborhood}`,
      addressLocality: address.city,
      addressRegion: address.region,
      postalCode: address.postalCode,
      addressCountry: address.country,
    },
    containedInPlace: { '@type': 'ShoppingCenter', name: address.mall },
    ...(business.instagram ? { sameAs: [business.instagram] } : {}),
    ...(business.openingHours.length > 0
      ? {
          openingHoursSpecification: business.openingHours.map((h) => ({
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: h.days,
            opens: h.opens,
            closes: h.closes,
          })),
        }
      : {}),
  }
}

export function websiteJsonLd(siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteUrl}/#site`,
    name: SITE_NAME,
    url: `${siteUrl}/`,
    inLanguage: 'pt-BR',
    publisher: { '@id': `${siteUrl}/#loja` },
  }
}

export function breadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, item: item.url })),
  }
}

export function productDescription(product: SeoProduct, minOrderCents: number): string {
  if (product.description?.trim()) return truncate(product.description)
  const details = [product.size, product.plating, product.shade && `tom ${product.shade}`].filter(Boolean).join(', ')
  return truncate(
    `${product.name} (${product.code})${details ? `, ${details}` : ''}, por ${brl(product.price_cents)} no atacado. ` +
      `Pedido mínimo de ${brl(minOrderCents)}, envio pelo WhatsApp e ${PICKUP}.`,
  )
}

export function productJsonLd(siteUrl: string, product: SeoProduct, minOrderCents: number, business: Business = BUSINESS) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    sku: product.code,
    description: productDescription(product, minOrderCents),
    ...(product.images.length > 0 ? { image: product.images } : {}),
    ...(product.category ? { category: product.category.name } : {}),
    ...(product.material ? { material: product.material } : {}),
    ...(product.shade ? { color: product.shade } : {}),
    ...(product.size ? { size: product.size } : {}),
    offers: {
      '@type': 'Offer',
      url: `${siteUrl}/produto/${product.slug}`,
      priceCurrency: 'BRL',
      price: reais(product.price_cents),
      availability: product.stock === 0 ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: business.name },
      // Preço de atacado: vale para pedidos a partir do mínimo
      eligibleTransactionVolume: { '@type': 'PriceSpecification', minPrice: reais(minOrderCents), priceCurrency: 'BRL' },
    },
  }
}

export function homeHead(siteUrl: string, minOrderCents = BUSINESS.minOrderCents): HeadData {
  return {
    title: 'Semijoias no atacado em Porto Alegre | Glamour Atacado',
    description: truncate(
      `Semijoias, acessórios e maquiagem no atacado para revender. Pedido mínimo de ${brl(minOrderCents)}, envio pelo WhatsApp e ${PICKUP}.`,
    ),
    canonical: `${siteUrl}/`,
    robots: INDEX,
    ogType: 'website',
    ...defaultImage(siteUrl),
    jsonLd: [localBusinessJsonLd(siteUrl), websiteJsonLd(siteUrl)],
  }
}

export function categoryHead(
  siteUrl: string,
  category: SeoCategory | 'novidades',
  minOrderCents = BUSINESS.minOrderCents,
): HeadData {
  const home = { name: 'Início', url: `${siteUrl}/` }
  if (category === 'novidades') {
    const url = `${siteUrl}/categoria/novidades`
    return {
      title: 'Novidades no atacado | Glamour Atacado · Porto Alegre',
      description: truncate(
        `As peças que acabaram de chegar ao atacado da Glamour: semijoias, acessórios e maquiagem para revender, com ${PICKUP}.`,
      ),
      canonical: url,
      robots: INDEX,
      ogType: 'website',
      ...defaultImage(siteUrl),
      jsonLd: [breadcrumbJsonLd([home, { name: 'Novidades', url }])],
    }
  }

  const url = `${siteUrl}/categoria/${category.slug}`
  return {
    title: `${category.name} no atacado | Glamour Atacado · Porto Alegre`,
    description: truncate(
      category.description?.trim() ||
        `${category.name} para revender, com preço de atacado. Pedido mínimo de ${brl(minOrderCents)}, envio pelo WhatsApp e ${PICKUP}.`,
    ),
    canonical: url,
    robots: INDEX,
    ogType: 'website',
    ...defaultImage(siteUrl),
    jsonLd: [breadcrumbJsonLd([home, { name: category.name, url }])],
  }
}

export function productHead(siteUrl: string, product: SeoProduct, minOrderCents: number): HeadData {
  const url = `${siteUrl}/produto/${product.slug}`
  const crumbs = [
    { name: 'Início', url: `${siteUrl}/` },
    ...(product.category ? [{ name: product.category.name, url: `${siteUrl}/categoria/${product.category.slug}` }] : []),
    { name: product.name, url },
  ]
  return {
    title: `${product.name} ${product.code} · ${brl(product.price_cents)} no atacado | Glamour`,
    description: productDescription(product, minOrderCents),
    canonical: url,
    robots: INDEX,
    ogType: 'product',
    ...(product.images[0] ? { image: product.images[0], imageAlt: product.name } : defaultImage(siteUrl)),
    priceCents: product.price_cents,
    jsonLd: [productJsonLd(siteUrl, product, minOrderCents), breadcrumbJsonLd(crumbs)],
  }
}

export function privacyHead(siteUrl: string): HeadData {
  return {
    title: 'Privacidade | Glamour Atacado',
    description: 'Como a Glamour Atacado usa o nome e o WhatsApp informados no pedido e os cookies de estatística do site.',
    canonical: `${siteUrl}/privacidade`,
    robots: INDEX,
    ogType: 'website',
    ...defaultImage(siteUrl),
    jsonLd: [],
  }
}

/** Pedido, meus pedidos e painel: fora do Google. */
export function privateHead(siteUrl: string): HeadData {
  return {
    title: SITE_NAME,
    description: 'Catálogo de atacado da Glamour Acessórios.',
    canonical: null,
    robots: NOINDEX,
    ogType: 'website',
    ...defaultImage(siteUrl),
    jsonLd: [],
  }
}

export function notFoundHead(siteUrl: string): HeadData {
  return { ...privateHead(siteUrl), title: 'Página não encontrada | Glamour Atacado' }
}

/** Resultado de busca (?busca=): fora do índice, apontando para a página sem busca. */
export function withSearch(head: HeadData): HeadData {
  return { ...head, robots: NOINDEX, jsonLd: [] }
}

export function renderHead(head: HeadData): string {
  const title = escapeHtml(head.title)
  const description = escapeHtml(head.description)
  const canonical = head.canonical ? escapeHtml(head.canonical) : null
  const lines = [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<meta name="robots" content="${head.robots}" />`,
    canonical && `<link rel="canonical" href="${canonical}" />`,
    `<meta property="og:type" content="${head.ogType}" />`,
    '<meta property="og:locale" content="pt_BR" />',
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    canonical && `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:image" content="${escapeHtml(head.image)}" />`,
    head.imageSize && `<meta property="og:image:width" content="${head.imageSize.width}" />`,
    head.imageSize && `<meta property="og:image:height" content="${head.imageSize.height}" />`,
    `<meta property="og:image:alt" content="${escapeHtml(head.imageAlt)}" />`,
    head.priceCents !== undefined && `<meta property="product:price:amount" content="${reais(head.priceCents)}" />`,
    head.priceCents !== undefined && '<meta property="product:price:currency" content="BRL" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    ...head.jsonLd.map(jsonLdScript),
  ]
  return lines
    .filter((line): line is string => typeof line === 'string' && line.length > 0)
    .map((line) => `    ${line}`)
    .join('\n')
}
