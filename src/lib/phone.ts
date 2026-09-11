export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

/** DDD + número (10 ou 11 dígitos), sem o 55 do país e sem zero à esquerda. */
export function normalizeBRPhone(value: string): string {
  let digits = onlyDigits(value).replace(/^0+/, '')
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    digits = digits.slice(2)
  }
  return digits
}

/** Celular (9 + 8 dígitos) ou fixo (8 dígitos começando em 2–5), com DDD válido. */
export function isValidBRPhone(value: string): boolean {
  return /^[1-9]{2}(9\d{8}|[2-5]\d{7})$/.test(normalizeBRPhone(value))
}

/** Máscara progressiva para o campo: "(51) 99999-9999" ou "(51) 3333-4444". */
export function formatBRPhone(value: string): string {
  const d = normalizeBRPhone(value).slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/** Número no formato do wa.me: 55 + DDD + número. */
export function toWhatsAppNumber(value: string): string {
  return `55${normalizeBRPhone(value)}`
}
