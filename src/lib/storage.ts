// Dados guardados só neste aparelho (localStorage), sempre com try/catch:
// navegação privada e alguns navegadores embutidos bloqueiam o acesso.

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // sem armazenamento disponível: segue sem lembrar
  }
}

export interface SavedCustomer {
  name: string
  phone: string
}

const CUSTOMER_KEY = 'glamour:cliente'
export const loadCustomer = () => read<SavedCustomer>(CUSTOMER_KEY)
export const saveCustomer = (customer: SavedCustomer | null) => write(CUSTOMER_KEY, customer)

export interface LastOrder {
  orderNumber: string
  text: string
  url: string
  totalCents: number
  pieces: number
  createdAt: string
  /** Já contado no GA4/Pixel (a página de confirmação pode ser reaberta) */
  tracked?: boolean
}

const LAST_ORDER_KEY = 'glamour:ultimo-pedido'
export const loadLastOrder = () => read<LastOrder>(LAST_ORDER_KEY)
export const saveLastOrder = (order: LastOrder) => write(LAST_ORDER_KEY, order)

export function markLastOrderTracked() {
  const order = loadLastOrder()
  if (order) saveLastOrder({ ...order, tracked: true })
}
