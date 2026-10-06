import { DEFAULT_SETTINGS } from '@/config'
import { DEMO_CATEGORIES, DEMO_PRODUCTS, DEMO_WHOLESALE_DISCOUNT_PCT } from '@/demo/catalog'
import { attributionForOrder, type Attribution } from '@/lib/attribution'
import { isValidBRPhone, normalizeBRPhone } from '@/lib/phone'
import { isDemo, photoUrl, restRpc, restSelect, type RestError } from '@/lib/rest'
import type { Category, CreatedOrder, CustomerOrder, Product, Settings } from '@/lib/types'
import { parseFaq } from '@/seo/faq'
import { normalizeDiscountPct, withWholesalePrice } from '@/seo/pricing'

export interface Catalog {
  categories: Category[]
  products: Product[]
}

export const PRODUCT_COLUMNS =
  'id, category_id, name, slug, code, description, material, plating, size, shade, weight_g, price_cents, stock, active, created_at, product_images (path_sm, path_lg, sort_order)'

export interface ProductRow extends Omit<Product, 'photos' | 'wholesale_price_cents'> {
  product_images: Array<{ path_sm: string; path_lg: string; sort_order: number }> | null
}

/** Linha do banco → peça, já com o preço de atacado (desconto de /admin → Config). */
export function toProduct(row: ProductRow, discountPct: number): Product {
  const { product_images, ...rest } = row
  const photos = [...(product_images ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((img) => ({ sm: photoUrl(img.path_sm), lg: photoUrl(img.path_lg) }))
  const product = { ...rest, weight_g: rest.weight_g == null ? null : Number(rest.weight_g), photos }
  return withWholesalePrice(product, discountPct)
}

/** O banco ainda não recebeu a migration 0009 (coluna settings.wholesale_discount_pct)? */
const missingDiscountColumn = (error: RestError) =>
  error.code === '42703' || /wholesale_discount_pct/.test(error.message)

/**
 * Desconto do atacado (/admin → Config). Vem junto com o catálogo, para preço e peças saírem sempre da mesma
 * leitura (sem piscar o preço cheio enquanto as configurações carregam). Sem a migration 0009, 0%.
 */
export async function fetchWholesaleDiscountPct(): Promise<number> {
  if (isDemo) return DEMO_WHOLESALE_DISCOUNT_PCT
  const { data, error } = await restSelect<Array<{ wholesale_discount_pct?: number }>>(
    'settings',
    'wholesale_discount_pct',
    ['id=eq.1'],
  )
  if (error) {
    if (missingDiscountColumn(error)) return 0
    throw error
  }
  return normalizeDiscountPct(data[0]?.wholesale_discount_pct)
}

/** Catálogo da loja: só categorias e peças ativas (sempre como visitante, mesmo com o admin logado). */
export async function fetchCatalog(): Promise<Catalog> {
  if (isDemo) return { categories: DEMO_CATEGORIES, products: DEMO_PRODUCTS }

  const [categories, products, discountPct] = await Promise.all([
    // select=* funciona antes e depois da migration 0006 (coluna description)
    restSelect<Category[]>('categories', '*', ['active=eq.true', 'order=sort_order.asc']),
    restSelect<ProductRow[]>('products', PRODUCT_COLUMNS, ['active=eq.true', 'order=created_at.desc']),
    fetchWholesaleDiscountPct(),
  ])
  if (categories.error) throw categories.error
  if (products.error) throw products.error

  const activeIds = new Set(categories.data.map((c) => c.id))
  return {
    categories: categories.data,
    products: products.data.map((row) => toProduct(row, discountPct)).filter((p) => activeIds.has(p.category_id)),
  }
}

type SettingsRow = Omit<Settings, 'faq'> & { faq?: unknown }

export async function fetchSettings(): Promise<Settings> {
  if (isDemo) return DEFAULT_SETTINGS
  // select=* funciona antes e depois da migration 0008 (coluna faq, as perguntas da página Como comprar)
  const { data, error } = await restSelect<SettingsRow[]>('settings', '*', ['id=eq.1'])
  if (error) throw error
  const row = data[0]
  if (!row) throw new Error('Configurações da loja não encontradas')
  return {
    whatsapp_number: row.whatsapp_number,
    min_order_cents: row.min_order_cents,
    // select=* traz a coluna depois da migration 0009; antes dela, fica ausente (o painel avisa)
    ...(row.wholesale_discount_pct === undefined
      ? {}
      : { wholesale_discount_pct: normalizeDiscountPct(row.wholesale_discount_pct) }),
    pickup_text: row.pickup_text,
    hours_text: row.hours_text,
    instagram_url: row.instagram_url,
    faq: parseFaq(row.faq),
    banners: row.banners,
  }
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
  /** De onde a cliente chegou ao site; sem informar, usa a origem guardada neste aparelho */
  attribution?: Attribution | null
}

/** O banco ainda não recebeu a migration 0007 (create_order sem o parâmetro da origem)? */
const missingAttributionParam = (error: { code?: string; message?: string }) =>
  error.code === 'PGRST202' || /p_attribution|could not find the function/i.test(error.message ?? '')

export async function createOrder(input: NewOrder): Promise<CreatedOrder> {
  if (isDemo) return createDemoOrder(input)
  const base = { p_customer_name: input.name, p_customer_phone: input.phone, p_items: input.items }
  const attribution = input.attribution === undefined ? attributionForOrder() : input.attribution
  let result = await restRpc<CreatedOrder>('create_order', attribution ? { ...base, p_attribution: attribution } : base)
  // Sem a migration 0007 aplicada, repete sem a origem: o pedido nunca para por causa dela
  if (result.error && attribution && missingAttributionParam(result.error)) {
    result = await restRpc<CreatedOrder>('create_order', base)
  }
  if (result.error) throw new OrderError(result.error.message, result.error.details)
  return result.data
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
      unit_price_cents: p.wholesale_price_cents,
      quantity,
      total_cents: p.wholesale_price_cents * quantity,
    }
  })

  const total = items.reduce((sum, i) => sum + i.total_cents, 0)
  if (total < DEFAULT_SETTINGS.min_order_cents) throw new OrderError('below_minimum')

  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date()).replaceAll('-', '')
  const order: CreatedOrder = {
    order_number: `GLM-${day}-${String(nextDemoSequence(day)).padStart(3, '0')}`,
    customer_name: name,
    customer_phone: normalizeBRPhone(input.phone),
    total_cents: total,
    item_count: items.reduce((sum, i) => sum + i.quantity, 0),
    min_order_cents: DEFAULT_SETTINGS.min_order_cents,
    items,
  }
  saveDemoOrder(order)
  return order
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

