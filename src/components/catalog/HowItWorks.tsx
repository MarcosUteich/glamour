import { Gem, ShoppingBag } from 'lucide-react'
import type { ReactNode } from 'react'
import { WhatsAppIcon } from '@/components/brand/WhatsAppIcon'
import { formatBRL } from '@/lib/money'

export function HowItWorks({ minOrderCents }: { minOrderCents: number }) {
  const steps: Array<{ icon: ReactNode; title: string; text: string }> = [
    { icon: <Gem className="size-5" strokeWidth={1.6} />, title: 'Escolha as peças', text: 'Pelo catálogo, no seu tempo' },
    {
      icon: <ShoppingBag className="size-5" strokeWidth={1.6} />,
      title: `A partir de ${formatBRL(minOrderCents)}`,
      text: 'Pedido mínimo no atacado',
    },
    { icon: <WhatsAppIcon className="size-5" />, title: 'Envie pelo WhatsApp', text: 'E retire no Lindóia Shopping' },
  ]

  return (
    <section aria-label="Como comprar" className="border-b border-border bg-white">
      <ol className="mx-auto grid max-w-3xl grid-cols-3 gap-2 px-3 py-6 text-center">
        {steps.map((step, i) => (
          <li key={step.title} className="flex flex-col items-center">
            <span className="relative grid size-11 place-items-center rounded-full border border-dourado/60 text-malva-600">
              {step.icon}
              <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-malva-600 text-[10px] font-bold text-white">
                {i + 1}
              </span>
            </span>
            <p className="mt-2 text-[12.5px] font-semibold leading-tight text-malva-800">{step.title}</p>
            <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
