// Páginas da loja montadas no servidor Node (server/index.ts): o HTML já sai com título, textos, peças, preços
// e links, e o navegador mostra a página antes do JavaScript (Core Web Vitals) — e robôs que não rodam
// JavaScript (buscadores de IA, prévias) leem o conteúdo. É a mesma árvore do navegador (routes.tsx), com os
// mesmos dados, que vão junto na página (query-client.ts); o React troca uma pela outra sem piscar.
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import { Providers } from '@/components/Providers'
import { fetchCatalog, fetchSettings } from '@/data/api'
import { createQueryClient, initialDataScript, seedQueryClient, type InitialData } from '@/lib/query-client'
import { HowToBuyPage } from '@/pages/HowToBuyPage'
import { PrivacyPage } from '@/pages/PrivacyPage'
import { ProductPage } from '@/pages/ProductPage'
import { AppRoutes, type Pages } from '@/routes'

export type { InitialData }

// Pedido, meus pedidos e painel dependem do aparelho (carrinho, login): não são montados no servidor.
// (Arquivo só do servidor: o aviso de recarga rápida do Vite não se aplica.)
// eslint-disable-next-line react-refresh/only-export-components
const Nothing = () => null
const SERVER_PAGES: Pages = {
  ProductPage,
  HowToBuyPage,
  PrivacyPage,
  OrderPage: Nothing,
  OrderConfirmedPage: Nothing,
  MyOrdersPage: Nothing,
  AdminApp: Nothing,
}

/** Catálogo e configurações, pelas mesmas funções que o navegador usa (mesmo resultado, mesma página). */
export async function loadStoreData(): Promise<InitialData> {
  const [catalog, settings] = await Promise.all([fetchCatalog(), fetchSettings()])
  return { catalog, settings }
}

/** Home, categorias, peças, Como comprar, Privacidade e 404; busca (?busca=) e páginas privadas, não. */
export function shouldPrerender(url: URL): boolean {
  if (url.searchParams.has('busca')) return false
  const path = url.pathname.replace(/\/+$/, '') || '/'
  return !/^\/(admin|pedido|meus-pedidos)(\/|$)/.test(path)
}

// O React 19 põe <title>, <meta> e <link> das páginas no começo do HTML; o servidor de SEO já escreveu os
// certos no <head>, então saem daqui
const HOISTED = /^(?:<link\b[^>]*>|<meta\b[^>]*>|<title\b[^>]*>[\s\S]*?<\/title>)/

function stripHoisted(html: string): string {
  let out = html
  for (let match = out.match(HOISTED); match; match = out.match(HOISTED)) out = out.slice(match[0].length)
  return out
}

export function renderStorePage(url: string, data: InitialData): string {
  const client = createQueryClient({ server: true })
  seedQueryClient(client, data)
  try {
    return stripHoisted(
      renderToString(
        <Providers client={client}>
          <StaticRouter location={url}>
            <AppRoutes pages={SERVER_PAGES} />
          </StaticRouter>
        </Providers>,
      ),
    )
  } finally {
    client.clear()
  }
}

/** Coloca a loja montada dentro de <div id="root"> e os dados usados logo depois. */
export function injectApp(html: string, app: string, data: InitialData): string {
  if (!html.includes('<div id="root"></div>')) return html
  return html.replace('<div id="root"></div>', () => `<div id="root">${app}</div>\n    ${initialDataScript(data)}`)
}

/**
 * Catálogo grande demais para ir junto em cada página (milhares de peças): a página sai como antes e o
 * navegador monta. Com algumas centenas de peças os dados ficam em poucas dezenas de KB comprimidos.
 */
export const MAX_INITIAL_DATA_CHARS = 800_000

export function prerenderPage(html: string, url: string, data: InitialData): string {
  if (initialDataScript(data).length > MAX_INITIAL_DATA_CHARS) return html
  return injectApp(html, renderStorePage(url, data), data)
}

/** Peça ou categoria que o catálogo guardado (até 1 minuto) ainda não tem: acabou de ser cadastrada. */
export function missingFromData(url: URL, data: InitialData): boolean {
  const match = url.pathname.match(/^\/(produto|categoria)\/([^/]+)\/?$/)
  if (!match || match[2] === 'novidades') return false
  const [, kind, slug] = match
  return kind === 'produto'
    ? !data.catalog.products.some((p) => p.slug === slug)
    : !data.catalog.categories.some((c) => c.slug === slug)
}
