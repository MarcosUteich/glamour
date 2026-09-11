// Cron diário (vercel.json): faz um SELECT leve para o projeto Supabase Free
// não pausar por 7 dias sem uso.
export const config = { runtime: 'edge' }

export default async function handler() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) {
    return new Response('sem configuração do supabase', { status: 200 })
  }

  try {
    const res = await fetch(`${url}/rest/v1/settings?select=id&limit=1`, {
      headers: { apikey: key, authorization: `Bearer ${key}` },
    })
    return new Response(`supabase ${res.status}`, { status: 200 })
  } catch {
    return new Response('falha ao contatar o supabase', { status: 200 })
  }
}
