// Todas as rotas públicas passam por aqui (ver vercel.json): devolve o index.html da loja
// com título, descrição, canonical, Open Graph e dados estruturados certos de cada página.
// A home não passa aqui: ela já sai do build com o SEO pronto (vite.config.ts).
import { handlePageRequest, readSeoEnv } from '../src/seo/handler'

export const config = { runtime: 'edge' }

export default function handler(request: Request) {
  return handlePageRequest(request, {
    env: readSeoEnv(process.env),
    fetch: (input, init) => fetch(input, init),
  })
}
