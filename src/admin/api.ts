import { PRODUCT_COLUMNS, toProduct, type ProductRow } from '@/data/api'
import { processProductImage } from '@/lib/images'
import { requireSupabase } from '@/lib/supabase'
import type { Category, Product, Settings } from '@/lib/types'
import type { OrderStatus } from '@/lib/orders'

export interface AdminOrderItem {
  id: string
  product_name: string
  product_code: string
  size: string | null
  shade: string | null
  unit_price_cents: number
  quantity: number
  total_cents: number
  product_id: string | null
}

export interface AdminOrder {
  id: string
  order_number: string
  customer_name: string
  customer_phone: string
  total_cents: number
  item_count: number
  status: OrderStatus
  admin_notes: string | null
  created_at: string
}

export interface AdminOrderDetail extends AdminOrder {
  order_items: AdminOrderItem[]
}

export interface DashboardData {
  orders_count: number
  pending_count: number
  confirmed_count: number
  cancelled_count: number
  total_cents: number
  by_status: Record<string, number>
  today_count: number
  today_total_cents: number
  top_added: Array<{ name: string; code: string; n: number }>
  top_sold: Array<{ name: string; code: string; n: number }>
}

export async function fetchAllCategories(): Promise<Category[]> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order')
  if (error) throw error
  return data as Category[]
}

export async function fetchAllProducts(): Promise<Product[]> {
  const supabase = requireSupabase()
  const { data, error } = await supabase.from('products').select(PRODUCT_COLUMNS).order('created_at', { ascending: false })
  if (error) throw error
  return (data as unknown as ProductRow[]).map(toProduct)
}

export async function fetchProduct(id: string): Promise<Product | null> {
  const supabase = requireSupabase()
  const { data, error } = await supabase.from('products').select(PRODUCT_COLUMNS).eq('id', id).maybeSingle()
  if (error) throw error
  return data ? toProduct(data as unknown as ProductRow) : null
}

export interface ProductInput {
  category_id: string
  name: string
  slug: string
  code: string
  description: string | null
  material: string | null
  plating: string | null
  size: string | null
  shade: string | null
  weight_g: number | null
  price_cents: number
  stock: number | null
  active: boolean
}

export async function saveProduct(input: ProductInput, id?: string): Promise<string> {
  const supabase = requireSupabase()
  if (id) {
    const { error } = await supabase.from('products').update(input).eq('id', id)
    if (error) throw error
    return id
  }
  const { data, error } = await supabase.from('products').insert(input).select('id').single()
  if (error) throw error
  return (data as { id: string }).id
}

export async function setProductField(
  id: string,
  patch: Partial<Pick<Product, 'price_cents' | 'stock' | 'active'>>,
): Promise<void> {
  const supabase = requireSupabase()
  const { error } = await supabase.from('products').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteProduct(id: string): Promise<void> {
  const supabase = requireSupabase()
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
}

export async function suggestCode(categoryId: string): Promise<string | null> {
  const supabase = requireSupabase()
  const { data, error } = await supabase.rpc('next_product_code', { p_category_id: categoryId })
  if (error) throw error
  return data as string | null
}

// Fotos ---------------------------------------------------------------

export interface StoredImage {
  id: string
  path_sm: string
  path_lg: string
  sort_order: number
  sm: string
  lg: string
}

export async function fetchProductImages(productId: string): Promise<StoredImage[]> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('product_images')
    .select('id, path_sm, path_lg, sort_order')
    .eq('product_id', productId)
    .order('sort_order')
  if (error) throw error
  const rows = (data ?? []) as Array<Omit<StoredImage, 'sm' | 'lg'>>
  return rows.map((row) => ({
    ...row,
    sm: supabase.storage.from('product-images').getPublicUrl(row.path_sm).data.publicUrl,
    lg: supabase.storage.from('product-images').getPublicUrl(row.path_lg).data.publicUrl,
  }))
}

