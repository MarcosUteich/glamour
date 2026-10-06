// Cron diário (vercel.json): faz um SELECT leve para o projeto Supabase Free
// não pausar por 7 dias sem uso. No servidor Node, o mesmo ping roda sozinho (server/index.ts).
import { pingSupabase, readSeoEnv } from '../src/seo/handler'

export const config = { runtime: 'edge' }

export default async function handler() {
  const message = await pingSupabase({ env: readSeoEnv(process.env), fetch: (input, init) => fetch(input, init) })
  return new Response(message, { status: 200 })
}
