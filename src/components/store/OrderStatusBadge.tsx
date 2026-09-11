import { CheckCircle2, Clock, PackageCheck, PackageSearch, XCircle } from 'lucide-react'
import { orderStatusLabel, type OrderStatus } from '@/lib/orders'
import { cn } from '@/lib/utils'

const STYLES: Record<OrderStatus, { className: string; icon: typeof Clock }> = {
  novo: { className: 'bg-malva-100 text-malva-800', icon: Clock },
  em_atendimento: { className: 'bg-malva-100 text-malva-800', icon: PackageSearch },
  confirmado: { className: 'bg-ok-fundo text-ok', icon: CheckCircle2 },
  separando: { className: 'bg-ok-fundo text-ok', icon: PackageSearch },
  pronto: { className: 'bg-ok-fundo text-ok', icon: PackageCheck },
  retirado: { className: 'bg-malva-200 text-malva-800', icon: CheckCircle2 },
  cancelado: { className: 'bg-red-50 text-red-700', icon: XCircle },
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { className, icon: Icon } = STYLES[status]
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold', className)}>
      <Icon className="size-3.5" />
      {orderStatusLabel(status)}
    </span>
  )
}
