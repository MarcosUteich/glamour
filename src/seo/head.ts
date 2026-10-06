// Título, descrição, canonical, Open Graph e dados estruturados (JSON-LD) de cada página.
// Usado no build (home), na função da Vercel e no servidor Node (demais páginas). Sem dependências do app.
import { BUSINESS, type Business } from './business'
import { faqJsonLd, type FaqItem } from './faq'
import { escapeHtml, jsonLdScript, truncate } from './html'
import { brl, reais, SITE_NAME, titles } from './titles'

export interface SiteVerification {
  /** Google Search Console, método "Tag HTML": só o valor de content="…" */
  google?: string
  /** Meta (Configurações da empresa → Domínios), método "Metatag": só o valor de content="…" */
  meta?: string
}

/** Aceita só o código ou a tag inteira colada do Search Console / da Meta. */
export function verificationToken(value?: string | null): string | undefined {
  const text = value?.trim()
  if (!text) return undefined
  const match = text.match(/content\s*=\s*["']([^"']+)["']/i)
  return (match ? match[1] : text).trim() || undefined
}

/** Lê VITE_GOOGLE_SITE_VERIFICATION e VITE_META_DOMAIN_VERIFICATION (build ou servidor). */
export function readVerification(source: Record<string, string | undefined>): SiteVerification | undefined {
  const google = verificationToken(source.VITE_GOOGLE_SITE_VERIFICATION)
  const meta = verificationToken(source.VITE_META_DOMAIN_VERIFICATION)
  return google || meta ? { google, meta } : undefined
}

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
  imageType?: string
  priceCents?: number
  /** Tags de produto da Meta (catálogo e anúncios dinâmicos): código igual ao do catálogo e do Pixel */
  product?: { retailerId: string; inStock: boolean }
  /** Foto principal da página: o navegador começa a baixar antes do JavaScript (LCP no celular) */
  preloadImage?: string
  jsonLd: unknown[]
  /** Tags de verificação de domínio (só na home) */
  verification?: SiteVerification
}

/** Foto de compartilhamento já pronta (JPEG quadrado de 1080 px), quando a peça tem. */
export interface ShareImage {
  url: string
  alt: string
}

export interface SeoCategory {
  id?: string
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
  /** URLs absolutas das fotos grandes (WebP), a capa primeiro */
  images: string[]
  /** JPEG quadrado da capa, para a prévia no WhatsApp/Facebook e o catálogo da Meta (quando existe) */
  shareImage?: string | null
  category: { name: string; slug: string } | null
}

const INDEX = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
const NOINDEX = 'noindex, follow'
const PICKUP = 'retirada no Lindóia Shopping, em Porto Alegre'

function defaultImage(siteUrl: string) {
  return {
    image: `${siteUrl}/brand/og-image.png`,
    imageAlt: `${SITE_NAME} · semijoias, acessórios e maquiagem no atacado em Porto Alegre`,
    imageSize: { width: 1200, height: 630 },
    imageType: 'image/png',
  }
}

const address = (business: Business) => ({
  '@type': 'PostalAddress',
  streetAddress: `${business.address.street} - ${business.address.neighborhood}`,
  addressLocality: business.address.city,
  addressRegion: business.address.region,
  postalCode: business.address.postalCode,
  addressCountry: business.address.country,
})

