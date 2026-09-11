import { describe, expect, it } from 'vitest'
import { filterProducts, isNewProduct, visibleCategories } from './catalog'
import type { Category, Product } from './types'

const cat = (slug: string, name: string, order: number, active = true): Category => ({
  id: `c-${slug}`,
  name,
  slug,
  code_prefix: null,
  image_url: null,
  sort_order: order,
  active,
})

const prod = (id: string, category: string, name: string, extra: Partial<Product> = {}): Product => ({
  id,
  category_id: `c-${category}`,
  name,
  slug: id,
  code: id.toUpperCase(),
  description: null,
  material: null,
  plating: null,
  size: null,
  shade: null,
  weight_g: null,
  price_cents: 1000,
  stock: null,
  active: true,
  created_at: '2020-01-01T00:00:00Z',
  photos: [],
  ...extra,
})

const categories = [cat('brincos', 'Brincos', 10), cat('aneis', 'Anéis', 20), cat('maquiagem', 'Maquiagem', 30)]
const products = [
  prod('br-1', 'brincos', 'Brinco argola dourada', { plating: 'Ouro 18k' }),
  prod('an-1', 'aneis', 'Anel solitário', { size: 'Aro 16' }),
  prod('mq-1', 'maquiagem', 'Batom matte', { shade: 'Nude 02', created_at: new Date().toISOString() }),
]

describe('filterProducts', () => {
  it('filtra por categoria', () => {
    expect(filterProducts(products, categories, { slug: 'aneis' }).map((p) => p.id)).toEqual(['an-1'])
  })

  it('"novidades" mostra só peças recentes', () => {
    expect(filterProducts(products, categories, { slug: 'novidades' }).map((p) => p.id)).toEqual(['mq-1'])
  })

  it('busca sem se importar com acento, maiúscula ou ordem das palavras', () => {
    expect(filterProducts(products, categories, { query: 'SOLITARIO' }).map((p) => p.id)).toEqual(['an-1'])
    expect(filterProducts(products, categories, { query: 'dourada argola' }).map((p) => p.id)).toEqual(['br-1'])
    expect(filterProducts(products, categories, { query: 'nude' }).map((p) => p.id)).toEqual(['mq-1'])
    expect(filterProducts(products, categories, { query: 'anéis' }).map((p) => p.id)).toEqual(['an-1'])
    expect(filterProducts(products, categories, { query: 'br-1' }).map((p) => p.id)).toEqual(['br-1'])
  })

  it('categoria desconhecida não mostra nada', () => {
    expect(filterProducts(products, categories, { slug: 'xyz' })).toEqual([])
  })
})

describe('visibleCategories', () => {
  it('esconde categorias vazias ou inativas e respeita a ordem', () => {
    const list = visibleCategories([...categories, cat('pulseiras', 'Pulseiras', 5), cat('x', 'X', 1, false)], products)
    expect(list.map((c) => c.slug)).toEqual(['brincos', 'aneis', 'maquiagem'])
  })
})

describe('isNewProduct', () => {
  it('considera novidade até 30 dias', () => {
    const now = Date.parse('2026-09-10T12:00:00Z')
    expect(isNewProduct('2026-09-01T12:00:00Z', now)).toBe(true)
    expect(isNewProduct('2026-08-01T12:00:00Z', now)).toBe(false)
  })
})
