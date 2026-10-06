// Preço de atacado: o preço cadastrado na peça (o original) com o desconto definido em /admin → Config.
// Quem cobra o pedido é o banco (função wholesale_price_cents da migration 0009); esta é a mesma conta, para a
// loja, o painel e as páginas do Google/Meta mostrarem o preço antes. Sem dependências do app.

export const MAX_WHOLESALE_DISCOUNT_PCT = 90

/** Valor lido do banco → porcentagem inteira de 0 a 90. Ausente ou inválido (banco sem a migration 0009) = 0. */
export function normalizeDiscountPct(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  return Math.min(Math.max(Math.round(value), 0), MAX_WHOLESALE_DISCOUNT_PCT)
}

/** Centavos com o desconto, arredondados ao centavo (meio centavo sobe, como o round do Postgres); nunca zero. */
export function wholesalePriceCents(priceCents: number, discountPct: number): number {
  const pct = normalizeDiscountPct(discountPct)
  return Math.max(1, Math.round((priceCents * (100 - pct)) / 100))
}

/** A peça com o preço de atacado ao lado do original. */
export function withWholesalePrice<T extends { price_cents: number }>(
  product: T,
  discountPct: number,
): T & { wholesale_price_cents: number } {
  return { ...product, wholesale_price_cents: wholesalePriceCents(product.price_cents, discountPct) }
}

/** Tem preço original para mostrar riscado? (desconto 0 = um preço só) */
export function hasWholesaleDiscount(product: { price_cents: number; wholesale_price_cents: number }): boolean {
  return product.wholesale_price_cents < product.price_cents
}
