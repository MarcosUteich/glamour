/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_SITE_URL?: string
  /** Google Analytics 4, ex.: G-XXXXXXXXXX */
  readonly VITE_GA_ID?: string
  /** Pixel da Meta (Facebook/Instagram), só números */
  readonly VITE_META_PIXEL_ID?: string
  /** Chave pública do Turnstile; a chave secreta fica no Supabase Auth. */
  readonly VITE_TURNSTILE_SITE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
