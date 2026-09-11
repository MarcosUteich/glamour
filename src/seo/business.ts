// Dados fixos da loja, usados no site, nos dados estruturados do Google e na função de SEO.
// Nome, endereço e telefone precisam ser idênticos aos do Perfil da Empresa no Google.
// Sem imports do app (alias @/ ou import.meta.env): este arquivo também roda no build e na Vercel.

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'

export interface OpeningHours {
  days: DayOfWeek[]
  /** "10:00" */
  opens: string
  /** "22:00" */
  closes: string
}

export interface Business {
  name: string
  siteName: string
  phone: string
  address: {
    street: string
    neighborhood: string
    mall: string
    city: string
    region: string
    postalCode: string
    country: string
  }
  /** URL do Instagram da loja, quando houver */
  instagram: string | null
  /** Vazio = o horário não entra nos dados estruturados (nada inventado) */
  openingHours: OpeningHours[]
  /** Pedido mínimo usado na home gerada no build; o valor vivo vem de settings */
  minOrderCents: number
}

export const BUSINESS: Business = {
  name: 'Glamour Acessórios',
  siteName: 'Glamour Atacado',
  phone: '+55 51 99227-5944',
  address: {
    street: 'Av. Assis Brasil, 3522 - Loja 160',
    neighborhood: 'Jardim Lindóia',
    mall: 'Lindóia Shopping',
    city: 'Porto Alegre',
    region: 'RS',
    postalCode: '91010-003',
    country: 'BR',
  },
  instagram: null,
  // Preencha quando o horário estiver confirmado, ex.:
  // { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], opens: '10:00', closes: '22:00' }
  openingHours: [],
  minOrderCents: 49000,
}

export const PICKUP_TEXT = 'Glamour Acessórios · Lindóia Shopping · Loja 160 · Av. Assis Brasil, 3522 · Porto Alegre/RS'
