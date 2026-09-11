import { CircleCheck } from 'lucide-react'
import { formatBRL } from '@/lib/money'
import { minOrderProgress } from '@/lib/orders'
import { cn } from '@/lib/utils'

export function MinOrderProgress({ totalCents, minOrderCents }: { totalCents: number; minOrderCents: number }) {
  const progress = minOrderProgress(totalCents, minOrderCents)

  return (
    <div className={cn('rounded-2xl p-4', progress.reached ? 'bg-ok-fundo' : 'bg-malva-100')} aria-live="polite">
      {progress.reached ? (
        <>
          <p className="flex items-center gap-2 text-[15px] font-semibold text-ok">
            <CircleCheck className="size-5" /> Pedido mínimo atingido!
          </p>
          <p className="mt-0.5 text-sm text-ok">Seu pedido está pronto para ser enviado.</p>
        </>
      ) : (
        <p className="text-[15px] text-malva-800">
          Faltam <strong className="font-bold">{formatBRL(progress.remainingCents)}</strong> para o pedido mínimo
        </p>
      )}
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-white/80"
        role="progressbar"
        aria-label="Progresso até o pedido mínimo"
        aria-valuemin={0}
        aria-valuemax={minOrderCents}
        aria-valuenow={Math.min(totalCents, minOrderCents)}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-500', progress.reached ? 'bg-ok' : 'bg-malva-500')}
          style={{ width: `${Math.round(progress.ratio * 100)}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs tabular-nums text-muted-foreground">
        {formatBRL(totalCents)} de {formatBRL(minOrderCents)}
      </p>
    </div>
  )
}
