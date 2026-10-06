export type SeoRoute =
  | { kind: 'home' }
  | { kind: 'category'; slug: string }
  | { kind: 'product'; slug: string }
  | { kind: 'privacy' }
  | { kind: 'howToBuy' }
  | { kind: 'private' }
  | { kind: 'notFound' }

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/

/**
 * Forma canônica do caminho, para responder 301 quando o pedido chega diferente:
 * sem barra no fim, /index.html vira / e o catálogo (/categoria, /produto) fica em minúsculas.
 * Devolve null quando o caminho já está certo.
 */
export function canonicalPath(pathname: string): string | null {
  let path = pathname.replace(/\/{2,}/g, '/')
  if (path.length > 1) path = path.replace(/\/+$/, '') || '/'
  if (path === '/index.html') path = '/'
  if (/^\/(categoria|produto)\//i.test(path) && /[A-Z]/.test(path)) path = path.toLowerCase()
  return path === pathname ? null : path
}

/** Classifica o caminho pedido (as mesmas rotas do App.tsx). */
export function resolveRoute(pathname: string): SeoRoute {
  let path: string
  try {
    path = decodeURIComponent(pathname)
  } catch {
    return { kind: 'notFound' }
  }
  path = path.replace(/\/+$/, '') || '/'

  if (path === '/') return { kind: 'home' }
  if (path === '/privacidade') return { kind: 'privacy' }
  if (path === '/como-comprar') return { kind: 'howToBuy' }
  if (
    path === '/meus-pedidos' ||
    path === '/pedido' ||
    path.startsWith('/pedido/') ||
    path === '/admin' ||
    path.startsWith('/admin/')
  ) {
    return { kind: 'private' }
  }

  const match = path.match(/^\/(categoria|produto)\/([^/]+)$/)
  if (match && SLUG.test(match[2])) {
    return match[1] === 'categoria' ? { kind: 'category', slug: match[2] } : { kind: 'product', slug: match[2] }
  }
  return { kind: 'notFound' }
}
