import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { fetchSettings } from '@/data/api'
import { centsToInput, formatBRL, parseBRLToCents } from '@/lib/money'
import { maskProductPrice, maskProductSize, maskProductWeight } from '@/lib/product-masks'
import { slugify } from '@/lib/slug'
import type { Product } from '@/lib/types'
import { wholesalePriceCents } from '@/seo/pricing'
import { fetchAllCategories, fetchProduct, suggestCode, type ProductInput } from './api'
import { PhotoUploader } from './PhotoUploader'
import { PhotoUploadError, saveProductWithPhotos, type PendingPhoto } from './product-save'
import { AdminCard, PageTitle } from './ui'

type Draft = {
  category_id: string
  name: string
  code: string
  price: string
  stock: string
  controlsStock: boolean
  description: string
  material: string
  plating: string
  size: string
  shade: string
  weight: string
  active: boolean
}

const EMPTY: Draft = {
  category_id: '',
  name: '',
  code: '',
  price: '',
  stock: '',
  controlsStock: false,
  description: '',
  material: '',
  plating: '',
  size: '',
  shade: '',
  weight: '',
  active: true,
}

function fromProduct(p: Product): Draft {
  return {
    category_id: p.category_id,
    name: p.name,
    code: p.code,
    price: centsToInput(p.price_cents),
    stock: p.stock?.toString() ?? '',
    controlsStock: p.stock !== null,
    description: p.description ?? '',
    material: p.material ?? '',
    plating: p.plating ?? '',
    size: maskProductSize(p.size ?? ''),
    shade: p.shade ?? '',
    weight: p.weight_g?.toString().replace('.', ',') ?? '',
    active: p.active,
  }
}

export function ProductFormPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  return <ProductForm key={id ?? `new:${params.get('duplicar') ?? ''}`} />
}

