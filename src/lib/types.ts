import type { FaqItem } from '@/seo/faq'

export interface Category {
  id: string
  name: string
  slug: string
  /** Texto da página da categoria e da busca do Google (migration 0006) */
  description?: string | null
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
  /** Preço original da peça, como cadastrado no painel */
  price_cents: number
  /** Preço de atacado (o cobrado): price_cents com o desconto de /admin → Config. Ver seo/pricing.ts */
  wholesale_price_cents: number
  /** null = a loja não controla estoque desta peça */
  stock: number | null
  active: boolean
  created_at: string
  photos: ProductPhoto[]
}

export interface Settings {
  whatsapp_number: string
  /** Pedido mínimo, somando os preços de atacado */
  min_order_cents: number
  /** Desconto do atacado sobre o preço original, em % (migration 0009); ausente = banco ainda sem a coluna */
  wholesale_discount_pct?: number
  pickup_text: string
  hours_text: string | null
  instagram_url: string | null
  /** Perguntas da página Como comprar salvas no painel (migration 0008); null ou ausente = as padrão */
  faq?: FaqItem[] | null
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

import type { OrderStatus } from './orders'

/** Um pedido antigo, devolvido por get_orders_by_phone (consulta sem login) */
export interface CustomerOrder {
  order_number: string
  created_at: string
  status: OrderStatus
  total_cents: number
  item_count: number
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
