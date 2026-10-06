// Catálogo de produtos em XML (RSS 2.0 com os campos g:), no formato que o Gerenciador de Commerce da Meta
// e o Google Merchant Center leem. Na Meta ele alimenta os anúncios de catálogo e a marcação de produtos no
// Instagram. O g:id é o código da peça, o mesmo content_ids que o Pixel envia: é assim que a Meta liga a visita
// ao produto. Sem dependências do app.
import { BUSINESS } from './business'
import { escapeHtml } from './html'
import { hasWholesaleDiscount } from './pricing'
import { reais, SITE_NAME } from './titles'

export interface FeedProduct {
  name: string
  slug: string
  code: string
  description: string | null
  material: string | null
  plating: string | null
  size: string | null
  shade: string | null
  /** Preço original */
  price_cents: number
  /** Preço de atacado (o cobrado), com o desconto de /admin → Config */
  wholesale_price_cents: number
  stock: number | null
  /** Fotos grandes (WebP), a capa primeiro */
  images: string[]
  /** JPEG quadrado da capa, quando existe */
  shareImage: string | null
  category: { name: string; slug: string } | null
}

/** Categoria na taxonomia do Google (a Meta aceita a mesma). */
export function googleCategory(slug: string | undefined): string {
  if (slug && /maquiagem|make/.test(slug)) return 'Health & Beauty > Personal Care > Cosmetics > Makeup'
  if (slug && /bolsa/.test(slug)) return 'Apparel & Accessories > Handbags, Wallets & Cases > Handbags'
  return 'Apparel & Accessories > Jewelry'
}

function feedDescription(p: FeedProduct): string {
  const own = p.description?.replace(/\s+/g, ' ').trim()
  if (own) return own.slice(0, 5000)
  const details = [p.size, p.plating, p.material, p.shade && `tom ${p.shade}`].filter(Boolean).join(', ')
  return `${p.name} (${p.code})${details ? `, ${details}` : ''}. Semijoias e acessórios no atacado para revender, com retirada no Lindóia Shopping, em Porto Alegre.`
}

const tag = (name: string, value: string | null | undefined) =>
  value ? `      <g:${name}>${escapeHtml(value)}</g:${name}>` : null

export function buildFeed(siteUrl: string, products: FeedProduct[]): string {
  const items = products
    .filter((p) => p.images.length > 0 || p.shareImage)
    .map((p) => {
      const main = p.shareImage ?? p.images[0]
      const extra = (p.shareImage ? p.images : p.images.slice(1)).slice(0, 10)
      return [
        '    <item>',
        tag('id', p.code),
        tag('title', p.name.slice(0, 150)),
        tag('description', feedDescription(p)),
        tag('link', `${siteUrl}/produto/${p.slug}`),
        tag('image_link', main),
        ...extra.map((url) => tag('additional_image_link', url)),
        tag('availability', p.stock === 0 ? 'out of stock' : 'in stock'),
        tag('condition', 'new'),
        // Com desconto de atacado, o original vai em price e o de atacado em sale_price (a Meta e o Google
        // mostram o original riscado); sem desconto, um preço só
        tag('price', `${reais(p.price_cents)} BRL`),
        hasWholesaleDiscount(p) ? tag('sale_price', `${reais(p.wholesale_price_cents)} BRL`) : null,
        tag('brand', BUSINESS.name),
        tag('identifier_exists', 'no'),
        tag('google_product_category', googleCategory(p.category?.slug)),
        tag('product_type', p.category?.name),
        tag('material', p.material ?? p.plating),
        tag('color', p.shade),
        tag('size', p.size),
        '    </item>',
      ]
        .filter(Boolean)
        .join('\n')
    })

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    '  <channel>',
    `    <title>${escapeHtml(SITE_NAME)}</title>`,
    `    <link>${escapeHtml(`${siteUrl}/`)}</link>`,
    '    <description>Semijoias, acessórios e maquiagem no atacado para revendedoras, com retirada em Porto Alegre.</description>',
    ...items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n')
}
