import { Link, Route, Routes } from 'react-router'
import { buttonVariants } from '@/components/ui/button-variants'
import { isDemo } from '@/lib/supabase'
import { AdminLayout } from './AdminLayout'
import { AuthProvider } from './auth'
import { useAuth } from './auth-context'
import { CategoriesPage } from './CategoriesPage'
import { DashboardPage } from './DashboardPage'
import { LoginPage } from './LoginPage'
import { OrderDetailPage } from './OrderDetailPage'
import { OrdersPage } from './OrdersPage'
import { ProductFormPage } from './ProductFormPage'
import { ProductsPage } from './ProductsPage'
import { SettingsPage } from './SettingsPage'

export function AdminApp() {
  if (isDemo) return <NeedsSupabase />
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}

function Gate() {
  const { session, isAdmin, loading } = useAuth()

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <span className="size-8 animate-spin rounded-full border-2 border-malva-200 border-t-malva-500" />
      </div>
    )
  }
  if (!session) return <LoginPage />
  if (!isAdmin) return <NotAllowed />

  return (
    <AdminLayout>
      <Routes>
        <Route index element={<DashboardPage />} />
        <Route path="pedidos" element={<OrdersPage />} />
        <Route path="pedidos/:id" element={<OrderDetailPage />} />
        <Route path="produtos" element={<ProductsPage />} />
        <Route path="produtos/novo" element={<ProductFormPage />} />
        <Route path="produtos/:id/editar" element={<ProductFormPage />} />
        <Route path="categorias" element={<CategoriesPage />} />
        <Route path="config" element={<SettingsPage />} />
        <Route path="*" element={<DashboardPage />} />
      </Routes>
    </AdminLayout>
  )
}

function NotAllowed() {
  const { session, signOut } = useAuth()
  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <p className="text-lg font-semibold text-malva-800">Acesso restrito</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          A conta {session?.user.email} não tem acesso ao painel. Peça para adicionarem seu usuário na tabela{' '}
          <code>admins</code> do Supabase.
        </p>
        <button type="button" onClick={signOut} className={buttonVariants({ variant: 'outline', className: 'mt-4' })}>
          Sair
        </button>
      </div>
    </div>
  )
}

function NeedsSupabase() {
  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <p className="text-lg font-semibold text-malva-800">Painel indisponível no modo demonstração</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Configure as chaves do Supabase no arquivo <code>.env.local</code> para usar a área da loja.
        </p>
        <Link to="/" className={buttonVariants({ className: 'mt-4' })}>
          Voltar ao catálogo
        </Link>
      </div>
    </div>
  )
}
