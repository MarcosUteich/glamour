import { useQuery } from '@tanstack/react-query'
import { DEFAULT_SETTINGS } from '@/config'
import { fetchCatalog, fetchSettings } from '@/data/api'

export function useCatalog() {
  return useQuery({ queryKey: ['catalog'], queryFn: fetchCatalog, staleTime: 5 * 60_000 })
}

/** Configurações da loja; enquanto carregam, valem os padrões (pedido mínimo de src/seo/business.ts, WhatsApp da loja). */
export function useSettings() {
  const { data } = useQuery({ queryKey: ['settings'], queryFn: fetchSettings, staleTime: 10 * 60_000 })
  return data ?? DEFAULT_SETTINGS
}
