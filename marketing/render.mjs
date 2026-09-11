// Renderiza as artes de marketing (marketing/templates/*.html) para PNG/PDF em marketing/out/.
// Usa o Chrome do sistema via playwright-core.
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

const SITE_URL = (process.env.VITE_SITE_URL ?? 'https://glamouratacado.com.br').replace(/\/$/, '')
// Letreiro sem width/height fixos, com classe .wordmark para o CSS controlar o tamanho
const WORDMARK = readFileSync(join(root, 'public', 'brand', 'glamour-wordmark-blush.svg'), 'utf8')
  .replace(/\s(width|height)="[^"]*"/g, '')
  .replace('<svg ', '<svg class="wordmark" ')
// Monograma "G" para os ícones, também sem tamanho fixo
const MONOGRAM = readFileSync(join(root, 'public', 'brand', 'glamour-g.svg'), 'utf8').replace(/\s(width|height)="[^"]*"/g, '')
// setContent não resolve caminhos relativos: injeta o CSS compartilhado direto no HTML
const SHARED_CSS = readFileSync(join(root, 'marketing', 'shared.css'), 'utf8')

// name, template, largura, altura, formato, [scale: densidade do PNG], [out: caminho final],
// [utm do QR], [needsDomain: só imprimir com o domínio definitivo]
const JOBS = [
  { name: 'og-image', tpl: 'og.html', w: 1200, h: 630, fmt: 'png', scale: 1, out: 'public/brand/og-image.png' },
  { name: 'icon-512', tpl: 'icon.html', w: 512, h: 512, fmt: 'png', scale: 1, out: 'public/brand/icon-512.png' },
  { name: 'icon-192', tpl: 'icon.html', w: 192, h: 192, fmt: 'png', scale: 1, out: 'public/brand/icon-192.png' },
  { name: 'apple-touch-icon', tpl: 'icon.html', w: 180, h: 180, fmt: 'png', scale: 1, out: 'public/brand/apple-touch-icon.png' },
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

mkdirSync(OUT, { recursive: true })
const executablePath = findChrome()
if (!executablePath) {
  console.error('Chrome/Edge não encontrado. Defina CHROME_PATH apontando para o executável.')
  process.exit(1)
}

const browser = await chromium.launch({ executablePath })
try {
  for (const job of jobs) {
    let html = readFileSync(join(TEMPLATES, job.tpl), 'utf8')
    html = html
      .replace(/<link[^>]+shared\.css[^>]*>/, `<style>${SHARED_CSS}</style>`)
      .replace(/{{WORDMARK}}/g, WORDMARK)
      .replace(/{{MONOGRAM}}/g, MONOGRAM)
      .replace(/{{SITE_URL}}/g, SITE_URL)

    if (html.includes('{{QR}}')) {
      const target = job.utm ? `${SITE_URL}/?utm_source=${job.utm}&utm_medium=impresso` : SITE_URL
      const qr = await QRCode.toString(target, { type: 'svg', margin: 0, color: { dark: '#2e1f25', light: '#00000000' } })
      html = html.replace(/{{QR}}/g, qr)
    }

    const scale = job.scale ?? (job.fmt === 'png' ? 2 : 1)
    const page = await browser.newPage({ viewport: { width: job.w, height: job.h }, deviceScaleFactor: scale })
    await page.setContent(html, { waitUntil: 'networkidle' })
    await page.evaluate(async () => {
      await document.fonts.load('600 76px Montserrat')
      await document.fonts.load('400 40px Yellowtail')
      await document.fonts.ready
    })
    await page.waitForTimeout(150)

    const file = job.out ? join(root, job.out) : join(OUT, `glamour-${job.name}.${job.fmt}`)
    if (job.fmt === 'pdf') {
      await page.pdf({ path: file, width: `${job.w}px`, height: `${job.h}px`, printBackground: true, pageRanges: '1' })
    } else {
      await page.screenshot({ path: file, type: 'png' })
    }
    await page.close()
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
    'og-image e ícones     gerados direto em public/brand/ (prévia de link, PWA, Google)',
    'cartaz-a4  A4 PDF      vitrine/balcão — QR aponta para o site',
    'cartao-*   90x50mm PDF (com 3mm de sangria já incluídos no tamanho)',
    '',
    'O QR do cartaz e do cartão usa VITE_SITE_URL. Só imprima depois que o domínio',
    'definitivo estiver no .env, senão o QR aponta para um endereço que vai mudar.',
  ].join('\n'),
)
