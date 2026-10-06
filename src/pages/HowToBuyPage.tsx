import { Clock, MapPin, ShoppingBag } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useLocation } from 'react-router'
import { GoldDivider } from '@/components/brand/Ornaments'
import { WhatsAppIcon } from '@/components/brand/WhatsAppIcon'
import { buttonVariants } from '@/components/ui/button-variants'
import { useCatalog, useSettings } from '@/hooks/useCatalog'
import { visibleCategories } from '@/lib/catalog'
import { formatBRL } from '@/lib/money'
import { formatBRPhone } from '@/lib/phone'
import { whatsappLink } from '@/lib/whatsapp'
import { BUSINESS } from '@/seo/business'
import { faqOrDefault, fillFaq } from '@/seo/faq'
import { titles } from '@/seo/titles'

/** /como-comprar: passo a passo do atacado, onde retirar e perguntas frequentes (editáveis em /admin → Config). */
export function HowToBuyPage() {
  const { hash } = useLocation()
  const settings = useSettings()
  const { data } = useCatalog()
  const categories = data ? visibleCategories(data.categories, data.products) : []
  const min = formatBRL(settings.min_order_cents)
  const faq = fillFaq(faqOrDefault(settings.faq), {
    minOrderCents: settings.min_order_cents,
    pickupText: settings.pickup_text,
    hoursText: settings.hours_text,
    whatsappNumber: settings.whatsapp_number,
  })

  const steps = [
    {
      title: 'Escolha as peças',
      text: 'Navegue pelo catálogo e adicione as peças e as quantidades que você quer revender.',
    },
    {
      title: `Chegue a ${min}`,
      text: `O pedido mínimo é de ${min}, somando todas as peças. A barra do pedido mostra quanto falta.`,
    },
    {
      title: 'Envie pelo WhatsApp',
      text: 'Informe seu nome e WhatsApp. O site monta a mensagem com o pedido completo para você enviar à loja.',
    },
    {
      title: 'Retire na loja',
      text: 'A loja confere as peças, confirma pelo WhatsApp e avisa quando o pedido estiver pronto para retirada.',
    },
  ]

  // Link do rodapé "Perguntas frequentes" (#perguntas-frequentes): rola depois que a página entra
  useEffect(() => {
    if (!hash) return
    const timer = window.setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' }), 60)
    return () => window.clearTimeout(timer)
  }, [hash])

  return (
    <div className="mx-auto max-w-3xl px-5 pb-16 pt-10 sm:px-6">
      <title>{titles.howToBuy()}</title>

      <nav aria-label="Você está em" className="mb-5 text-sm text-muted-foreground">
        <Link to="/" className="font-medium text-malva-700 hover:underline">
          Início
        </Link>{' '}
        › <span aria-current="page">Como comprar</span>
      </nav>

      <h1 className="text-[28px] font-semibold leading-tight text-malva-800 sm:text-4xl">Como comprar no atacado</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-malva-800/85 sm:text-base">
        Semijoias, acessórios e maquiagem com preço de atacado para lojistas, revendedoras e sacoleiras. Você monta o
        pedido no site, envia pelo WhatsApp e retira na {BUSINESS.name}, no Lindóia Shopping, em Porto Alegre.
      </p>
      <ul className="mt-5 flex flex-wrap gap-2 text-[13px] font-medium text-malva-800">
        <li className="inline-flex items-center gap-1.5 rounded-full bg-malva-100 px-3.5 py-2">
          <ShoppingBag className="size-4 text-malva-600" aria-hidden /> Pedido mínimo {min}
        </li>
        <li className="inline-flex items-center gap-1.5 rounded-full bg-malva-100 px-3.5 py-2">
          <WhatsAppIcon className="size-4 text-whats-escuro" /> Pedido pelo WhatsApp
        </li>
        <li className="inline-flex items-center gap-1.5 rounded-full bg-malva-100 px-3.5 py-2">
          <MapPin className="size-4 text-malva-600" aria-hidden /> Retirada no Lindóia Shopping
        </li>
      </ul>

      <section className="mt-10" aria-labelledby="passo-a-passo">
        <h2 id="passo-a-passo" className="text-xl font-semibold text-malva-800">
          Passo a passo
        </h2>
        <ol className="mt-4 space-y-4">
          {steps.map((step, i) => (
            <li key={step.title} className="flex gap-4 rounded-2xl border border-border bg-white p-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-malva-600 text-sm font-bold text-white">
                {i + 1}
              </span>
              <div>
                <h3 className="font-semibold text-tinta">{step.title}</h3>
                <p className="mt-0.5 text-[14.5px] leading-relaxed text-malva-800/85">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[14.5px] text-malva-800/85">
          Depois de enviar, acompanhe o andamento em{' '}
          <Link to="/meus-pedidos" className="font-semibold text-malva-700 underline underline-offset-4">
            Meus pedidos
          </Link>
          , só com o número do WhatsApp.
        </p>
      </section>

      {categories.length > 0 && (
        <section className="mt-10" aria-labelledby="o-que-encontra">
          <h2 id="o-que-encontra" className="text-xl font-semibold text-malva-800">
            O que você encontra no atacado
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            <li>
              <Link
                to="/categoria/novidades"
                className="inline-block rounded-full border border-malva-600 bg-malva-600 px-4 py-2 text-[13px] font-medium text-white"
              >
                Novidades
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  to={`/categoria/${c.slug}`}
                  className="inline-block rounded-full border border-border bg-white px-4 py-2 text-[13px] font-medium text-tinta hover:border-malva-300"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10" aria-labelledby="onde-retirar">
        <h2 id="onde-retirar" className="text-xl font-semibold text-malva-800">
          Onde retirar
        </h2>
        <div className="mt-4 space-y-3 rounded-2xl border border-border bg-white p-5 text-[15px] text-malva-800">
          <p className="flex gap-2.5">
            <MapPin className="mt-0.5 size-5 shrink-0 text-dourado" aria-hidden />
            <span>{settings.pickup_text}</span>
          </p>
          {settings.hours_text && (
            <p className="flex gap-2.5">
              <Clock className="mt-0.5 size-5 shrink-0 text-dourado" aria-hidden />
              <span>{settings.hours_text}</span>
            </p>
          )}
          <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1 text-sm font-semibold">
            <a href={BUSINESS.mapsUrl} target="_blank" rel="noopener noreferrer" className="text-malva-700 underline underline-offset-4">
              Ver no Google Maps
            </a>
            <a
              href={whatsappLink(settings.whatsapp_number)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-whats-escuro"
            >
              <WhatsAppIcon className="size-4" /> {formatBRPhone(settings.whatsapp_number)}
            </a>
          </div>
        </div>
      </section>

      {faq.length > 0 && (
        <section className="mt-10 scroll-mt-20" aria-labelledby="perguntas" id="perguntas-frequentes">
          <h2 id="perguntas" className="text-xl font-semibold text-malva-800">
            Perguntas frequentes
          </h2>
          <div className="mt-4 divide-y divide-border rounded-2xl border border-border bg-white">
            {faq.map((item) => (
              <div key={item.question} className="p-5">
                <h3 className="font-semibold text-tinta">{item.question}</h3>
                <p className="mt-1.5 whitespace-pre-line text-[14.5px] leading-relaxed text-malva-800/85">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <GoldDivider className="my-10" />

      <div className="text-center">
        <p className="text-lg font-semibold text-malva-800">Tudo pronto para montar seu pedido?</p>
        <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/" className={buttonVariants({ size: 'lg', className: 'w-full max-w-xs' })}>
            Ver o catálogo
          </Link>
          <a
            href={whatsappLink(settings.whatsapp_number)}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: 'whatsapp', size: 'lg', className: 'w-full max-w-xs' })}
          >
            <WhatsAppIcon className="size-5" /> Falar no WhatsApp
          </a>
        </div>
      </div>
    </div>
  )
}
