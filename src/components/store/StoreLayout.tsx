import { Suspense, useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router'
import { toast } from 'sonner'
import { useCatalog } from '@/hooks/useCatalog'
import { captureAttribution } from '@/lib/attribution'
import { isDemo } from '@/lib/rest'
import { initTracking, trackPageView } from '@/lib/tracking'
import { cn } from '@/lib/utils'
import { loadSavedCart, useCart } from '@/store/cart'
import { CartFab } from './CartFab'
import { CookieBanner } from './CookieBanner'
import { StoreFooter } from './StoreFooter'
import { StoreHeader } from './StoreHeader'

const isCatalogView = (path: string) => path === '/' || path.startsWith('/categoria')

export function StoreLayout() {
  const { pathname } = useLocation()
  const { data } = useCatalog()
  const sync = useCart((s) => s.sync)
  const hasItems = useCart((s) => s.lines.length > 0)
  const onOrderPages = pathname.startsWith('/pedido')
  const previousPath = useRef(pathname)

  // Origem da visita (UTM, anúncio, Instagram...) antes de qualquer navegação interna apagar a URL de chegada.
  // Numa página que veio montada do servidor, o pedido salvo no aparelho entra aqui, depois da hidratação.
  useEffect(() => {
    loadSavedCart()
    captureAttribution()
    initTracking()
  }, [])

  // page_view do GA4 e do Pixel a cada troca de página, depois que o <title> novo entrou
  useEffect(() => {
    const timer = window.setTimeout(() => trackPageView(pathname), 300)
    return () => window.clearTimeout(timer)
  }, [pathname])

  // Entre "todas" e categorias a página não pula para o topo (os chips ficam fixos); o resto abre no topo
  useEffect(() => {
    if (!(isCatalogView(previousPath.current) && isCatalogView(pathname))) window.scrollTo({ top: 0 })
    previousPath.current = pathname
  }, [pathname])

  // Pedido salvo no aparelho sempre com preço e estoque atuais
  useEffect(() => {
    if (!data) return
    const changes = sync(data.products)
    if (changes.length > 0) toast.info('Atualizamos seu pedido', { description: changes.join(' · '), duration: 8000 })
  }, [data, sync])

  return (
    <div className="flex min-h-dvh flex-col">
      {isDemo && (
        <p className="bg-[#F4EBD8] px-4 py-1.5 text-center text-[12px] text-[#6E5321]">
          Modo demonstração: produtos de exemplo. Conecte o Supabase para usar o catálogo real.
        </p>
      )}
      <StoreHeader />
      <main className={cn('flex-1', hasItems && !onOrderPages && 'pb-32')}>
        {/* Página ainda baixando: cabeçalho e rodapé ficam, só o meio mostra o carregando */}
        <Suspense fallback={<PageLoading />}>
          <Outlet />
        </Suspense>
      </main>
      <StoreFooter />
      {!onOrderPages && <CartFab />}
      <CookieBanner />
    </div>
  )
}

function PageLoading() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <span className="size-8 animate-spin rounded-full border-2 border-malva-200 border-t-malva-500" />
    </div>
  )
}
