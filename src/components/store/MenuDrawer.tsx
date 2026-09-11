import { AtSign, Clock, History, MapPin, Menu, ShoppingBag, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { WhatsAppIcon } from '@/components/brand/WhatsAppIcon'
import { Wordmark } from '@/components/brand/Wordmark'
import { Drawer, DrawerClose, DrawerContent, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer'
import { useCatalog, useSettings } from '@/hooks/useCatalog'
import { visibleCategories } from '@/lib/catalog'
import { formatBRPhone } from '@/lib/phone'
import { whatsappLink } from '@/lib/whatsapp'

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
          className="grid size-12 place-items-center rounded-full transition-colors hover:bg-white/10"
        >
          <Menu className="size-6" strokeWidth={1.6} />
        </button>
      </DrawerTrigger>
      <DrawerContent side="left" aria-describedby={undefined}>
        <div className="flex items-center justify-between bg-malva-500 px-5 py-4 text-malva-50">
          <DrawerTitle className="w-28">
            <Wordmark className="w-28" dotsClassName="fill-dourado-claro" />
          </DrawerTitle>
          <DrawerClose aria-label="Fechar menu" className="grid size-10 place-items-center rounded-full hover:bg-white/10">
            <X className="size-5" />
          </DrawerClose>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Menu">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Categorias</p>
          <MenuLink to="/" onClick={close}>
            Todas as peças
          </MenuLink>
          <MenuLink to="/categoria/novidades" onClick={close}>
            Novidades
          </MenuLink>
          {categories.map((c) => (
            <MenuLink key={c.id} to={`/categoria/${c.slug}`} onClick={close}>
              {c.name}
            </MenuLink>
          ))}

          <div className="mx-3 my-4 border-t border-border" />
          <MenuLink to="/pedido" onClick={close}>
            <ShoppingBag className="size-4 text-malva-500" /> Seu pedido
          </MenuLink>
          <MenuLink to="/meus-pedidos" onClick={close}>
            <History className="size-4 text-malva-500" /> Meus pedidos
          </MenuLink>

          <div className="mt-6 space-y-3 px-3 text-sm text-malva-800">
            <a
              href={whatsappLink(settings.whatsapp_number)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 font-semibold text-whats"
            >
              <WhatsAppIcon className="size-5" /> {formatBRPhone(settings.whatsapp_number)}
            </a>
            <p className="flex gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-dourado" /> {settings.pickup_text}
            </p>
            {settings.hours_text && (
              <p className="flex gap-2">
                <Clock className="mt-0.5 size-4 shrink-0 text-dourado" /> {settings.hours_text}
              </p>
            )}
            {settings.instagram_url && (
              <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                <AtSign className="size-4 text-dourado" /> Instagram
              </a>
            )}
          </div>
        </nav>
      </DrawerContent>
    </Drawer>
  )
}

function MenuLink({ to, onClick, children }: { to: string; onClick: () => void; children: ReactNode }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[15px] font-medium text-tinta transition-colors hover:bg-malva-100"
    >
      {children}
    </Link>
  )
}
