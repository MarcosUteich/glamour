import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronUp, Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { slugify } from '@/lib/slug'
import type { Category } from '@/lib/types'
import { fetchAllCategories, reorderCategories, saveCategory } from './api'
import { AdminCard, PageTitle } from './ui'

export function CategoriesPage() {
  const qc = useQueryClient()
  const { data: categories, isPending } = useQuery({ queryKey: ['admin-categories'], queryFn: fetchAllCategories })
  const [editing, setEditing] = useState<Category | 'novo' | null>(null)

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin-categories'] })
    qc.invalidateQueries({ queryKey: ['catalog'] })
  }

  const save = useMutation({
    mutationFn: ({ input, id }: { input: Parameters<typeof saveCategory>[0]; id?: string }) => saveCategory(input, id),
    onSuccess: () => {
      toast.success('Categoria salva')
      setEditing(null)
      invalidate()
    },
    onError: () => toast.error('Não foi possível salvar. O nome já pode existir.'),
  })

  const reorder = useMutation({
    mutationFn: (ordered: Array<{ id: string; sort_order: number }>) => reorderCategories(ordered),
    onSuccess: invalidate,
  })

  const move = (index: number, dir: -1 | 1) => {
    if (!categories) return
    const next = [...categories]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    reorder.mutate(next.map((c, i) => ({ id: c.id, sort_order: (i + 1) * 10 })))
  }

  return (
    <div>
      <PageTitle
        action={
          <Button size="sm" onClick={() => setEditing('novo')}>
            <Plus /> Nova
          </Button>
        }
      >
        Categorias
      </PageTitle>

      {editing && (
        <CategoryForm
          category={editing === 'novo' ? null : editing}
          nextOrder={((categories?.length ?? 0) + 1) * 10}
          saving={save.isPending}
          onCancel={() => setEditing(null)}
          onSave={(input, id) => save.mutate({ input, id })}
        />
      )}

      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : (
        <ul className="space-y-2">
          {categories?.map((c, i) => (
            <li
              key={c.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-white p-3"
            >
              <div className="flex flex-col">
                <button
                  type="button"
                  aria-label="Subir"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="text-muted-foreground disabled:opacity-30"
                >
                  <ChevronUp className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="Descer"
                  onClick={() => move(i, 1)}
                  disabled={i === categories.length - 1}
                  className="text-muted-foreground disabled:opacity-30"
                >
                  <ChevronDown className="size-4" />
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-tinta">
                  {c.name}
                  {!c.active && <span className="text-muted-foreground"> · oculta</span>}
                </p>
                <p className="text-[12px] text-muted-foreground">
                  /{c.slug}
                  {c.code_prefix && ` · códigos ${c.code_prefix}-`}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setEditing(c)}>
                Editar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function CategoryForm({
  category,
  nextOrder,
  saving,
  onCancel,
  onSave,
}: {
  category: Category | null
  nextOrder: number
  saving: boolean
  onCancel: () => void
  onSave: (input: Parameters<typeof saveCategory>[0], id?: string) => void
}) {
  const [name, setName] = useState(category?.name ?? '')
  const [prefix, setPrefix] = useState(category?.code_prefix ?? '')
  const [description, setDescription] = useState(category?.description ?? '')
  const [active, setActive] = useState(category?.active ?? true)

  return (
    <AdminCard className="mb-4 space-y-3">
      <div className="space-y-1.5">
        <Label>Nome</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Brincos" />
      </div>
      <div className="space-y-1.5">
        <Label>Prefixo do código (opcional)</Label>
        <Input
          value={prefix}
          onChange={(e) => setPrefix(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3))}
          placeholder="BR"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Descrição (opcional)</Label>
        <Textarea
          value={description}
          maxLength={600}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brincos para revender com preço de atacado: argolas, pontos de luz e modelos da moda…"
        />
        <p className="text-[12px] text-muted-foreground">
          Aparece na página da categoria e no Google (lá, só as primeiras ~160 letras).
        </p>
      </div>
      <label className="flex items-center gap-2.5 text-sm font-medium text-malva-800">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="size-4 accent-malva-600" />
        Mostrar no catálogo
      </label>
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={saving || name.trim().length < 2 || (!!prefix && prefix.length < 2)}
          onClick={() =>
            onSave(
              {
                name: name.trim(),
                slug: slugify(name),
                description: description.trim() || null,
                code_prefix: prefix || null,
                active,
                sort_order: category?.sort_order ?? nextOrder,
              },
              category?.id,
            )
          }
        >
          Salvar
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </AdminCard>
  )
}
