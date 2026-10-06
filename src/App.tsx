import type { QueryClient } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router'
import { clientPages } from '@/client-pages'
import { Providers } from '@/components/Providers'
import { AppRoutes } from '@/routes'

export default function App({ queryClient }: { queryClient: QueryClient }) {
  return (
    <Providers client={queryClient}>
      <BrowserRouter>
        <AppRoutes pages={clientPages} />
      </BrowserRouter>
    </Providers>
  )
}
