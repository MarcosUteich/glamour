import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { fetchSettings } from '@/data/api'
import { requireSupabase } from '@/lib/supabase'
import type { Banner } from '@/lib/types'
import { BannerCarousel } from '@/components/catalog/BannerCarousel'
import { AdminCard } from './ui'

function validLink(value: string) {
  return !value || (/^\/(?!\/)/.test(value) && !/[\\\s]/.test(value)) || /^https?:\/\/[^\s]+$/i.test(value)
}

export function BannersEditor() {
  const qc = useQueryClient()
  const { data, isError } = useQuery({ queryKey: ['settings'], queryFn: fetchSettings })
  const [draft, setDraft] = useState<Banner[] | null>(null)
  const [uploading, setUploading] = useState(false)
  const banners = draft ?? data?.banners ?? []
  const available = data?.banners !== undefined
  const patch = (id: string, values: Partial<Banner>) => setDraft(banners.map((item) => item.id === id ? { ...item, ...values } : item))
  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await requireSupabase().from('settings').update({ banners }).eq('id', 1)
      if (error) throw error
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['settings'] })
      setDraft(null)
      toast.success('Banners salvos')
    },
    onError: () => toast.error('Não foi possível salvar os banners'),
  })
  async function upload(id: string, field: 'image_url' | 'mobile_image_url', file?: File) {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      toast.error('Use JPG, PNG ou WebP de até 5 MB')
      return
    }
    setUploading(true)
    try {
      const bitmap = await createImageBitmap(file)
      bitmap.close()
      const supabase = requireSupabase()
      const path = `${id}/${crypto.randomUUID()}.${file.type.split('/')[1]}`
      const { error } = await supabase.storage.from('banners').upload(path, file, { contentType: file.type, cacheControl: '31536000' })
      if (error) throw error
      const url = supabase.storage.from('banners').getPublicUrl(path).data.publicUrl
      setDraft((current) => (current ?? banners).map((item) => item.id === id ? { ...item, [field]: url } : item))
    } catch {
      toast.error('Não foi possível enviar a imagem')
    } finally { setUploading(false) }
  }
  const valid = banners.every((item) => item.title.trim() && item.image_url && item.mobile_image_url && validLink(item.link) && Number.isInteger(item.duration_seconds) && item.duration_seconds >= 2 && item.duration_seconds <= 120)
  return <AdminCard className="space-y-4">
    <p className="text-sm text-muted-foreground">Campanhas na home, na ordem abaixo. O tempo em segundos define quando passa para o próximo banner. Sem banners ativos, aparece a arte original.</p>
    {!available && <p className="text-sm text-destructive">{isError ? 'Não foi possível carregar os banners.' : data ? 'Aplique a migration 0010_banners.sql no Supabase para habilitar o cadastro.' : 'Carregando…'}</p>}
    <fieldset disabled={!available || uploading || mutation.isPending} className="space-y-4 disabled:opacity-60">
      {banners.map((banner, index) => <div key={banner.id} className="space-y-3 rounded-xl border border-border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-auto font-semibold">Banner {index + 1}</span>
          <Button variant="ghost" size="sm" disabled={index === 0} onClick={() => { const next = [...banners]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; setDraft(next) }}>Subir</Button>
          <Button variant="ghost" size="sm" disabled={index === banners.length - 1} onClick={() => { const next = [...banners]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; setDraft(next) }}>Descer</Button>
          <Button variant="ghost" size="sm" onClick={() => setDraft(banners.filter((item) => item.id !== banner.id))}>Remover</Button>
        </div>
        <label className="block space-y-1 text-sm">Título<Input value={banner.title} onChange={(event) => patch(banner.id, { title: event.target.value })} placeholder="Black Friday" /></label>
        <p className="text-xs text-muted-foreground">Descreve a campanha e identifica a imagem para acessibilidade. Inclua o texto visual na própria arte.</p>
        <label className="block space-y-1 text-sm">Link (opcional)<Input value={banner.link} onChange={(event) => patch(banner.id, { link: event.target.value.trim() })} placeholder="/categoria/brincos ou https://…" aria-invalid={!validLink(banner.link)} /></label>
        <label className="block space-y-1 text-sm">Tempo de exibição (segundos)<Input type="number" min={2} max={120} step={1} value={banner.duration_seconds || ''} onChange={(event) => patch(banner.id, { duration_seconds: Number(event.target.value) })} /></label>
        {(['image_url', 'mobile_image_url'] as const).map((field) => <div key={field} className="space-y-2">
          <label className="block space-y-1 text-sm">{field === 'image_url' ? 'Imagem para computador (obrigatória)' : 'Imagem para celular (obrigatória)'}<Input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { void upload(banner.id, field, event.target.files?.[0]); event.target.value = '' }} /></label>
          {banner[field] && <img src={banner[field]} alt={`Prévia: ${banner.title}`} className="max-h-48 max-w-full rounded-lg object-contain" />}
          {field === 'mobile_image_url' && banner[field] && <Button variant="ghost" size="sm" onClick={() => patch(banner.id, { mobile_image_url: '' })}>Remover imagem mobile</Button>}
        </div>)}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={banner.active} onChange={(event) => patch(banner.id, { active: event.target.checked })} />Ativo</label>
      </div>)}
      <p className="text-xs text-muted-foreground">JPG, PNG ou WebP, até 5 MB. Sugestão: computador 2000 × 666 px; celular 1000 × 1000 px. Use a mesma proporção entre as artes de cada formato para evitar saltos na página.</p>
      {banners.length > 0 && !valid && <p className="text-sm text-muted-foreground">Preencha título, imagem desktop, imagem mobile, link válido (ou vazio) e duração de 2 a 120 segundos em cada banner.</p>}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => setDraft([...banners, { id: crypto.randomUUID(), title: '', link: '', image_url: '', mobile_image_url: '', duration_seconds: 5, active: true }])}>Adicionar banner</Button>
        <Button disabled={!valid || draft === null} onClick={() => mutation.mutate()}>Salvar banners</Button>
      </div>
    </fieldset>
    {valid && banners.some((item) => item.active) && <div className="space-y-3">
      <h2 className="font-semibold">Prévia dos banners ativos</h2>
      <BannerCarousel key={JSON.stringify(banners)} banners={banners.filter((item) => item.active)} />
    </div>}
    {uploading && <p className="text-sm" role="status">Enviando imagem…</p>}
  </AdminCard>
}
