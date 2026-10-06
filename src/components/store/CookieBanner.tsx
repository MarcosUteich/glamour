import { Cookie } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { setConsent, useConsent } from '@/lib/consent'
import { trackingConfigured } from '@/lib/tracking'

/**
 * Aviso de cookies (LGPD). Aparece só quando há alguma ferramenta de medição configurada e a pessoa ainda
 * não escolheu. Aceitar e recusar ficam lado a lado, com o mesmo peso, como orienta a ANPD.
 */
export function CookieBanner() {
  const consent = useConsent()
  if (!trackingConfigured || consent !== null) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <section
        role="dialog"
        aria-live="polite"
        aria-label="Aviso de cookies"
        className="w-full max-w-md rounded-2xl border border-malva-200 bg-white p-4 shadow-xl shadow-tinta/15"
      >
        <p className="flex items-center gap-2 text-sm font-semibold text-malva-800">
          <Cookie className="size-4 text-dourado" strokeWidth={1.8} /> Cookies de estatística e anúncios
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-malva-800/85">
          Com a sua permissão, usamos cookies do Google e da Meta (Facebook e Instagram) para saber quantas pessoas
          visitam o catálogo e se os nossos anúncios funcionam. Seu nome e seu WhatsApp não vão para eles.{' '}
          <Link to="/privacidade" className="font-medium underline underline-offset-2">
            Saiba mais
          </Link>
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => setConsent('denied')}>
            Recusar
          </Button>
          <Button onClick={() => setConsent('granted')}>Aceitar</Button>
        </div>
      </section>
    </div>
  )
}
