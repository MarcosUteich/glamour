import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Toaster } from 'sonner'

/** O cliente de dados vem de fora: no navegador, um só (main.tsx); no servidor, um por página gerada. */
export function Providers({ client, children }: { client: QueryClient; children: ReactNode }) {
  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster
        position="top-center"
        toastOptions={{
          classNames: {
            toast: 'rounded-xl border border-border bg-white text-tinta',
            description: 'text-muted-foreground',
          },
        }}
      />
    </QueryClientProvider>
  )
}
