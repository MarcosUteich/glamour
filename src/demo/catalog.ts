// Produtos de exemplo, usados só quando o Supabase ainda não está configurado.
import { categoryArt } from '@/lib/placeholders'
import { slugify } from '@/lib/slug'
import type { Category, Product } from '@/lib/types'

const CATEGORIES: Array<[slug: string, name: string, prefix: string]> = [
  ['brincos', 'Brincos', 'BR'],
  ['colares', 'Colares', 'CL'],
  ['pulseiras', 'Pulseiras', 'PL'],
  ['aneis', 'Anéis', 'AN'],
  ['piercings', 'Piercings', 'PC'],
  ['tornozeleiras', 'Tornozeleiras', 'TZ'],
  ['conjuntos', 'Conjuntos', 'CJ'],
  ['pingentes', 'Pingentes', 'PG'],
  ['correntes', 'Correntes', 'CR'],
  ['maquiagem', 'Maquiagem', 'MQ'],
]

export const DEMO_CATEGORIES: Category[] = CATEGORIES.map(([slug, name, prefix], i) => ({
  id: `demo-${slug}`,
  name,
  slug,
  code_prefix: prefix,
  image_url: null,
  sort_order: (i + 1) * 10,
  active: true,
}))

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString()
const gold = { material: 'Latão', plating: 'Ouro 18k' }

const SEEDS: Array<[category: string, code: string, name: string, priceCents: number, extra?: Partial<Product>]> = [
  ['brincos', 'BR-101', 'Brinco argola lisa', 2490, { ...gold, size: '2,5 cm', created_at: daysAgo(3), description: 'Argola clássica e leve, com fecho click. Vende o ano inteiro.' }],
  ['brincos', 'BR-102', 'Brinco ponto de luz', 1990, { material: 'Zircônia', plating: 'Ródio branco', size: '6 mm', created_at: daysAgo(12) }],
  ['brincos', 'BR-103', 'Brinco gota rosé', 3290, { material: 'Cristal', plating: 'Ouro 18k', size: '3 cm' }],
  ['colares', 'CL-101', 'Colar riviera', 7990, { material: 'Zircônias', plating: 'Ouro 18k', size: '45 cm', stock: 6 }],
  ['colares', 'CL-102', 'Colar ponto de luz', 3290, { ...gold, size: '40 cm + 5 cm de extensor' }],
  ['colares', 'CL-103', 'Choker elos', 4590, { ...gold, size: '35 cm', created_at: daysAgo(8) }],
  ['pulseiras', 'PL-101', 'Pulseira elos cartier', 3990, { ...gold, size: '18 cm' }],
  ['pulseiras', 'PL-102', 'Pulseira riviera', 5990, { material: 'Zircônias', plating: 'Ródio branco', size: '17 cm', stock: 0 }],
  ['aneis', 'AN-101', 'Anel solitário', 2990, { material: 'Zircônia', plating: 'Ouro 18k', size: 'Aro 16' }],
  ['aneis', 'AN-102', 'Anel trançado', 2490, { ...gold, size: 'Aros 14 a 20' }],
  ['piercings', 'PC-101', 'Piercing argolinha', 1290, { material: 'Aço cirúrgico', plating: 'Ouro 18k', size: '8 mm' }],
  ['tornozeleiras', 'TZ-101', 'Tornozeleira bolinhas', 2790, { ...gold, size: '23 cm', created_at: daysAgo(5) }],
  ['conjuntos', 'CJ-101', 'Conjunto coração', 6990, { ...gold, size: 'Colar 45 cm · brinco 1 cm' }],
  ['pingentes', 'PG-101', 'Pingente letra', 1890, { ...gold, size: '1,2 cm', description: 'Todas as letras. Diga quais letras você quer na conversa pelo WhatsApp.' }],
  ['correntes', 'CR-101', 'Corrente veneziana', 3490, { ...gold, size: '60 cm' }],
  ['maquiagem', 'MQ-101', 'Batom matte', 990, { shade: 'Nude 02', created_at: daysAgo(2), description: 'Alta pigmentação e longa duração. Caixa com 6 unidades do mesmo tom.' }],
  ['maquiagem', 'MQ-102', 'Paleta de sombras', 2890, { shade: 'Rosé · 9 cores' }],
  ['maquiagem', 'MQ-103', 'Máscara de cílios volume', 1490, { shade: 'Preta' }],
]

export const DEMO_PRODUCTS: Product[] = SEEDS.map(([category, code, name, priceCents, extra], i) => ({
  id: `demo-${code.toLowerCase()}`,
  category_id: `demo-${category}`,
  name,
  slug: slugify(`${name} ${code}`),
  code,
  description: null,
  material: null,
  plating: null,
  size: null,
  shade: null,
  weight_g: null,
  price_cents: priceCents,
  stock: null,
  active: true,
  created_at: daysAgo(40 + i),
  photos: [{ sm: categoryArt(category), lg: categoryArt(category) }],
  ...extra,
})).sort((a, b) => b.created_at.localeCompare(a.created_at))
