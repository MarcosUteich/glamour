import { useMemo } from 'react'
import { ProductCard } from '@/components/catalog/ProductCard'
import { useCatalog } from '@/hooks/useCatalog'
import { isNewProduct, isSoldOut } from '@/lib/catalog'
import { formatBRL } from '@/lib/money'
import { categoryArt } from '@/lib/placeholders'
import { useCart } from '@/store/cart'

/** "Falta pouco": algumas peças (novidades primeiro) para completar o mínimo, sem sair do pedido. */
export function Suggestions({ remainingCents }: { remainingCents: number }) {
  const { data } = useCatalog()
  const lines = useCart((s) => s.lines)

  const picks = useMemo(() => {
    if (!data) return []
    const inCart = new Set(lines.map((l) => l.productId))
    const candidates = data.products.filter((p) => !inCart.has(p.id) && !isSoldOut(p))
    const fresh = candidates.filter((p) => isNewProduct(p.created_at))
    return [...fresh, ...candidates.filter((p) => !fresh.includes(p))].slice(0, 6)
  }, [data, lines])

  if (!data || picks.length === 0) return null
  const slugById = new Map(data.categories.map((c) => [c.id, c.slug]))

  return (
    <section className="mt-8" aria-label="Sugestões para completar o pedido">
      <p className="text-[15px] font-semibold text-malva-800">Falta só {formatBRL(remainingCents)}</p>
      <p className="text-sm text-muted-foreground">Veja algumas peças para completar seu pedido</p>
      <ul className="no-scrollbar -mx-4 mt-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
        {picks.map((p) => (
          <li key={p.id} className="w-[152px] shrink-0 snap-start">
            <ProductCard product={p} fallback={categoryArt(slugById.get(p.category_id))} />
          </li>
        ))}
      </ul>
    </section>
  )
}
