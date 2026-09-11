import { useState } from 'react'
import { Link } from 'react-router'
import { Wordmark } from '@/components/brand/Wordmark'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { requireSupabase } from '@/lib/supabase'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await requireSupabase().auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (error) setError('E-mail ou senha incorretos.')
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-malva-100 px-5">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex flex-col items-center">
          <Wordmark className="w-40 text-malva-500" dotsClassName="fill-dourado" />
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.4em] text-malva-600">área da loja</span>
        </Link>
        <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-[13px] text-destructive">{error}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  )
}
