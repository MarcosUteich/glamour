// /sitemap.xml (ver vercel.json): sempre atualizado com as categorias e peças ativas.
import { handleSitemapRequest, readSeoEnv } from '../src/seo/handler'

export const config = { runtime: 'edge' }

export default function handler() {
  return handleSitemapRequest({
    env: readSeoEnv(process.env),
    fetch: (input, init) => fetch(input, init),
  })
}
