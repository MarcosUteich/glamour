import { ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { SectionTitle } from '@/components/brand/Ornaments'
import { ProductGrid } from '@/components/catalog/ProductGrid'
import { ProductImage } from '@/components/catalog/ProductImage'
import { QtyStepper } from '@/components/catalog/QtyStepper'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Skeleton } from '@/components/ui/skeleton'
import { useCatalog } from '@/hooks/useCatalog'
import { track } from '@/lib/analytics'
import { isNewProduct, isSoldOut } from '@/lib/catalog'
import { formatBRL } from '@/lib/money'
import { categoryArt } from '@/lib/placeholders'
import type { ProductPhoto } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useCart, useCartLine } from '@/store/cart'
import { maxQuantityFor } from '@/store/cart-logic'

export function ProductPage() {
  const { slug } = useParams()
  const { data, isPending } = useCatalog()
  const product = data?.products.find((p) => p.slug === slug)
  const category = product ? data?.categories.find((c) => c.id === product.category_id) : undefined
  const line = useCartLine(product?.id)
  const add = useCart((s) => s.add)
  const [quantity, setQuantity] = useState(1)
  const categoryName = category?.name

  useEffect(() => {
    if (product) track('product_view', { product, category: categoryName })
  }, [product, categoryName])

  if (isPending) return <ProductSkeleton />
  if (!product) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <title>Peça não encontrada · Glamour Atacado</title>
        <meta name="robots" content="noindex" />
        <p className="text-lg font-semibold text-malva-800">Essa peça não está mais no catálogo.</p>
        <Link to="/" className={buttonVariants({ className: 'mt-6' })}>
          Ver o catálogo
        </Link>
      </div>
    )
  }

  const soldOut = isSoldOut(product)
  const inCart = line?.quantity ?? 0
  const room = Math.max(maxQuantityFor(product.stock) - inCart, 0)
  const fallback = categoryArt(category?.slug)
  const related = (data?.products ?? [])
    .filter((p) => p.category_id === product.category_id && p.id !== product.id && !isSoldOut(p))
    .slice(0, 4)
  const details: Array<[string, string | null]> = [
    ['Código', product.code],
    ['Categoria', category?.name ?? null],
    ['Material', product.material],
    ['Banho', product.plating],
    ['Tamanho', product.size],
    ['Tom', product.shade],
    ['Peso', product.weight_g ? `${String(product.weight_g).replace('.', ',')} g` : null],
  ]

  const handleAdd = () => {
    const qty = Math.min(quantity, room)
    const result = add(product, qty)
    if (result === 'unavailable') return
    toast.success(result === 'limited' ? 'Adicionamos o máximo disponível' : 'Adicionado ao pedido', {
      id: 'carrinho',
      description: `${qty} × ${product.name}`,
    })
    track('add_to_cart', { product, category: category?.name, quantity: qty, meta: { quantity: qty } })
    setQuantity(1)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-4 sm:px-6">
      <title>{`${product.name} ${product.code} · ${formatBRL(product.price_cents)} no atacado | Glamour`}</title>
      <meta name="description" content={`${product.name} (${product.code}) no atacado por ${formatBRL(product.price_cents)}.`} />

      <nav aria-label="Você está em" className="mb-4 flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/" className="shrink-0 font-medium text-malva-700 hover:underline">
          Início
        </Link>
        <ChevronRight className="size-3.5 shrink-0" aria-hidden />
        {category && (
          <>
            <Link to={`/categoria/${category.slug}`} className="shrink-0 font-medium text-malva-700 hover:underline">
              {category.name}
            </Link>
            <ChevronRight className="size-3.5 shrink-0" aria-hidden />
          </>
        )}
        <span className="truncate" aria-current="page">
          {product.name}
        </span>
      </nav>

      <div className="grid gap-8 md:grid-cols-2 md:gap-12">
        <Gallery photos={product.photos} fallback={fallback} alt={product.name} />

        <div>
          {isNewProduct(product.created_at) && <Badge variant="gold">Novidade</Badge>}
          <h1 className="mt-2 text-2xl font-semibold leading-tight text-tinta sm:text-3xl">{product.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Código {product.code}</p>
          <p className="mt-4 text-3xl font-bold tabular-nums text-malva-800">{formatBRL(product.price_cents)}</p>
          <p className="text-xs text-muted-foreground">Preço de atacado, por unidade</p>
          <Availability stock={product.stock} />

          {!soldOut && (
            <div className="mt-6 flex gap-3">
              <div className="w-36">
                <QtyStepper
                  value={Math.min(quantity, Math.max(room, 1))}
                  min={1}
                  max={Math.max(room, 1)}
                  onChange={setQuantity}
                />
              </div>
              <Button size="lg" className="h-12 flex-1" onClick={handleAdd} disabled={room === 0}>
                {room === 0 ? 'Máximo no pedido' : 'Adicionar ao pedido'}
              </Button>
            </div>
          )}
          {inCart > 0 && (
            <p className="mt-3 text-sm text-malva-700">
              Você já tem {inCart} no pedido ·{' '}
              <Link to="/pedido" className="font-semibold underline underline-offset-4">
                Ver pedido
              </Link>
            </p>
          )}

          <dl className="mt-8 divide-y divide-border rounded-2xl border border-border bg-white">
            {details
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 px-4 py-3 text-sm">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-right font-medium text-tinta">{value}</dd>
                </div>
              ))}
          </dl>
          {product.description && (
            <p className="mt-6 whitespace-pre-line text-[15px] leading-relaxed text-malva-800/85">{product.description}</p>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-14">
          <SectionTitle>Da mesma categoria</SectionTitle>
          <div className="mt-6">
            <ProductGrid products={related} categories={data?.categories ?? []} />
          </div>
        </section>
      )}
    </div>
  )
}

function Availability({ stock }: { stock: number | null }) {
  if (stock === 0) return <p className="mt-3 text-sm font-semibold text-destructive">Sem estoque no momento</p>
  if (stock !== null && stock <= 5) return <p className="mt-3 text-sm font-semibold text-malva-600">Últimas {stock} unidades</p>
  return <p className="mt-3 text-sm font-medium text-ok">Disponível</p>
}

function Gallery({ photos, fallback, alt }: { photos: ProductPhoto[]; fallback: string; alt: string }) {
  const [index, setIndex] = useState(0)
  const list = photos.length > 0 ? photos : [{ sm: fallback, lg: fallback }]

  return (
    <div>
      <div
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-3xl bg-malva-100"
        onScroll={(e) => {
          const el = e.currentTarget
          setIndex(Math.round(el.scrollLeft / el.clientWidth))
        }}
      >
        {list.map((photo, i) => (
          <ProductImage
            key={photo.lg}
            src={photo.lg}
            fallback={fallback}
            alt={i === 0 ? alt : `${alt}, foto ${i + 1}`}
            eager={i === 0}
            className="aspect-square w-full shrink-0 snap-center object-cover"
          />
        ))}
      </div>
      {list.length > 1 && (
        <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
          {list.map((photo, i) => (
            <span
              key={photo.lg}
              className={cn('size-1.5 rounded-full transition-colors', i === index ? 'bg-malva-600' : 'bg-malva-200')}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ProductSkeleton() {
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 md:grid-cols-2">
      <Skeleton className="aspect-square w-full rounded-3xl" />
      <div className="space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
    </div>
  )
}
