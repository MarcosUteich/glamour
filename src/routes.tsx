// Rotas da loja, iguais no navegador (App.tsx) e no servidor (entry-server.tsx, páginas pré-montadas).
// As páginas menos usadas chegam por fora: no navegador sob demanda (client-pages.ts), no servidor já carregadas.
import { Suspense, type ComponentType } from 'react'
import { Route, Routes } from 'react-router'
import { StoreLayout } from '@/components/store/StoreLayout'
import { Home } from '@/pages/Home'
import { NotFoundPage } from '@/pages/NotFoundPage'

export interface Pages {
  ProductPage: ComponentType
  OrderPage: ComponentType
  OrderConfirmedPage: ComponentType
  MyOrdersPage: ComponentType
  PrivacyPage: ComponentType
  HowToBuyPage: ComponentType
  AdminApp: ComponentType
}

export function Loading() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <span className="size-8 animate-spin rounded-full border-2 border-malva-200 border-t-malva-500" />
    </div>
  )
}

export function AppRoutes({ pages }: { pages: Pages }) {
  const { ProductPage, OrderPage, OrderConfirmedPage, MyOrdersPage, PrivacyPage, HowToBuyPage, AdminApp } = pages
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<StoreLayout />}>
          <Route index element={<Home />} />
          <Route path="categoria/:slug" element={<Home />} />
          <Route path="produto/:slug" element={<ProductPage />} />
          <Route path="pedido" element={<OrderPage />} />
          <Route path="pedido/confirmado/:orderNumber" element={<OrderConfirmedPage />} />
          <Route path="meus-pedidos" element={<MyOrdersPage />} />
          <Route path="privacidade" element={<PrivacyPage />} />
          <Route path="como-comprar" element={<HowToBuyPage />} />
        </Route>
        <Route path="admin/*" element={<AdminApp />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
