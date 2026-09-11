import { Link } from 'react-router'
import { useSettings } from '@/hooks/useCatalog'
import { formatBRPhone } from '@/lib/phone'

export function PrivacyPage() {
  const settings = useSettings()

  return (
    <div className="mx-auto max-w-2xl px-5 py-12 sm:px-6">
      <title>Privacidade · Glamour Atacado</title>
      <h1 className="text-2xl font-semibold text-malva-800">Privacidade</h1>
      <div className="mt-6 space-y-5 text-[15px] leading-relaxed text-malva-800/90">
        <p>
          Este site é o catálogo de atacado da Glamour Acessórios, feito para lojistas e revendedoras montarem um pedido e
          enviarem pelo WhatsApp.
        </p>
        <div>
          <h2 className="font-semibold text-malva-800">Quais dados coletamos</h2>
          <p className="mt-1">
            Apenas o <strong>nome</strong> e o <strong>WhatsApp</strong> que você informa ao finalizar o pedido. Não pedimos
            e-mail, CPF nem endereço, e não há cadastro.
          </p>
        </div>
        <div>
          <h2 className="font-semibold text-malva-800">Para que usamos</h2>
          <p className="mt-1">
            Só para atender e combinar a retirada deste pedido com você. Não enviamos propaganda sem você pedir e não
            compartilhamos seus dados com terceiros.
          </p>
        </div>
        <div>
          <h2 className="font-semibold text-malva-800">Onde ficam guardados</h2>
          <p className="mt-1">
            O pedido fica registrado no sistema da loja para organizarmos a separação e a retirada. O seu nome e telefone
            também podem ficar salvos <em>neste aparelho</em> para agilizar um próximo pedido — você pode limpar isso
            apagando os dados do site no navegador.
          </p>
        </div>
        <div>
          <h2 className="font-semibold text-malva-800">Seus direitos</h2>
          <p className="mt-1">
            É só falar com a gente pelo WhatsApp <strong>{formatBRPhone(settings.whatsapp_number)}</strong> para consultar,
            corrigir ou apagar seus dados.
          </p>
        </div>
      </div>
      <Link to="/" className="mt-8 inline-block text-sm font-semibold text-malva-700 underline underline-offset-4">
        Voltar ao catálogo
      </Link>
    </div>
  )
}
