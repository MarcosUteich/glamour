import { Link } from 'react-router'
import { buttonVariants } from '@/components/ui/button-variants'

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <title>Página não encontrada · Glamour Atacado</title>
      <meta name="robots" content="noindex" />
      <p className="font-script text-5xl text-malva-400">ops</p>
      <h1 className="mt-4 text-xl font-semibold text-malva-800">Não encontramos essa página</h1>
      <p className="mt-1 text-sm text-muted-foreground">O link pode estar quebrado ou a peça saiu do catálogo.</p>
      <Link to="/" className={buttonVariants({ className: 'mt-6' })}>
        Ir para o catálogo
      </Link>
    </div>
  )
}
