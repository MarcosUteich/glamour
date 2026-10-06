import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@/config'
import { DEMO_CATEGORIES, DEMO_PRODUCTS } from '@/demo/catalog'
import { injectApp, missingFromData, prerenderPage, renderStorePage, shouldPrerender, type InitialData } from './entry-server'

const data: InitialData = {
  catalog: { categories: DEMO_CATEGORIES, products: DEMO_PRODUCTS },
  settings: { ...DEFAULT_SETTINGS, min_order_cents: 50000, faq: [{ question: 'Aceitam Pix?', answer: 'Sim, a partir de {pedido_minimo}.' }] },
}
const product = DEMO_PRODUCTS.find((p) => p.code === 'BR-101')!
/** formatBRL usa espaço fixo (NBSP) depois do R$ */
const plain = (html: string) => html.replace(/\u00a0/g, ' ')

describe('páginas montadas no servidor', () => {
  it('home sai com o título, o pedido mínimo atual, as peças e os links das categorias', () => {
    const html = plain(renderStorePage('/', data))
    expect(html).toMatch(/<h1[^>]*>.*Semijoias/)
    expect(html).toContain('R$ 500,00')
    expect(html).toContain(`href="/produto/${product.slug}"`)
    expect(html).toContain('href="/categoria/brincos"')
    expect(html).toContain('href="/como-comprar"')
    // <title>/<meta> das páginas ficam só no <head> (o servidor de SEO escreve os certos)
    expect(html).toMatch(/^(<!--\$-->)?<div/)
    expect(html).not.toMatch(/<title>|<meta /)
  })

  it('categoria sai com o nome no h1 e as peças dela', () => {
    const html = renderStorePage('/categoria/brincos', data)
    expect(html).toMatch(/<h1[^>]*>.*Brincos/)
    expect(html).toContain(product.name)
    expect(html).not.toContain('Batom matte')
  })

  it('peça sai com nome, preço, foto em prioridade e detalhes', () => {
    const html = plain(renderStorePage(`/produto/${product.slug}`, data))
    expect(html).toContain(`<h1 class="mt-2 text-2xl font-semibold leading-tight text-tinta sm:text-3xl">${product.name}</h1>`)
    expect(html).toContain('R$ 24,90')
    expect(html).toContain('Detalhes da peça')
    expect(html).toMatch(/fetchPriority="high"/)
  })

  it('peça que saiu do catálogo mostra o aviso, como no navegador', () => {
    expect(renderStorePage('/produto/nao-existe', data)).toContain('Essa peça não está mais no catálogo')
  })

  it('como comprar sai com o passo a passo e as perguntas salvas no painel', () => {
    const html = plain(renderStorePage('/como-comprar', data))
    expect(html).toContain('Como comprar no atacado')
    expect(html).toContain('Aceitam Pix?')
    expect(html).toContain('Sim, a partir de R$ 500,00.')
    expect(html).toContain('href="/categoria/brincos"')
  })

  it('o aviso de cookies nunca entra no HTML do servidor', () => {
    expect(renderStorePage('/', data)).not.toContain('Aviso de cookies')
  })

  it('não monta busca, pedido, meus pedidos nem o painel', () => {
    const url = (path: string) => new URL(`https://glamour.test${path}`)
    expect(shouldPrerender(url('/'))).toBe(true)
    expect(shouldPrerender(url('/produto/x'))).toBe(true)
    expect(shouldPrerender(url('/qualquer'))).toBe(true)
    expect(shouldPrerender(url('/?busca=argola'))).toBe(false)
    expect(shouldPrerender(url('/pedido'))).toBe(false)
    expect(shouldPrerender(url('/pedido/confirmado/GLM-1'))).toBe(false)
    expect(shouldPrerender(url('/meus-pedidos'))).toBe(false)
    expect(shouldPrerender(url('/admin/produtos'))).toBe(false)
  })

  it('põe a loja dentro de #root e os dados logo depois, sem deixar texto fechar o <script>', () => {
    const risky: InitialData = {
      ...data,
      catalog: { ...data.catalog, products: [{ ...product, name: '</script><script>alert(1)</script>' }] },
    }
    const page = injectApp('<body><div id="root"></div></body>', '<main>ok</main>', risky)
    expect(page).toContain('<div id="root"><main>ok</main></div>')
    expect(page).toContain('<script id="glamour-dados" type="application/json">')
    expect(page.match(/<\/script>/g)).toHaveLength(1)
    expect(injectApp('<body>sem raiz</body>', '<main/>', data)).toBe('<body>sem raiz</body>')
  })

  it('peça ou categoria recém-cadastrada pede o catálogo de novo', () => {
    const url = (path: string) => new URL(`https://glamour.test${path}`)
    expect(missingFromData(url(`/produto/${product.slug}`), data)).toBe(false)
    expect(missingFromData(url('/produto/peca-nova-br-999'), data)).toBe(true)
    expect(missingFromData(url('/categoria/brincos'), data)).toBe(false)
    expect(missingFromData(url('/categoria/nova'), data)).toBe(true)
    expect(missingFromData(url('/categoria/novidades'), data)).toBe(false)
    expect(missingFromData(url('/'), data)).toBe(false)
  })

  it('catálogo enorme: a página sai sem pré-montagem (o navegador monta)', () => {
    const many = Array.from({ length: 4000 }, (_, i) => ({ ...product, id: `p${i}`, slug: `peca-${i}`, description: 'x'.repeat(150) }))
    const big: InitialData = { ...data, catalog: { ...data.catalog, products: many } }
    const html = '<body><div id="root"></div></body>'
    expect(prerenderPage(html, '/', big)).toBe(html)
    expect(prerenderPage(html, '/', data)).toContain('glamour-dados')
  })
})