function ProductForm() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const duplicateOf = params.get('duplicar')
  const navigate = useNavigate()
  const qc = useQueryClient()
  const editing = !!id

  const { data: categories = [] } = useQuery({ queryKey: ['admin-categories'], queryFn: fetchAllCategories })
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: fetchSettings })
  const discountPct = settings?.wholesale_discount_pct ?? 0
  const { data: product } = useQuery({
    queryKey: ['admin-product', id ?? duplicateOf],
    queryFn: () => fetchProduct((id ?? duplicateOf)!),
    enabled: !!(id ?? duplicateOf),
  })

  const [photos, setPhotos] = useState<PendingPhoto[]>([])
  const [createdId, setCreatedId] = useState<string>()
  const savedIdRef = useRef<string | undefined>(id)
  const [saveProgress, setSaveProgress] = useState('')
  const [photoError, setPhotoError] = useState(false)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [seededFrom, setSeededFrom] = useState<Product | null>(null)
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }))

  // Semeia o formulário quando o produto (edição ou duplicação) chega
  if (product && product !== seededFrom) {
    setSeededFrom(product)
    const base = fromProduct(product)
    setDraft(id ? base : { ...base, code: '', name: `${base.name} (cópia)` })
  }

  // Ao escolher a categoria de um produto novo, sugere o próximo código
  useEffect(() => {
    if (editing || !draft.category_id || draft.code) return
    void suggestCode(draft.category_id).then((code) => code && setDraft((d) => (d.code ? d : { ...d, code })))
  }, [draft.category_id, draft.code, editing])

  const priceCents = useMemo(() => parseBRLToCents(draft.price), [draft.price])
  const errors: Partial<Record<keyof Draft, string>> = {}
  if (!draft.category_id) errors.category_id = 'Escolha a categoria'
  if (draft.name.trim().length < 2) errors.name = 'Informe o nome'
  if (!draft.code.trim()) errors.code = 'Informe o código'
  if (priceCents === null || priceCents <= 0) errors.price = 'Preço inválido'
  // O que a cliente paga: o preço original com o desconto de Config
  const wholesaleHint =
    priceCents && priceCents > 0 && discountPct > 0
      ? `Atacado: ${formatBRL(wholesalePriceCents(priceCents, discountPct))} (−${discountPct}%)`
      : undefined
  if (draft.controlsStock && !/^\d+$/.test(draft.stock.trim())) errors.stock = 'Quantidade inválida'
  if (draft.weight && (!/^\d{1,6}(,\d{0,2})?$/.test(draft.weight) || Number(draft.weight.replace(',', '.')) <= 0)) {
    errors.weight = 'Informe um peso maior que zero'
  }

  const mutation = useMutation({
    mutationFn: async ({ next }: { next: boolean }) => {
      setPhotoError(false)
      setSaveProgress('Salvando produto…')
      const weight = draft.weight.trim() ? Number(draft.weight.replace(',', '.')) : null
      const input: ProductInput = {
        category_id: draft.category_id,
        name: draft.name.trim(),
        slug: slugify(`${draft.name} ${draft.code}`),
        code: draft.code.trim().toUpperCase(),
        description: draft.description.trim() || null,
        material: draft.material.trim() || null,
        plating: draft.plating.trim() || null,
        size: draft.size.trim() || null,
        shade: draft.shade.trim() || null,
        weight_g: weight && Number.isFinite(weight) ? weight : null,
        price_cents: priceCents!,
        stock: draft.controlsStock ? Number(draft.stock) : null,
        active: draft.active,
      }
      let uploaded = 0
      const savedId = await saveProductWithPhotos(input, id ?? savedIdRef.current, photos,
        (productId) => {
          savedIdRef.current = productId
          setCreatedId(productId)
          if (photos.length) setSaveProgress(`Enviando fotos (0/${photos.length})…`)
        },
        (photoId) => {
          setPhotos((pending) => pending.filter((photo) => photo.id !== photoId))
          uploaded++
          setSaveProgress(`Enviando fotos (${uploaded}/${photos.length})…`)
        },
      )
      return { savedId, next }
    },
    onSuccess: ({ savedId, next }) => {
      qc.invalidateQueries({ queryKey: ['admin-products'] })
      qc.invalidateQueries({ queryKey: ['catalog'] })
      qc.invalidateQueries({ queryKey: ['admin-product', savedId] })
      qc.invalidateQueries({ queryKey: ['product-images', savedId] })
      toast.success(editing ? 'Produto salvo' : 'Produto cadastrado')
      setPhotos([])
      setPhotoError(false)
      if (next) {
        savedIdRef.current = undefined
        setCreatedId(undefined)
        setDraft((d) => ({ ...EMPTY, category_id: d.category_id, material: d.material, plating: d.plating, active: true }))
        navigate('/admin/produtos/novo', { replace: true })
      } else {
        navigate(`/admin/produtos/${savedId}/editar`, { replace: true })
      }
    },
    onError: (error: { message?: string }) => {
      if (error instanceof PhotoUploadError) {
        setPhotoError(true)
        qc.invalidateQueries({ queryKey: ['product-images', error.productId] })
        qc.invalidateQueries({ queryKey: ['admin-products'] })
        qc.invalidateQueries({ queryKey: ['catalog'] })
        toast.error('Produto salvo, mas algumas fotos não foram enviadas. Tente salvar novamente.')
        return
      }
      toast.error(error.message?.includes('duplicate') ? 'Já existe um produto com esse código' : 'Não foi possível salvar')
    },
  })

  const canSave = Object.keys(errors).length === 0 && !mutation.isPending
  const isMaquiagem = categories.find((c) => c.id === draft.category_id)?.slug === 'maquiagem'

  return (
    <div>
      <Link to="/admin/produtos" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-malva-700">
        <ArrowLeft className="size-4" /> Produtos
      </Link>
      <PageTitle>{editing ? 'Editar produto' : 'Novo produto'}</PageTitle>

      <fieldset disabled={mutation.isPending} className="min-w-0 space-y-4">
        <AdminCard className="space-y-4">
          <Field label="Categoria" error={errors.category_id}>
            <select
              value={draft.category_id}
              onChange={(e) => set('category_id', e.target.value)}
              className="h-12 w-full rounded-xl border border-input bg-white px-3 text-base text-tinta focus-visible:border-malva-500 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-malva-200"
            >
              <option value="">Escolha…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nome" error={errors.name}>
            <Input
              value={draft.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Brinco argola dourada"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Código" error={errors.code}>
              <Input value={draft.code} onChange={(e) => set('code', e.target.value.toUpperCase())} placeholder="BR-102" />
            </Field>
            <Field label="Preço original (R$)" error={errors.price} hint={wholesaleHint}>
              <Input
                inputMode="decimal"
                value={draft.price}
                onChange={(e) => set('price', maskProductPrice(e.target.value))}
                placeholder="24,90"
              />
            </Field>
          </div>
        </AdminCard>

        <AdminCard className="space-y-4">
          <label className="flex items-center gap-2.5 text-sm font-medium text-malva-800">
            <input
              type="checkbox"
              checked={draft.controlsStock}
              onChange={(e) => set('controlsStock', e.target.checked)}
              className="size-4 accent-malva-600"
            />
            Controlar estoque desta peça
          </label>
          {draft.controlsStock && (
            <Field label="Quantidade em estoque" error={errors.stock}>
              <Input
                inputMode="numeric"
                value={draft.stock}
                onChange={(e) => set('stock', e.target.value.replace(/\D/g, ''))}
                placeholder="0"
              />
            </Field>
          )}
          <label className="flex items-center gap-2.5 text-sm font-medium text-malva-800">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(e) => set('active', e.target.checked)}
              className="size-4 accent-malva-600"
            />
            Produto ativo (aparece no catálogo)
          </label>
        </AdminCard>

        <AdminCard className="space-y-4">
          <p className="text-sm font-semibold text-malva-800">Detalhes (opcionais)</p>
          <div className="grid grid-cols-2 gap-3">
            {isMaquiagem ? (
              <Field label="Cor / tom">
                <Input value={draft.shade} onChange={(e) => set('shade', e.target.value)} placeholder="Nude 02" />
              </Field>
            ) : (
              <Field label="Banho">
                <Input value={draft.plating} onChange={(e) => set('plating', e.target.value)} placeholder="Ouro 18k" />
              </Field>
            )}
            <Field label="Tamanho">
              <Input value={draft.size} onChange={(e) => set('size', maskProductSize(e.target.value))} placeholder="2,5 cm" />
            </Field>
            <Field label="Material">
              <Input value={draft.material} onChange={(e) => set('material', e.target.value)} placeholder="Latão" />
            </Field>
            <Field label="Peso (g)" error={errors.weight}>
              <Input
                inputMode="decimal"
                value={draft.weight}
                onChange={(e) => set('weight', maskProductWeight(e.target.value))}
                placeholder="3,2"
              />
            </Field>
          </div>
          <Field label="Descrição">
            <Textarea
              value={draft.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Detalhes que ajudam a lojista a vender."
            />
          </Field>
        </AdminCard>

        <AdminCard>
          <PhotoUploader
            productId={id ?? createdId}
            photos={photos}
            onChange={setPhotos}
            disabled={mutation.isPending}
          />
          {photoError && (
            <p role="alert" className="mt-3 text-[13px] text-destructive">
              O produto já foi salvo. As fotos pendentes continuam aqui; clique em salvar para tentar novamente.
            </p>
          )}
        </AdminCard>

        <div className="sticky bottom-16 z-10 flex gap-2 border-t border-border bg-background/95 py-3 backdrop-blur sm:bottom-0">
          <Button className="flex-1" disabled={!canSave} onClick={() => mutation.mutate({ next: false })}>
            {mutation.isPending ? saveProgress : photoError ? 'Salvar e reenviar fotos' : editing ? 'Salvar' : 'Cadastrar'}
          </Button>
          {!editing && (
            <Button variant="outline" disabled={!canSave} onClick={() => mutation.mutate({ next: true })}>
              Salvar e cadastrar próximo
            </Button>
          )}
        </div>
      </fieldset>
    </div>
  )
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error ? (
        <p className="text-[12px] text-destructive">{error}</p>
      ) : (
        hint && <p className="text-[12px] font-medium tabular-nums text-malva-700">{hint}</p>
      )}
    </div>
  )
}
