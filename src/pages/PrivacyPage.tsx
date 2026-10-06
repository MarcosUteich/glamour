import { Link } from 'react-router'
import { useSettings } from '@/hooks/useCatalog'
import { resetConsent } from '@/lib/consent'
import { formatBRPhone } from '@/lib/phone'
import { BUSINESS } from '@/seo/business'
import { titles } from '@/seo/titles'

export function PrivacyPage() {
  const settings = useSettings()

  return (
    <div className="mx-auto max-w-2xl px-5 py-12 sm:px-6">
      <title>{titles.page('Privacidade')}</title>
      <h1 className="text-2xl font-semibold text-malva-800">Privacidade</h1>
      <div className="mt-6 space-y-5 text-[15px] leading-relaxed text-malva-800/90">
        <p>
          Este site é o catálogo de atacado da {BUSINESS.name}, feito para lojistas e revendedoras montarem um pedido e
          enviarem pelo WhatsApp.
        </p>
        <div>
          <h2 className="font-semibold text-malva-800">Quais dados coletamos</h2>
          <p className="mt-1">
            O <strong>nome</strong> e o <strong>WhatsApp</strong> que você informa ao finalizar o pedido e, junto com o
            pedido, <strong>de onde você chegou ao site</strong> (por exemplo, um anúncio, o Instagram ou uma busca no
            Google). Não pedimos e-mail, CPF nem endereço, e não há cadastro.
          </p>
        </div>
        <div>
          <h2 className="font-semibold text-malva-800">Para que usamos</h2>
          <p className="mt-1">
            Para atender e combinar a retirada do pedido com você e para saber quais divulgações da loja funcionam. Não
            enviamos propaganda sem você pedir e não compartilhamos seu nome nem seu WhatsApp com terceiros.
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
          <h2 className="font-semibold text-malva-800">Consultar pedidos antigos</h2>
          <p className="mt-1">
            Em <Link to="/meus-pedidos" className="underline underline-offset-2">Meus pedidos</Link>, digitar o WhatsApp
            mostra o histórico feito com esse número — sem senha nem cadastro. Por isso, quem souber o seu WhatsApp
            consegue ver esses pedidos; não compartilhe seu número com quem não deva ver essa informação.
          </p>
        </div>
        <div>
          <h2 className="font-semibold text-malva-800">Cookies e estatísticas</h2>
          <p className="mt-1">
            Com a sua permissão no aviso de cookies, usamos ferramentas como o <strong>Google Analytics</strong>, o{' '}
            <strong>Google Ads</strong>, o <strong>Pixel da Meta</strong> (Facebook e Instagram) e o{' '}
            <strong>Microsoft Clarity</strong> para saber quantas pessoas visitam o site, quais peças despertam interesse
            e se os nossos anúncios funcionam. Essas ferramentas gravam cookies no seu navegador e recebem dados como
            páginas vistas, peças adicionadas ao pedido, valor do pedido, tipo de aparelho e cidade aproximada. Seu nome e
            seu WhatsApp não são enviados para elas. Se você recusar, nenhuma delas é carregada.
          </p>
          <p className="mt-2">
            Você pode mudar a escolha a qualquer momento:{' '}
            <button type="button" onClick={resetConsent} className="font-medium underline underline-offset-2">
              abrir as preferências de cookies
            </button>
            . As preferências de anúncios da Meta ficam em{' '}
            <a
              href="https://www.facebook.com/adpreferences"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              facebook.com/adpreferences
            </a>
            .
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
