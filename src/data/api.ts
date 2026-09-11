import { DEFAULT_SETTINGS } from '@/config'
import { DEMO_CATEGORIES, DEMO_PRODUCTS } from '@/demo/catalog'
import { isValidBRPhone, normalizeBRPhone } from '@/lib/phone'
import { photoUrl, supabase } from '@/lib/supabase'
import type { Category, CreatedOrder, Product, Settings } from '@/lib/types'

export interface Catalog {
  categories: Category[]
  products: Product[]
}

export const PRODUCT_COLUMNS =
  'id, category_id, name, slug, code, description, material, plating, size, shade, weight_g, price_cents, stock, active, created_at, product_images (path_sm, path_lg, sort_order)'

export interface ProductRow extends Omit<Product, 'photos'> {
  product_images: Array<{ path_sm: string; path_lg: string; sort_order: number }> | null
}

export function toProduct(row: ProductRow): Product {
  const { product_images, ...rest } = row
  const photos = [...(product_images ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((img) => ({ sm: photoUrl(img.path_sm), lg: photoUrl(img.path_lg) }))
  return { ...rest, weight_g: rest.weight_g == null ? null : Number(rest.weight_g), photos }
}

/** Catálogo da loja: só categorias e peças ativas (mesmo que quem esteja vendo seja admin). */
export async function fetchCatalog(): Promise<Catalog> {
  if (!supabase) return { categories: DEMO_CATEGORIES, products: DEMO_PRODUCTS }

  const [categories, products] = await Promise.all([
    supabase.from('categories').select('id, name, slug, code_prefix, image_url, sort_order, active').eq('active', true).order('sort_order'),
    supabase.from('products').select(PRODUCT_COLUMNS).eq('active', true).order('created_at', { ascending: false }),
  ])
  if (categories.error) throw categories.error
  if (products.error) throw products.error

  const activeIds = new Set((categories.data as Category[]).map((c) => c.id))
  return {
    categories: categories.data as Category[],
    products: (products.data as unknown as ProductRow[]).map(toProduct).filter((p) => activeIds.has(p.category_id)),
  }
}

export async function fetchSettings(): Promise<Settings> {
  if (!supabase) return DEFAULT_SETTINGS
  const { data, error } = await supabase
    .from('settings')
    .select('whatsapp_number, min_order_cents, pickup_text, hours_text, instagram_url')
    .eq('id', 1)
    .single()
  if (error) throw error
  return data as Settings
}

export class OrderError extends Error {
  readonly code: string
  readonly detail: string | null

  constructor(code: string, detail?: string | null) {
    super(code)
    this.code = code
    this.detail = detail ?? null
  }
}

export interface NewOrder {
  name: string
  phone: string
  items: Array<{ product_id: string; quantity: number }>
}

export async function createOrder(input: NewOrder): Promise<CreatedOrder> {
  if (!supabase) return createDemoOrder(input)
  const { data, error } = await supabase.rpc('create_order', {
    p_customer_name: input.name,
    p_customer_phone: input.phone,
    p_items: input.items,
  })
  if (error) throw new OrderError(error.message, error.details)
  return data as CreatedOrder
}

// Mesmas regras do create_order do banco, para o modo demonstração
function createDemoOrder(input: NewOrder): CreatedOrder {
  const name = input.name.trim().replace(/\s+/g, ' ')
  if (name.length < 2) throw new OrderError('invalid_name')
  if (!isValidBRPhone(input.phone)) throw new OrderError('invalid_phone')
  if (input.items.length === 0) throw new OrderError('empty_cart')

  const items = input.items.map(({ product_id, quantity }) => {
    const p = DEMO_PRODUCTS.find((x) => x.id === product_id)
    if (!p?.active) throw new OrderError('product_unavailable', JSON.stringify({ code: p?.code ?? product_id }))
    if (p.stock !== null && quantity > p.stock) {
      throw new OrderError('insufficient_stock', JSON.stringify({ code: p.code, available: p.stock }))
    }
    return {
      product_id: p.id,
      name: p.name,
      code: p.code,
      size: p.size,
      shade: p.shade,
      unit_price_cents: p.price_cents,
      quantity,
      total_cents: p.price_cents * quantity,
    }
  })

  const total = items.reduce((sum, i) => sum + i.total_cents, 0)
  if (total < DEFAULT_SETTINGS.min_order_cents) throw new OrderError('below_minimum')

  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date()).replaceAll('-', '')
  return {
    order_number: `GLM-${day}-${String(nextDemoSequence(day)).padStart(3, '0')}`,
    customer_name: name,
    customer_phone: normalizeBRPhone(input.phone),
    total_cents: total,
    item_count: items.reduce((sum, i) => sum + i.quantity, 0),
    min_order_cents: DEFAULT_SETTINGS.min_order_cents,
    items,
  }
}

function nextDemoSequence(day: string): number {
  const key = 'glamour:demo-sequencia'
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? 'null') as { day: string; last: number } | null
    const last = saved?.day === day ? saved.last + 1 : 1
    localStorage.setItem(key, JSON.stringify({ day, last }))
    return last
  } catch {
    return 1
  }
}
