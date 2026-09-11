import { useEffect, useMemo, useRef } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { SectionTitle } from '@/components/brand/Ornaments'
import { CategoryChips } from '@/components/catalog/CategoryChips'
import { Hero } from '@/components/catalog/Hero'
import { HowItWorks } from '@/components/catalog/HowItWorks'
import { GridSkeleton, ProductGrid } from '@/components/catalog/ProductGrid'
import { SearchField } from '@/components/catalog/SearchField'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { useCatalog, useSettings } from '@/hooks/useCatalog'
import { filterProducts, visibleCategories } from '@/lib/catalog'

export function Home() {
  const { slug } = useParams()
  const [params, setParams] = useSearchParams()
  const query = params.get('busca') ?? ''
  const settings = useSettings()
  const { data, isPending, isError, refetch } = useCatalog()
  const catalogTop = useRef<HTMLDivElement>(null)

  const categories = useMemo(() => (data ? visibleCategories(data.categories, data.products) : []), [data])
  const products = useMemo(
    () => (data ? filterProducts(data.products, data.categories, { slug, query }) : []),
    [data, slug, query],
  )
  const category = slug && slug !== 'novidades' ? data?.categories.find((c) => c.slug === slug) : undefined
  const title = slug === 'novidades' ? 'Novidades' : (category?.name ?? (query ? 'Busca' : 'Todas as peças'))
  const showHero = !slug && !query

  // Ao trocar de categoria rolando a grade, volta para o começo da lista (os chips continuam à vista)
  useEffect(() => {
    const el = catalogTop.current
    if (!el || !slug) return
    const top = el.getBoundingClientRect().top + window.scrollY - 64
    if (window.scrollY > top) window.scrollTo({ top })
  }, [slug])

  return (
    <>
      <title>
        {category
          ? `${category.name} no atacado · Glamour`
          : 'Glamour Atacado · Semijoias, acessórios e maquiagem para revender'}
      </title>
      {showHero && (
        <>
          <Hero
            minOrderCents={settings.min_order_cents}
            onShop={() => catalogTop.current?.scrollIntoView({ behavior: 'smooth' })}
          />
          <HowItWorks minOrderCents={settings.min_order_cents} />
        </>
      )}
      <div ref={catalogTop} className="scroll-mt-16" />
      <CategoryChips categories={categories} active={slug ?? null} />

      <section className="mx-auto max-w-6xl px-3 pb-12 pt-5 sm:px-6">
        <div className="mx-auto max-w-xl">
          <SearchField value={query} onChange={(value) => setParams(value ? { busca: value } : {}, { replace: true })} />
        </div>
        <div className="mb-6 mt-7 text-center">
          <SectionTitle>{title}</SectionTitle>
          {data && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              {products.length} {products.length === 1 ? 'peça' : 'peças'}
            </p>
          )}
        </div>

        {isPending ? (
          <GridSkeleton />
        ) : isError ? (
          <div className="py-16 text-center">
            <p className="text-malva-800">Não conseguimos carregar o catálogo.</p>
            <Button variant="outline" className="mt-4" onClick={() => void refetch()}>
              Tentar de novo
            </Button>
          </div>
        ) : products.length === 0 ? (
          <div className="py-14 text-center">
            <p className="font-medium text-malva-800">
              {query ? `Nenhuma peça encontrada para “${query}”.` : 'Nenhuma peça por aqui ainda.'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Tente outro nome ou código, ou veja todas as peças.</p>
            <Link to="/" className={buttonVariants({ variant: 'outline', className: 'mt-5' })}>
              Ver todas as peças
            </Link>
          </div>
        ) : (
          <ProductGrid key={`${slug ?? ''}|${query}`} products={products} categories={data?.categories ?? []} />
        )}
      </section>
    </>
  )
}
