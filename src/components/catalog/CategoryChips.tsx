import { useEffect, useRef, type ReactNode } from 'react'
import { Link } from 'react-router'
import type { Category } from '@/lib/types'
import { cn } from '@/lib/utils'

interface CategoryChipsProps {
  categories: Category[]
  /** slug da categoria, "novidades" ou null para todas */
  active: string | null
}

export function CategoryChips({ categories, active }: CategoryChipsProps) {
  const scroller = useRef<HTMLDivElement>(null)

  // Centraliza o chip ativo sem mexer na rolagem da página
  useEffect(() => {
    const box = scroller.current
    const chip = box?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!box || !chip) return
    box.scrollTo({ left: chip.offsetLeft - box.clientWidth / 2 + chip.clientWidth / 2, behavior: 'smooth' })
  }, [active, categories.length])

  return (
    <nav aria-label="Categorias" className="sticky top-16 z-30 border-b border-border/70 bg-background/95 backdrop-blur">
      <div ref={scroller} className="no-scrollbar mx-auto flex max-w-6xl gap-2 overflow-x-auto px-3 py-2.5 sm:px-6">
        <Chip to="/" active={active === null}>
          Todos
        </Chip>
        <Chip to="/categoria/novidades" active={active === 'novidades'}>
          Novidades
        </Chip>
        {categories.map((c) => (
          <Chip key={c.id} to={`/categoria/${c.slug}`} active={active === c.slug}>
            {c.name}
          </Chip>
        ))}
      </div>
    </nav>
  )
}

function Chip({ to, active, children }: { to: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'shrink-0 rounded-full border px-4 py-2 text-[13px] font-medium transition-colors',
        active
          ? 'border-malva-600 bg-malva-600 text-white'
          : 'border-border bg-white text-malva-800 hover:border-malva-300',
      )}
    >
      {children}
    </Link>
  )
}
