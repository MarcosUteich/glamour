import path from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { homeHead, renderHead } from './src/seo/head'
import { injectHead } from './src/seo/html'

// A home sai do build já com título, canonical e dados da loja (LocalBusiness), sem depender
// de função. As demais páginas recebem o SEO em api/page.ts (ver vercel.json).
function seoHome(siteUrl: string, supabaseUrl?: string): Plugin {
  return {
    name: 'glamour-seo-home',
    transformIndexHtml(html) {
      const withHead = injectHead(html, renderHead(homeHead(siteUrl)))
      if (!supabaseUrl) return withHead
      // Abre a conexão com o Supabase cedo: o catálogo aparece mais rápido no celular
      return withHead.replace('</head>', () => `  <link rel="preconnect" href="${supabaseUrl}" crossorigin />\n  </head>`)
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const siteUrl = (env.VITE_SITE_URL || 'https://glamouratacado.com.br').replace(/\/$/, '')

  return {
    plugins: [react(), tailwindcss(), seoHome(siteUrl, env.VITE_SUPABASE_URL?.replace(/\/$/, ''))],
    resolve: {
      alias: { '@': path.resolve(import.meta.dirname, './src') },
    },
  }
})
