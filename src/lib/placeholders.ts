// Ilustrações douradas (no estilo do tapume) para peças ainda sem foto e para o modo demonstração.
const BG = '#F3E7EB'
const GOLD = '#C4A062'

const art = (body: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="${BG}"/>` +
      `<g fill="none" stroke="${GOLD}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`,
  )}`

const dot = (x: number, y: number, r = 5) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${GOLD}" stroke="none"/>`
const diamond = (x: number, y: number, s = 12) =>
  `<path d="M${x} ${y - s} L${x + s * 0.8} ${y} L${x} ${y + s} L${x - s * 0.8} ${y} Z" fill="${GOLD}" stroke="none"/>`

const ART: Record<string, string> = {
  brincos: art(`<circle cx="70" cy="112" r="30"/><circle cx="130" cy="112" r="30"/>${dot(70, 74)}${dot(130, 74)}`),
  colares: art(`<path d="M35 55 Q100 165 165 55"/><path d="M100 110 v10"/>${diamond(100, 134)}`),
  pulseiras: art(`<ellipse cx="100" cy="100" rx="60" ry="34"/><ellipse cx="100" cy="100" rx="47" ry="24" stroke-width="2"/>`),
  aneis: art(`<circle cx="100" cy="118" r="38"/>${diamond(100, 70, 14)}`),
  piercings: art(`<path d="M82 82 A28 28 0 1 0 118 82"/>${dot(82, 82, 6)}${dot(118, 82, 6)}`),
  tornozeleiras: art(
    `<path d="M35 85 Q100 150 165 85"/>${dot(61, 106)}${dot(87, 116)}${dot(113, 116)}${dot(139, 106)}`,
  ),
  conjuntos: art(
    `<path d="M45 45 Q100 130 155 45"/>${diamond(100, 100, 10)}<circle cx="70" cy="150" r="15"/><circle cx="130" cy="150" r="15"/>`,
  ),
  pingentes: art(`<circle cx="100" cy="45" r="7"/><path d="M100 52 v18"/><path d="M100 76 L130 113 L100 150 L70 113 Z"/>`),
  correntes: art(
    [0, 1, 2, 3, 4]
      .map((i) => `<ellipse cx="${56 + i * 22}" cy="${144 - i * 22}" rx="15" ry="8" transform="rotate(-45 ${56 + i * 22} ${144 - i * 22})"/>`)
      .join(''),
  ),
  maquiagem: art(
    `<rect x="78" y="104" width="44" height="58" rx="5"/><path d="M84 104 V76 L116 60 V104"/><path d="M78 124 h44" stroke-width="2"/>`,
  ),
}

const FALLBACK = art(`${diamond(100, 100, 42).replace(`fill="${GOLD}" stroke="none"`, '')}<path d="M66 100 h68"/>`)

export function categoryArt(slug?: string | null): string {
  return (slug && ART[slug]) || FALLBACK
}
