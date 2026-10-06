import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import '@fontsource-variable/montserrat'
import '@fontsource/yellowtail'
import './index.css'
import App from './App'
import { preloadRoute } from './client-pages'
import { createQueryClient, readInitialData, seedQueryClient } from './lib/query-client'
import { loadSavedCart } from './store/cart'

// No servidor Node a página já chega montada (título, peças, textos) junto com os dados usados nela: o React
// só "hidrata" o HTML que já está na tela, com os mesmos dados. Sem isso (busca, pedido, Vercel), monta do zero.
const container = document.getElementById('root')!
const queryClient = createQueryClient()
const initial = readInitialData()
if (initial) seedQueryClient(queryClient, initial)
await preloadRoute(window.location.pathname)

const app = (
  <StrictMode>
    <App queryClient={queryClient} />
  </StrictMode>
)

if (initial && container.firstElementChild) {
  // O pedido salvo no aparelho entra logo depois da hidratação (StoreLayout)
  hydrateRoot(container, app)
} else {
  loadSavedCart()
  createRoot(container).render(app)
}