// Histórico de pedidos do modo demonstração, para testar "meus pedidos" sem Supabase
const DEMO_ORDERS_KEY = 'glamour:demo-pedidos'

function saveDemoOrder(order: CreatedOrder) {
  try {
    const all = JSON.parse(localStorage.getItem(DEMO_ORDERS_KEY) ?? '[]') as CreatedOrder[]
    all.unshift(order)
    localStorage.setItem(DEMO_ORDERS_KEY, JSON.stringify(all.slice(0, 50)))
  } catch {
    // sem armazenamento disponível: a consulta por telefone só não encontra nada
  }
}

/** Consulta pedidos pelo WhatsApp (sem login). Erros chegam como OrderError; ver lib/orders.ts. */
export async function fetchOrdersByPhone(phone: string): Promise<CustomerOrder[]> {
  if (isDemo) return fetchDemoOrdersByPhone(phone)
  const { data, error } = await restRpc<CustomerOrder[] | null>('get_orders_by_phone', { p_phone: phone })
  if (error) throw new OrderError(error.message, error.details)
  return data ?? []
}

function fetchDemoOrdersByPhone(phone: string): CustomerOrder[] {
  if (!isValidBRPhone(phone)) throw new OrderError('invalid_phone')
  const normalized = normalizeBRPhone(phone)
  let all: CreatedOrder[]
  try {
    all = JSON.parse(localStorage.getItem(DEMO_ORDERS_KEY) ?? '[]') as CreatedOrder[]
  } catch {
    all = []
  }
  return all
    .filter((o) => o.customer_phone === normalized)
    .map((o) => ({
      order_number: o.order_number,
      created_at: new Date().toISOString(),
      status: 'novo',
      total_cents: o.total_cents,
      item_count: o.item_count,
      items: o.items,
    }))
}
