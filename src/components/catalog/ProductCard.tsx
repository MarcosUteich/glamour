import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { track } from '@/lib/analytics'
import { isNewProduct, isSoldOut, productSubtitle } from '@/lib/catalog'
import { formatBRL } from '@/lib/money'
import type { Product } from '@/lib/types'
import { hasWholesaleDiscount } from '@/seo/pricing'
import { useCart, useCartLine } from '@/store/cart'
import { maxQuantityFor } from '@/store/cart-logic'
import { ProductImage } from './ProductImage'
import { QtyStepper } from './QtyStepper'

export function ProductCard({
  product,
  fallback,
  heading: Heading = 'h3',
  eager = false,
}: {
  product: Product
  fallback: string
  heading?: 'h2' | 'h3' | 'p'
  eager?: boolean
}) {
  const [requestedPreview, setRequestedPreview] = useState<string | null>(null)
  const [loadedPreview, setLoadedPreview] = useState<string | null>(null)
  const preview = product.photos[1]?.sm
  const line = useCartLine(product.id)
  const add = useCart((s) => s.add)
  const setQuantity = useCart((s) => s.setQuantity)
  const soldOut = isSoldOut(product)
  const lowStock = product.stock !== null && product.stock > 0 && product.stock <= 5
  const discounted = hasWholesaleDiscount(product)
  const href = `/produto/${product.slug}`

  const handleAdd = () => {
    if (add(product) === 'unavailable') return
    toast.success('Adicionado ao pedido', { id: 'carrinho', description: product.name })
    track('add_to_cart', { product })
  }

  const handleQuantity = (quantity: number) => {
    if (quantity === 0) track('remove_from_cart', { product, quantity: line?.quantity ?? 1 })
    setQuantity(product.id, quantity)
  }

  return (
    <article
      className="product-card group flex h-full flex-col"
      onPointerEnter={(event) => {
        if (preview && event.pointerType === 'mouse' && window.matchMedia('(hover: hover)').matches) {
          setRequestedPreview(preview)
        }
      }}
    >
      <Link to={href} className="relative block overflow-hidden rounded-2xl bg-malva-100">
        <ProductImage
          src={product.photos[0]?.sm}
          fallback={fallback}
          alt={product.name}
          eager={eager}
          className="aspect-square w-full object-cover"
        />
        {preview && requestedPreview === preview && (
          <img
            key={preview}
            src={preview}
            alt=""
            aria-hidden="true"
            data-ready={loadedPreview === preview}
            decoding="async"
            onLoad={(event) => {
              const image = event.currentTarget
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  if (image.isConnected) setLoadedPreview(preview)
                })
              })
            }}
            onError={() => setLoadedPreview(null)}
            className="product-card-preview pointer-events-none absolute inset-0 aspect-square h-full w-full object-cover"
          />
        )}
        {isNewProduct(product.created_at) && (
          <Badge variant="gold" className="absolute left-2 top-2">
            Novo
          </Badge>
        )}
        {soldOut && (
          <span className="absolute inset-x-0 bottom-0 bg-tinta/70 py-1.5 text-center text-xs font-semibold text-white">
            Sem estoque
          </span>
        )}
      </Link>

      <div className="mt-2.5 flex flex-1 flex-col px-0.5">
        <Heading className="line-clamp-2 text-[14px] font-medium leading-snug text-tinta">
          <Link to={href}>{product.name}</Link>
        </Heading>
        <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{productSubtitle(product)}</p>
        <p className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 tabular-nums">
          <span className="text-base font-bold text-malva-800">
            {discounted && <span className="sr-only">Preço de atacado: </span>}
            {formatBRL(product.wholesale_price_cents)}
          </span>
          {discounted && (
            <s className="text-[12px] text-muted-foreground">
              <span className="sr-only">Preço original: </span>
              {formatBRL(product.price_cents)}
            </s>
          )}
        </p>
        {lowStock && <p className="text-[11.5px] font-medium text-malva-600">Últimas {product.stock} unidades</p>}

        <div className="mt-auto pt-2.5">
          {line ? (
            <QtyStepper
              size="sm"
              value={line.quantity}
              max={maxQuantityFor(product.stock)}
              onChange={handleQuantity}
              label={`Quantidade de ${product.name}`}
            />
          ) : (
            <Button variant="outline" size="sm" className="w-full" disabled={soldOut} onClick={handleAdd}>
              {soldOut ? (
                'Sem estoque'
              ) : (
                <>
                  <Plus /> Adicionar
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}
