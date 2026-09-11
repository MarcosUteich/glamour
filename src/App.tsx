import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { Providers } from '@/components/Providers'
import { StoreLayout } from '@/components/store/StoreLayout'
import { Home } from '@/pages/Home'
import { NotFoundPage } from '@/pages/NotFoundPage'

const ProductPage = lazy(() => import('@/pages/ProductPage').then((m) => ({ default: m.ProductPage })))
const OrderPage = lazy(() => import('@/pages/OrderPage').then((m) => ({ default: m.OrderPage })))
const OrderConfirmedPage = lazy(() =>
  import('@/pages/OrderConfirmedPage').then((m) => ({ default: m.OrderConfirmedPage })),
)
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })))
const AdminApp = lazy(() => import('@/admin/AdminApp').then((m) => ({ default: m.AdminApp })))

const Loading = () => (
  <div className="grid min-h-dvh place-items-center">
    <span className="size-8 animate-spin rounded-full border-2 border-malva-200 border-t-malva-500" />
  </div>
)

export default function App() {
  return (
    <Providers>
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route element={<StoreLayout />}>
              <Route index element={<Home />} />
              <Route path="categoria/:slug" element={<Home />} />
              <Route path="produto/:slug" element={<ProductPage />} />
              <Route path="pedido" element={<OrderPage />} />
              <Route path="pedido/confirmado/:orderNumber" element={<OrderConfirmedPage />} />
              <Route path="privacidade" element={<PrivacyPage />} />
            </Route>
            <Route path="admin/*" element={<AdminApp />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </Providers>
  )
}
