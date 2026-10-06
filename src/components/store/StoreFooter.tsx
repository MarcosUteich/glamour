import { Link } from 'react-router'
import { WhatsAppIcon } from '@/components/brand/WhatsAppIcon'
import { Wordmark } from '@/components/brand/Wordmark'
import { useCatalog, useSettings } from '@/hooks/useCatalog'
import { visibleCategories } from '@/lib/catalog'
import { resetConsent } from '@/lib/consent'
import { formatBRPhone } from '@/lib/phone'
import { trackingConfigured } from '@/lib/tracking'
import { whatsappLink } from '@/lib/whatsapp'
import { BUSINESS } from '@/seo/business'

const YEAR = new Date().getFullYear()

export function StoreFooter() {
  const settings = useSettings()
  const { data } = useCatalog()
  const categories = data ? visibleCategories(data.categories, data.products) : []

  return (
    <footer className="border-t border-border bg-malva-100/60">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div>
          <Wordmark className="w-36 text-malva-500" dotsClassName="fill-dourado" />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Atacado de semijoias, acessórios e maquiagem para lojistas e revendedoras, com retirada no Lindóia Shopping,
            em Porto Alegre.
          </p>
        </div>
        <nav aria-label="Catálogo" className="text-sm text-malva-800">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.25em]">Catálogo</p>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-1">
            <li>
              <Link to="/categoria/novidades" className="hover:underline">
                Novidades
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c.id}>
                <Link to={`/categoria/${c.slug}`} className="hover:underline">
                  {c.name}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/" className="hover:underline">
                Todas as peças
              </Link>
            </li>
          </ul>
        </nav>
        <div className="space-y-1.5 text-sm text-malva-800">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.25em]">Retirada</p>
          <p>{settings.pickup_text}</p>
          {settings.hours_text && <p className="text-muted-foreground">{settings.hours_text}</p>}
          <a
            href={BUSINESS.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block pt-1 font-medium underline-offset-2 hover:underline"
          >
            Ver no Google Maps
          </a>
        </div>
        <div className="space-y-2 text-sm text-malva-800">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.25em]">Fale com a gente</p>
          <a
            href={whatsappLink(settings.whatsapp_number)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 font-semibold text-whats-escuro"
          >
            <WhatsAppIcon className="size-4" /> {formatBRPhone(settings.whatsapp_number)}
          </a>
          <Link to="/como-comprar" className="block hover:underline">
            Como comprar
          </Link>
          <Link to="/como-comprar#perguntas-frequentes" className="block hover:underline">
            Perguntas frequentes
          </Link>
          {settings.instagram_url && (
            <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer" className="block hover:underline">
              Instagram
            </a>
          )}
          <Link to="/meus-pedidos" className="block hover:underline">
            Meus pedidos
          </Link>
          <Link to="/privacidade" className="block hover:underline">
            Privacidade
          </Link>
          {trackingConfigured && (
            <button type="button" onClick={resetConsent} className="block text-left hover:underline">
              Preferências de cookies
            </button>
          )}
        </div>
      </div>
      <p className="border-t border-border/70 py-4 text-center text-xs text-muted-foreground">
        © {YEAR} {BUSINESS.name} ·{' '}
        <Link to="/admin" rel="nofollow" className="hover:text-malva-700">
          Área da loja
        </Link>
      </p>
    </footer>
  )
}
