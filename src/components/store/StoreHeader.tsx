import { ShoppingBag } from 'lucide-react'
import { Link } from 'react-router'
import { Wordmark } from '@/components/brand/Wordmark'
import { useCartTotals } from '@/store/cart'
import { MenuDrawer } from './MenuDrawer'

export function StoreHeader() {
  const { pieces } = useCartTotals()

  return (
    <header className="sticky top-0 z-40 bg-malva-500 text-malva-50">
      <div className="mx-auto grid h-16 max-w-6xl grid-cols-[3rem_1fr_3rem] items-center px-2 sm:px-6">
        <MenuDrawer />
        <Link
          to="/"
          aria-label="Glamour Atacado, página inicial"
          className="flex flex-col items-center justify-self-center"
        >
          <Wordmark className="w-[128px]" dotsClassName="fill-dourado-claro" />
          <span className="-mt-0.5 text-[10px] font-medium uppercase tracking-[0.5em] text-malva-100">atacado</span>
        </Link>
        <Link
          to="/pedido"
          aria-label={pieces > 0 ? `Seu pedido, ${pieces} peças` : 'Seu pedido'}
          className="relative grid size-12 place-items-center justify-self-end rounded-full transition-colors hover:bg-white/10"
        >
          <ShoppingBag className="size-6" strokeWidth={1.6} />
          {pieces > 0 && (
            <span className="absolute right-0.5 top-1 min-w-5 rounded-full bg-malva-50 px-1 text-center text-[11px] font-bold leading-5 text-malva-700">
              {pieces > 99 ? '99+' : pieces}
            </span>
          )}
        </Link>
      </div>
    </header>
  )
}
