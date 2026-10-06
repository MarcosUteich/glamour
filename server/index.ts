/// <reference types="vite/client" />
// Servidor da loja para VPS / Docker (Hostinger, Coolify, EasyPanel, Dokploy, Railway...).
// Entrega os arquivos do build (dist/) e as mesmas funções de SEO da Vercel: título, canonical, Open Graph e
// dados estruturados por página, /sitemap.xml, /robots.txt, /catalogo.xml (Meta), 404 de verdade,
// redirecionamentos 301 e o ping diário que impede o Supabase Free de pausar. Além disso monta as páginas da
// loja no servidor (src/entry-server.tsx): o conteúdo chega pronto no HTML.
// Só usa o Node (22+); o build (npm run build) gera dist-server/index.js.
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { extname, join, relative, resolve, sep } from 'node:path'
import { brotliCompressSync, constants as zlib, gzipSync } from 'node:zlib'
import {
  handleFeedRequest,
  handlePageRequest,
  handleRobotsRequest,
  handleSitemapRequest,
  pingSupabase,
  readSeoEnv,
  type SeoDeps,
} from '../src/seo/handler'
import { loadStoreData, missingFromData, prerenderPage, shouldPrerender, type InitialData } from '../src/entry-server'

const DIST = resolve(process.env.DIST_DIR ?? join(process.cwd(), 'dist'))
const PORT = Number(process.env.PORT ?? 3000)
const HOST = process.env.HOST ?? '0.0.0.0'

// Valem as variáveis do ambiente; sem elas, as que o build embutiu (VITE_*)
const env = readSeoEnv({ ...(import.meta.env as Record<string, string | undefined>), ...process.env })
const siteHost = new URL(env.siteUrl).host

// ---------------------------------------------------------------- arquivos estáticos (em memória)

interface StaticFile {
  body: Buffer
  gzip?: Buffer
  br?: Buffer
  type: string
  etag: string
  cache: string
}

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
}

const compressible = (type: string) => /^(text\/|application\/(json|manifest\+json|xml|javascript)|image\/svg)/.test(type)

function compress(body: Buffer, type: string) {
  if (!compressible(type) || body.length < 1024) return {}
  return {
    gzip: gzipSync(body, { level: 9 }),
    br: brotliCompressSync(body, { params: { [zlib.BROTLI_PARAM_QUALITY]: 11 } }),
  }
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

function loadStatic(dir: string): Map<string, StaticFile> {
  const files = new Map<string, StaticFile>()
  for (const full of walk(dir)) {
    const path = `/${relative(dir, full).split(sep).join('/')}`
    const body = readFileSync(full)
    const type = TYPES[extname(full).toLowerCase()] ?? 'application/octet-stream'
    files.set(path, {
      body,
      type,
      etag: `"${createHash('sha1').update(body).digest('base64url').slice(0, 20)}"`,
      // Arquivos com hash no nome nunca mudam; o resto (ícones, manifest) é revalidado de hora em hora
      cache: path.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
      ...compress(body, type),
    })
  }
  return files
}

const STATIC = loadStatic(DIST)
const TEMPLATE = STATIC.get('/index.html')?.body.toString('utf8')
if (!TEMPLATE) throw new Error(`index.html não encontrado em ${DIST}. Rode "npm run build" antes.`)

// ---------------------------------------------------------------- respostas

const SECURITY_HEADERS: Record<string, string> = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'SAMEORIGIN',
}

/** Compressão que o navegador aceita: brotli, gzip ou nenhuma. */
function acceptedEncoding(req: IncomingMessage): 'br' | 'gzip' | null {
  const accept = String(req.headers['accept-encoding'] ?? '')
  if (/\bbr\b/.test(accept)) return 'br'
  if (/\bgzip\b/.test(accept)) return 'gzip'
  return null
}

function send(
  req: IncomingMessage,
  res: ServerResponse,
  status: number,
  headers: Record<string, string>,
  body: Buffer | null,
  secure: boolean,
) {
  let payload = body
  const out: Record<string, string> = { ...SECURITY_HEADERS, ...headers }
  if (secure) out['strict-transport-security'] = 'max-age=31536000'
  if (payload && !out['content-encoding'] && compressible(out['content-type'] ?? '') && payload.length >= 1024) {
    const encoding = acceptedEncoding(req)
    if (encoding === 'br') payload = brotliCompressSync(payload, { params: { [zlib.BROTLI_PARAM_QUALITY]: 5 } })
    if (encoding === 'gzip') payload = gzipSync(payload)
    if (encoding) out['content-encoding'] = encoding
    out.vary = 'accept-encoding'
  }
  if (payload) out['content-length'] = String(payload.length)
  res.writeHead(status, out)
  res.end(req.method === 'HEAD' ? undefined : (payload ?? undefined))
}

