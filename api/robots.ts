// /robots.txt (ver vercel.json): aponta o sitemap do domínio configurado em VITE_SITE_URL.
import { handleRobotsRequest, readSeoEnv } from '../src/seo/handler'

export const config = { runtime: 'edge' }

export default function handler() {
  return handleRobotsRequest({ env: readSeoEnv(process.env) })
}
