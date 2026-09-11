import { useEffect, useMemo, useRef, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { categoryArt } from '@/lib/placeholders'
import type { Category, Product } from '@/lib/types'
import { ProductCard } from './ProductCard'

const PAGE_SIZE = 24

/** Grade 2/3/4 colunas que vai mostrando mais peças conforme a rolagem. */
export function ProductGrid({ products, categories }: { products: Product[]; categories: Category[] }) {
  const [limit, setLimit] = useState(PAGE_SIZE)
  const sentinel = useRef<HTMLDivElement>(null)
  const hasMore = limit < products.length
  const slugById = useMemo(() => new Map(categories.map((c) => [c.id, c.slug])), [categories])

  useEffect(() => {
    const el = sentinel.current
    if (!el || !hasMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setLimit((l) => l + PAGE_SIZE)
      },
      { rootMargin: '800px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, limit])

  return (
    <>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4">
        {products.slice(0, limit).map((p) => (
          <li key={p.id}>
            <ProductCard product={p} fallback={categoryArt(slugById.get(p.category_id))} />
          </li>
        ))}
      </ul>
      {hasMore && <div ref={sentinel} aria-hidden className="h-12" />}
    </>
  )
}

export function GridSkeleton() {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4" aria-label="Carregando peças">
      {Array.from({ length: 8 }, (_, i) => (
        <li key={i} className="space-y-2.5">
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-9 w-full rounded-full" />
        </li>
      ))}
    </ul>
  )
}
