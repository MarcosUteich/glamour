// /catalogo.xml (ver vercel.json): catálogo de produtos para o Gerenciador de Commerce da Meta
// (anúncios de catálogo e marcação de produtos no Instagram). Mesma lógica do servidor Node.
import { handleFeedRequest, readSeoEnv } from '../src/seo/handler'

export const config = { runtime: 'edge' }

export default function handler() {
  return handleFeedRequest({
    env: readSeoEnv(process.env),
    fetch: (input, init) => fetch(input, init),
  })
}
