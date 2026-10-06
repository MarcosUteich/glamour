import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DEFAULT_FAQ, FAQ_LIMITS, FAQ_PLACEHOLDERS, type FaqItem } from '@/seo/faq'
import { fetchFaqForEdit, saveFaq, type FaqState } from './api'
import { AdminCard } from './ui'

/** Perguntas frequentes da página /como-comprar (e do FAQPage que o Google lê). */
export function FaqEditor() {
  const qc = useQueryClient()
  const { data, isError } = useQuery({ queryKey: ['admin-faq'], queryFn: fetchFaqForEdit })
  const [items, setItems] = useState<FaqItem[] | null>(null)
  const [seededFrom, setSeededFrom] = useState<FaqState | null>(null)

  // Semeia a lista quando as perguntas chegam (mesmo padrão do formulário de configurações)
  if (data && data !== seededFrom) {
    setSeededFrom(data)
    setItems(data.items)
  }

  const mutation = useMutation({
    mutationFn: (list: FaqItem[] | null) => saveFaq(list),
    onSuccess: (_, list) => {
      toast.success(list === null ? 'Voltamos às perguntas padrão' : 'Perguntas salvas')
      qc.invalidateQueries({ queryKey: ['admin-faq'] })
      qc.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: () => toast.error('Não foi possível salvar as perguntas'),
  })

  if (isError) {
    return (
      <AdminCard className="mt-6">
        <p className="text-sm text-destructive">Não foi possível carregar as perguntas frequentes.</p>
      </AdminCard>
    )
  }
  if (!data || !items) return null

  const update = (index: number, patch: Partial<FaqItem>) =>
    setItems(items.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  const move = (index: number, delta: number) => {
    const next = [...items]
    const [item] = next.splice(index, 1)
    next.splice(index + delta, 0, item)
    setItems(next)
  }
  const cleaned = items
    .map((item) => ({ question: item.question.trim(), answer: item.answer.trim() }))
    .filter((item) => item.question || item.answer)
  const incomplete = cleaned.some((item) => !item.question || !item.answer)
  const disabled = !data.available || mutation.isPending

  return (
    <AdminCard className="mt-6 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-malva-800">Perguntas frequentes</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          Aparecem na página{' '}
          <a href="/como-comprar" target="_blank" rel="noopener noreferrer" className="font-medium text-malva-700 underline">
            Como comprar
          </a>{' '}
          e no Google. Escreva {FAQ_PLACEHOLDERS.join(', ')} para o texto acompanhar as configurações acima.
          {data.isDefault && ' Hoje o site mostra as perguntas padrão.'}
        </p>
      </div>

      {!data.available && (
        <p className="rounded-xl bg-[#F4EBD8] p-3 text-[13px] leading-relaxed text-[#6E5321]">
          Para editar, rode a migration <code>supabase/migrations/0008_como_comprar.sql</code> no SQL Editor do Supabase.
          Enquanto isso, o site mostra as perguntas abaixo.
        </p>
      )}

      {items.map((item, i) => (
        <div key={i} className="space-y-2 rounded-xl border border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor={`faq-q-${i}`}>Pergunta {i + 1}</Label>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" aria-label="Subir" disabled={disabled || i === 0} onClick={() => move(i, -1)}>
                <ArrowUp />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Descer"
                disabled={disabled || i === items.length - 1}
                onClick={() => move(i, 1)}
              >
                <ArrowDown />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Remover pergunta"
                disabled={disabled}
                onClick={() => setItems(items.filter((_, j) => j !== i))}
              >
                <Trash2 />
              </Button>
            </div>
          </div>
          <Input
            id={`faq-q-${i}`}
            value={item.question}
            maxLength={FAQ_LIMITS.question}
            disabled={disabled}
            onChange={(e) => update(i, { question: e.target.value })}
            placeholder="Ex.: Quais são as formas de pagamento?"
          />
          <Textarea
            aria-label={`Resposta da pergunta ${i + 1}`}
            value={item.answer}
            maxLength={FAQ_LIMITS.answer}
            disabled={disabled}
            rows={3}
            onChange={(e) => update(i, { answer: e.target.value })}
            placeholder="Resposta"
          />
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || items.length >= FAQ_LIMITS.items}
          onClick={() => setItems([...items, { question: '', answer: '' }])}
        >
          <Plus /> Adicionar pergunta
        </Button>
        <Button variant="ghost" size="sm" disabled={disabled} onClick={() => setItems(DEFAULT_FAQ)}>
          Voltar às perguntas padrão
        </Button>
      </div>
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        Vale acrescentar o que só a loja pode responder: formas de pagamento, troca e garantia, nota fiscal, se precisa de
        CNPJ e se envia para outras cidades.
      </p>
      {incomplete && <p className="text-[12px] text-destructive">Preencha a pergunta e a resposta, ou remova a pergunta.</p>}

      <Button className="w-full" disabled={disabled || incomplete} onClick={() => mutation.mutate(cleaned)}>
        Salvar perguntas
      </Button>
    </AdminCard>
  )
}
