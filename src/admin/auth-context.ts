import type { Session } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'

export interface AuthValue {
  session: Session | null
  isAdmin: boolean
  loading: boolean
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthValue | null>(null)

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de AuthProvider')
  return ctx
}
