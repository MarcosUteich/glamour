import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionReady, setSessionReady] = useState(!supabase)
  const [admin, setAdmin] = useState<{ userId: string; value: boolean } | null>(null)

  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setSessionReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setSessionReady(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id
  useEffect(() => {
    if (!supabase || !userId) return
    let active = true
    void supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setAdmin({ userId, value: !!data })
      })
    return () => {
      active = false
    }
  }, [userId])

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut()
    setSession(null)
    setAdmin(null)
  }, [])

  const value = useMemo(() => {
    const matched = !!userId && admin?.userId === userId
    return {
      session,
      isAdmin: matched && admin.value,
      loading: !!supabase && (!sessionReady || (!!userId && !matched)),
      signOut,
    }
  }, [session, userId, admin, sessionReady, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
