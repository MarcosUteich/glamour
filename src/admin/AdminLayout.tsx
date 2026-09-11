import { BarChart3, LogOut, Package, ClipboardList, Settings2, Tags } from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink } from 'react-router'
import { Wordmark } from '@/components/brand/Wordmark'
import { cn } from '@/lib/utils'
import { useAuth } from './auth-context'

const NAV = [
  { to: '/admin', end: true, label: 'Início', icon: BarChart3 },
  { to: '/admin/pedidos', label: 'Pedidos', icon: ClipboardList },
  { to: '/admin/produtos', label: 'Produtos', icon: Package },
  { to: '/admin/categorias', label: 'Categorias', icon: Tags },
  { to: '/admin/config', label: 'Config', icon: Settings2 },
]

export function AdminLayout({ children }: { children: ReactNode }) {
  const { session, signOut } = useAuth()

  return (
    <div className="min-h-dvh bg-background pb-20 sm:pb-0 sm:pl-56">
      <aside className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-border bg-white sm:inset-y-0 sm:left-0 sm:w-56 sm:flex-col sm:justify-start sm:border-r sm:border-t-0 sm:px-3 sm:py-5">
        <div className="hidden px-2 sm:block">
          <Wordmark className="w-28 text-malva-500" dotsClassName="fill-dourado" />
          <p className="mb-6 mt-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            área da loja
          </p>
        </div>
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium sm:flex-none sm:flex-row sm:gap-2.5 sm:rounded-xl sm:px-3 sm:py-2.5 sm:text-sm',
                isActive ? 'text-malva-700 sm:bg-malva-100' : 'text-muted-foreground sm:hover:bg-malva-50',
              )
            }
          >
            <item.icon className="size-5 sm:size-[18px]" strokeWidth={1.8} />
            {item.label}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={signOut}
          className="hidden items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-malva-50 sm:mt-auto sm:flex"
        >
          <LogOut className="size-[18px]" strokeWidth={1.8} />
          Sair
        </button>
      </aside>

      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8">
        <div className="mb-4 flex items-center justify-between sm:hidden">
          <Wordmark className="w-24 text-malva-500" dotsClassName="fill-dourado" />
          <button type="button" onClick={signOut} className="text-sm font-medium text-muted-foreground">
            Sair
          </button>
        </div>
        <p className="mb-4 truncate text-[12px] text-muted-foreground">{session?.user.email}</p>
        {children}
      </div>
    </div>
  )
}
