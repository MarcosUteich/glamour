export interface Category {
  id: string
  name: string
  slug: string
  code_prefix: string | null
  image_url: string | null
  sort_order: number
  active: boolean
}

export interface ProductPhoto {
  sm: string
  lg: string
}

export interface Product {
  id: string
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
  /** null = a loja não controla estoque desta peça */
  stock: number | null
  active: boolean
  created_at: string
  photos: ProductPhoto[]
}

export interface Settings {
  whatsapp_number: string
  min_order_cents: number
  pickup_text: string
  hours_text: string | null
  instagram_url: string | null
}

export interface CreatedOrderItem {
  product_id: string
  name: string
  code: string
  size: string | null
  shade: string | null
  unit_price_cents: number
  quantity: number
  total_cents: number
}

export interface CreatedOrder {
  order_number: string
  customer_name: string
  customer_phone: string
  total_cents: number
  item_count: number
  min_order_cents: number
  items: CreatedOrderItem[]
}

export type EventType =
  | 'product_view'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'cart_view'
  | 'checkout_started'
  | 'order_created'
  | 'whatsapp_clicked'
