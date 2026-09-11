import { ChevronDown, Search } from 'lucide-react'
import { useState } from 'react'
import { GoldDivider } from '@/components/brand/Ornaments'
import { OrderStatusBadge } from '@/components/store/OrderStatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fetchOrdersByPhone, OrderError } from '@/data/api'
import { productSubtitle } from '@/lib/catalog'
import { formatBRL } from '@/lib/money'
import { orderLookupErrorMessage } from '@/lib/orders'
import { formatBRPhone, isValidBRPhone } from '@/lib/phone'
import { loadCustomer } from '@/lib/storage'
import type { CustomerOrder } from '@/lib/types'
import { cn } from '@/lib/utils'

const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

type Status = 'idle' | 'loading' | 'error' | 'done'

export function MyOrdersPage() {
  const [phone, setPhone] = useState(formatBRPhone(loadCustomer()?.phone ?? ''))
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [searchedPhone, setSearchedPhone] = useState('')

  const search = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidBRPhone(phone)) {
      setStatus('error')
      setErrorMessage('Use DDD + número, como (51) 99999-9999.')
      return
    }
    setStatus('loading')
    try {
      const result = await fetchOrdersByPhone(phone)
      setOrders(result)
      setSearchedPhone(formatBRPhone(phone))
      setStatus('done')
    } catch (error) {
      setStatus('error')
      setErrorMessage(error instanceof OrderError ? orderLookupErrorMessage(error.code) : orderLookupErrorMessage(''))
    }
  }

  return (
    <div className="mx-auto max-w-lg px-5 pb-20 pt-10">
      <title>Meus pedidos · Glamour Atacado</title>

      <h1 className="text-center text-2xl font-semibold text-malva-800">Meus pedidos</h1>
      <p className="mx-auto mt-2 max-w-sm text-center text-[15px] text-muted-foreground">
        Digite o WhatsApp usado no pedido para ver o histórico. Não é preciso senha nem cadastro.
      </p>

      <form onSubmit={search} className="mt-7 space-y-1.5">
        <Label htmlFor="phone">WhatsApp</Label>
        <div className="flex gap-2">
          <Input
            id="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="(51) 99999-9999"
            aria-invalid={status === 'error'}
            value={phone}
            onChange={(e) => setPhone(formatBRPhone(e.target.value))}
          />
          <Button type="submit" size="default" disabled={status === 'loading'} className="shrink-0">
            <Search /> {status === 'loading' ? 'Buscando…' : 'Ver'}
          </Button>
        </div>
        {status === 'error' && <p className="text-[13px] text-destructive">{errorMessage}</p>}
      </form>

      <GoldDivider className="my-8" />

      {status === 'done' && orders.length === 0 && (
        <p className="text-center text-[15px] text-muted-foreground">
          Nenhum pedido encontrado com o WhatsApp {searchedPhone}.
        </p>
      )}

      {status === 'done' && orders.length > 0 && (
        <ul className="space-y-3">
          {orders.map((order) => (
            <OrderCard key={order.order_number} order={order} />
          ))}
        </ul>
      )}
    </div>
  )
}

function OrderCard({ order }: { order: CustomerOrder }) {
  const [open, setOpen] = useState(false)

  return (
    <li className="overflow-hidden rounded-2xl border border-border bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-semibold text-tinta">
            #{order.order_number}
            <OrderStatusBadge status={order.status} />
          </p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {dateFmt.format(new Date(order.created_at))} · {order.item_count} {order.item_count === 1 ? 'peça' : 'peças'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-bold tabular-nums text-malva-800">{formatBRL(order.total_cents)}</span>
          <ChevronDown className={cn('size-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
        </div>
      </button>

      {open && (
        <ul className="divide-y divide-border border-t border-border px-4">
          {order.items.map((item, i) => (
            <li key={`${item.code}-${i}`} className="flex justify-between gap-3 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-tinta">{item.name}</p>
                <p className="text-[12px] text-muted-foreground">
                  {productSubtitle(item)} · Qtd {item.quantity}
                </p>
              </div>
              <span className="shrink-0 font-semibold tabular-nums text-malva-800">{formatBRL(item.total_cents)}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}
