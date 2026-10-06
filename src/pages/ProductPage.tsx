import { ChevronLeft, ChevronRight, LoaderCircle } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { SectionTitle } from '@/components/brand/Ornaments'
import { ProductGrid } from '@/components/catalog/ProductGrid'
import { QtyStepper } from '@/components/catalog/QtyStepper'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Skeleton } from '@/components/ui/skeleton'
import { useCatalog, useSettings } from '@/hooks/useCatalog'
import { track } from '@/lib/analytics'
import { isNewProduct, isSoldOut } from '@/lib/catalog'
import { formatBRL } from '@/lib/money'
import { categoryArt } from '@/lib/placeholders'
import type { ProductPhoto } from '@/lib/types'
import { cn } from '@/lib/utils'
import { hasWholesaleDiscount } from '@/seo/pricing'
import { useCart, useCartLine } from '@/store/cart'
import { maxQuantityFor } from '@/store/cart-logic'
import { productDescription } from '@/seo/head'
import { titles } from '@/seo/titles'

export function ProductPage() {
  const { slug } = useParams()
  const { data, isPending } = useCatalog()
  const settings = useSettings()
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
        <title>{titles.page('Peça não encontrada')}</title>
        <meta name="robots" content="noindex" />
        <p className="text-lg font-semibold text-malva-800">Essa peça não está mais no catálogo.</p>
        <Link to="/" className={buttonVariants({ className: 'mt-6' })}>
          Ver o catálogo
        </Link>
      </div>
    )
  }

  const soldOut = isSoldOut(product)
  const discounted = hasWholesaleDiscount(product)
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
      <title>{titles.product(product)}</title>
      <meta name="description" content={productDescription(product, settings.min_order_cents)} />

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

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
        <Gallery key={product.id} photos={product.photos} fallback={fallback} alt={product.name} />

        <div className="min-w-0">
          {isNewProduct(product.created_at) && <Badge variant="gold">Novidade</Badge>}
          <h1 className="mt-2 text-2xl font-semibold leading-tight text-tinta sm:text-3xl">{product.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Código {product.code}</p>
          <p className="mt-4 flex flex-wrap items-baseline gap-x-3 tabular-nums">
            <span className="text-3xl font-bold text-malva-800">
              {discounted && <span className="sr-only">Preço de atacado: </span>}
              {formatBRL(product.wholesale_price_cents)}
            </span>
            {discounted && (
              <s className="text-base text-muted-foreground">
                <span className="sr-only">Preço original: </span>
                {formatBRL(product.price_cents)}
              </s>
            )}
          </p>
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

          <p className="mt-5 rounded-2xl bg-malva-100/70 px-4 py-3 text-[13.5px] leading-relaxed text-malva-800">
            Pedido mínimo de <strong>{formatBRL(settings.min_order_cents)}</strong> somando as peças, envio pelo WhatsApp
            e retirada no Lindóia Shopping.{' '}
            <Link to="/como-comprar" className="font-semibold underline underline-offset-4">
              Como funciona
            </Link>
          </p>

          <h2 className="mt-8 text-[11px] font-semibold uppercase tracking-[0.25em] text-malva-800">Detalhes da peça</h2>
          <dl className="mt-2 divide-y divide-border rounded-2xl border border-border bg-white">
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
  const viewport = useRef<HTMLDivElement>(null)
  const list = photos.length > 0 ? photos : [{ sm: fallback, lg: fallback }]
  const multiple = list.length > 1
  const goTo = (next: number) => {
    const el = viewport.current
    if (!el) return
    el.scrollTo({ left: Math.max(0, Math.min(next, list.length - 1)) * el.clientWidth, behavior: 'smooth' })
  }

  return (
    <div className="min-w-0" role="region" aria-label={`Fotos de ${alt}`}>
      <div className="relative">
        <div
          ref={viewport}
          tabIndex={multiple ? 0 : undefined}
          aria-label="Galeria de fotos"
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-3xl bg-malva-100"
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
              event.preventDefault()
              goTo(index + (event.key === 'ArrowRight' ? 1 : -1))
            }
          }}
          onScroll={(e) => {
            const el = e.currentTarget
            if (el.clientWidth) setIndex(Math.max(0, Math.min(list.length - 1, Math.round(el.scrollLeft / el.clientWidth))))
          }}
        >
          {list.map((photo, i) => (
            <div key={`${photo.lg}-${i}`} className="relative aspect-square w-full min-w-0 flex-none snap-center snap-always">
              <GalleryPhoto src={photo.lg} fallback={fallback} alt={`${alt}, foto ${i + 1}`} eager={i === 0} />
            </div>
          ))}
      </div>
      {multiple && (
        <>
          <button type="button" aria-label="Foto anterior" disabled={index === 0} onClick={() => goTo(index - 1)}
            className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-malva-800 shadow-md transition-opacity hover:bg-white focus-visible:outline-2 focus-visible:outline-malva-500 disabled:pointer-events-none disabled:opacity-30">
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <button type="button" aria-label="Próxima foto" disabled={index === list.length - 1} onClick={() => goTo(index + 1)}
            className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-malva-800 shadow-md transition-opacity hover:bg-white focus-visible:outline-2 focus-visible:outline-malva-500 disabled:pointer-events-none disabled:opacity-30">
            <ChevronRight className="size-5" aria-hidden />
          </button>
        </>
      )}
      </div>
      {multiple && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-1">
          {list.map((photo, i) => (
            <button key={`${photo.lg}-${i}`} type="button" aria-label={`Ver foto ${i + 1}`} aria-current={i === index ? 'true' : undefined}
              onClick={() => goTo(i)} className="grid size-8 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-malva-500">
              <span className={cn('size-2 rounded-full transition-colors', i === index ? 'bg-malva-600' : 'bg-malva-200')} />
            </button>
          ))}
          <span className="ml-2 text-xs tabular-nums text-muted-foreground" aria-live="polite">{index + 1} / {list.length}</span>
        </div>
      )}
    </div>
  )
}

function GalleryPhoto({ src, fallback, alt, eager }: { src: string; fallback: string; alt: string; eager: boolean }) {
  const [failed, setFailed] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const [loaded, setLoaded] = useState<string | null>(null)
  const current = failed ? fallback : src
  const ready = loaded === current
  const imageRef = useCallback((image: HTMLImageElement | null) => {
    if (image?.complete && image.naturalWidth > 0) setLoaded(current)
  }, [current])

  return (
    <>
      {!ready && !unavailable && (
        <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-malva-100 text-malva-600">
          <LoaderCircle className="size-7 animate-spin" aria-hidden />
          <span className="text-xs">Carregando foto...</span>
        </div>
      )}
      {unavailable ? (
        <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">Foto indisponível</div>
      ) : (
        <img ref={imageRef} src={current} alt={alt} loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : undefined}
          decoding="async" draggable={false} onLoad={() => setLoaded(current)}
          onError={() => { if (current === fallback) setUnavailable(true); else setFailed(true) }}
          className={cn('absolute inset-0 h-full w-full object-cover transition-opacity duration-300', ready ? 'opacity-100' : 'opacity-0')} />
      )}
    </>
  )
}

function ProductSkeleton() {
  return (
    <div className="mx-auto grid min-h-dvh max-w-6xl grid-cols-1 content-start gap-8 px-4 py-8 sm:px-6 md:grid-cols-2">
      <Skeleton className="aspect-square w-full rounded-3xl" />
      <div className="min-w-0 space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
    </div>
  )
}
