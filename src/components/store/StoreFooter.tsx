import { Link } from 'react-router'
import { WhatsAppIcon } from '@/components/brand/WhatsAppIcon'
import { Wordmark } from '@/components/brand/Wordmark'
import { useSettings } from '@/hooks/useCatalog'
import { formatBRPhone } from '@/lib/phone'
import { whatsappLink } from '@/lib/whatsapp'

const YEAR = new Date().getFullYear()

export function StoreFooter() {
  const settings = useSettings()

  return (
    <footer className="border-t border-border bg-malva-100/60">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:grid-cols-[1.3fr_1fr_1fr] sm:px-6">
        <div>
          <Wordmark className="w-36 text-malva-500" dotsClassName="fill-dourado" />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Atacado de semijoias, acessórios e maquiagem para lojistas e revendedoras.
          </p>
        </div>
        <div className="space-y-1.5 text-sm text-malva-800">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.25em]">Retirada</p>
          <p>{settings.pickup_text}</p>
          {settings.hours_text && <p className="text-muted-foreground">{settings.hours_text}</p>}
        </div>
        <div className="space-y-2 text-sm text-malva-800">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.25em]">Fale com a gente</p>
          <a
            href={whatsappLink(settings.whatsapp_number)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 font-semibold text-whats"
          >
            <WhatsAppIcon className="size-4" /> {formatBRPhone(settings.whatsapp_number)}
          </a>
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
        </div>
      </div>
      <p className="border-t border-border/70 py-4 text-center text-xs text-muted-foreground">
        © {YEAR} Glamour Acessórios ·{' '}
        <Link to="/admin" className="hover:text-malva-700">
          Área da loja
        </Link>
      </p>
    </footer>
  )
}
