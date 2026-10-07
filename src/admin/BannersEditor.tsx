import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Check, Clock3, ImagePlus, Loader2, Monitor, Plus, Smartphone, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { fetchSettings } from '@/data/api'
import { requireSupabase } from '@/lib/supabase'
import type { Banner } from '@/lib/types'
import { AdminCard } from './ui'

function validLink(value: string) {
  return !value || (/^\/(?!\/)/.test(value) && !/[\\\s]/.test(value)) || /^https?:\/\/[^\s]+$/i.test(value)
}

export function BannersEditor() {
  const qc = useQueryClient()
  const { data, isError, isPending, refetch } = useQuery({ queryKey: ['settings'], queryFn: fetchSettings })
  const [draft, setDraft] = useState<Banner[] | null>(null)
  const [uploading, setUploading] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const banners = draft ?? data?.banners ?? []
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
    setUploading(`${id}:${field}`)
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
    } finally { setUploading(null) }
  }
  function addBanner() {
    setDraft([...banners, { id: crypto.randomUUID(), title: '', link: '', image_url: '', mobile_image_url: '', duration_seconds: 5, active: true }])
  }
  function move(index: number, direction: -1 | 1) {
    const next = [...banners]
    ;[next[index + direction], next[index]] = [next[index], next[index + direction]]
    setDraft(next)
  }
  const valid = banners.every((item) => item.title.trim() && item.image_url && item.mobile_image_url && validLink(item.link) && Number.isInteger(item.duration_seconds) && item.duration_seconds >= 2 && item.duration_seconds <= 120)
  const busy = uploading !== null || mutation.isPending
  const disabled = isPending || isError || busy
  return <div className="space-y-5 [&_button:enabled]:cursor-pointer">
    <AdminCard className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium text-malva-800">Campanhas da home</p>
        <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">Cada banner tem uma arte para desktop, outra para celular e seu próprio tempo de exibição.</p>
        <p className="mt-3 text-xs text-muted-foreground">{banners.length} {banners.length === 1 ? 'banner' : 'banners'} · {banners.filter((item) => item.active).length} ativos · Exibição na ordem abaixo</p>
      </div>
      <Button size="sm" variant="outline" disabled={disabled} onClick={addBanner}><Plus className="size-4" />Adicionar banner</Button>
    </AdminCard>
    {isPending && <AdminCard><p className="flex items-center gap-2 text-sm text-muted-foreground" role="status"><Loader2 className="size-4 animate-spin" />Carregando banners…</p></AdminCard>}
    {isError && <AdminCard><p className="text-sm text-destructive" role="alert">Não foi possível carregar os banners.</p><Button size="sm" className="mt-3" variant="outline" onClick={() => void refetch()}>Tentar novamente</Button></AdminCard>}
    <fieldset disabled={disabled} className="min-w-0 space-y-5 disabled:opacity-70">
      {!isPending && !isError && banners.length === 0 && <div className="rounded-2xl border border-dashed border-malva-200 bg-white px-6 py-12 text-center">
        <ImagePlus className="mx-auto mb-3 size-9 text-malva-400" />
        <h2 className="font-semibold text-malva-800">Adicione sua primeira campanha</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">Envie as duas versões da arte e escolha por quanto tempo o banner fica na tela.</p>
        <Button size="sm" className="mt-5" onClick={addBanner}><Plus className="size-4" />Adicionar banner</Button>
      </div>}
      {banners.map((banner, index) => {
        const durationValid = Number.isInteger(banner.duration_seconds) && banner.duration_seconds >= 2 && banner.duration_seconds <= 120
        return <AdminCard key={banner.id} className="overflow-hidden p-0 sm:p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-malva-50/60 px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-sm font-semibold text-malva-700 ring-1 ring-border">{index + 1}</span>
              <div className="min-w-0"><h2 className="truncate text-sm font-semibold text-malva-800">{banner.title.trim() || `Novo banner ${index + 1}`}</h2>
                <p className="text-xs text-muted-foreground">{banner.duration_seconds || '—'} segundos por exibição</p></div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" aria-label={`Mover banner ${index + 1} para cima`} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp className="size-4" /></Button>
              <Button variant="ghost" size="icon" aria-label={`Mover banner ${index + 1} para baixo`} disabled={index === banners.length - 1} onClick={() => move(index, 1)}><ArrowDown className="size-4" /></Button>
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" aria-label={`Remover banner ${index + 1}`} onClick={() => setRemoving(banner.id)}><Trash2 className="size-4" /></Button>
            </div>
          </div>
          <div className="space-y-5 p-4 sm:p-5">
            {removing === banner.id && <div className="flex flex-wrap items-center gap-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">
              <p className="mr-auto">Remover este banner da lista?</p><Button size="sm" variant="outline" onClick={() => setRemoving(null)}>Cancelar</Button>
              <Button size="sm" variant="destructive" onClick={() => { setDraft(banners.filter((item) => item.id !== banner.id)); setRemoving(null) }}>Remover</Button>
            </div>}
            <div className="grid gap-4 lg:grid-cols-2">
              {(['image_url', 'mobile_image_url'] as const).map((field) => {
                const desktop = field === 'image_url'
                const Icon = desktop ? Monitor : Smartphone
                const uploadingImage = uploading === `${banner.id}:${field}`
                return <div key={field} className="overflow-hidden rounded-xl border border-border">
                  <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
                    <span className="flex items-center gap-2 text-sm font-medium text-malva-800"><Icon className="size-4" />{desktop ? 'Desktop' : 'Celular'}</span>
                    <span className="text-xs text-muted-foreground">{desktop ? '2000 × 666 px' : '1000 × 639 px'}</span>
                  </div>
                  <div className="flex h-44 items-center justify-center bg-malva-50/50 p-3 sm:h-48">
                    {banner[field] ? <img src={banner[field]} alt={`Prévia ${desktop ? 'desktop' : 'mobile'}: ${banner.title || `banner ${index + 1}`}`} className="max-h-full max-w-full rounded object-contain" />
                      : <div className="text-center text-muted-foreground"><ImagePlus className="mx-auto mb-2 size-7 opacity-50" /><p className="text-xs">Envie a arte para {desktop ? 'desktop' : 'celular'}</p></div>}
                  </div>
                  <div className="border-t border-border p-3">
                    <label className="relative flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-full border border-input bg-white px-3.5 text-[13px] font-semibold text-malva-700 transition hover:bg-malva-50 focus-within:ring-2 focus-within:ring-malva-400">
                      {uploadingImage ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                      {uploadingImage ? 'Enviando imagem…' : banner[field] ? 'Trocar imagem' : 'Selecionar imagem'}
                      <input type="file" className="absolute inset-0 w-full cursor-pointer opacity-0" accept="image/jpeg,image/png,image/webp" aria-label={`${banner[field] ? 'Trocar' : 'Selecionar'} imagem ${desktop ? 'desktop' : 'mobile'} do banner ${index + 1}`}
                        onChange={(event) => { void upload(banner.id, field, event.target.files?.[0]); event.target.value = '' }} />
                    </label>
                  </div>
                </div>
              })}
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
              <label className="block space-y-1.5 text-sm font-medium text-malva-800">Título<Input value={banner.title} onChange={(event) => patch(banner.id, { title: event.target.value })} placeholder="Ex.: Coleção de primavera" /><span className="block text-xs font-normal text-muted-foreground">Identifica a campanha e descreve a imagem para acessibilidade.</span></label>
              <label className="block space-y-1.5 text-sm font-medium text-malva-800"><span className="flex items-center gap-1.5"><Clock3 className="size-4" />Tempo (segundos)</span><Input type="number" min={2} max={120} step={1} aria-invalid={!durationValid} value={banner.duration_seconds || ''} onChange={(event) => patch(banner.id, { duration_seconds: Number(event.target.value) })} /><span className={`block text-xs font-normal ${durationValid ? 'text-muted-foreground' : 'text-destructive'}`}>De 2 a 120 segundos.</span></label>
            </div>
            <label className="block space-y-1.5 text-sm font-medium text-malva-800">Link de destino <span className="font-normal text-muted-foreground">(opcional)</span><Input value={banner.link} onChange={(event) => patch(banner.id, { link: event.target.value.trim() })} placeholder="/categoria/brincos ou https://…" aria-invalid={!validLink(banner.link)} />{!validLink(banner.link) && <span className="block text-xs text-destructive">Informe um caminho do site ou endereço http:// ou https://.</span>}</label>
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-malva-50/70 p-3">
              <div><span className="text-sm font-medium text-malva-800">{banner.active ? 'Banner ativo' : 'Banner inativo'}</span><p className="mt-0.5 text-xs text-muted-foreground">{banner.active ? 'Aparece na sequência da home.' : 'Fica salvo, sem aparecer na home.'}</p></div>
              <input type="checkbox" role="switch" className="size-5 shrink-0 accent-malva-600" checked={banner.active} onChange={(event) => patch(banner.id, { active: event.target.checked })} />
            </label>
          </div>
        </AdminCard>
      })}
    </fieldset>
    {!isPending && !isError && <div className="sticky bottom-20 z-10 rounded-2xl border border-border bg-white p-4 shadow-lg sm:bottom-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-sm font-medium text-malva-800">{busy ? uploading ? 'Enviando imagem…' : 'Salvando banners…' : draft !== null ? 'Alterações ainda não salvas' : 'Tudo salvo'}{draft === null && !busy && <Check className="ml-1 inline size-4" />}</p>
          <p className="mt-1 text-xs text-muted-foreground">JPG, PNG ou WebP, até 5 MB por imagem. Todo texto visual deve estar na arte.</p></div>
        <div className="flex shrink-0 gap-2"><Button size="sm" variant="outline" disabled={disabled} onClick={addBanner}><Plus className="size-4" />Adicionar</Button><Button size="sm" disabled={disabled || !valid || draft === null} onClick={() => mutation.mutate()}>{mutation.isPending ? 'Salvando…' : 'Salvar banners'}</Button></div>
      </div>
      {banners.length > 0 && !valid && <p className="mt-3 text-xs text-destructive">Para salvar, complete o título, as duas imagens e a duração de cada banner; confira também os links.</p>}
      {banners.length > 0 && !banners.some((item) => item.active) && <p className="mt-2 text-xs text-muted-foreground">Sem banners ativos, a área do banner fica oculta na home.</p>}
    </div>}
    {uploading && <p className="sr-only" role="status">Enviando imagem…</p>}
  </div>
}
