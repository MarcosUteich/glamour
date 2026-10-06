// Acesso leve ao Supabase para a loja: a API REST (PostgREST) e as fotos públicas do Storage.
// A loja só lê o catálogo, grava eventos e chama duas funções do banco; o supabase-js completo (login,
// tempo real, upload) fica só no painel, que carrega sob demanda. São ~60 KB a menos no celular.
import { publicPhotoUrl } from '@/seo/url'

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/+$/, '') || undefined
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || undefined

/** Sem as chaves do Supabase o site roda em modo demonstração, com produtos de exemplo. */
export const isDemo = !SUPABASE_URL || !SUPABASE_ANON_KEY

/** Mesmo formato de erro do supabase-js (vem do corpo da resposta do PostgREST). */
export interface RestError {
  code?: string
  message: string
  details?: string | null
  hint?: string | null
}

export type RestResult<T> = { data: T; error: null } | { data: null; error: RestError }

async function request<T>(path: string, init: RequestInit = {}): Promise<RestResult<T>> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return { data: null, error: { message: 'Supabase não configurado' } }
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    })
    const text = await response.text()
    let body: unknown = null
    try {
      body = text ? JSON.parse(text) : null
    } catch {
      body = null
    }
    if (!response.ok) {
      const info = (body ?? {}) as Partial<RestError>
      return {
        data: null,
        error: {
          code: info.code,
          message: info.message ?? `Supabase respondeu ${response.status}`,
          details: info.details ?? null,
          hint: info.hint ?? null,
        },
      }
    }
    return { data: body as T, error: null }
  } catch (error) {
    return { data: null, error: { message: error instanceof Error ? error.message : String(error) } }
  }
}

/** Colunas como no supabase-js: espaços e quebras de linha saem do select. */
const cleanSelect = (columns: string) => columns.replace(/\s+/g, '')

/** GET /rest/v1/tabela?select=…&filtros (os filtros no formato do PostgREST: "active=eq.true") */
export function restSelect<T>(table: string, columns: string, filters: string[] = []): Promise<RestResult<T>> {
  const query = [`select=${encodeURIComponent(cleanSelect(columns))}`, ...filters].join('&')
  return request<T>(`${table}?${query}`)
}

/** Chama uma função do banco (POST /rest/v1/rpc/nome). */
export function restRpc<T>(fn: string, args: Record<string, unknown>): Promise<RestResult<T>> {
  return request<T>(`rpc/${fn}`, { method: 'POST', body: JSON.stringify(args) })
}

/** Insere uma linha sem pedir o registro de volta (o RLS da loja só permite inserir). */
export function restInsert(table: string, row: Record<string, unknown>): Promise<RestResult<null>> {
  return request<null>(table, { method: 'POST', body: JSON.stringify(row), headers: { Prefer: 'return=minimal' } })
}

/** Endereço público da foto (igual ao que o servidor usa no pré-carregamento da foto principal). */
export const photoUrl = (path: string) => publicPhotoUrl(SUPABASE_URL, path)
