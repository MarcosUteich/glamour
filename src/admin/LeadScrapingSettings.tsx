import { Check, KeyRound, Sheet, ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { AdminCard } from './ui'
import { getLeadsConfig, saveLeadsConfig, type LeadScrapingConfig } from './leads-config'

export function LeadScrapingSettings() {
  const [config, setConfig] = useState<LeadScrapingConfig>(getLeadsConfig())
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setConfig(getLeadsConfig())
  }, [])

  const handleSave = () => {
    saveLeadsConfig(config)
    setSaved(true)
    toast.success('Configurações de integração salvas com sucesso!')
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-6">
      <AdminCard className="max-w-2xl">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold text-malva-800">
            <KeyRound className="size-4" />
            Token de acesso Apify & Webhook n8n
          </h3>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Configure as credenciais e conexões para disparar o scraping pelo n8n e salvar automaticamente na sua planilha do Google Sheets.
        </p>

        <div className="mt-6 space-y-5">
          <label className="block text-sm font-medium text-malva-800">
            <div className="flex items-center justify-between">
              <span>Token da Apify</span>
              <a
                href="https://console.apify.com/account/integrations"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-malva-600 hover:underline"
              >
                Obter token na Apify <ExternalLink className="size-3" />
              </a>
            </div>
            <Input
              className="mt-2"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={config.apifyToken}
              onChange={(event) => setConfig({ ...config, apifyToken: event.target.value })}
              placeholder="apify_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Usado para fazer requisições dinâmicas no scraper do Google Maps da Apify.
            </p>
          </label>

          <label className="block text-sm font-medium text-malva-800">
            <div className="flex items-center justify-between">
              <span>URL do Webhook de Busca (Scraping) n8n</span>
            </div>
            <Input
              className="mt-2"
              type="url"
              autoComplete="off"
              spellCheck={false}
              value={config.n8nWebhookUrl}
              onChange={(event) => setConfig({ ...config, n8nWebhookUrl: event.target.value })}
              placeholder="https://n8n.glamourlindoia.com.br/webhook/leads-scraping"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              O webhook no seu n8n que recebe os parâmetros de busca enviados pelo painel.
            </p>
          </label>

          <label className="block text-sm font-medium text-malva-800">
            <div className="flex items-center justify-between">
              <span>URL do Webhook de Atualização (Google Sheets) n8n</span>
            </div>
            <Input
              className="mt-2"
              type="url"
              autoComplete="off"
              spellCheck={false}
              value={config.n8nUpdateWebhookUrl || ''}
              onChange={(event) => setConfig({ ...config, n8nUpdateWebhookUrl: event.target.value })}
              placeholder="https://n8n.glamourlindoia.com.br/webhook/leads-update"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              O webhook que atualiza o status, anotações e data de contato diretamente na sua planilha.
            </p>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-malva-800">
              <div className="flex items-center justify-between">
                <span>ID da Planilha (Google Sheets)</span>
                {config.sheetId && (
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${config.sheetId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline"
                  >
                    Abrir planilha <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
              <Input
                className="mt-2"
                value={config.sheetId}
                onChange={(event) => setConfig({ ...config, sheetId: event.target.value })}
                placeholder="1ARtBNXi9JHnK7fzSeectXe8K_aEyGA1iyXnqOzieJsw"
              />
            </label>

            <label className="block text-sm font-medium text-malva-800">
              <span>Nome da Aba / Página</span>
              <Input
                className="mt-2"
                value={config.sheetName}
                onChange={(event) => setConfig({ ...config, sheetName: event.target.value })}
                placeholder="Página1"
              />
            </label>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            As configurações são salvas de forma segura no navegador do administrador.
          </p>
          <Button onClick={handleSave} className="gap-2">
            {saved ? <Check className="size-4 text-emerald-300" /> : <Check className="size-4" />}
            {saved ? 'Salvo!' : 'Salvar configurações'}
          </Button>
        </div>
      </AdminCard>

      <AdminCard className="max-w-2xl bg-malva-50/50">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-malva-800">
          <Sheet className="size-4 text-emerald-600" />
          Como conectar o Google Sheets para leitura direta
        </h4>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Para que o painel consiga ler os leads da sua planilha sem precisar de servidor intermediário, certifique-se de que a planilha no Google Sheets esteja compartilhada com <strong>"Qualquer pessoa com o link pode visualizar"</strong>.
        </p>
      </AdminCard>
    </div>
  )
}
