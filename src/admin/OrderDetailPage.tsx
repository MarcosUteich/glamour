import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Printer } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { WhatsAppIcon } from '@/components/brand/WhatsAppIcon'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useSettings } from '@/hooks/useCatalog'
import { formatBRL } from '@/lib/money'
import { formatBRPhone, toWhatsAppNumber } from '@/lib/phone'
import type { OrderStatus } from '@/lib/orders'
import { buildCustomerMessage, whatsappLink } from '@/lib/whatsapp'
import { changeOrderStatus, fetchOrder, saveOrderNotes } from './api'
import { AdminCard, PageTitle, StatusSelect } from './ui'

const dateFmt = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

export function OrderDetailPage() {
  const { id = '' } = useParams()
  const settings = useSettings()
  const qc = useQueryClient()
  const { data: order, isPending } = useQuery({ queryKey: ['order', id], queryFn: () => fetchOrder(id) })
  const [notes, setNotes] = useState('')
  const [notesSeeded, setNotesSeeded] = useState(false)
  if (order && !notesSeeded) {
    setNotesSeeded(true)
    setNotes(order.admin_notes ?? '')
  }

  const statusMutation = useMutation({
    mutationFn: (status: OrderStatus) => changeOrderStatus(id, status),
    onSuccess: () => {
      toast.success('Status atualizado')
      qc.invalidateQueries({ queryKey: ['order', id] })
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: () => toast.error('Não foi possível mudar o status'),
  })

  const notesMutation = useMutation({
    mutationFn: () => saveOrderNotes(id, notes),
    onSuccess: () => toast.success('Anotação salva'),
    onError: () => toast.error('Não foi possível salvar'),
  })

  if (isPending) return <Skeleton className="h-96 w-full" />
  if (!order) {
    return (
      <div>
        <p className="text-malva-800">Pedido não encontrado.</p>
        <Link to="/admin/pedidos" className={buttonVariants({ variant: 'outline', className: 'mt-4' })}>
          Voltar
        </Link>
      </div>
    )
  }

  const customerWhats = whatsappLink(
    toWhatsAppNumber(order.customer_phone),
    buildCustomerMessage(order.status, {
      customerName: order.customer_name,
      orderNumber: order.order_number,
      totalCents: order.total_cents,
      pickupText: settings.pickup_text,
      hoursText: settings.hours_text,
    }),
  )

  return (
    <div>
      <Link to="/admin/pedidos" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-malva-700">
        <ArrowLeft className="size-4" /> Pedidos
      </Link>
      <PageTitle>#{order.order_number}</PageTitle>

      <AdminCard className="mb-4">
        <p className="font-semibold text-tinta">{order.customer_name}</p>
        <p className="text-sm text-muted-foreground">{formatBRPhone(order.customer_phone)}</p>
        <p className="text-[12px] text-muted-foreground">{dateFmt.format(new Date(order.created_at))}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={customerWhats} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: 'whatsapp', size: 'sm' })}>
            <WhatsAppIcon className="size-4" /> Falar com cliente
          </a>
          <button type="button" onClick={() => window.print()} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            <Printer className="size-4" /> Lista de separação
          </button>
        </div>
      </AdminCard>

      <AdminCard className="mb-4">
        <label className="text-sm font-semibold text-malva-800" htmlFor="status">
          Status do pedido
        </label>
        <div className="mt-2">
          <StatusSelect
            value={order.status}
            disabled={statusMutation.isPending}
            onChange={(status) => statusMutation.mutate(status)}
          />
        </div>
        <p className="mt-2 text-[12px] text-muted-foreground">
          Ao confirmar, o estoque das peças é baixado automaticamente. Cancelar devolve ao estoque.
        </p>
      </AdminCard>

      <AdminCard className="mb-4">
        <p className="mb-2 text-sm font-semibold text-malva-800">Itens</p>
        <ul className="divide-y divide-border">
          {order.order_items.map((item) => (
            <li key={item.id} className="flex justify-between gap-3 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-tinta">{item.product_name}</p>
                <p className="text-[12px] text-muted-foreground">
                  {[item.product_code, item.size, item.shade].filter(Boolean).join(' · ')} · {item.quantity} ×{' '}
                  {formatBRL(item.unit_price_cents)}
                </p>
              </div>
              <span className="shrink-0 font-semibold tabular-nums text-malva-800">{formatBRL(item.total_cents)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-border pt-3 font-semibold text-malva-800">
          <span>Total · {order.item_count} peças</span>
          <span className="tabular-nums">{formatBRL(order.total_cents)}</span>
        </div>
      </AdminCard>

      <AdminCard>
        <label htmlFor="notes" className="text-sm font-semibold text-malva-800">
          Anotações internas
        </label>
        <Textarea
          id="notes"
          className="mt-2"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ex.: cliente vai retirar sexta à tarde"
        />
        <Button variant="soft" size="sm" className="mt-2" onClick={() => notesMutation.mutate()} disabled={notesMutation.isPending}>
          Salvar anotação
        </Button>
      </AdminCard>
    </div>
  )
}
