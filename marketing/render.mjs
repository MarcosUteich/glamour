// Renderiza as artes de marketing (marketing/templates/*.html) para PNG/PDF em marketing/out/ e os arquivos de
// marca do site (arte de compartilhar, ícones, logo e favicon.ico) direto em public/.
// Usa o Chrome/Edge do computador via playwright-core e as fontes do próprio site (@fontsource), sem internet.
//
// O pedido mínimo das artes vem de /admin → Config (Supabase, com as chaves do .env); sem acesso, de
// src/seo/business.ts. O QR do cartaz e do cartão aponta para VITE_SITE_URL (padrão: glamourlindoia.com.br).
//
// Uso: npm run artes            (todas)
//      npm run artes -- post    (só uma)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import QRCode from 'qrcode'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(root, 'marketing', 'out')
const TEMPLATES = join(root, 'marketing', 'templates')

// Mesmas variáveis do site: .env.local tem prioridade sobre .env (o que já estiver no ambiente vale mais)
for (const file of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(join(root, file))
  } catch {
    // arquivo não existe: segue
  }
}

/** Mesma regra de src/seo/url.ts: completa o https:// e tira a barra do fim. */
function siteUrl(raw) {
  const value = (raw ?? '').trim()
  if (!value) return 'https://glamourlindoia.com.br'
  const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`)
  if (!['localhost', '127.0.0.1'].includes(url.hostname)) url.protocol = 'https:'
  return url.origin
}
const SITE_URL = siteUrl(process.env.VITE_SITE_URL)

/** "R$ 499" ou "R$ 1.249,90" */
function money(cents) {
  const [int, dec] = (cents / 100).toFixed(2).split('.')
  const whole = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return dec === '00' ? `R$ ${whole}` : `R$ ${whole},${dec}`
}

async function minOrder() {
  const url = process.env.VITE_SUPABASE_URL?.trim().replace(/\/+$/, '')
  const key = process.env.VITE_SUPABASE_ANON_KEY?.trim()
  if (url && key) {
    try {
      const res = await fetch(`${url}/rest/v1/settings?select=min_order_cents&id=eq.1`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(8000),
      })
      const [row] = res.ok ? await res.json() : []
      if (row?.min_order_cents) return { cents: row.min_order_cents, from: '/admin → Config' }
    } catch {
      // sem internet ou Supabase fora do ar: usa o valor de referência
    }
  }
  const business = readFileSync(join(root, 'src', 'seo', 'business.ts'), 'utf8')
  const cents = Number(business.match(/minOrderCents:\s*(\d+)/)?.[1] ?? 49900)
  return { cents, from: 'src/seo/business.ts' }
}

// Fontes do site, embutidas no HTML (setContent não carrega arquivos locais por caminho)
const fontFile = (pkg, file) => readFileSync(join(root, 'node_modules', ...pkg.split('/'), 'files', file)).toString('base64')
const FONTS_CSS = [
  ['Montserrat', '@fontsource-variable/montserrat', 'montserrat-latin-wght-normal.woff2', '100 900', 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215'],
  ['Montserrat', '@fontsource-variable/montserrat', 'montserrat-latin-ext-wght-normal.woff2', '100 900', 'U+0100-02AF,U+1E00-1EFF,U+2020,U+20A0-20AB,U+20AD-20CF,U+2113,U+2C60-2C7F,U+A720-A7FF'],
  ['Yellowtail', '@fontsource/yellowtail', 'yellowtail-latin-400-normal.woff2', '400', 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215'],
]
  .map(
    ([family, pkg, file, weight, range]) =>
      `@font-face{font-family:'${family}';font-style:normal;font-display:block;font-weight:${weight};` +
      `src:url(data:font/woff2;base64,${fontFile(pkg, file)}) format('woff2');unicode-range:${range}}`,
  )
  .join('\n')

// Letreiro sem width/height fixos, com classe .wordmark para o CSS controlar o tamanho
const WORDMARK = readFileSync(join(root, 'public', 'brand', 'glamour-wordmark-blush.svg'), 'utf8')
  .replace(/\s(width|height)="[^"]*"/g, '')
  .replace('<svg ', '<svg class="wordmark" ')
// Monograma "G" para os ícones, também sem tamanho fixo
const MONOGRAM = readFileSync(join(root, 'public', 'brand', 'glamour-g.svg'), 'utf8').replace(/\s(width|height)="[^"]*"/g, '')
const SHARED_CSS = readFileSync(join(root, 'marketing', 'shared.css'), 'utf8')

// name, template, largura, altura, formato, [scale: densidade do PNG], [out: caminho final],
// [utm do QR], [needsDomain: só imprimir com o domínio definitivo], [sizes: tamanhos do .ico]
const JOBS = [
  { name: 'og-image', tpl: 'og.html', w: 1200, h: 630, fmt: 'png', scale: 1, out: 'public/brand/og-image.png' },
  { name: 'logo', tpl: 'logo.html', w: 512, h: 512, fmt: 'png', scale: 1, out: 'public/brand/logo.png' },
  { name: 'icon-512', tpl: 'icon.html', w: 512, h: 512, fmt: 'png', scale: 1, out: 'public/brand/icon-512.png' },
  { name: 'icon-192', tpl: 'icon.html', w: 192, h: 192, fmt: 'png', scale: 1, out: 'public/brand/icon-192.png' },
  { name: 'apple-touch-icon', tpl: 'icon.html', w: 180, h: 180, fmt: 'png', scale: 1, out: 'public/brand/apple-touch-icon.png' },
  { name: 'favicon', tpl: 'favicon.html', fmt: 'ico', sizes: [16, 32, 48], out: 'public/favicon.ico' },
  { name: 'post-feed', tpl: 'post.html', w: 1080, h: 1080, fmt: 'png' },
  { name: 'story', tpl: 'story.html', w: 1080, h: 1920, fmt: 'png' },
  { name: 'cartaz-a4', tpl: 'cartaz.html', w: 794, h: 1123, fmt: 'pdf', utm: 'cartaz', needsDomain: true },
  { name: 'cartao-frente', tpl: 'cartao-frente.html', w: 366, h: 214, fmt: 'pdf' },
  { name: 'cartao-verso', tpl: 'cartao-verso.html', w: 366, h: 214, fmt: 'pdf', utm: 'cartao', needsDomain: true },
]

const only = process.argv[2]
const jobs = only ? JOBS.filter((j) => j.name.includes(only) || j.tpl.includes(only)) : JOBS

const findChrome = () => {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean)
  for (const p of candidates) {
    try {
      readFileSync(p)
      return p
    } catch {
      // continua
    }
  }
  return null
}

/** Junta PNGs num .ico (formato aceito por todos os navegadores e pelo Windows desde o Vista). */
function toIco(images) {
  const header = Buffer.alloc(6 + images.length * 16)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)
  let offset = header.length
  images.forEach(({ size, png }, i) => {
    const entry = 6 + i * 16
    header.writeUInt8(size >= 256 ? 0 : size, entry)
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1)
    header.writeUInt8(0, entry + 2)
    header.writeUInt8(0, entry + 3)
    header.writeUInt16LE(1, entry + 4)
    header.writeUInt16LE(32, entry + 6)
    header.writeUInt32LE(png.length, entry + 8)
    header.writeUInt32LE(offset, entry + 12)
    offset += png.length
  })
  return Buffer.concat([header, ...images.map((image) => image.png)])
}

mkdirSync(OUT, { recursive: true })
const executablePath = findChrome()
if (!executablePath) {
  console.error('Chrome/Edge não encontrado. Defina CHROME_PATH apontando para o executável.')
  process.exit(1)
}

const minimum = await minOrder()
console.log(`Site: ${SITE_URL} · pedido mínimo ${money(minimum.cents)} (de ${minimum.from})`)

async function renderPage(browser, html, w, h, scale) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: scale })
  await page.setContent(html, { waitUntil: 'load' })
  await page.evaluate(async () => {
    await document.fonts.load('600 76px Montserrat')
    await document.fonts.load('400 40px Yellowtail')
    await document.fonts.ready
  })
  await page.waitForTimeout(150)
  return page
}

const browser = await chromium.launch({ executablePath })
try {
  for (const job of jobs) {
    let html = readFileSync(join(TEMPLATES, job.tpl), 'utf8')
    html = html
      .replace(/<link[^>]+shared\.css[^>]*>/, `<style>${FONTS_CSS}\n${SHARED_CSS}</style>`)
      .replace(/{{WORDMARK}}/g, WORDMARK)
      .replace(/{{MONOGRAM}}/g, MONOGRAM)
      .replace(/{{SITE_URL}}/g, SITE_URL)
      .replace(/{{PEDIDO_MINIMO}}/g, money(minimum.cents))

    if (html.includes('{{QR}}')) {
      const target = job.utm ? `${SITE_URL}/?utm_source=${job.utm}&utm_medium=impresso` : SITE_URL
      const qr = await QRCode.toString(target, { type: 'svg', margin: 0, color: { dark: '#2e1f25', light: '#00000000' } })
      html = html.replace(/{{QR}}/g, qr)
    }

    const file = job.out ? join(root, job.out) : join(OUT, `glamour-${job.name}.${job.fmt}`)
    if (job.fmt === 'ico') {
      const images = []
      for (const size of job.sizes) {
        // Traço do G em unidades do desenho (1558 de altura), ~0,9 px em 16 px e mais fino nos maiores
        const unitsPerPx = 1558 / (size * 0.7)
        const stroke = Math.round(unitsPerPx * (size <= 16 ? 0.9 : size <= 32 ? 0.6 : 0.4))
        const page = await renderPage(browser, html.replace(/{{STROKE}}/g, String(stroke)), size, size, 1)
        images.push({ size, png: await page.screenshot({ type: 'png', omitBackground: true }) })
        await page.close()
      }
      writeFileSync(file, toIco(images))
    } else {
      const page = await renderPage(browser, html, job.w, job.h, job.scale ?? (job.fmt === 'png' ? 2 : 1))
      if (job.fmt === 'pdf') {
        await page.pdf({ path: file, width: `${job.w}px`, height: `${job.h}px`, printBackground: true, pageRanges: '1' })
      } else {
        await page.screenshot({ path: file, type: 'png' })
      }
      await page.close()
    }
    console.log(`${job.needsDomain ? '⚠ ' : '✓ '}${file.replace(root, '.')}${job.needsDomain ? '  (confira o domínio antes de imprimir)' : ''}`)
  }
} finally {
  await browser.close()
}

writeFileSync(
  join(OUT, 'LEIA-ME.txt'),
  [
    'Artes geradas por marketing/render.mjs.',
    '',
    'post-feed  1080x1080  Instagram/Facebook',
    'story      1080x1920  Stories e status do WhatsApp',
    'og-image, logo, ícones e favicon.ico   gerados direto em public/ (prévia de link, Google, PWA)',
    'cartaz-a4  A4 PDF      vitrine/balcão — QR aponta para o site',
    'cartao-*   90x50mm PDF (com 3mm de sangria já incluídos no tamanho)',
    '',
    `Pedido mínimo nas artes: ${money(minimum.cents)} (de ${minimum.from}). Mudou em /admin → Config? Rode de novo.`,
    `O QR do cartaz e do cartão aponta para ${SITE_URL} (VITE_SITE_URL).`,
  ].join('\n'),
)
