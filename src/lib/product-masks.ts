import { centsToInput } from './money'

/** Digitação monetária da direita para a esquerda: 2490 → 24,90. */
export function maskProductPrice(value: string): string {
  const digits = value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 10)
  return digits ? centsToInput(Number(digits)) : ''
}

/** Peso em gramas, com até duas casas decimais (numeric(8, 2) no banco). */
export function maskProductWeight(value: string): string {
  const clean = value.replace(/\./g, ',').replace(/[^\d,]/g, '')
  const separator = clean.indexOf(',')
  const integer = (separator < 0 ? clean : clean.slice(0, separator))
    .replace(/^0+(?=\d)/, '').slice(0, 6)
  if (separator < 0) return integer
  return `${integer || '0'},${clean.slice(separator + 1).replace(/,/g, '').slice(0, 2)}`
}

/** Mantém unidades, aros e extensores; padroniza os decimais das medidas. */
export function maskProductSize(value: string): string {
  return value.replace(/(\d)\.(?=\d)/g, '$1,')
}
