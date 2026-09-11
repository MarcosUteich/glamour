import { ShoppingBag } from 'lucide-react'
import { Link } from 'react-router'
import { useSettings } from '@/hooks/useCatalog'
import { formatBRL } from '@/lib/money'
import { minOrderProgress } from '@/lib/orders'
import { cn } from '@/lib/utils'
import { useCartTotals } from '@/store/cart'

/** Botão flutuante com o total e a barra até o pedido mínimo. */
export function CartFab() {
  const settings = useSettings()
  const { totalCents, pieces } = useCartTotals()
  if (pieces === 0) return null

  const progress = minOrderProgress(totalCents, settings.min_order_cents)

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <Link
        to="/pedido"
        className="pointer-events-auto w-full max-w-md overflow-hidden rounded-2xl bg-tinta text-malva-50 shadow-xl shadow-tinta/25 transition-transform active:scale-[0.99]"
      >
        <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-3">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <ShoppingBag className="size-5" strokeWidth={1.8} />
            Ver pedido · {pieces} {pieces === 1 ? 'peça' : 'peças'}
          </span>
          <span className="text-base font-bold tabular-nums">{formatBRL(totalCents)}</span>
        </div>
        <div className="mx-4 h-1.5 overflow-hidden rounded-full bg-white/15">
          <div
            className={cn('h-full rounded-full transition-[width] duration-500', progress.reached ? 'bg-[#8fc4a3]' : 'bg-dourado')}
            style={{ width: `${Math.round(progress.ratio * 100)}%` }}
          />
        </div>
        <p className="px-4 pb-2.5 pt-1.5 text-[12px] text-malva-100">
          {progress.reached
            ? '✓ Pedido mínimo atingido. Toque para enviar'
            : `Faltam ${formatBRL(progress.remainingCents)} para o pedido mínimo`}
        </p>
      </Link>
    </div>
  )
}