function serveStatic(req: IncomingMessage, res: ServerResponse, file: StaticFile, secure: boolean) {
  if (req.headers['if-none-match'] === file.etag) {
    res.writeHead(304, { etag: file.etag, 'cache-control': file.cache })
    res.end()
    return
  }
  const accepted = acceptedEncoding(req)
  const encoding = accepted === 'br' && file.br ? 'br' : accepted && file.gzip ? 'gzip' : null
  const body = encoding === 'br' && file.br ? file.br : encoding === 'gzip' && file.gzip ? file.gzip : file.body
  send(
    req,
    res,
    200,
    {
      'content-type': file.type,
      'cache-control': file.cache,
      etag: file.etag,
      ...(encoding ? { 'content-encoding': encoding } : {}),
      ...(file.gzip || file.br ? { vary: 'accept-encoding' } : {}),
    },
    body,
    secure,
  )
}

// Cache curto das páginas geradas: um pico de visitas vindas de anúncio não vira um pico no Supabase
interface Cached {
  expires: number
  status: number
  headers: Record<string, string>
  body: Buffer
}
const pageCache = new Map<string, Cached>()
const PAGE_TTL = 60_000
const FEED_TTL = 10 * 60_000
const MAX_CACHED = 500

function fromCache(key: string): Cached | null {
  const hit = pageCache.get(key)
  return hit && hit.expires > Date.now() ? hit : null
}

/** Guarda só respostas 200 e 404 (redirecionamentos e erros passam direto). */
async function remember(key: string, ttl: number, response: Response): Promise<Cached> {
  const entry: Cached = {
    expires: Date.now() + ttl,
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: Buffer.from(await response.arrayBuffer()),
  }
  if (response.status === 200 || response.status === 404) {
    if (pageCache.size >= MAX_CACHED) pageCache.delete(pageCache.keys().next().value as string)
    pageCache.set(key, entry)
  }
  return entry
}

async function cached(key: string, ttl: number, produce: () => Promise<Response>): Promise<Cached> {
  return fromCache(key) ?? remember(key, ttl, await produce())
}

// ---------------------------------------------------------------- páginas montadas no servidor

// Catálogo e configurações de todas as páginas, buscados no máximo uma vez por minuto. Se o Supabase falhar,
// as páginas saem só com o SEO (o navegador monta) e a próxima tentativa é em 20 segundos, sem fazer cada
// visita esperar.
const STORE_TTL = 60_000
const STORE_RETRY = 20_000
let storeData: { at: number; ttl: number; data: Promise<InitialData> } | null = null

