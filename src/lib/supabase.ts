import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** Sem as chaves do Supabase o site roda em modo demonstração, com produtos de exemplo. */
export const isDemo = !url || !anonKey

export const supabase = url && anonKey ? createClient(url, anonKey) : null

export const PHOTO_BUCKET = 'product-images'

export function photoUrl(path: string): string {
  if (!supabase || /^(https?:|data:|blob:)/.test(path)) return path
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl
}

export function requireSupabase() {
  if (!supabase) throw new Error('Supabase não configurado: preencha o .env.local')
  return supabase
}
