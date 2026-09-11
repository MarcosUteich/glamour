import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { fetchSettings } from '@/data/api'
import { centsToInput, parseBRLToCents } from '@/lib/money'
import { normalizeBRPhone } from '@/lib/phone'
import type { Settings } from '@/lib/types'
import { saveSettings } from './api'
import { AdminCard, PageTitle } from './ui'

export function SettingsPage() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['settings'], queryFn: fetchSettings })
  type FormState = { whats: string; min: string; pickup: string; hours: string; instagram: string }
  const [form, setForm] = useState<FormState | null>(null)
  const [seededFrom, setSeededFrom] = useState<Settings | null>(null)

  // Semeia o formulário quando as configurações chegam (padrão do React para estado derivado de dados assíncronos)
  if (data && data !== seededFrom) {
    setSeededFrom(data)
    setForm({
      whats: normalizeBRPhone(data.whatsapp_number),
      min: centsToInput(data.min_order_cents),
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
    },
    onError: () => toast.error('Não foi possível salvar'),
  })

  if (!form) return null

  const minCents = parseBRLToCents(form.min)
  const whatsDigits = form.whats.replace(/\D/g, '')
  const valid = whatsDigits.length >= 10 && minCents !== null && form.pickup.trim().length > 3

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
          <Input inputMode="decimal" value={form.min} onChange={(e) => setForm({ ...form, min: e.target.value })} placeholder="490,00" />
        </div>
        <div className="space-y-1.5">
          <Label>Texto de retirada</Label>
          <Textarea
            value={form.pickup}
            onChange={(e) => setForm({ ...form, pickup: e.target.value })}
            placeholder="Glamour Acessórios · Lindóia Shopping · Loja 160 · Av. Assis Brasil, 3522 · Porto Alegre/RS"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Horário de funcionamento (opcional)</Label>
          <Input
            value={form.hours}
            onChange={(e) => setForm({ ...form, hours: e.target.value })}
            placeholder="Seg. a sáb., 10h às 22h"
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
              pickup_text: form.pickup.trim(),
              hours_text: form.hours.trim() || null,
              instagram_url: form.instagram.trim() || null,
            })
          }
        >
          Salvar configurações
        </Button>
      </AdminCard>
    </div>
  )
}
