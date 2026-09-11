const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

/** Escapa texto para HTML e XML (atributos e conteúdo). */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char])
}

/** JSON-LD seguro dentro de <script>: nenhum texto do cadastro consegue fechar a tag. */
export function jsonLdScript(data: unknown): string {
  const json = JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
  return `<script type="application/ld+json">${json}</script>`
}

/** Corta em ~160 caracteres (o que o Google mostra), sem quebrar palavra. */
export function truncate(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max - 1)
  const space = cut.lastIndexOf(' ')
  const base = space > max * 0.6 ? cut.slice(0, space) : cut
  return `${base.replace(/[\s,.;:·–-]+$/, '')}…`
}

export const SEO_START = '<!-- seo:start -->'
export const SEO_END = '<!-- seo:end -->'
const SEO_BLOCK = /<!-- seo:start -->[\s\S]*?<!-- seo:end -->/

/** Troca o bloco de SEO do index.html; sem marcadores, insere antes de </head>. */
export function injectHead(html: string, head: string): string {
  const block = `${SEO_START}\n${head}\n    ${SEO_END}`
  if (SEO_BLOCK.test(html)) return html.replace(SEO_BLOCK, () => block)
  return html.replace('</head>', () => `${block}\n  </head>`)
}