export async function uploadProductImage(
  productId: string,
  file: File,
  sortOrder: number,
  /** Entra no nome do arquivo (ajuda no Google Imagens) */
  slug?: string,
): Promise<void> {
  const supabase = requireSupabase()
  const processed = await processProductImage(file)
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const base = `${productId}/${slug ? `${slug}-` : ''}${stamp}`
  const opts = { contentType: 'image/webp', cacheControl: '31536000', upsert: false }

  const [lg, sm] = await Promise.all([
    supabase.storage.from('product-images').upload(`${base}-lg.webp`, processed.lg, opts),
    supabase.storage.from('product-images').upload(`${base}-sm.webp`, processed.sm, opts),
  ])
  if (lg.error) throw lg.error
  if (sm.error) throw sm.error

  const { error } = await supabase.from('product_images').insert({
    product_id: productId,
    path_lg: `${base}-lg.webp`,
    path_sm: `${base}-sm.webp`,
    sort_order: sortOrder,
  })
  if (error) throw error
}

export async function deleteProductImage(image: StoredImage): Promise<void> {
  const supabase = requireSupabase()
  await supabase.storage.from('product-images').remove([image.path_lg, image.path_sm])
  const { error } = await supabase.from('product_images').delete().eq('id', image.id)
  if (error) throw error
}

export async function reorderProductImages(ids: string[]): Promise<void> {
  const supabase = requireSupabase()
  await Promise.all(ids.map((id, index) => supabase.from('product_images').update({ sort_order: index }).eq('id', id)))
}

// Categorias --------------------------------------------------------

export async function saveCategory(
  input: Pick<Category, 'name' | 'slug' | 'description' | 'code_prefix' | 'active' | 'sort_order'>,
  id?: string,
): Promise<void> {
  const supabase = requireSupabase()
  const { error } = id
    ? await supabase.from('categories').update(input).eq('id', id)
    : await supabase.from('categories').insert(input)
  if (error) throw error
}

export async function reorderCategories(ordered: Array<{ id: string; sort_order: number }>): Promise<void> {
  const supabase = requireSupabase()
  await Promise.all(ordered.map((c) => supabase.from('categories').update({ sort_order: c.sort_order }).eq('id', c.id)))
}

// Pedidos ---------------------------------------------------------

export async function fetchOrders(): Promise<AdminOrder[]> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, customer_name, customer_phone, total_cents, item_count, status, admin_notes, created_at')
    .order('created_at', { ascending: false })
    .limit(300)
  if (error) throw error
  return data as AdminOrder[]
}

export async function fetchOrder(id: string): Promise<AdminOrderDetail | null> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('orders')
    .select(
      'id, order_number, customer_name, customer_phone, total_cents, item_count, status, admin_notes, created_at, order_items (id, product_id, product_name, product_code, size, shade, unit_price_cents, quantity, total_cents)',
    )
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return (data as AdminOrderDetail) ?? null
}

export async function changeOrderStatus(id: string, status: OrderStatus): Promise<void> {
  const supabase = requireSupabase()
  const { error } = await supabase.rpc('set_order_status', { p_order_id: id, p_status: status })
  if (error) throw error
}

export async function saveOrderNotes(id: string, notes: string): Promise<void> {
  const supabase = requireSupabase()
  const { error } = await supabase.from('orders').update({ admin_notes: notes || null }).eq('id', id)
  if (error) throw error
}

// Configurações + painel -----------------------------------------

export async function saveSettings(input: Settings): Promise<void> {
  const supabase = requireSupabase()
  const { error } = await supabase.from('settings').update(input).eq('id', 1)
  if (error) throw error
}

export async function fetchDashboard(days: number): Promise<DashboardData> {
  const supabase = requireSupabase()
  const to = new Date()
  const from = new Date(to.getTime() - days * 86_400_000)
  const { data, error } = await supabase.rpc('admin_dashboard', { p_from: from.toISOString(), p_to: to.toISOString() })
  if (error) throw error
  return data as DashboardData
}
