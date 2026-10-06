import { QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createQueryClient } from '@/lib/query-client'
import { DEFAULT_FAQ } from '@/seo/faq'
import type { FaqState } from './api'
import { FaqEditor } from './FaqEditor'

function render(state: FaqState) {
  const client = createQueryClient({ server: true })
  client.setQueryData(['admin-faq'], state)
  return renderToString(createElement(QueryClientProvider, { client }, createElement(FaqEditor)))
}

describe('editor das perguntas frequentes (painel)', () => {
  it('mostra as perguntas salvas, com os marcadores explicados', () => {
    const html = render({ available: true, isDefault: false, items: [{ question: 'Aceitam Pix?', answer: 'Sim.' }] })
    expect(html).toContain('value="Aceitam Pix?"')
    expect(html).toContain('Sim.')
    expect(html).toContain('{pedido_minimo}')
    expect(html).toContain('Salvar perguntas')
    expect(html).not.toContain('0008_como_comprar.sql')
  })

  it('sem a migration 0008, mostra as padrão e explica o que rodar', () => {
    const html = render({ available: false, isDefault: true, items: DEFAULT_FAQ })
    expect(html).toContain('0008_como_comprar.sql')
    expect(html).toContain(DEFAULT_FAQ[0].question)
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Salvar perguntas/)
  })
})
