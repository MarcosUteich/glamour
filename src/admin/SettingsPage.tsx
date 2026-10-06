import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { fetchSettings } from '@/data/api'
import { centsToInput, formatBRL, parseBRLToCents } from '@/lib/money'
import { normalizeBRPhone } from '@/lib/phone'
import type { Settings } from '@/lib/types'
import { saveSettings } from './api'
import { FaqEditor } from './FaqEditor'
import { AdminCard, PageTitle } from './ui'
import { PICKUP_TEXT } from '@/seo/business'
import { MAX_WHOLESALE_DISCOUNT_PCT, wholesalePriceCents } from '@/seo/pricing'

/** Peça de exemplo da explicação do desconto */
const EXAMPLE_PRICE_CENTS = 10_000

export function SettingsPage() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['settings'], queryFn: fetchSettings })
  type FormState = { whats: string; min: string; discount: string; pickup: string; hours: string; instagram: string }
  const [form, setForm] = useState<FormState | null>(null)
  const [seededFrom, setSeededFrom] = useState<Settings | null>(null)

  // Semeia o formulário quando as configurações chegam (padrão do React para estado derivado de dados assíncronos)
  if (data && data !== seededFrom) {
    setSeededFrom(data)
    setForm({
      whats: normalizeBRPhone(data.whatsapp_number),
      min: centsToInput(data.min_order_cents),
      discount: String(data.wholesale_discount_pct ?? 0),
      pickup: data.pickup_text,
      hours: data.hours_text ?? '',
      instagram: data.instagram_url ?? '',
    })
  }

  const mutation = useMutation({
    mutationFn: (settings: Settings) => saveSettings(settings),
    onSuccess: () => {
      toast.success('Configurações salvas')
      qc.invalidateQueries({ queryKey: ['settings'] })
      // O desconto muda o preço de atacado de todas as peças
      qc.invalidateQueries({ queryKey: ['catalog'] })
      qc.invalidateQueries({ queryKey: ['admin-products'] })
      qc.invalidateQueries({ queryKey: ['admin-product'] })
    },
    onError: () => toast.error('Não foi possível salvar'),
  })

  if (!form) return null

  const minCents = parseBRLToCents(form.min)
  const whatsDigits = form.whats.replace(/\D/g, '')
  // Banco sem a migration 0009: o campo aparece, mas não é salvo
  const discountAvailable = data?.wholesale_discount_pct !== undefined
  const discountPct = form.discount === '' ? 0 : Number(form.discount)
  const discountValid = discountPct <= MAX_WHOLESALE_DISCOUNT_PCT
  const valid = whatsDigits.length >= 10 && minCents !== null && discountValid && form.pickup.trim().length > 3
  const example = formatBRL(EXAMPLE_PRICE_CENTS)
  const discountHelp = !discountAvailable
    ? 'Para usar o desconto, aplique a migration 0009_desconto_atacado.sql no Supabase.'
    : !discountValid
      ? `No máximo ${MAX_WHOLESALE_DISCOUNT_PCT}%.`
      : discountPct === 0
        ? 'Sem desconto: o site mostra só o preço cadastrado em cada peça.'
        : `Vale para todas as peças, sobre o preço original. Ex.: peça de ${example} sai por ` +
          `${formatBRL(wholesalePriceCents(EXAMPLE_PRICE_CENTS, discountPct))} no atacado; o site mostra os dois preços.`

  return (
    <div>
      <PageTitle>Configurações</PageTitle>
      <AdminCard className="space-y-4">
        <div className="space-y-1.5">
          <Label>WhatsApp da loja (recebe os pedidos)</Label>
          <Input
            inputMode="numeric"
            value={form.whats}
            onChange={(e) => setForm({ ...form, whats: e.target.value.replace(/\D/g, '') })}
            placeholder="51992275944"
          />
          <p className="text-[12px] text-muted-foreground">Só números, com DDD. Ex.: 51992275944</p>
        </div>
        <div className="space-y-1.5">
          <Label>Pedido mínimo</Label>
          <Input inputMode="decimal" value={form.min} onChange={(e) => setForm({ ...form, min: e.target.value })} placeholder="799,90" />
          <p className="text-[12px] text-muted-foreground">Somando os preços de atacado das peças.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="desconto-atacado">Desconto do atacado</Label>
          <div className="relative">
            <Input
              id="desconto-atacado"
              inputMode="numeric"
              value={form.discount}
              disabled={!discountAvailable}
              onChange={(e) => setForm({ ...form, discount: e.target.value.replace(/\D/g, '').slice(0, 2) })}
              placeholder="0"
              className="pr-9"
              aria-invalid={!discountValid}
              aria-describedby="desconto-atacado-ajuda"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-sm text-muted-foreground">
              %
            </span>
          </div>
          <p
            id="desconto-atacado-ajuda"
            className={discountValid ? 'text-[12px] text-muted-foreground' : 'text-[12px] text-destructive'}
          >
            {discountHelp}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label>Texto de retirada</Label>
          <Textarea
            value={form.pickup}
            onChange={(e) => setForm({ ...form, pickup: e.target.value })}
            placeholder={PICKUP_TEXT}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Horário de funcionamento (opcional)</Label>
          <Input
            value={form.hours}
            onChange={(e) => setForm({ ...form, hours: e.target.value })}
            placeholder="Segunda a sábado, das 10h às 21h"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Instagram (opcional)</Label>
          <Input
            value={form.instagram}
            onChange={(e) => setForm({ ...form, instagram: e.target.value })}
            placeholder="https://instagram.com/glamour..."
          />
        </div>
        <Button
          className="w-full"
          disabled={!valid || mutation.isPending}
          onClick={() =>
            mutation.mutate({
              whatsapp_number: `55${whatsDigits}`,
              min_order_cents: minCents!,
              ...(discountAvailable ? { wholesale_discount_pct: discountPct } : {}),
              pickup_text: form.pickup.trim(),
              hours_text: form.hours.trim() || null,
              instagram_url: form.instagram.trim() || null,
            })
          }
        >
          Salvar configurações
        </Button>
      </AdminCard>
      <FaqEditor />
    </div>
  )
}
