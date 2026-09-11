import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { normalizeText } from '@/lib/slug'
import { formatBRL } from '@/lib/money'
import { formatBRPhone } from '@/lib/phone'
import { ORDER_STATUSES, type OrderStatus } from '@/lib/orders'
import { fetchOrders } from './api'
import { EmptyState, FilterChip, PageTitle, StatusPill } from './ui'

const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

export function OrdersPage() {
  const { data, isPending } = useQuery({ queryKey: ['orders'], queryFn: fetchOrders })
  const [status, setStatus] = useState<OrderStatus | 'todos'>('todos')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!data) return []
    const term = normalizeText(query).trim()
    return data.filter((o) => {
      if (status !== 'todos' && o.status !== status) return false
      if (!term) return true
      return normalizeText(`${o.order_number} ${o.customer_name} ${o.customer_phone}`).includes(term)
    })
  }, [data, status, query])

  return (
    <div>
      <PageTitle>Pedidos</PageTitle>

      <Input
        placeholder="Buscar por nome, telefone ou número"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-3"
      />
      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
        <FilterChip active={status === 'todos'} onClick={() => setStatus('todos')}>
          Todos
        </FilterChip>
        {ORDER_STATUSES.map((s) => (
          <FilterChip key={s.value} active={status === s.value} onClick={() => setStatus(s.value)}>
            {s.label}
          </FilterChip>
        ))}
      </div>

      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState>Nenhum pedido {status !== 'todos' ? 'com esse status' : 'ainda'}.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {filtered.map((o) => (
            <li key={o.id}>
              <Link
                to={`/admin/pedidos/${o.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-white p-4 transition-colors hover:border-malva-300"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold text-tinta">
                    #{o.order_number.split('-').slice(-1)[0]}
                    <StatusPill status={o.status} />
                  </p>
                  <p className="truncate text-sm text-tinta">{o.customer_name}</p>
                  <p className="text-[12px] text-muted-foreground">
                    {formatBRPhone(o.customer_phone)} · {dateFmt.format(new Date(o.created_at))}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-bold tabular-nums text-malva-800">{formatBRL(o.total_cents)}</p>
                  <p className="text-[12px] text-muted-foreground">{o.item_count} peças</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
