import { ArrowLeft, MapPin } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { CartLineRow } from '@/components/cart/CartLineRow'
import { MinOrderProgress } from '@/components/cart/MinOrderProgress'
import { Suggestions } from '@/components/cart/Suggestions'
import { CustomerForm } from '@/components/checkout/CustomerForm'
import { WhatsAppIcon } from '@/components/brand/WhatsAppIcon'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { createOrder, OrderError } from '@/data/api'
import { useSettings } from '@/hooks/useCatalog'
import { track } from '@/lib/analytics'
import { productSubtitle } from '@/lib/catalog'
import { formatBRL } from '@/lib/money'
import { minOrderProgress, orderErrorMessage } from '@/lib/orders'
import { formatBRPhone } from '@/lib/phone'
import { loadCustomer, saveCustomer, saveLastOrder } from '@/lib/storage'
import { buildOrderWhatsApp } from '@/lib/whatsapp'
import { useCart, useCartTotals } from '@/store/cart'
import { useMutation } from '@tanstack/react-query'

type Step = 'carrinho' | 'dados' | 'revisao'
const STEPS: Step[] = ['carrinho', 'dados', 'revisao']

export function OrderPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const settings = useSettings()
  const { lines, totalCents, pieces } = useCartTotals()
  const setQuantity = useCart((s) => s.setQuantity)
  const clear = useCart((s) => s.clear)

  const requested = (params.get('etapa') as Step) ?? 'carrinho'
  const progress = minOrderProgress(totalCents, settings.min_order_cents)
  const customer = loadCustomer()
  const goTo = (next: Step) => setParams(next === 'carrinho' ? {} : { etapa: next }, { replace: true })

  useEffect(() => {
    track('cart_view')
  }, [])

  const mutation = useMutation({
    mutationFn: () =>
      createOrder({
        name: customer!.name,
        phone: customer!.phone,
        items: lines.map((l) => ({ product_id: l.productId, quantity: l.quantity })),
      }),
    onSuccess: (order) => {
      const summary = {
        orderNumber: order.order_number,
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        items: order.items.map((i) => ({
          name: i.name,
          code: i.code,
          size: i.size,
          shade: i.shade,
          quantity: i.quantity,
          unitPriceCents: i.unit_price_cents,
          totalCents: i.total_cents,
        })),
        totalCents: order.total_cents,
        itemCount: order.item_count,
        minOrderCents: order.min_order_cents,
        pickupText: settings.pickup_text,
      }
      const { text, url } = buildOrderWhatsApp(summary, settings.whatsapp_number)
      saveLastOrder({
        orderNumber: order.order_number,
        text,
        url,
        totalCents: order.total_cents,
        pieces: order.item_count,
        createdAt: new Date().toISOString(),
      })
      navigate(`/pedido/confirmado/${order.order_number}`, { replace: true })
      clear()
    },
    onError: (error) => {
      const message =
        error instanceof OrderError ? orderErrorMessage(error.code, error.detail) : 'Não foi possível registrar o pedido.'
      toast.error(message, { duration: 8000 })
    },
  })

  // Enquanto o pedido é criado e a rota muda para a confirmação, não voltamos ao "carrinho vazio"
  if (mutation.isPending || mutation.isSuccess) {
    return (
      <div className="grid min-h-[60dvh] place-items-center">
        <span className="size-8 animate-spin rounded-full border-2 border-malva-200 border-t-malva-500" />
      </div>
    )
  }

  if (pieces === 0) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <title>Seu pedido · Glamour Atacado</title>
        <p className="text-lg font-semibold text-malva-800">Seu pedido está vazio</p>
        <p className="mt-1 text-sm text-muted-foreground">Escolha as peças no catálogo para montar seu pedido de atacado.</p>
        <Link to="/" className={buttonVariants({ className: 'mt-6' })}>
          Ver o catálogo
        </Link>
      </div>
    )
  }

  // Etapa efetiva (puro cálculo — não força a URL para não competir com a navegação de sucesso)
  const step: Step =
    !progress.reached ? 'carrinho' : requested === 'revisao' && !customer ? 'dados' : requested

  return (
    <div className="mx-auto max-w-xl px-4 pb-24 pt-4 sm:px-6">
      <title>Seu pedido · Glamour Atacado</title>
      <StepHeader step={step} onBack={step === 'carrinho' ? () => navigate('/') : () => goTo(STEPS[STEPS.indexOf(step) - 1])} />

      {step === 'carrinho' && (
        <>
          <MinOrderProgress totalCents={totalCents} minOrderCents={settings.min_order_cents} />
          <ul className="mt-2 divide-y divide-border">
            {lines.map((line) => (
              <CartLineRow key={line.productId} line={line} onQuantity={(q) => setQuantity(line.productId, q)} />
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
            <span className="text-sm text-muted-foreground">Total ({pieces} {pieces === 1 ? 'peça' : 'peças'})</span>
            <span className="text-xl font-bold tabular-nums text-malva-800">{formatBRL(totalCents)}</span>
          </div>

          {progress.suggest && <Suggestions remainingCents={progress.remainingCents} />}

          <div className="mt-6 space-y-3">
            <Link to="/" className={buttonVariants({ variant: 'outline', className: 'w-full' })}>
              Continuar escolhendo peças
            </Link>
            <Button
              size="lg"
              className="w-full"
              disabled={!progress.reached}
              onClick={() => {
                track('checkout_started')
                goTo('dados')
              }}
            >
              {progress.reached ? 'Continuar' : `Faltam ${formatBRL(progress.remainingCents)}`}
            </Button>
            {!progress.reached && (
              <p className="text-center text-[13px] text-muted-foreground">
                Envio pelo WhatsApp liberado a partir de {formatBRL(settings.min_order_cents)}
              </p>
            )}
          </div>
        </>
      )}

      {step === 'dados' && (
        <>
          <h1 className="mb-1 text-xl font-semibold text-malva-800">Seus dados</h1>
          <p className="mb-6 text-sm text-muted-foreground">Para a gente falar com você sobre o pedido.</p>
          <CustomerForm
            defaultValues={customer}
            onSubmit={(values) => {
              saveCustomer(values)
              goTo('revisao')
            }}
          />
        </>
      )}

      {step === 'revisao' && customer && (
        <>
          <h1 className="mb-4 text-xl font-semibold text-malva-800">Confirme seu pedido</h1>
          <dl className="rounded-2xl bg-malva-100 p-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Cliente</dt>
              <dd className="text-right font-medium text-tinta">{customer.name}</dd>
            </div>
            <div className="mt-1 flex justify-between gap-4">
              <dt className="text-muted-foreground">WhatsApp</dt>
              <dd className="text-right font-medium text-tinta">{formatBRPhone(customer.phone)}</dd>
            </div>
            <button
              type="button"
              onClick={() => goTo('dados')}
              className="mt-2 text-[13px] font-semibold text-malva-700 underline underline-offset-2"
            >
              Editar dados
            </button>
          </dl>

          <ul className="mt-4 divide-y divide-border rounded-2xl border border-border bg-white">
            {lines.map((line) => (
              <li key={line.productId} className="flex justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-tinta">{line.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {productSubtitle(line)} · Qtd {line.quantity}
                  </p>
                </div>
                <span className="shrink-0 font-semibold tabular-nums text-malva-800">
                  {formatBRL(line.priceCents * line.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-center justify-between rounded-2xl bg-malva-600 px-4 py-3 text-malva-50">
            <span className="text-sm">Total do pedido</span>
            <span className="text-xl font-bold tabular-nums">{formatBRL(totalCents)}</span>
          </div>

          <p className="mt-4 flex gap-2 text-sm text-malva-800">
            <MapPin className="mt-0.5 size-4 shrink-0 text-dourado" />
            <span>
              <strong className="font-semibold">Retirada</strong>
              <br />
              {settings.pickup_text}
            </span>
          </p>

          <Button
            size="lg"
            variant="whatsapp"
            className="mt-6 h-13 w-full text-base"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            <WhatsAppIcon className="size-5" />
            {mutation.isPending ? 'Preparando…' : 'Enviar pedido pelo WhatsApp'}
          </Button>
          <p className="mt-2 text-center text-[13px] text-muted-foreground">
            Você confere a mensagem no WhatsApp antes de enviar.
          </p>
        </>
      )}
    </div>
  )
}

function StepHeader({ step, onBack }: { step: Step; onBack: () => void }) {
  const index = STEPS.indexOf(step)
  return (
    <div className="mb-5">
      <button
        type="button"
        onClick={onBack}
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-malva-700"
      >
        <ArrowLeft className="size-4" /> Voltar
      </button>
      <div className="flex gap-1.5" aria-hidden>
        {STEPS.map((_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full ${i <= index ? 'bg-malva-500' : 'bg-malva-200'}`}
          />
        ))}
      </div>
    </div>
  )
}
