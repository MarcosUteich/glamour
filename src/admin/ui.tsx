import type { ComponentProps, ReactNode } from 'react'
import { ORDER_STATUSES, orderStatusLabel, type OrderStatus } from '@/lib/orders'
import { cn } from '@/lib/utils'

export function AdminCard({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('rounded-2xl border border-border bg-white p-4 sm:p-5', className)} {...props} />
}

export function PageTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <h1 className="text-xl font-semibold text-malva-800">{children}</h1>
      {action}
    </div>
  )
}

export function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-malva-100/70 p-4">
      <p className="text-[12px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-malva-800">{value}</p>
      {hint && <p className="text-[12px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

const STATUS_STYLES: Record<OrderStatus, string> = {
  novo: 'bg-malva-100 text-malva-800',
  em_atendimento: 'bg-[#F4EBD8] text-[#6E5321]',
  confirmado: 'bg-ok-fundo text-ok',
  separando: 'bg-ok-fundo text-ok',
  pronto: 'bg-ok-fundo text-ok',
  retirado: 'bg-malva-200 text-malva-800',
  cancelado: 'bg-red-50 text-red-700',
}

export function StatusPill({ status }: { status: OrderStatus }) {
  return (
    <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-[12px] font-semibold', STATUS_STYLES[status])}>
      {orderStatusLabel(status)}
    </span>
  )
}

export function StatusSelect({
  value,
  onChange,
  disabled,
}: {
  value: OrderStatus
  onChange: (value: OrderStatus) => void
  disabled?: boolean
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as OrderStatus)}
      className="h-11 rounded-xl border border-input bg-white px-3 text-sm font-medium text-tinta focus-visible:border-malva-500 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-malva-200 disabled:opacity-50"
    >
      {ORDER_STATUSES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  )
}

export function FilterChip({ active, ...props }: ComponentProps<'button'> & { active: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        'shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors',
        active ? 'border-malva-600 bg-malva-600 text-white' : 'border-border bg-white text-malva-800 hover:border-malva-300',
      )}
      {...props}
    />
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-border bg-white py-12 text-center text-sm text-muted-foreground">{children}</p>
}
