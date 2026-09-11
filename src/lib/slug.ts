/** Tira acentos e deixa minúsculo: "Anéis" → "aneis" */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

/** "Brinco Argola Dourada 2,5cm" → "brinco-argola-dourada-2-5cm" */
export function slugify(text: string): string {
  return normalizeText(text)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '')
}
