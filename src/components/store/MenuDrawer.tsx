import { AtSign, CircleHelp, Clock, History, MapPin, Menu, ShoppingBag, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { WhatsAppIcon } from '@/components/brand/WhatsAppIcon'
import { Wordmark } from '@/components/brand/Wordmark'
import { Drawer, DrawerClose, DrawerContent, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer'
import { useCatalog, useSettings } from '@/hooks/useCatalog'
import { visibleCategories } from '@/lib/catalog'
import { formatBRPhone } from '@/lib/phone'
import { cn } from '@/lib/utils'
import { whatsappLink } from '@/lib/whatsapp'

const serif = "font-['Playfair_Display','Bodoni_Moda',Georgia,serif]"

export function MenuDrawer() {
  const [open, setOpen] = useState(false)
  const { data } = useCatalog()
  const settings = useSettings()
  const categories = data ? visibleCategories(data.categories, data.products) : []
  const close = () => setOpen(false)

  return (
    <Drawer open={open} onOpenChange={setOpen} direction="left">
      <DrawerTrigger asChild>
        <button
          type="button"
          aria-label="Abrir menu"
          className="grid size-12 place-items-center transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-white/70"
        >
          <Menu className="size-6" strokeWidth={1.6} />
        </button>
      </DrawerTrigger>

      <DrawerContent side="left" aria-describedby={undefined} className="rounded-none md:max-w-104">
        <div className="flex items-center justify-between bg-malva-500 px-6 py-4 text-malva-50 md:px-8 md:py-5">
          <DrawerTitle className="w-28 md:w-32">
            <Wordmark className="w-28 md:w-32" dotsClassName="fill-dourado-claro" />
          </DrawerTitle>
          <DrawerClose
            aria-label="Fechar menu"
            className="grid size-10 place-items-center transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-white/70 md:size-11"
          >
            <X className="size-5 md:size-6" />
          </DrawerClose>
        </div>

        <nav className="flex-1 overflow-y-auto px-6 pb-4 pt-2 md:px-8 md:pt-3" aria-label="Menu">
          <ul>
            <li>
              <CategoryLink to="/" onClick={close}>
                Todas as peças
              </CategoryLink>
            </li>
            <li>
              <CategoryLink to="/categoria/novidades" onClick={close}>
                Novidades
              </CategoryLink>
            </li>
            {categories.map((c) => (
              <li key={c.id}>
                <CategoryLink to={`/categoria/${c.slug}`} onClick={close}>
                  {c.name}
                </CategoryLink>
              </li>
            ))}
          </ul>

          <div className="mt-7 grid grid-cols-2 gap-3 md:mt-8">
            <Tile to="/pedido" onClick={close} icon={<ShoppingBag className="size-5 md:size-6" strokeWidth={1.6} />}>
              Seu pedido
            </Tile>
            <Tile to="/meus-pedidos" onClick={close} icon={<History className="size-5 md:size-6" strokeWidth={1.6} />}>
              Meus pedidos
            </Tile>
            <Tile
              to="/como-comprar"
              onClick={close}
              icon={<CircleHelp className="size-5 md:size-6" strokeWidth={1.6} />}
              className="col-span-2 flex-row items-center"
            >
              Como comprar
            </Tile>
          </div>
        </nav>

        <div className="space-y-4 border-t border-border bg-malva-50/60 px-6 pb-6 pt-5 text-tinta md:px-8 md:pb-7 md:pt-6">
          <a
            href={whatsappLink(settings.whatsapp_number)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-whats px-4 py-2.5 text-sm font-semibold text-white transition active:opacity-90 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-whats"
          >
            <WhatsAppIcon className="size-5" />
            {formatBRPhone(settings.whatsapp_number)}
          </a>

          <ul className="space-y-2.5 text-sm leading-snug md:text-[15px]">
            <li className="flex gap-2.5">
              <MapPin className="mt-0.5 size-4 shrink-0 text-dourado md:size-4.5" /> {settings.pickup_text}
            </li>
            {settings.hours_text && (
              <li className="flex gap-2.5">
                <Clock className="mt-0.5 size-4 shrink-0 text-dourado md:size-4.5" /> {settings.hours_text}
              </li>
            )}
            {settings.instagram_url && (
              <li>
                <a
                  href={settings.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 transition-colors hover:text-malva-500"
                >
                  <AtSign className="size-4 text-dourado md:size-4.5" /> Instagram
                </a>
              </li>
            )}
          </ul>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function CategoryLink({ to, onClick, children }: { to: string; onClick: () => void; children: ReactNode }) {
  const { pathname } = useLocation()
  const active = pathname === to

  return (
    <Link
      to={to}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        serif,
        'group flex items-center gap-3 border-b border-border py-3 text-[17px] font-medium leading-none antialiased transition-colors md:py-3.5 md:text-[19px]',
        'focus-visible:outline focus-visible:outline-malva-500',
        active ? 'font-semibold text-malva-600' : 'text-tinta hover:text-malva-600',
      )}
    >
      <span className="transition-transform duration-200 group-hover:translate-x-1">{children}</span>
      {active && <span className="ml-auto size-1.5 bg-dourado md:size-2" />}
    </Link>
  )
}

function Tile({
  to,
  onClick,
  icon,
  className,
  children,
}: {
  to: string
  onClick: () => void
  icon: ReactNode
  className?: string
  children: ReactNode
}) {
  const { pathname } = useLocation()
  const active = pathname === to

  return (
    <Link
      to={to}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex flex-col gap-2 border p-3.5 text-sm font-semibold transition-colors md:gap-2.5 md:p-4 md:text-[15px]',
        'focus-visible:outline focus-visible:outline-malva-500',
        active
          ? 'border-malva-500 bg-malva-500 text-white'
          : 'border-border bg-white text-tinta hover:border-malva-300',
        className,
      )}
    >
      <span className={active ? 'text-white' : 'text-malva-500'}>{icon}</span>
      {children}
    </Link>
  )
}