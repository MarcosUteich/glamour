// Dados fixos da loja, usados no site, nos dados estruturados do Google, no catálogo da Meta e nas funções de SEO.
// Nome, endereço e telefone precisam ser idênticos aos do Perfil da Empresa no Google (Google Maps).
// Sem imports do app (alias @/ ou import.meta.env): este arquivo também roda no build, na Vercel e no servidor Node.

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'

export interface OpeningHours {
  days: DayOfWeek[]
  /** "10:00" */
  opens: string
  /** "22:00" */
  closes: string
}

export interface Business {
  /** Nome da loja, igual ao do Perfil da Empresa no Google */
  name: string
  /** Nome do site: aparece no Google, na prévia do WhatsApp e na aba do navegador */
  siteName: string
  /** Outros nomes pelos quais a loja é conhecida */
  alternateNames: string[]
  /** Telefone de contato do atacado (WhatsApp) */
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
  /** Coordenadas do pino no Google Maps */
  geo: { latitude: number; longitude: number }
  /** Link fixo do Perfil da Empresa no Google Maps */
  mapsUrl: string
  /**
   * Link para deixar avaliação no Google. Pegue em Perfil da Empresa → "Pedir avaliações" e cole aqui;
   * com ele preenchido, a mensagem de "Retirado" do painel já pede a avaliação.
   */
  reviewUrl: string | null
  /** Perfis oficiais da loja (Instagram, Facebook...) */
  social: string[]
  /** Vazio = o horário não entra nos dados estruturados (nada inventado) */
  openingHours: OpeningHours[]
  /** Pedido mínimo usado na home gerada no build e como reserva; o valor vivo vem de /admin → Config */
  minOrderCents: number
}

export const BUSINESS: Business = {
  name: 'Glamour Lindóia',
  siteName: 'Glamour Lindóia Atacado',
  alternateNames: ['Glamour Acessórios', 'Glamour Atacado'],
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
  geo: { latitude: -30.0097795, longitude: -51.1519193 },
  mapsUrl: 'https://maps.google.com/?cid=13724727791516573833',
  reviewUrl: null,
  social: ['https://www.instagram.com/glamour_lindoia/'],
  // Mesmo horário do site e do Lindóia Shopping. Se a loja abrir aos domingos, acrescente
  // { days: ['Sunday'], opens: '14:00', closes: '19:00' } e ajuste também o Perfil da Empresa.
  openingHours: [
    { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], opens: '10:00', closes: '21:00' },
  ],
  minOrderCents: 49900,
}

export const PICKUP_TEXT = 'Glamour Lindóia · Lindóia Shopping · Loja 160 (térreo) · Av. Assis Brasil, 3522 · Porto Alegre/RS'

export const HOURS_TEXT = 'Segunda a sábado, das 10h às 21h'
