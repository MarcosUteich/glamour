import { escapeHtml } from './html'

export interface SitemapCategory {
  id: string
  slug: string
  updated_at: string
}

export interface SitemapProduct {
  slug: string
  category_id: string
  updated_at: string
  /** Foto de capa (URL absoluta), para o Google Imagens */
  image: string | null
}

interface Entry {
  loc: string
  lastmod?: string
  image?: string | null
}

function iso(value: string): string | undefined {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

const newest = (values: string[]) =>
  values
    .map(iso)
    .filter((v): v is string => Boolean(v))
    .sort()
    .at(-1)

/** Home, novidades, categorias que têm peças, cada peça (com foto) e a página de privacidade. */
export function buildSitemap(siteUrl: string, categories: SitemapCategory[], products: SitemapProduct[]): string {
  const withProducts = new Set(products.map((p) => p.category_id))
  const latest = newest(products.map((p) => p.updated_at))

  const entries: Entry[] = [
    { loc: `${siteUrl}/`, lastmod: latest },
    { loc: `${siteUrl}/categoria/novidades`, lastmod: latest },
    ...categories
      .filter((c) => withProducts.has(c.id))
      .map((c) => ({
        loc: `${siteUrl}/categoria/${c.slug}`,
        lastmod: newest([c.updated_at, ...products.filter((p) => p.category_id === c.id).map((p) => p.updated_at)]),
      })),
    ...products.map((p) => ({ loc: `${siteUrl}/produto/${p.slug}`, lastmod: iso(p.updated_at), image: p.image })),
    { loc: `${siteUrl}/privacidade` },
  ]

  const body = entries
    .map((e) =>
      [
        '  <url>',
        `    <loc>${escapeHtml(e.loc)}</loc>`,
        e.lastmod && `    <lastmod>${e.lastmod}</lastmod>`,
        e.image && `    <image:image><image:loc>${escapeHtml(e.image)}</image:loc></image:image>`,
        '  </url>',
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n')

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' +
    `${body}\n</urlset>\n`
  )
}

export function buildRobots(siteUrl: string): string {
  return ['User-agent: *', 'Allow: /', 'Disallow: /admin', 'Disallow: /api/', '', `Sitemap: ${siteUrl}/sitemap.xml`, ''].join('\n')
}
