// Perguntas frequentes da página "Como comprar": as mesmas no site, nos dados estruturados (FAQPage) e no painel.
// A loja edita em /admin → Config (coluna settings.faq, migration 0008). Sem nada salvo, valem as padrão abaixo.
// Os marcadores {pedido_minimo}, {retirada}, {horario} e {whatsapp} viram os valores atuais de /admin → Config,
// então o texto nunca fica desatualizado. Sem imports do app com @/: roda no servidor de SEO.
import { formatBRPhone } from '../lib/phone'
import { brl } from './titles'

export interface FaqItem {
  question: string
  answer: string
}

export interface FaqValues {
  minOrderCents: number
  pickupText: string
  hoursText: string | null
  /** WhatsApp da loja, só números (como em settings.whatsapp_number) */
  whatsappNumber: string
}

export const FAQ_LIMITS = { items: 30, question: 200, answer: 2000 } as const

export const FAQ_PLACEHOLDERS = ['{pedido_minimo}', '{retirada}', '{horario}', '{whatsapp}'] as const

/** Só o que o site e a loja já fazem hoje. Pagamento, troca, garantia e CNPJ a loja acrescenta no painel. */
export const DEFAULT_FAQ: FaqItem[] = [
  {
    question: 'Qual é o pedido mínimo?',
    answer:
      'O pedido mínimo é de {pedido_minimo}, somando todas as peças do pedido. Dá para misturar semijoias, acessórios e maquiagem para chegar ao valor.',
  },
  {
    question: 'Como faço o pedido?',
    answer:
      'Escolha as peças e as quantidades no catálogo, confira o total e informe seu nome e WhatsApp. O site monta a mensagem com o pedido completo e você envia para o WhatsApp da loja, {whatsapp}.',
  },
  {
    question: 'O que acontece depois que eu envio o pedido?',
    answer:
      'A loja confere as peças, confirma o pedido pelo WhatsApp e avisa quando ele estiver separado e pronto para retirada. Você também acompanha o andamento em "Meus pedidos", só com o número do WhatsApp.',
  },
  {
    question: 'Onde eu retiro o pedido?',
    answer: 'Na loja: {retirada}. Horário: {horario}.',
  },
  {
    question: 'Os preços do site são de atacado?',
    answer: 'Sim. Os preços são por unidade e valem para pedidos a partir de {pedido_minimo}.',
  },
  {
    question: 'Como sei se a peça está disponível?',
    answer:
      'Cada peça mostra se está disponível ou se restam poucas unidades. As que estão sem estoque aparecem marcadas e não entram no pedido, e a loja confirma tudo antes de separar.',
  },
]

/**
 * Lê o valor salvo no banco. null = nada salvo (ou valor inválido): usar as padrão.
 * Lista vazia = a loja tirou todas as perguntas.
 */
export function parseFaq(raw: unknown): FaqItem[] | null {
  if (!Array.isArray(raw)) return null
  const items: FaqItem[] = []
  for (const entry of raw.slice(0, FAQ_LIMITS.items)) {
    if (!entry || typeof entry !== 'object') continue
    const { question, answer } = entry as Record<string, unknown>
    if (typeof question !== 'string' || typeof answer !== 'string') continue
    const q = question.trim().slice(0, FAQ_LIMITS.question)
    const a = answer.trim().slice(0, FAQ_LIMITS.answer)
    if (q && a) items.push({ question: q, answer: a })
  }
  return raw.length > 0 && items.length === 0 ? null : items
}

/** Perguntas que valem: as salvas pela loja ou, sem nada salvo, as padrão. */
export const faqOrDefault = (raw: unknown): FaqItem[] => parseFaq(raw) ?? DEFAULT_FAQ

/** Troca os marcadores pelos valores atuais da loja. */
export function fillFaq(items: FaqItem[], values: FaqValues): FaqItem[] {
  const replacements: Record<string, string> = {
    '{pedido_minimo}': brl(values.minOrderCents),
    '{retirada}': values.pickupText.trim().replace(/[.\s]+$/, ''),
    '{horario}': values.hoursText?.trim().replace(/[.\s]+$/, '') || 'confirme pelo WhatsApp',
    '{whatsapp}': formatBRPhone(values.whatsappNumber) || values.whatsappNumber,
  }
  const fill = (text: string) => text.replace(/\{(pedido_minimo|retirada|horario|whatsapp)\}/g, (m) => replacements[m] ?? m)
  return items.map((item) => ({ question: fill(item.question), answer: fill(item.answer) }))
}

/** FAQPage do schema.org com as perguntas já preenchidas. */
export function faqJsonLd(items: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  }
}
