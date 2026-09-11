// Extrai o letreiro "Glamour" (com os pontos) do SVG da fachada e gera os arquivos de marca.
// O SVG vem do potrace: paths com números inteiros e um <g transform="translate(...) scale(0.1,-0.1)">.
// Aqui o transform é aplicado direto nos paths (resultado exato, 1 casa decimal) e a caixa
// de cada path é calculada para montar viewBoxes justos.
//
// Uso: npm run brand
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(root, 'brand-src', 'fachada_glamour_325x60cm.svg')
const OUT_PUBLIC = join(root, 'public', 'brand')
const OUT_TS = join(root, 'src', 'components', 'brand', 'logo-paths.ts')

const MALVA = '#A86478'
const BLUSH = '#FAF6F7'
const DOURADO = '#C4A062'

const source = readFileSync(SRC, 'utf8')

// O 1º <svg> aninhado é o "Glamour" com os pontos; o 2º é "ACESSÓRIOS" (não usado).
const nested = [...source.matchAll(/<svg\s+x="[^"]*"\s+y="[^"]*"[^>]*viewBox="[^"]+"[^>]*>([\s\S]*?)<\/svg>/g)]
if (nested.length === 0) throw new Error('Letreiro não encontrado no SVG da fachada')
const inner = nested[0][1]
const transform = parseTransform(inner.match(/<g\s+transform="([^"]+)"/)?.[1] ?? '')
const rawPaths = [...inner.matchAll(/<path\s+d="([^"]+)"/g)].map((m) => m[1].replace(/\s+/g, ' ').trim())

const shapes = rawPaths.map((d) => transformPath(d, transform))
const maxWidth = Math.max(...shapes.map((s) => s.box.maxX - s.box.minX))
// Os pontos têm ~5% da largura do "lamour"; o G tem ~40%
const letters = shapes.filter((s) => s.box.maxX - s.box.minX > maxWidth * 0.15).sort((a, b) => a.box.minX - b.box.minX)
const dots = shapes.filter((s) => !letters.includes(s)).sort((a, b) => a.box.minX - b.box.minX)
if (letters.length !== 2 || dots.length !== 4) {
  throw new Error(`Esperava 2 paths de letras e 4 pontos, encontrei ${letters.length} e ${dots.length}`)
}
const [monogram] = letters

const wordmarkBox = viewBoxFor([...letters, ...dots])
const lettersBox = viewBoxFor(letters)
const monogramBox = viewBoxFor([monogram])

const svgDoc = (box, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.viewBox}" width="${box.width}" height="${box.height}">${body}</svg>\n`
const pathsOf = (list, fill) => list.map((s) => `<path fill="${fill}" d="${s.d}"/>`).join('')

mkdirSync(OUT_PUBLIC, { recursive: true })
writeFileSync(join(OUT_PUBLIC, 'glamour-wordmark.svg'), svgDoc(wordmarkBox, pathsOf(letters, MALVA) + pathsOf(dots, MALVA)))
writeFileSync(
  join(OUT_PUBLIC, 'glamour-wordmark-blush.svg'),
  svgDoc(wordmarkBox, pathsOf(letters, BLUSH) + pathsOf(dots, DOURADO)),
)
writeFileSync(join(OUT_PUBLIC, 'glamour-g.svg'), svgDoc(monogramBox, pathsOf([monogram], MALVA)))
writeFileSync(
  join(OUT_PUBLIC, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<circle cx="32" cy="32" r="32" fill="${MALVA}"/>` +
    `<svg x="11" y="11" width="42" height="42" viewBox="${monogramBox.viewBox}" preserveAspectRatio="xMidYMid meet">` +
    pathsOf([monogram], BLUSH) +
    `</svg></svg>\n`,
)

mkdirSync(dirname(OUT_TS), { recursive: true })
writeFileSync(
  OUT_TS,
  `// Gerado por scripts/extract-logo.mjs a partir de brand-src/fachada_glamour_325x60cm.svg. Não editar à mão.\n\n` +
    `export const WORDMARK_VIEWBOX = ${JSON.stringify(wordmarkBox.viewBox)}\n` +
    `export const WORDMARK_RATIO = ${round(wordmarkBox.width / wordmarkBox.height, 4)}\n` +
    `export const LETTERS_VIEWBOX = ${JSON.stringify(lettersBox.viewBox)}\n` +
    `export const LETTERS_RATIO = ${round(lettersBox.width / lettersBox.height, 4)}\n` +
    `export const MONOGRAM_VIEWBOX = ${JSON.stringify(monogramBox.viewBox)}\n\n` +
    `export const LETTER_PATHS = ${JSON.stringify(letters.map((s) => s.d), null, 2)}\n\n` +
    `export const DOT_PATHS = ${JSON.stringify(dots.map((s) => s.d), null, 2)}\n`,
)

console.log('Letreiro extraído:')
console.log(`  letras  ${letters.length} paths · viewBox ${lettersBox.viewBox}`)
console.log(`  pontos  ${dots.length} paths · viewBox completo ${wordmarkBox.viewBox}`)
console.log(`  monograma G · viewBox ${monogramBox.viewBox}`)
console.log(`  arquivos: public/brand/{glamour-wordmark,glamour-wordmark-blush,glamour-g,favicon}.svg, ${OUT_TS.replace(root, '.')}`)

function parseTransform(value) {
  const translate = value.match(/translate\(\s*([-\d.]+)[\s,]+([-\d.]+)\s*\)/)
  const scale = value.match(/scale\(\s*([-\d.]+)(?:[\s,]+([-\d.]+))?\s*\)/)
  return {
    tx: translate ? Number(translate[1]) : 0,
    ty: translate ? Number(translate[2]) : 0,
    sx: scale ? Number(scale[1]) : 1,
    sy: scale ? Number(scale[2] ?? scale[1]) : 1,
  }
}

function round(value, digits = 2) {
  return Number(value.toFixed(digits))
}

// Aplica x' = tx + sx·x, y' = ty + sy·y ao path (comandos M/L/C/Z do potrace, absolutos ou relativos)
// e devolve o path novo junto com a caixa exata (extremos das curvas incluídos).
function transformPath(d, { tx, ty, sx, sy }) {
  const tokens = d.match(/[MmLlHhVvCcZz]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? []
  const params = { M: 2, L: 2, H: 1, V: 1, C: 6 }
  const out = []
  const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  const include = (x, y) => {
    box.minX = Math.min(box.minX, x)
    box.maxX = Math.max(box.maxX, x)
    box.minY = Math.min(box.minY, y)
    box.maxY = Math.max(box.maxY, y)
  }
  let cmd = ''
  let startsSubpath = false
  let cx = 0
  let cy = 0
  let startX = 0
  let startY = 0
  let i = 0

  while (i < tokens.length) {
    const token = tokens[i]
    if (/^[a-zA-Z]$/.test(token)) {
      cmd = token
      out.push(cmd)
      i += 1
      if (cmd === 'Z' || cmd === 'z') {
        cx = startX
        cy = startY
      }
      startsSubpath = cmd === 'M' || cmd === 'm'
      continue
    }
    const upper = cmd.toUpperCase()
    const relative = cmd !== upper
    const count = params[upper]
    if (!count) throw new Error(`Comando de path não suportado: ${cmd}`)
    const v = tokens.slice(i, i + count).map(Number)
    i += count

    if (upper === 'M' || upper === 'L') {
      const x = relative ? cx + sx * v[0] : tx + sx * v[0]
      const y = relative ? cy + sy * v[1] : ty + sy * v[1]
      out.push(relative ? round(sx * v[0]) : round(x), relative ? round(sy * v[1]) : round(y))
      if (startsSubpath) {
        startX = x
        startY = y
        startsSubpath = false
      }
      include(x, y)
      cx = x
      cy = y
    } else if (upper === 'H') {
      const x = relative ? cx + sx * v[0] : tx + sx * v[0]
      out.push(relative ? round(sx * v[0]) : round(x))
      include(x, cy)
      cx = x
    } else if (upper === 'V') {
      const y = relative ? cy + sy * v[0] : ty + sy * v[0]
      out.push(relative ? round(sy * v[0]) : round(y))
      include(cx, y)
      cy = y
    } else {
      const pts = [0, 2, 4].map((k) =>
        relative ? [cx + sx * v[k], cy + sy * v[k + 1]] : [tx + sx * v[k], ty + sy * v[k + 1]],
      )
      out.push(...(relative ? v.map((n, k) => round(k % 2 === 0 ? sx * n : sy * n)) : pts.flat().map((n) => round(n))))
      cubicBounds([cx, cy], pts[0], pts[1], pts[2], include)
      ;[cx, cy] = pts[2]
    }
  }

  return { d: out.join(' ').replace(/ ?([a-zA-Z]) ?/g, '$1'), box }
}

function cubicBounds(p0, p1, p2, p3, include) {
  include(...p0)
  include(...p3)
  for (const axis of [0, 1]) {
    const a = -p0[axis] + 3 * p1[axis] - 3 * p2[axis] + p3[axis]
    const b = 2 * (p0[axis] - 2 * p1[axis] + p2[axis])
    const c = p1[axis] - p0[axis]
    const roots = []
    if (Math.abs(a) < 1e-9) {
      if (Math.abs(b) > 1e-9) roots.push(-c / b)
    } else {
      const disc = b * b - 4 * a * c
      if (disc >= 0) {
        const s = Math.sqrt(disc)
        roots.push((-b + s) / (2 * a), (-b - s) / (2 * a))
      }
    }
    for (const t of roots) {
      if (t <= 0 || t >= 1) continue
      const mt = 1 - t
      const at = (k) => mt ** 3 * p0[k] + 3 * mt ** 2 * t * p1[k] + 3 * mt * t ** 2 * p2[k] + t ** 3 * p3[k]
      include(at(0), at(1))
    }
  }
}

function viewBoxFor(list) {
  const minX = Math.min(...list.map((s) => s.box.minX))
  const minY = Math.min(...list.map((s) => s.box.minY))
  const maxX = Math.max(...list.map((s) => s.box.maxX))
  const maxY = Math.max(...list.map((s) => s.box.maxY))
  const pad = (maxY - minY) * 0.02
  const width = round(maxX - minX + pad * 2, 1)
  const height = round(maxY - minY + pad * 2, 1)
  return { viewBox: `${round(minX - pad, 1)} ${round(minY - pad, 1)} ${width} ${height}`, width, height }
}
