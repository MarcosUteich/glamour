import path from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { homeHead, readVerification, renderHead } from './src/seo/head'
import { injectHead } from './src/seo/html'
import { normalizeSiteUrl } from './src/seo/url'

// A home sai do build já com título, canonical, dados da loja (LocalBusiness) e as tags de verificação do
// Google e da Meta, sem depender de função. As demais páginas recebem o SEO em api/page.ts (Vercel) ou em
// server/index.ts (servidor Node / Docker).
function seoHome(siteUrl: string, env: Record<string, string>, supabaseUrl?: string): Plugin {
  return {
    name: 'glamour-seo-home',
    transformIndexHtml(html) {
      const withHead = injectHead(html, renderHead(homeHead(siteUrl, undefined, readVerification(env))))
      if (!supabaseUrl) return withHead
      // Abre a conexão com o Supabase cedo: o catálogo (crossorigin) e as fotos (sem) aparecem mais rápido no celular
      return withHead.replace(
        '</head>',
        () => `  <link rel="preconnect" href="${supabaseUrl}" crossorigin />\n    <link rel="preconnect" href="${supabaseUrl}" />\n  </head>`,
      )
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const siteUrl = normalizeSiteUrl(env.VITE_SITE_URL)

  return {
    plugins: [
      react(),
      tailwindcss(),
      seoHome(siteUrl, env, env.VITE_SUPABASE_URL?.trim().replace(/\/+$/, '')),
    ],
    resolve: {
      alias: { '@': path.resolve(import.meta.dirname, './src') },
    },
  }
})
