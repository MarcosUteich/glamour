import { Check, Copy, MapPin } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { WhatsAppIcon } from '@/components/brand/WhatsAppIcon'
import { GoldDivider } from '@/components/brand/Ornaments'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { useSettings } from '@/hooks/useCatalog'
import { track } from '@/lib/analytics'
import { formatBRL } from '@/lib/money'
import { formatBRPhone } from '@/lib/phone'
import { loadLastOrder, markLastOrderTracked } from '@/lib/storage'
import { whatsappLink } from '@/lib/whatsapp'

export function OrderConfirmedPage() {
  const { orderNumber } = useParams()
  const settings = useSettings()
  const [copied, setCopied] = useState(false)
  const [order] = useState(loadLastOrder)
  const matches = order !== null && order.orderNumber === orderNumber

  // Conta o pedido no GA4/Pixel uma vez só, mesmo que a página seja reaberta
  useEffect(() => {
    if (!order || !matches || order.tracked) return
    track('order_created', { valueCents: order.totalCents, meta: { order_number: order.orderNumber } })
    markLastOrderTracked()
  }, [order, matches])

  if (!matches) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <title>Pedido · Glamour Atacado</title>
        <p className="text-lg font-semibold text-malva-800">Pedido {orderNumber}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Não encontramos os detalhes deste pedido neste aparelho. Se você já enviou a mensagem, é só aguardar nosso
          retorno pelo WhatsApp.
        </p>
        <Link to="/" className={buttonVariants({ className: 'mt-6' })}>
          Voltar ao catálogo
        </Link>
      </div>
    )
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(order.text)
      setCopied(true)
      toast.success('Pedido copiado')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error('Não foi possível copiar')
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 pb-20 pt-10 text-center">
      <title>{`Pedido ${order.orderNumber} · Glamour Atacado`}</title>

      <div className="mx-auto grid size-16 place-items-center rounded-full bg-ok-fundo">
        <Check className="size-8 text-ok" strokeWidth={2.5} />
      </div>
      <h1 className="mt-4 text-2xl font-semibold text-malva-800">Pedido preparado!</h1>
      <p className="mt-1.5 text-[15px] text-muted-foreground">
        Agora toque no botão abaixo para enviar pelo WhatsApp e finalizar.
      </p>

      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Número do pedido</p>
      <p className="text-lg font-bold text-malva-800">#{order.orderNumber}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {order.pieces} {order.pieces === 1 ? 'peça' : 'peças'} · {formatBRL(order.totalCents)}
      </p>

      <a
        href={order.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() =>
          track('whatsapp_clicked', { valueCents: order.totalCents, meta: { order_number: order.orderNumber } })
        }
        className={buttonVariants({ variant: 'whatsapp', size: 'lg', className: 'mt-7 h-14 w-full text-base' })}
      >
        <WhatsAppIcon className="size-5" />
        Enviar pedido pelo WhatsApp
      </a>
      <Button variant="soft" className="mt-3 w-full" onClick={copy}>
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copied ? 'Copiado' : 'Copiar pedido'}
      </Button>

      <GoldDivider className="my-8" />

      <div className="space-y-3 text-left text-sm text-malva-800">
        <p className="flex items-center gap-2">
          <WhatsAppIcon className="size-4 text-whats" />
          WhatsApp Glamour ·{' '}
          <a href={whatsappLink(settings.whatsapp_number)} className="font-semibold text-whats">
            {formatBRPhone(settings.whatsapp_number)}
          </a>
        </p>
        <p className="flex gap-2">
          <MapPin className="mt-0.5 size-4 shrink-0 text-dourado" />
          {settings.pickup_text}
        </p>
      </div>

      <Link to="/" className={buttonVariants({ variant: 'ghost', className: 'mt-8' })}>
        Fazer outro pedido
      </Link>
    </div>
  )
}
