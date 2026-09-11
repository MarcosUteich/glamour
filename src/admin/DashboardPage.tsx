import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { formatBRL } from '@/lib/money'
import { orderStatusLabel, type OrderStatus } from '@/lib/orders'
import { fetchDashboard } from './api'
import { AdminCard, FilterChip, Metric, PageTitle } from './ui'

const RANGES = [
  { days: 1, label: 'Hoje' },
  { days: 7, label: '7 dias' },
  { days: 30, label: '30 dias' },
]

export function DashboardPage() {
  const [days, setDays] = useState(7)
  const { data, isPending } = useQuery({ queryKey: ['dashboard', days], queryFn: () => fetchDashboard(days) })

  return (
    <div>
      <PageTitle>Início</PageTitle>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Metric label="Pedidos hoje" value={data ? String(data.today_count) : '—'} />
        <Metric label="Valor hoje" value={data ? formatBRL(data.today_total_cents) : '—'} />
      </div>

      <div className="mb-3 flex gap-2">
        {RANGES.map((r) => (
          <FilterChip key={r.days} active={days === r.days} onClick={() => setDays(r.days)}>
            {r.label}
          </FilterChip>
        ))}
      </div>

      {isPending || !data ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Pedidos" value={String(data.orders_count)} />
            <Metric label="Pendentes" value={String(data.pending_count)} />
            <Metric label="Confirmados" value={String(data.confirmed_count)} />
            <Metric label="Valor" value={formatBRL(data.total_cents)} hint="sem cancelados" />
          </div>

          {Object.keys(data.by_status).length > 0 && (
            <AdminCard className="mb-4">
              <p className="mb-2 text-sm font-semibold text-malva-800">Pedidos por status</p>
              <ul className="space-y-1.5 text-sm">
                {Object.entries(data.by_status).map(([status, n]) => (
                  <li key={status} className="flex justify-between">
                    <span className="text-muted-foreground">{orderStatusLabel(status as OrderStatus)}</span>
                    <span className="font-semibold tabular-nums">{n}</span>
                  </li>
                ))}
              </ul>
            </AdminCard>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <TopList title="Mais adicionados ao pedido" rows={data.top_added} unit="vezes" />
            <TopList title="Mais vendidos" rows={data.top_sold} unit="un." />
          </div>
        </>
      )}
    </div>
  )
}

function TopList({ title, rows, unit }: { title: string; rows: Array<{ name: string; code: string; n: number }>; unit: string }) {
  return (
    <AdminCard>
      <p className="mb-2 text-sm font-semibold text-malva-800">{title}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ainda sem dados no período.</p>
      ) : (
        <ol className="space-y-1.5 text-sm">
          {rows.map((row) => (
            <li key={row.code} className="flex justify-between gap-3">
              <span className="min-w-0 truncate text-tinta">
                {row.name} <span className="text-muted-foreground">· {row.code}</span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums">
                {row.n} {unit}
              </span>
            </li>
          ))}
        </ol>
      )}
    </AdminCard>
  )
}
