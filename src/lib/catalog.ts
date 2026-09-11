import { NEW_PRODUCT_DAYS } from '@/config'
import { normalizeText } from './slug'
import type { Category, Product } from './types'

export function isNewProduct(createdAt: string, now = Date.now()): boolean {
  return now - new Date(createdAt).getTime() < NEW_PRODUCT_DAYS * 86_400_000
}

export function isSoldOut(product: Pick<Product, 'stock'>): boolean {
  return product.stock !== null && product.stock <= 0
}

/** Linha curta de detalhes do card: "BR-102 · 2,5 cm" ou "MQ-014 · Nude 02". */
export function productSubtitle(product: Pick<Product, 'code' | 'size' | 'shade'>): string {
  return [product.code, product.size ?? product.shade].filter(Boolean).join(' · ')
}

/** Categorias ativas que têm pelo menos uma peça, na ordem definida no painel. */
export function visibleCategories(categories: Category[], products: Product[]): Category[] {
  const withProducts = new Set(products.map((p) => p.category_id))
  return categories.filter((c) => c.active && withProducts.has(c.id)).sort((a, b) => a.sort_order - b.sort_order)
}

/** Filtra por categoria (ou "novidades") e pela busca, que olha nome, código, tom, tamanho, banho e categoria. */
export function filterProducts(
  products: Product[],
  categories: Category[],
  { slug, query }: { slug?: string | null; query?: string | null },
): Product[] {
  let list = products
  if (slug === 'novidades') {
    list = list.filter((p) => isNewProduct(p.created_at))
  } else if (slug) {
    const category = categories.find((c) => c.slug === slug)
    list = category ? list.filter((p) => p.category_id === category.id) : []
  }

  const terms = normalizeText(query ?? '').trim().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return list

  const categoryName = new Map(categories.map((c) => [c.id, c.name]))
  return list.filter((p) => {
    const haystack = normalizeText(
      [p.name, p.code, p.shade, p.size, p.plating, p.material, categoryName.get(p.category_id)].filter(Boolean).join(' '),
    )
    return terms.every((t) => haystack.includes(t))
  })
}