function currentStoreData(fresh = false): Promise<InitialData> {
  if (fresh || !storeData || Date.now() - storeData.at > storeData.ttl) {
    const data = Promise.race([
      loadStoreData(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Supabase demorou para responder')), 4_000).unref()),
    ])
    const entry = { at: Date.now(), ttl: STORE_TTL, data }
    storeData = entry
    data.catch(() => {
      entry.ttl = STORE_RETRY
    })
  }
  return storeData.data
}

/** Põe a loja pronta dentro da página; se algo falhar, a página sai como antes e o navegador monta. */
async function prerender(url: URL, page: Response): Promise<Response> {
  const html = await page.text()
  const rebuilt = (body: string) => new Response(body, { status: page.status, headers: page.headers })
  if (!shouldPrerender(url) || (page.status !== 200 && page.status !== 404)) return rebuilt(html)
  try {
    let data = await currentStoreData()
    // Peça ou categoria recém-cadastrada (o SEO já achou no banco): busca o catálogo de novo, uma vez
    if (page.status === 200 && missingFromData(url, data)) data = await currentStoreData(true)
    return rebuilt(prerenderPage(html, `${url.pathname}${url.search}`, data))
  } catch (error) {
    console.error('[glamour] página sem pré-montagem', url.pathname, error instanceof Error ? error.message : error)
    return rebuilt(html)
  }
}

function depsFor(origin: string): SeoDeps {
  return {
    env,
    // O index.html vem da memória; o resto (Supabase) vai para a rede
    fetch: (input, init) => {
      const target = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      if (target === `${origin}/index.html`) {
        return Promise.resolve(new Response(TEMPLATE, { headers: { 'content-type': 'text/html; charset=utf-8' } }))
      }
      return fetch(input, init)
    },
  }
}

async function handle(req: IncomingMessage, res: ServerResponse) {
  const forwardedHost = String(req.headers['x-forwarded-host'] ?? '').split(',')[0].trim()
  const host = (forwardedHost || req.headers.host || siteHost).toLowerCase()
  const proto = String(req.headers['x-forwarded-proto'] ?? '').split(',')[0].trim() || 'http'
  const secure = proto === 'https'
  const url = new URL(req.url ?? '/', `${proto}://${host}`)

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(req, res, 405, { allow: 'GET, HEAD', 'content-type': 'text/plain; charset=utf-8' }, Buffer.from('Método não permitido'), secure)
    return
  }

  // www.glamourlindoia.com.br → glamourlindoia.com.br (um endereço só para o Google)
  if (host === `www.${siteHost}`) {
    send(req, res, 301, { location: `${env.siteUrl}${url.pathname}${url.search}`, 'cache-control': 'public, max-age=86400' }, null, secure)
    return
  }

  if (url.pathname === '/healthz') {
    send(req, res, 200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' }, Buffer.from('ok'), secure)
    return
  }

  const origin = `${proto}://${host}`
  const deps = depsFor(origin)
  let result: Cached | null = null
  if (url.pathname === '/sitemap.xml') result = await cached('sitemap', PAGE_TTL * 10, () => handleSitemapRequest(deps))
  else if (url.pathname === '/robots.txt') result = await cached('robots', PAGE_TTL * 10, async () => handleRobotsRequest(deps))
  else if (url.pathname === '/catalogo.xml') result = await cached('feed', FEED_TTL, () => handleFeedRequest(deps))

  if (!result && url.pathname === '/index.html') {
    send(req, res, 301, { location: `/${url.search}`, 'cache-control': 'public, max-age=86400' }, null, secure)
    return
  }

  if (!result) {
    const file = STATIC.get(url.pathname)
    if (file) {
      serveStatic(req, res, file, secure)
      return
    }
    // Arquivo que não existe (foto, script antigo...): 404 simples, sem devolver a página da loja
    if (url.pathname.startsWith('/assets/') || /\.[a-z0-9]{2,5}$/i.test(url.pathname)) {
      send(req, res, 404, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=60' }, Buffer.from('Não encontrado'), secure)
      return
    }
    // A página só muda com o caminho e com a presença de ?busca (que a deixa fora do Google)
    const key = `page:${url.pathname}|${url.searchParams.has('busca') ? 'busca' : ''}`
    result = fromCache(key)
    if (!result) {
      const page = await handlePageRequest(new Request(url, { headers: { accept: 'text/html' } }), deps)
      // Redirecionamento 301 não entra no cache (leva a busca e as UTMs de quem pediu)
      result =
        page.status === 301
          ? { expires: 0, status: 301, headers: Object.fromEntries(page.headers.entries()), body: Buffer.alloc(0) }
          : await remember(key, PAGE_TTL, await prerender(url, page))
    }
  }

  const headers = { ...result.headers }
  delete headers['content-length']
  send(req, res, result.status, headers, result.status === 301 ? null : result.body, secure)
}

const server = createServer((req, res) => {
  handle(req, res).catch((error: unknown) => {
    console.error('[glamour] erro ao responder', req.url, error)
    if (!res.headersSent) res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('Erro no servidor')
  })
})

server.listen(PORT, HOST, () => {
  console.log(`[glamour] loja no ar em http://${HOST}:${PORT} · site ${env.siteUrl} · ${STATIC.size} arquivos em ${DIST}`)
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    console.warn('[glamour] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ausentes: páginas sem SEO por produto e catálogo indisponível')
  }
})

// Mantém o Supabase Free acordado (pausa após 1 semana sem uso); a cada 12 horas
if (env.supabaseUrl && env.supabaseAnonKey) {
  const ping = () => void pingSupabase({ env, fetch }).then((message) => console.log(`[glamour] ${message}`))
  setTimeout(ping, 60_000).unref()
  setInterval(ping, 12 * 60 * 60_000).unref()
}

function shutdown() {
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(0), 5_000).unref()
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
