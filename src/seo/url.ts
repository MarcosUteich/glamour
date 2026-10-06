// Endereço canônico do site. Sem dependências do app: roda no build, na Vercel e no servidor Node.

export const DEFAULT_SITE_URL = 'https://glamourlindoia.com.br'

/**
 * Normaliza o VITE_SITE_URL para a origem com https e sem barra no fim.
 * Aceita o valor como costuma ser digitado em painéis de hospedagem:
 * "glamourlindoia.com.br", "https://glamourlindoia.com.br/", "HTTP://Glamourlindoia.com.br".
 * Sem https, o canonical, a imagem da prévia e os dados estruturados viram endereços relativos e quebram.
 */
export function normalizeSiteUrl(raw?: string | null, fallback = DEFAULT_SITE_URL): string {
  const value = (raw ?? '').trim()
  if (!value) return fallback
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`
  let url: URL
  try {
    url = new URL(withScheme)
  } catch {
    return fallback
  }
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname.endsWith('.localhost')
  if (!local) url.protocol = 'https:'
  return url.origin
}

/** "www.glamourlindoia.com.br" → "glamourlindoia.com.br" */
export const stripWww = (host: string) => host.replace(/^www\./i, '')

/**
 * Endereço público de uma foto do bucket product-images. É o mesmo no site, no servidor (pré-carregamento da
 * foto principal) e no catálogo da Meta: o navegador reaproveita o download só se o endereço for idêntico.
 */
export function publicPhotoUrl(supabaseUrl: string | undefined, path: string, bucket = 'product-images'): string {
  if (!supabaseUrl || /^(https?:|data:|blob:)/.test(path)) return path
  const encoded = path.replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/')
  return `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/${bucket}/${encoded}`
}
