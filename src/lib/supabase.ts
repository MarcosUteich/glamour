// Cliente completo do Supabase (login, upload de fotos, tabelas do painel). Só o painel /admin usa;
// a loja fala com o banco por src/lib/rest.ts, bem mais leve.
import { createClient } from '@supabase/supabase-js'
import { isDemo, SUPABASE_ANON_KEY, SUPABASE_URL } from './rest'

export { isDemo }

export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null

export function requireSupabase() {
  if (!supabase) throw new Error('Supabase não configurado: preencha o .env.local')
  return supabase
}
