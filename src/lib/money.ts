const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** Centavos → "R$ 1.234,56" (com espaço não separável entre R$ e o valor). */
export function formatBRL(cents: number): string {
  return BRL.format(cents / 100)
}

/**
 * Texto digitado no painel → centavos. Aceita "24,90", "24.90", "1.234,56", "R$ 49" e "49".
 * Devolve null quando não dá para entender o valor.
 */
export function parseBRLToCents(input: string): number | null {
  const clean = input.replace(/R\$|\s/g, '')
  if (!/^\d[\d.,]*$/.test(clean)) return null

  let normalized: string
  if (clean.includes(',')) {
    normalized = clean.replace(/\./g, '').replace(',', '.')
  } else if (/\.\d{1,2}$/.test(clean) && (clean.match(/\./g) ?? []).length === 1) {
    normalized = clean
  } else {
    normalized = clean.replace(/\./g, '')
  }

  const value = Number(normalized)
  if (!Number.isFinite(value)) return null
  return Math.round(value * 100)
}

/** Centavos → "24,90" para preencher campos de edição. */
export function centsToInput(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
