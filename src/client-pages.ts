// Páginas carregadas sob demanda no navegador. preloadRoute baixa a da página aberta antes da primeira
// renderização (main.tsx), para a página pré-montada pelo servidor ser trocada pela do React sem piscar.
import { lazy, type ComponentType } from 'react'
import type { Pages } from './routes'

type Module = { default: ComponentType }

/**
 * React.lazy que pode ser baixado antes (preload). Já baixado, o lazy recebe uma "promessa" que responde na hora
 * (o React aceita e não mostra o carregando); ainda não, baixa normalmente.
 */
function lazyPage(load: () => Promise<ComponentType>) {
  let loaded: Module | null = null
  let pending: Promise<Module> | null = null
  const preload = () =>
    (pending ??= load().then((component) => {
      loaded = { default: component }
      return loaded
    }))
  const Page = lazy(() =>
    loaded ? ({ then: (resolve: (value: Module) => void) => resolve(loaded as Module) } as unknown as Promise<Module>) : preload(),
  )
  return Object.assign(Page, { preload })
}

const pages = {
  ProductPage: lazyPage(() => import('@/pages/ProductPage').then((m) => m.ProductPage)),
  OrderPage: lazyPage(() => import('@/pages/OrderPage').then((m) => m.OrderPage)),
  OrderConfirmedPage: lazyPage(() => import('@/pages/OrderConfirmedPage').then((m) => m.OrderConfirmedPage)),
  MyOrdersPage: lazyPage(() => import('@/pages/MyOrdersPage').then((m) => m.MyOrdersPage)),
  PrivacyPage: lazyPage(() => import('@/pages/PrivacyPage').then((m) => m.PrivacyPage)),
  HowToBuyPage: lazyPage(() => import('@/pages/HowToBuyPage').then((m) => m.HowToBuyPage)),
  AdminApp: lazyPage(() => import('@/admin/AdminApp').then((m) => m.AdminApp)),
}

export const clientPages: Pages = pages

export function preloadRoute(pathname: string): Promise<unknown> {
  const path = pathname.replace(/\/+$/, '') || '/'
  const page = path.startsWith('/produto/')
    ? pages.ProductPage
    : path === '/como-comprar'
      ? pages.HowToBuyPage
      : path === '/privacidade'
        ? pages.PrivacyPage
        : path === '/meus-pedidos'
          ? pages.MyOrdersPage
          : path.startsWith('/pedido/confirmado/')
            ? pages.OrderConfirmedPage
            : path === '/pedido'
              ? pages.OrderPage
              : null
  return page ? page.preload().catch(() => undefined) : Promise.resolve()
}