export function localBusinessJsonLd(siteUrl: string, business: Business = BUSINESS) {
  const sameAs = [...business.social, business.mapsUrl].filter(Boolean)
  return {
    '@context': 'https://schema.org',
    '@type': 'JewelryStore',
    '@id': `${siteUrl}/#loja`,
    name: business.name,
    alternateName: [business.siteName, ...business.alternateNames],
    description:
      'Semijoias, acessórios e maquiagem no atacado para lojistas e revendedoras, com pedido pelo WhatsApp e retirada na loja do Lindóia Shopping, em Porto Alegre.',
    url: `${siteUrl}/`,
    logo: { '@type': 'ImageObject', url: `${siteUrl}/brand/logo.png`, width: 512, height: 512 },
    image: [`${siteUrl}/brand/og-image.png`, `${siteUrl}/brand/logo.png`],
    telephone: business.phone,
    priceRange: '$$',
    currenciesAccepted: 'BRL',
    address: address(business),
    geo: { '@type': 'GeoCoordinates', latitude: business.geo.latitude, longitude: business.geo.longitude },
    hasMap: business.mapsUrl,
    containedInPlace: { '@type': 'ShoppingCenter', name: business.address.mall, address: address(business) },
    areaServed: [
      { '@type': 'City', name: 'Porto Alegre' },
      { '@type': 'State', name: 'Rio Grande do Sul' },
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'sales',
      telephone: business.phone,
      areaServed: 'BR',
      availableLanguage: 'pt-BR',
    },
    ...(sameAs.length > 0 ? { sameAs } : {}),
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

export function websiteJsonLd(siteUrl: string, business: Business = BUSINESS) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteUrl}/#site`,
    name: business.siteName,
    alternateName: [business.name, ...business.alternateNames],
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

export function productDescription(
  product: Pick<SeoProduct, 'name' | 'code' | 'description' | 'size' | 'plating' | 'shade' | 'price_cents'>,
  minOrderCents: number,
): string {
  if (product.description?.trim()) return truncate(product.description)
  const details = [product.size, product.plating, product.shade && `tom ${product.shade}`].filter(Boolean).join(', ')
  return truncate(
    `${product.name} (${product.code})${details ? `, ${details}` : ''}, por ${brl(product.price_cents)} no atacado. ` +
      `Pedido mínimo de ${brl(minOrderCents)}, envio pelo WhatsApp e ${PICKUP}.`,
  )
}

export function productJsonLd(siteUrl: string, product: SeoProduct, minOrderCents: number, business: Business = BUSINESS) {
  const images = [...product.images, ...(product.shareImage ? [product.shareImage] : [])]
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    sku: product.code,
    description: productDescription(product, minOrderCents),
    ...(images.length > 0 ? { image: images } : {}),
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
      seller: { '@type': 'Organization', '@id': `${siteUrl}/#loja`, name: business.name },
      // Preço de atacado: vale para pedidos a partir do mínimo
      eligibleTransactionVolume: { '@type': 'PriceSpecification', minPrice: reais(minOrderCents), priceCurrency: 'BRL' },
    },
  }
}

export function homeHead(
  siteUrl: string,
  minOrderCents = BUSINESS.minOrderCents,
  verification?: SiteVerification,
): HeadData {
  return {
    title: titles.home(),
    description: truncate(
      `Semijoias, acessórios e maquiagem no atacado para revender. Pedido mínimo de ${brl(minOrderCents)}, envio pelo WhatsApp e ${PICKUP}.`,
    ),
    canonical: `${siteUrl}/`,
    robots: INDEX,
    ogType: 'website',
    ...defaultImage(siteUrl),
    jsonLd: [localBusinessJsonLd(siteUrl), websiteJsonLd(siteUrl)],
    verification,
  }
}

/** Prévia de link de uma lista (categoria, novidades): a foto da peça mais nova; sem ela, a arte da loja. */
function listImage(siteUrl: string, cover?: ShareImage | null) {
  return cover
    ? { image: cover.url, imageAlt: cover.alt, imageSize: { width: 1080, height: 1080 }, imageType: 'image/jpeg' }
    : defaultImage(siteUrl)
}

export function categoryHead(
  siteUrl: string,
  category: SeoCategory | 'novidades',
  minOrderCents = BUSINESS.minOrderCents,
  /** Categoria sem nenhuma peça ativa: fica fora do Google até ter peças */
  empty = false,
  /** Foto de compartilhamento da peça mais nova da lista */
  cover?: ShareImage | null,
): HeadData {
  const home = { name: 'Início', url: `${siteUrl}/` }
  if (category === 'novidades') {
    const url = `${siteUrl}/categoria/novidades`
    return {
      title: titles.novidades(),
      description: truncate(
        `As peças que acabaram de chegar ao atacado da ${BUSINESS.name}: semijoias, acessórios e maquiagem para revender, com ${PICKUP}.`,
      ),
      canonical: url,
      robots: INDEX,
      ogType: 'website',
      ...listImage(siteUrl, cover),
      jsonLd: [breadcrumbJsonLd([home, { name: 'Novidades', url }])],
    }
  }

  const url = `${siteUrl}/categoria/${category.slug}`
  return {
    title: titles.category(category.name),
    description: truncate(
      category.description?.trim() ||
        `${category.name} para revender, com preço de atacado. Pedido mínimo de ${brl(minOrderCents)}, envio pelo WhatsApp e ${PICKUP}.`,
    ),
    canonical: url,
    robots: empty ? NOINDEX : INDEX,
    ogType: 'website',
    ...listImage(siteUrl, empty ? null : cover),
    jsonLd: empty ? [] : [breadcrumbJsonLd([home, { name: category.name, url }])],
  }
}

