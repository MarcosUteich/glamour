import { QueryClient } from '@tanstack/react-query'
import type { Catalog } from '@/data/api'
import type { Settings } from './types'

/**
 * Cliente do React Query. No servidor (páginas pré-montadas) o cache não agenda limpeza: cada página usa um
 * cliente novo, que o Node descarta ao terminar.
 */
export function createQueryClient({ server = false }: { server?: boolean } = {}) {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60_000,
        gcTime: server ? Infinity : 15 * 60_000,
        refetchOnWindowFocus: false,
        retry: server ? false : 1,
      },
    },
  })
}

/** Dados que o servidor usou para montar a página; o navegador começa com eles e atualiza em seguida. */
export interface InitialData {
  catalog: Catalog
  settings: Settings
}

export function seedQueryClient(client: QueryClient, data: InitialData) {
  // updatedAt 0: a página abre com estes dados e o React Query busca a versão atual logo depois, sem piscar
  client.setQueryData(['catalog'], data.catalog, { updatedAt: 0 })
  client.setQueryData(['settings'], data.settings, { updatedAt: 0 })
}

export const INITIAL_DATA_ID = 'glamour-dados'

/** <script type="application/json"> seguro: nenhum texto do cadastro consegue fechar a tag. */
export function initialDataScript(data: InitialData): string {
  const json = JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
  return `<script id="${INITIAL_DATA_ID}" type="application/json">${json}</script>`
}

export function readInitialData(): InitialData | null {
  const element = typeof document === 'undefined' ? null : document.getElementById(INITIAL_DATA_ID)
  if (!element?.textContent) return null
  try {
    const data = JSON.parse(element.textContent) as InitialData
    return data?.catalog && data.settings ? data : null
  } catch {
    return null
  }
}
