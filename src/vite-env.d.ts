/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  /** Endereço do site; aceita com ou sem https ("glamourlindoia.com.br") */
  readonly VITE_SITE_URL?: string
  /** Google Analytics 4, ex.: G-XXXXXXXXXX */
  readonly VITE_GA_ID?: string
  /** Pixel da Meta (Facebook/Instagram), só números */
  readonly VITE_META_PIXEL_ID?: string
  /** Google Ads (opcional), ex.: AW-123456789 */
  readonly VITE_GOOGLE_ADS_ID?: string
  /** Rótulo da conversão "pedido" no Google Ads (opcional), ex.: AbCdEfGhIjKlMnOp */
  readonly VITE_GOOGLE_ADS_LEAD_LABEL?: string
  /** Microsoft Clarity (opcional): mapas de clique e gravações de sessão */
  readonly VITE_CLARITY_ID?: string
  /** Tag HTML do Google Search Console (só o código de content="…") */
  readonly VITE_GOOGLE_SITE_VERIFICATION?: string
  /** Metatag de verificação de domínio da Meta (só o código de content="…") */
  readonly VITE_META_DOMAIN_VERIFICATION?: string
  /** Chave pública do Turnstile; a chave secreta fica no Supabase Auth. */
  readonly VITE_TURNSTILE_SITE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