export function productHead(siteUrl: string, product: SeoProduct, minOrderCents: number): HeadData {
  const url = `${siteUrl}/produto/${product.slug}`
  const crumbs = [
    { name: 'Início', url: `${siteUrl}/` },
    ...(product.category ? [{ name: product.category.name, url: `${siteUrl}/categoria/${product.category.slug}` }] : []),
    { name: product.name, url },
  ]
  // Prévia de link: o JPEG quadrado (abre em qualquer app); sem ele, a foto grande; sem foto, a arte da loja
  const image = product.shareImage
    ? { image: product.shareImage, imageAlt: product.name, imageSize: { width: 1080, height: 1080 }, imageType: 'image/jpeg' }
    : product.images[0]
      ? { image: product.images[0], imageAlt: product.name }
      : defaultImage(siteUrl)
  return {
    title: titles.product(product),
    description: productDescription(product, minOrderCents),
    canonical: url,
    robots: INDEX,
    ogType: 'product',
    ...image,
    priceCents: product.price_cents,
    product: { retailerId: product.code, inStock: product.stock !== 0 },
    // A foto grande que a página mostra primeiro (a mesma URL que o site usa)
    preloadImage: product.images[0],
    jsonLd: [productJsonLd(siteUrl, product, minOrderCents), breadcrumbJsonLd(crumbs)],
  }
}

/** Página "Como comprar": passo a passo, retirada e perguntas frequentes (FAQPage). */
export function howToBuyHead(siteUrl: string, faq: FaqItem[], minOrderCents = BUSINESS.minOrderCents): HeadData {
  const url = `${siteUrl}/como-comprar`
  return {
    title: titles.howToBuy(),
    description: truncate(
      `Pedido mínimo de ${brl(minOrderCents)}, envio pelo WhatsApp e ${PICKUP}. Veja o passo a passo e as perguntas frequentes do atacado da ${BUSINESS.name}.`,
    ),
    canonical: url,
    robots: INDEX,
    ogType: 'website',
    ...defaultImage(siteUrl),
    jsonLd: [
      breadcrumbJsonLd([
        { name: 'Início', url: `${siteUrl}/` },
        { name: 'Como comprar', url },
      ]),
      ...(faq.length > 0 ? [faqJsonLd(faq)] : []),
    ],
  }
}

export function privacyHead(siteUrl: string): HeadData {
  return {
    title: titles.page('Privacidade'),
    description: `Como a ${BUSINESS.name} usa o nome e o WhatsApp informados no pedido e os cookies de estatística e anúncios do site.`,
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
    description: `Catálogo de atacado da ${BUSINESS.name}.`,
    canonical: null,
    robots: NOINDEX,
    ogType: 'website',
    ...defaultImage(siteUrl),
    jsonLd: [],
  }
}

export function notFoundHead(siteUrl: string): HeadData {
  return { ...privateHead(siteUrl), title: titles.page('Página não encontrada') }
}

/** Resultado de busca (?busca=): fora do índice, apontando para a página sem busca. */
export function withSearch(head: HeadData): HeadData {
  return { ...head, robots: NOINDEX, jsonLd: [] }
}

export function renderHead(head: HeadData): string {
  const title = escapeHtml(head.title)
  const description = escapeHtml(head.description)
  const canonical = head.canonical ? escapeHtml(head.canonical) : null
  const image = escapeHtml(head.image)
  const lines = [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<meta name="robots" content="${head.robots}" />`,
    canonical && `<link rel="canonical" href="${canonical}" />`,
    head.verification?.google && `<meta name="google-site-verification" content="${escapeHtml(head.verification.google)}" />`,
    head.verification?.meta && `<meta name="facebook-domain-verification" content="${escapeHtml(head.verification.meta)}" />`,
    `<meta property="og:type" content="${head.ogType}" />`,
    '<meta property="og:locale" content="pt_BR" />',
    `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    canonical && `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:image" content="${image}" />`,
    image.startsWith('https://') && `<meta property="og:image:secure_url" content="${image}" />`,
    head.imageType && `<meta property="og:image:type" content="${head.imageType}" />`,
    head.imageSize && `<meta property="og:image:width" content="${head.imageSize.width}" />`,
    head.imageSize && `<meta property="og:image:height" content="${head.imageSize.height}" />`,
    `<meta property="og:image:alt" content="${escapeHtml(head.imageAlt)}" />`,
    head.priceCents !== undefined && `<meta property="product:price:amount" content="${reais(head.priceCents)}" />`,
    head.priceCents !== undefined && '<meta property="product:price:currency" content="BRL" />',
    head.product && `<meta property="product:retailer_item_id" content="${escapeHtml(head.product.retailerId)}" />`,
    head.product && `<meta property="product:availability" content="${head.product.inStock ? 'in stock' : 'out of stock'}" />`,
    head.product && '<meta property="product:condition" content="new" />',
    head.product && `<meta property="product:brand" content="${escapeHtml(BUSINESS.name)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    `<meta name="twitter:image:alt" content="${escapeHtml(head.imageAlt)}" />`,
    head.preloadImage &&
      `<link rel="preload" as="image" href="${escapeHtml(head.preloadImage)}" fetchpriority="high" />`,
    ...head.jsonLd.map(jsonLdScript),
  ]
  return lines
    .filter((line): line is string => typeof line === 'string' && line.length > 0)
    .map((line) => `    ${line}`)
    .join('\n')
}
