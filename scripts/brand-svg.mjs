// Otimiza os paths do letreiro com o svgo: coordenadas inteiras (no letreiro, 1 unidade é menos de 0,03 px na
// tela) e comandos mais curtos. O desenho fica igual e o letreiro, que vai dentro do JavaScript e do HTML de
// cada página, cai de ~72 KB para ~15 KB.
import { optimize } from 'svgo'

const OPTIONS = {
  multipass: true,
  floatPrecision: 0,
  plugins: [{ name: 'preset-default', params: { overrides: { mergePaths: false } } }],
}

export function optimizePath(d, viewBox) {
  const svg = optimize(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><path d="${d}"/></svg>`, OPTIONS).data
  const match = svg.match(/ d="([^"]+)"/)
  if (!match) throw new Error('svgo não devolveu o path otimizado')
  return match[1]
}
