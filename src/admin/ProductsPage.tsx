import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { isSoldOut } from '@/lib/catalog'
import { centsToInput, parseBRLToCents } from '@/lib/money'
import { categoryArt } from '@/lib/placeholders'
import { normalizeText } from '@/lib/slug'
import type { Product } from '@/lib/types'
import { deleteProduct, fetchAllCategories, fetchAllProducts, setProductField } from './api'
import { EmptyState, FilterChip, PageTitle } from './ui'

type Tab = 'ativos' | 'inativos' | 'sem_estoque'

export function ProductsPage() {
  const qc = useQueryClient()
  const { data: products, isPending } = useQuery({ queryKey: ['admin-products'], queryFn: fetchAllProducts })
  const { data: categories = [] } = useQuery({ queryKey: ['admin-categories'], queryFn: fetchAllCategories })
  const [tab, setTab] = useState<Tab>('ativos')
  const [categoryId, setCategoryId] = useState('')
  const [query, setQuery] = useState('')

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-products'] })
    qc.invalidateQueries({ queryKey: ['catalog'] })
  }

  const patch = useMutation({
    mutationFn: ({ id, ...rest }: { id: string; price_cents?: number; stock?: number | null; active?: boolean }) =>
      setProductField(id, rest),
    onSuccess: refresh,
    onError: () => toast.error('Não foi possível salvar'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      toast.success('Produto excluído')
      refresh()
    },
    onError: () => toast.error('Não foi possível excluir. Tente desativar.'),
  })

  const filtered = useMemo(() => {
    if (!products) return []
    const term = normalizeText(query).trim()
    return products.filter((p) => {
      if (tab === 'ativos' && !p.active) return false
      if (tab === 'inativos' && p.active) return false
      if (tab === 'sem_estoque' && !isSoldOut(p)) return false
      if (categoryId && p.category_id !== categoryId) return false
      if (term && !normalizeText(`${p.name} ${p.code}`).includes(term)) return false
      return true
    })
  }, [products, tab, categoryId, query])

  return (
    <div>
      <PageTitle
        action={
          <Link to="/admin/produtos/novo" className={buttonVariants({ size: 'sm' })}>
            <Plus /> Novo
          </Link>
        }
      >
        Produtos
      </PageTitle>

      <Input placeholder="Buscar por nome ou código" value={query} onChange={(e) => setQuery(e.target.value)} className="mb-3" />
      <div className="mb-2 flex gap-2">
        <FilterChip active={tab === 'ativos'} onClick={() => setTab('ativos')}>
          Ativos
        </FilterChip>
        <FilterChip active={tab === 'inativos'} onClick={() => setTab('inativos')}>
          Inativos
        </FilterChip>
        <FilterChip active={tab === 'sem_estoque'} onClick={() => setTab('sem_estoque')}>
          Sem estoque
        </FilterChip>
      </div>
      <select
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        className="mb-4 h-10 w-full rounded-xl border border-input bg-white px-3 text-sm text-tinta"
      >
        <option value="">Todas as categorias</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState>Nenhum produto por aqui.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {filtered.map((p) => (
            <Row
              key={p.id}
              product={p}
              categorySlug={categories.find((c) => c.id === p.category_id)?.slug}
              onPrice={(price_cents) => patch.mutate({ id: p.id, price_cents })}
              onStock={(stock) => patch.mutate({ id: p.id, stock })}
              onToggleActive={() => patch.mutate({ id: p.id, active: !p.active })}
              onDelete={() => {
                if (confirm(`Excluir "${p.name}"? Isso não pode ser desfeito.`)) remove.mutate(p.id)
              }}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function Row({
  product,
  categorySlug,
  onPrice,
  onStock,
  onToggleActive,
  onDelete,
}: {
  product: Product
  categorySlug?: string
  onPrice: (cents: number) => void
  onStock: (stock: number | null) => void
  onToggleActive: () => void
  onDelete: () => void
}) {
  const [price, setPrice] = useState(centsToInput(product.price_cents))
  const [stock, setStock] = useState(product.stock?.toString() ?? '')

  const commitPrice = () => {
    const cents = parseBRLToCents(price)
    if (cents && cents !== product.price_cents) onPrice(cents)
    else setPrice(centsToInput(product.price_cents))
  }
  const commitStock = () => {
    if (product.stock === null) return
    const n = Number.parseInt(stock, 10)
    if (Number.isFinite(n) && n !== product.stock) onStock(n)
  }

  return (
    <li className="flex gap-3 rounded-2xl border border-border bg-white p-3">
      <img
        src={product.photos[0]?.sm ?? categoryArt(categorySlug)}
        alt=""
        className="size-16 shrink-0 rounded-xl bg-malva-100 object-cover"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-tinta">{product.name}</p>
            <p className="text-[12px] text-muted-foreground">
              {product.code}
              {!product.active && ' · inativo'}
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            <Link
              to={`/admin/produtos/${product.id}/editar`}
              aria-label="Editar"
              className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-malva-100"
            >
              <Pencil className="size-4" />
            </Link>
            <Link
              to={`/admin/produtos/novo?duplicar=${product.id}`}
              aria-label="Duplicar"
              className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-malva-100"
            >
              <Copy className="size-4" />
            </Link>
            <button
              type="button"
              aria-label="Excluir"
              onClick={onDelete}
              className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1 text-[12px] text-muted-foreground">
            R$
            <input
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              onBlur={commitPrice}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              className="w-20 rounded-lg border border-input bg-white px-2 py-1 text-sm text-tinta tabular-nums"
            />
          </label>
          {product.stock === null ? (
            <span className="text-[12px] text-muted-foreground">estoque livre</span>
          ) : (
            <label className="flex items-center gap-1 text-[12px] text-muted-foreground">
              estoque
              <input
                inputMode="numeric"
                value={stock}
                onChange={(e) => setStock(e.target.value.replace(/\D/g, ''))}
                onBlur={commitStock}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                className="w-14 rounded-lg border border-input bg-white px-2 py-1 text-sm text-tinta tabular-nums"
              />
            </label>
          )}
          <Button variant="ghost" size="sm" className="h-7 px-2 text-[12px]" onClick={onToggleActive}>
            {product.active ? 'Desativar' : 'Ativar'}
          </Button>
        </div>
      </div>
    </li>
  )
}
