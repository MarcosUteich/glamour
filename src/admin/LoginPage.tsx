import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { Wordmark } from '@/components/brand/Wordmark'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { requireSupabase } from '@/lib/supabase'

const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim()
export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const turnstileRef = useRef<TurnstileInstance | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setError(null)

    if (turnstileSiteKey && !captchaToken) {
      setError('Confirme que você não é um robô.')
      return
    }

    setLoading(true)
    try {
      const { error } = await requireSupabase().auth.signInWithPassword({
        email: email.trim(),
        password,
        options: captchaToken ? { captchaToken } : undefined,
      })

      if (error) {
        setError(error.code === 'captcha_failed'
          ? 'A verificação de segurança falhou. Confirme o CAPTCHA novamente.'
          : error.code === 'invalid_credentials'
            ? 'E-mail ou senha incorretos.'
            : 'Não foi possível entrar. Tente novamente.')
      }
    } catch {
      setError('Não foi possível conectar ao serviço de login. Tente novamente.')
    } finally {
      setLoading(false)
      turnstileRef.current?.reset()
      setCaptchaToken(null)
    }
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
          {turnstileSiteKey && (
            <Turnstile
              ref={turnstileRef}
              siteKey={turnstileSiteKey}
              options={{ language: 'pt-br', theme: 'light' }}
              onSuccess={(token) => {
                setCaptchaToken(token)
                setError(null)
              }}
              onExpire={() => setCaptchaToken(null)}
              onError={() => {
                setCaptchaToken(null)
                setError('Não foi possível validar o CAPTCHA. Tente novamente.')
              }}
            />
          )}
          {error && <p className="text-[13px] text-destructive">{error}</p>}
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={loading || (!!turnstileSiteKey && !captchaToken)}
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  )
}
